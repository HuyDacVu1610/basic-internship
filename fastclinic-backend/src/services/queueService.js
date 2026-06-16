const { sequelize, PhieuKham, LuotKham, BenhNhan, PhongKham, SinhHieu } = require('../models');
const logger = require('../utils/logger');

class QueueService {
  getLocalDateString() {
    const d = new Date();
    const year = d.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
    const month = d.toLocaleDateString('en-US', { month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
    const day = d.toLocaleDateString('en-US', { day: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
    return `${year}-${month}-${day}`;
  }

  async issueTicket(maBenhNhan, maPhong, maNhanVien) {
    // 1. Verify Clinic Room
    const room = await PhongKham.findOne({
      where: { ma_phong: maPhong, trang_thai: 'HOAT_DONG' }
    });
    if (!room) {
      const err = new Error('Phòng khám không hoạt động hoặc không tồn tại.');
      err.statusCode = 404;
      err.code = 'ROOM_NOT_FOUND';
      throw err;
    }

    // 2. Verify Patient
    const patient = await BenhNhan.findOne({
      where: { ma_benh_nhan: maBenhNhan, is_active: true }
    });
    if (!patient) {
      const err = new Error('Bệnh nhân không tồn tại hoặc đã bị ẩn.');
      err.statusCode = 404;
      err.code = 'PATIENT_NOT_FOUND';
      throw err;
    }

    const todayStr = this.getLocalDateString();
    
    // Check if patient already has an active ticket in this room today
    const existingActiveTicket = await PhieuKham.findOne({
      where: {
        ma_benh_nhan: maBenhNhan,
        ma_phong: maPhong,
        ngay_kham: todayStr,
        trang_thai: ['CHO_DO_SINH_HIEU', 'CHO_BAC_SI', 'DANG_KHAM', 'CHO_CLS', 'CHO_THANH_TOAN']
      }
    });

    if (existingActiveTicket) {
      const err = new Error('Bệnh nhân đã có phiếu khám đang hoạt động tại phòng này hôm nay.');
      err.statusCode = 400;
      err.code = 'DUPLICATE_ACTIVE_TICKET';
      throw err;
    }

    // 3. Issue ticket with retry mechanism for concurrent STT conflicts
    let retries = 3;
    while (retries > 0) {
      try {
        // Step 1: Find MAX STT in this room today
        const maxSTT = await PhieuKham.max('so_thu_tu', {
          where: { ngay_kham: todayStr, ma_phong: maPhong }
        }) || 0;
        
        const nextSTT = maxSTT + 1;
        logger.info(`Issuing ticket for Patient ${maBenhNhan} at Room ${maPhong}. Next STT: ${nextSTT}`);

        // Step 2: Create PhieuKham & LuotKham in a managed transaction
        const result = await sequelize.transaction(async (t) => {
          const phieuKham = await PhieuKham.create({
            so_thu_tu: nextSTT,
            ngay_kham: todayStr,
            trang_thai: 'CHO_DO_SINH_HIEU',
            ma_benh_nhan: maBenhNhan,
            ma_phong: maPhong,
            ma_nhan_vien_tao: maNhanVien
          }, { transaction: t });

          const luotKham = await LuotKham.create({
            ma_benh_nhan: maBenhNhan,
            ma_phong: maPhong,
            ma_phieu: phieuKham.ma_phieu,
            trang_thai: 'CHO_DO',
            thoi_gian_kham: null
          }, { transaction: t });

          return { phieuKham, luotKham };
        });

        // Fetch complete objects to return
        const fullTicket = await PhieuKham.findByPk(result.phieuKham.ma_phieu, {
          include: [
            { model: BenhNhan, as: 'benhNhan', attributes: ['ma_benh_nhan', 'ho_ten', 'so_dien_thoai'] },
            { model: PhongKham, as: 'phongKham', attributes: ['ma_phong', 'ten_phong'] }
          ]
        });

        return fullTicket;
      } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          logger.warn(`STT unique constraint collision on Room ${maPhong}. Retrying...`);
          retries--;
          if (retries === 0) throw error;
          continue;
        }
        throw error;
      }
    }
  }

  async callPatient(maPhieu, maBacSi) {
    const phieuKham = await PhieuKham.findByPk(maPhieu, {
      include: [
        { model: BenhNhan, as: 'benhNhan', attributes: ['ma_benh_nhan', 'ho_ten'] },
        { model: PhongKham, as: 'phongKham', attributes: ['ma_phong', 'ten_phong'] }
      ]
    });

    if (!phieuKham) {
      const err = new Error('Phiếu khám không tồn tại.');
      err.statusCode = 404;
      err.code = 'TICKET_NOT_FOUND';
      throw err;
    }

    if (phieuKham.trang_thai === 'HOAN_TAT' || phieuKham.trang_thai === 'HUY') {
      const err = new Error('Phiếu khám đã hoàn tất hoặc bị hủy.');
      err.statusCode = 400;
      err.code = 'INVALID_TICKET_STATUS';
      throw err;
    }

    const luotKham = await LuotKham.findOne({
      where: { ma_phieu: maPhieu }
    });

    if (!luotKham) {
      const err = new Error('Lượt khám không tồn tại cho phiếu khám này.');
      err.statusCode = 404;
      err.code = 'VISIT_NOT_FOUND';
      throw err;
    }

    // Recall mechanism:
    // If already in DANG_KHAM state, we do NOT update thoi_gian_kham
    if (phieuKham.trang_thai === 'DANG_KHAM' || luotKham.trang_thai === 'DANG_KHAM') {
      logger.info(`Doctor ${maBacSi} recalled patient on PhieuKham ${maPhieu}`);
      return {
        ma_phieu: phieuKham.ma_phieu,
        so_thu_tu: phieuKham.so_thu_tu,
        trang_thai: 'DANG_KHAM',
        ma_luot_kham: luotKham.ma_luot_kham,
        ten_phong: phieuKham.phongKham?.ten_phong || '',
        ma_phong: phieuKham.ma_phong,
        ho_ten: phieuKham.benhNhan?.ho_ten || ''
      };
    }

    // First time call -> Update DB inside transaction
    await sequelize.transaction(async (t) => {
      await phieuKham.update({ trang_thai: 'DANG_KHAM' }, { transaction: t });
      await luotKham.update({
        trang_thai: 'DANG_KHAM',
        ma_bac_si: maBacSi,
        thoi_gian_kham: new Date()
      }, { transaction: t });
    });

    logger.info(`Doctor ${maBacSi} called patient on PhieuKham ${maPhieu} first time`);
    
    return {
      ma_phieu: phieuKham.ma_phieu,
      so_thu_tu: phieuKham.so_thu_tu,
      trang_thai: 'DANG_KHAM',
      ma_luot_kham: luotKham.ma_luot_kham,
      ten_phong: phieuKham.phongKham?.ten_phong || '',
      ma_phong: phieuKham.ma_phong,
      ho_ten: phieuKham.benhNhan?.ho_ten || ''
    };
  }

  async getQueueList(maPhong = null, dateStr = null) {
    const todayStr = dateStr || this.getLocalDateString();
    const whereClause = {
      ngay_kham: todayStr,
      trang_thai: ['CHO_DO_SINH_HIEU', 'CHO_BAC_SI', 'DANG_KHAM', 'CHO_CLS', 'CHO_THANH_TOAN']
    };

    if (maPhong) {
      whereClause.ma_phong = maPhong;
    }

    logger.info(`Fetching queue list for date: ${todayStr}, room: ${maPhong || 'ALL'}`);

    return await PhieuKham.findAll({
      where: whereClause,
      include: [
        { model: BenhNhan, as: 'benhNhan', attributes: ['ma_benh_nhan', 'ho_ten', 'so_dien_thoai', 'gioi_tinh', 'ngay_sinh'] },
        { model: PhongKham, as: 'phongKham', attributes: ['ma_phong', 'ten_phong'] },
        {
          model: LuotKham,
          as: 'luotKhams',
          attributes: ['ma_luot_kham', 'trang_thai', 'thoi_gian_kham'],
          include: [
            { model: SinhHieu, as: 'sinhHieu' }
          ]
        }
      ],
      order: [['so_thu_tu', 'ASC']]
    });
  }

  async getQueueStats(dateStr = null) {
    const todayStr = dateStr || this.getLocalDateString();
    
    logger.info(`Fetching queue stats for date: ${todayStr}`);

    const tickets = await PhieuKham.findAll({
      where: { ngay_kham: todayStr }
    });

    let totalRegistered = 0;
    let waitingVitals = 0;
    let waitingDoctor = 0;
    let examining = 0;
    let finished = 0;

    tickets.forEach(ticket => {
      if (ticket.trang_thai !== 'HUY') {
        totalRegistered++;
      }
      if (ticket.trang_thai === 'CHO_DO_SINH_HIEU') {
        waitingVitals++;
      } else if (ticket.trang_thai === 'CHO_BAC_SI') {
        waitingDoctor++;
      } else if (ticket.trang_thai === 'DANG_KHAM') {
        examining++;
      } else if (ticket.trang_thai === 'HOAN_TAT') {
        finished++;
      }
    });

    return {
      totalRegistered,
      waitingVitals,
      waitingDoctor,
      examining,
      finished
    };
  }

  async getQueueDisplayData() {
    const todayStr = this.getLocalDateString();
    
    // 1. Get all active clinic rooms
    const rooms = await PhongKham.findAll({
      where: { trang_thai: 'HOAT_DONG' },
      attributes: ['ma_phong', 'ten_phong', 'chuyen_khoa']
    });

    // 2. Get all active tickets for today
    const tickets = await PhieuKham.findAll({
      where: {
        ngay_kham: todayStr,
        trang_thai: ['CHO_DO_SINH_HIEU', 'CHO_BAC_SI', 'DANG_KHAM']
      },
      include: [
        { model: BenhNhan, as: 'benhNhan', attributes: ['ho_ten'] }
      ],
      order: [['so_thu_tu', 'ASC']]
    });

    // 3. Map tickets to each room
    return rooms.map(room => {
      const roomTickets = tickets.filter(t => t.ma_phong === room.ma_phong);
      
      const dangKham = roomTickets.find(t => t.trang_thai === 'DANG_KHAM') || null;
      const hangCho = roomTickets.filter(t => t.trang_thai === 'CHO_BAC_SI' || t.trang_thai === 'CHO_DO_SINH_HIEU');

      return {
        ma_phong: room.ma_phong,
        ten_phong: room.ten_phong,
        chuyen_khoa: room.chuyen_khoa,
        dang_kham: dangKham ? {
          ma_phieu: dangKham.ma_phieu,
          so_thu_tu: dangKham.so_thu_tu,
          ho_ten: dangKham.benhNhan ? dangKham.benhNhan.ho_ten : ''
        } : null,
        hang_cho: hangCho.map(t => ({
          ma_phieu: t.ma_phieu,
          so_thu_tu: t.so_thu_tu,
          ho_ten: t.benhNhan ? t.benhNhan.ho_ten : ''
        }))
      };
    });
  }

  async getActiveRooms() {
    return await PhongKham.findAll({
      where: { trang_thai: 'HOAT_DONG' },
      attributes: ['ma_phong', 'ten_phong', 'chuyen_khoa']
    });
  }
}

module.exports = new QueueService();
