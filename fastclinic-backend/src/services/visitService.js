const { sequelize, LuotKham, PhieuKham, BenhNhan, PhongKham, SinhHieu, DichVuCLS, KetQuaCLS, DonThuoc, ChiTietDonThuoc, Thuoc, PhieuThu } = require('../models');
const logger = require('../utils/logger');

class VisitService {
  getLocalDateString() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  }

  async getWaitingList(role, maPhong = null) {
    const todayStr = this.getLocalDateString();
    
    // DIEU_DUONG waits for vitals ('CHO_DO')
    // BAC_SI waits for examination ('CHO_BAC_SI')
    // NV_CLS waits for lab results ('CHO_CLS')
    // THU_NGAN waits for payment ('CHO_THANH_TOAN')
    const roleStatusMap = {
      DIEU_DUONG: 'CHO_DO',
      NV_CLS: 'CHO_CLS',
      THU_NGAN: 'CHO_THANH_TOAN',
      BAC_SI: 'CHO_BAC_SI'
    };
    const status = roleStatusMap[role] || 'CHO_BAC_SI';
    
    const whereClause = {
      trang_thai: status
    };
    
    if (maPhong) {
      whereClause.ma_phong = maPhong;
    }

    logger.info(`Fetching waiting list for role: ${role}, room: ${maPhong || 'ALL'}, date: ${todayStr}`);

    return await LuotKham.findAll({
      where: whereClause,
      include: [
        {
          model: PhieuKham,
          as: 'phieuKham',
          where: { ngay_kham: todayStr },
          attributes: ['ma_phieu', 'so_thu_tu', 'ngay_kham', 'trang_thai']
        },
        {
          model: BenhNhan,
          as: 'benhNhan',
          attributes: ['ma_benh_nhan', 'ho_ten', 'so_dien_thoai', 'gioi_tinh', 'ngay_sinh']
        },
        {
          model: PhongKham,
          as: 'phongKham',
          attributes: ['ma_phong', 'ten_phong', 'chuyen_khoa']
        },
        {
          model: KetQuaCLS,
          as: 'ketQuaCLSs',
          include: [{ model: DichVuCLS, as: 'dichVuCLS' }]
        }
      ],
      order: [
        [{ model: PhieuKham, as: 'phieuKham' }, 'so_thu_tu', 'ASC']
      ]
    });
  }

  async recordVitalSigns(maLuotKham, vitalSignsData, maDieuDuong) {
    // 1. Find the active visit
    const visit = await LuotKham.findByPk(maLuotKham, {
      include: [{ model: PhieuKham, as: 'phieuKham' }]
    });

    if (!visit) {
      const err = new Error('Lượt khám không tồn tại.');
      err.statusCode = 404;
      err.code = 'VISIT_NOT_FOUND';
      throw err;
    }

    if (visit.trang_thai !== 'CHO_DO') {
      const err = new Error('Lượt khám không ở trạng thái chờ đo sinh hiệu.');
      err.statusCode = 400;
      err.code = 'INVALID_VISIT_STATUS';
      throw err;
    }

    const { huyetAp, nhipTim, nhietDo, chieuCao, canNang } = vitalSignsData;

    // 2. Perform transaction to save vital signs and update states
    const result = await sequelize.transaction(async (t) => {
      // Create SinhHieu record
      const sinhHieu = await SinhHieu.create({
        huyet_ap: huyetAp,
        nhip_tim: nhipTim,
        nhiet_do: nhietDo,
        chieu_cao: chieuCao,
        can_nang: canNang,
        ma_luot_kham: maLuotKham,
        ma_dieu_duong: maDieuDuong
      }, { transaction: t });

      // Update LuotKham state -> CHO_BAC_SI
      await visit.update({ trang_thai: 'CHO_BAC_SI' }, { transaction: t });

      // Update PhieuKham state -> CHO_BAC_SI
      if (visit.phieuKham) {
        await visit.phieuKham.update({ trang_thai: 'CHO_BAC_SI' }, { transaction: t });
      }

      return sinhHieu;
    });

    logger.info(`Recorded vital signs for LuotKham ${maLuotKham} by Nurse ${maDieuDuong}`);
    return result;
  }

  async getVisitDetail(maLuotKham) {
    const visit = await LuotKham.findByPk(maLuotKham, {
      include: [
        {
          model: BenhNhan,
          as: 'benhNhan',
          attributes: ['ma_benh_nhan', 'ho_ten', 'so_dien_thoai', 'cccd', 'ngay_sinh', 'gioi_tinh', 'dia_chi', 'tien_su_di_ung']
        },
        {
          model: SinhHieu,
          as: 'sinhHieu'
        },
        {
          model: PhongKham,
          as: 'phongKham',
          attributes: ['ma_phong', 'ten_phong', 'chuyen_khoa']
        },
        {
          model: PhieuKham,
          as: 'phieuKham',
          attributes: ['ma_phieu', 'so_thu_tu', 'ngay_kham', 'trang_thai']
        },
        {
          model: KetQuaCLS,
          as: 'ketQuaCLSs',
          include: [{ model: DichVuCLS, as: 'dichVuCLS' }]
        },
        {
          model: DonThuoc,
          as: 'donThuoc',
          include: [{
            model: ChiTietDonThuoc,
            as: 'chiTietDonThuocs',
            include: [{ model: Thuoc, as: 'thuoc' }]
          }]
        }
      ]
    });

    if (!visit) {
      const err = new Error('Lượt khám không tồn tại.');
      err.statusCode = 404;
      err.code = 'VISIT_NOT_FOUND';
      throw err;
    }

    // Query 3 most recent historical visits of the same patient
    const history = await LuotKham.findAll({
      where: {
        ma_benh_nhan: visit.ma_benh_nhan,
        ma_luot_kham: { [sequelize.Sequelize.Op.ne]: maLuotKham } // exclude current one
      },
      include: [
        { model: PhongKham, as: 'phongKham', attributes: ['ten_phong'] },
        { model: SinhHieu, as: 'sinhHieu' }
      ],
      order: [['ma_luot_kham', 'DESC']], // sort by ma_luot_kham descending to get latest
      limit: 3
    });

    return {
      visit: {
        ...visit.toJSON(),
        maBenhNhan: visit.ma_benh_nhan
      },
      history
    };
  }

  async updateExamination(maLuotKham, examData) {
    const visit = await LuotKham.findByPk(maLuotKham, {
      include: [{ model: PhieuKham, as: 'phieuKham' }]
    });

    if (!visit) {
      const err = new Error('Lượt khám không tồn tại.');
      err.statusCode = 404;
      err.code = 'VISIT_NOT_FOUND';
      throw err;
    }

    const { trieuChung, chanDoan, ghiChu, trangThai } = examData;

    await sequelize.transaction(async (t) => {
      const updateData = {
        trieu_chung: trieuChung,
        chan_doan: chanDoan,
        ghi_chu: ghiChu
      };

      // If status is passed (e.g. CHO_CLS or HOAN_TAT), update it
      if (trangThai) {
        updateData.trang_thai = trangThai;
        
        // Also update the PhieuKham's state if applicable
        if (visit.phieuKham) {
          await visit.phieuKham.update({ trang_thai: trangThai }, { transaction: t });
        }
      }

      await visit.update(updateData, { transaction: t });
    });

    return await LuotKham.findByPk(maLuotKham, {
      include: [
        { model: BenhNhan, as: 'benhNhan', attributes: ['ho_ten'] },
        { model: SinhHieu, as: 'sinhHieu' }
      ]
    });
  }

  async getClsServices() {
    return await DichVuCLS.findAll({
      where: { is_active: true },
      order: [['ten_dich_vu', 'ASC']]
    });
  }

  async createLabOrders(maLuotKham, maDichVus) {
    // 1. Find the active visit
    const visit = await LuotKham.findByPk(maLuotKham, {
      include: [{ model: PhieuKham, as: 'phieuKham' }]
    });

    if (!visit) {
      const err = new Error('Lượt khám không tồn tại.');
      err.statusCode = 404;
      err.code = 'VISIT_NOT_FOUND';
      throw err;
    }

    if (!maDichVus || maDichVus.length === 0) {
      const err = new Error('Danh sách dịch vụ chỉ định không được trống.');
      err.statusCode = 400;
      err.code = 'EMPTY_LAB_ORDERS';
      throw err;
    }

    // 2. Perform transaction to create KetQuaCLS and update states
    const results = await sequelize.transaction(async (t) => {
      const createdOrders = [];
      for (const maDichVu of maDichVus) {
        const dichVu = await DichVuCLS.findOne({
          where: { ma_dich_vu: maDichVu, is_active: true },
          transaction: t
        });

        if (!dichVu) {
          const err = new Error(`Dịch vụ cận lâm sàng ID ${maDichVu} không tồn tại hoặc đã bị ngừng hoạt động.`);
          err.statusCode = 400;
          err.code = 'SERVICE_NOT_FOUND';
          throw err;
        }

        const order = await KetQuaCLS.create({
          ma_luot_kham: maLuotKham,
          ma_dich_vu: maDichVu,
          loai_cls: dichVu.ten_dich_vu,
          noi_dung: null,
          file_dinh_kem: null,
          ma_nhan_vien_nhap: null,
          thoi_gian_nhap: new Date()
        }, { transaction: t });

        createdOrders.push(order);
      }

      // Update states to CHO_CLS
      await visit.update({ trang_thai: 'CHO_CLS' }, { transaction: t });
      if (visit.phieuKham) {
        await visit.phieuKham.update({ trang_thai: 'CHO_CLS' }, { transaction: t });
      }

      return createdOrders;
    });

    logger.info(`Created ${results.length} lab orders for LuotKham ${maLuotKham}`);
    return results;
  }

  async updateLabResult(maKetQua, resultData, fileInfo, maNhanVienNhap) {
    const { noiDung } = resultData;
    
    if (!noiDung || !noiDung.trim()) {
      const err = new Error('Nội dung kết quả cận lâm sàng không được để trống.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    
    // Find the lab order
    const order = await KetQuaCLS.findByPk(maKetQua, {
      include: [{ 
        model: LuotKham, 
        as: 'luotKham',
        include: [{ model: PhieuKham, as: 'phieuKham' }]
      }]
    });

    if (!order) {
      const err = new Error('Kết quả cận lâm sàng không tồn tại.');
      err.statusCode = 404;
      err.code = 'LAB_RESULT_NOT_FOUND';
      throw err;
    }

    const updateData = {
      noi_dung: noiDung,
      ma_nhan_vien_nhap: maNhanVienNhap,
      thoi_gian_nhap: new Date()
    };

    if (fileInfo) {
      // Relative path for client serving
      updateData.file_dinh_kem = `uploads/${fileInfo.filename}`;
    }

    await sequelize.transaction(async (t) => {
      await order.update(updateData, { transaction: t });

      // Check if all lab orders for this visit are completed
      const pendingCount = await KetQuaCLS.count({
        where: {
          ma_luot_kham: order.ma_luot_kham,
          noi_dung: null,
          file_dinh_kem: null
        },
        transaction: t
      });

      // If all orders are completed, transition patient back to CHO_BAC_SI
      if (pendingCount === 0 && order.luotKham) {
        await order.luotKham.update({ trang_thai: 'CHO_BAC_SI' }, { transaction: t });
        if (order.luotKham.phieuKham) {
          await order.luotKham.phieuKham.update({ trang_thai: 'CHO_BAC_SI' }, { transaction: t });
        }
        logger.info(`Visit ${order.ma_luot_kham} returned to CHO_BAC_SI (all CLS completed)`);
      }
    });

    return await KetQuaCLS.findByPk(maKetQua, {
      include: [
        { model: DichVuCLS, as: 'dichVuCLS' },
        { 
          model: LuotKham, 
          as: 'luotKham',
          include: [
            { model: BenhNhan, as: 'benhNhan', attributes: ['ho_ten'] },
            { model: PhongKham, as: 'phongKham', attributes: ['ma_phong', 'ten_phong'] }
          ]
        }
      ]
    });
  }

  async createPrescription(maLuotKham, prescriptionData) {
    const visit = await LuotKham.findByPk(maLuotKham, {
      include: [{ model: PhieuKham, as: 'phieuKham' }]
    });

    if (!visit) {
      const err = new Error('Lượt khám không tồn tại.');
      err.statusCode = 404;
      err.code = 'VISIT_NOT_FOUND';
      throw err;
    }

    if (!prescriptionData.thuocs || prescriptionData.thuocs.length === 0) {
      const err = new Error('Đơn thuốc phải chứa ít nhất một loại thuốc.');
      err.statusCode = 400;
      err.code = 'EMPTY_PRESCRIPTION';
      throw err;
    }

    const insufficientStock = [];
    const warnings = [];
    const processedItems = [];
    let tongTienThuoc = 0;

    for (const item of prescriptionData.thuocs) {
      const { maThuoc, soLuong, lieuDung, cachDung } = item;
      const medicine = await Thuoc.findOne({
        where: { ma_thuoc: maThuoc, is_active: true }
      });

      if (!medicine) {
        const err = new Error(`Thuốc với ID ${maThuoc} không tồn tại hoặc đã ngừng hoạt động.`);
        err.statusCode = 400;
        err.code = 'MEDICINE_NOT_FOUND';
        throw err;
      }

      if (medicine.so_luong_ton < soLuong) {
        insufficientStock.push({
          maThuoc: medicine.ma_thuoc,
          tenThuoc: medicine.ten_thuoc,
          soLuongTon: medicine.so_luong_ton,
          soLuongYeuCau: soLuong
        });
      }

      // BR-014: Expiry warning (< 7 days)
      if (medicine.han_dung) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiryDate = new Date(medicine.han_dung);
        expiryDate.setHours(0, 0, 0, 0);
        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 7) {
          warnings.push(`Thuốc ${medicine.ten_thuoc} sắp hết hạn (còn ${diffDays} ngày).`);
        }
      }

      const donGia = parseFloat(medicine.gia);
      const thanhTien = donGia * soLuong;
      tongTienThuoc += thanhTien;

      processedItems.push({
        ma_thuoc: medicine.ma_thuoc,
        so_luong: soLuong,
        lieu_dung: lieuDung || null,
        cach_dung: cachDung || null,
        don_gia: donGia,
        thanh_tien: thanhTien
      });
    }

    if (insufficientStock.length > 0) {
      const err = new Error('Một số thuốc không đủ số lượng tồn kho.');
      err.statusCode = 400;
      err.code = 'INSUFFICIENT_STOCK';
      err.details = insufficientStock;
      throw err;
    }

    // Execute in transaction
    const result = await sequelize.transaction(async (t) => {
      // Check if a prescription already exists for this visit
      const existingPrescription = await DonThuoc.findOne({
        where: { ma_luot_kham: maLuotKham },
        transaction: t
      });

      if (existingPrescription) {
        await ChiTietDonThuoc.destroy({
          where: { ma_don_thuoc: existingPrescription.ma_don_thuoc },
          transaction: t
        });
        await existingPrescription.destroy({ transaction: t });
      }

      // Create DonThuoc
      const donThuoc = await DonThuoc.create({
        ma_luot_kham: maLuotKham,
        ghi_chu: prescriptionData.ghiChu || null,
        tong_tien_thuoc: tongTienThuoc,
        ngay_ke: new Date()
      }, { transaction: t });

      // Create ChiTietDonThuoc items
      for (const item of processedItems) {
        await ChiTietDonThuoc.create({
          ...item,
          ma_don_thuoc: donThuoc.ma_don_thuoc
        }, { transaction: t });
      }

      // Update LuotKham and PhieuKham status to CHO_THANH_TOAN
      await visit.update({ trang_thai: 'CHO_THANH_TOAN' }, { transaction: t });
      if (visit.phieuKham) {
        await visit.phieuKham.update({ trang_thai: 'CHO_THANH_TOAN' }, { transaction: t });
      }

      return donThuoc;
    });

    logger.info(`Saved prescription for LuotKham ${maLuotKham}. Total cost: ${tongTienThuoc}`);

    // Fetch complete saved prescription with details and warnings
    const fullPrescription = await DonThuoc.findByPk(result.ma_don_thuoc, {
      include: [
        {
          model: ChiTietDonThuoc,
          as: 'chiTietDonThuocs',
          include: [{ model: Thuoc, as: 'thuoc' }]
        }
      ]
    });

    return {
      prescription: fullPrescription,
      warnings
    };
  }

  async checkout(maLuotKham, checkoutData, maThuNgan) {
    const visit = await LuotKham.findByPk(maLuotKham, {
      include: [
        { model: PhieuKham, as: 'phieuKham' },
        {
          model: DonThuoc,
          as: 'donThuoc',
          include: [{
            model: ChiTietDonThuoc,
            as: 'chiTietDonThuocs',
            include: [{ model: Thuoc, as: 'thuoc' }]
          }]
        },
        {
          model: KetQuaCLS,
          as: 'ketQuaCLSs',
          include: [{ model: DichVuCLS, as: 'dichVuCLS' }]
        }
      ]
    });

    if (!visit) {
      const err = new Error('Lượt khám không tồn tại.');
      err.statusCode = 404;
      err.code = 'VISIT_NOT_FOUND';
      throw err;
    }

    if (visit.trang_thai !== 'CHO_THANH_TOAN') {
      const err = new Error('Lượt khám không ở trạng thái chờ thanh toán.');
      err.statusCode = 400;
      err.code = 'INVALID_VISIT_STATUS';
      throw err;
    }

    // Calculate totals
    const tienKham = parseFloat(checkoutData.tienKham !== undefined ? checkoutData.tienKham : 150000);
    
    const tongPhiCls = (visit.ketQuaCLSs || [])
      .reduce((sum, kq) => sum + parseFloat(kq.dichVuCLS?.gia || 0), 0);

    const tongTienThuoc = visit.donThuoc ? parseFloat(visit.donThuoc.tong_tien_thuoc) : 0;
    const tongTien = tienKham + tongPhiCls + tongTienThuoc;

    const processedMedicineDeductions = (visit.donThuoc?.chiTietDonThuocs || []).map(ct => {
      if (!ct.thuoc) {
        const err = new Error(`Không tìm thấy thông tin chi tiết của thuốc ID ${ct.ma_thuoc}.`);
        err.statusCode = 400;
        err.code = 'MEDICINE_NOT_FOUND';
        throw err;
      }
      return {
        maThuoc: ct.ma_thuoc,
        soLuong: ct.so_luong,
        tenThuoc: ct.thuoc.ten_thuoc
      };
    });

    // Start database transaction
    const resultPhieuThu = await sequelize.transaction(async (t) => {
      // 1. Deduct stocks and double check
      for (const item of processedMedicineDeductions) {
        const medicine = await Thuoc.findByPk(item.maThuoc, {
          transaction: t,
          lock: true // Acquire lock for writing to prevent race conditions
        });

        if (!medicine || !medicine.is_active) {
          const err = new Error(`Thuốc ${item.tenThuoc} không tồn tại hoặc đã ngừng hoạt động.`);
          err.statusCode = 400;
          err.code = 'MEDICINE_NOT_FOUND';
          throw err;
        }

        if (medicine.so_luong_ton < item.soLuong) {
          const err = new Error(`Thuốc ${item.tenThuoc} không đủ tồn kho để xuất. Tồn hiện tại: ${medicine.so_luong_ton}, yêu cầu: ${item.soLuong}`);
          err.statusCode = 400;
          err.code = 'INSUFFICIENT_STOCK';
          err.details = [{
            maThuoc: medicine.ma_thuoc,
            tenThuoc: medicine.ten_thuoc,
            soLuongTon: medicine.so_luong_ton,
            soLuongYeuCau: item.soLuong
          }];
          throw err;
        }

        // Deduct stock
        await medicine.update({
          so_luong_ton: medicine.so_luong_ton - item.soLuong
        }, { transaction: t });
      }

      // 2. Create PhieuThu record
      const phieuThu = await PhieuThu.create({
        tien_kham: tienKham,
        tong_phi_cls: tongPhiCls,
        tong_tien_thuoc: tongTienThuoc,
        tong_tien: tongTien,
        phuong_thuc_tt: checkoutData.phuongThucTT,
        trang_thai: 'DA_THANH_TOAN',
        thoi_gian_tt: new Date(),
        ma_luot_kham: maLuotKham,
        ma_thu_ngan: maThuNgan
      }, { transaction: t });

      // 3. Update LuotKham and PhieuKham status to HOAN_TAT
      await visit.update({ trang_thai: 'HOAN_TAT' }, { transaction: t });
      if (visit.phieuKham) {
        await visit.phieuKham.update({ trang_thai: 'HOAN_TAT' }, { transaction: t });
      }

      return phieuThu;
    });

    logger.info(`Checkout successfully for LuotKham ${maLuotKham} by Cashier ${maThuNgan}. PhieuThu ID: ${resultPhieuThu.ma_phieu_thu}`);
    
    // Fetch full checkout details to return
    return await PhieuThu.findByPk(resultPhieuThu.ma_phieu_thu, {
      include: [
        {
          model: LuotKham,
          as: 'luotKham',
          include: [
            { model: BenhNhan, as: 'benhNhan' },
            { model: PhieuKham, as: 'phieuKham' },
            {
              model: DonThuoc,
              as: 'donThuoc',
              include: [{
                model: ChiTietDonThuoc,
                as: 'chiTietDonThuocs',
                include: [{ model: Thuoc, as: 'thuoc' }]
              }]
            },
            {
              model: KetQuaCLS,
              as: 'ketQuaCLSs',
              include: [{ model: DichVuCLS, as: 'dichVuCLS' }]
            }
          ]
        }
      ]
    });
  }

  async getTodayPayments() {
    // Construct local range bounds in Vietnam time
    // Filter payments created on the current calendar date
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return await PhieuThu.findAll({
      where: {
        thoi_gian_tt: {
          [sequelize.Sequelize.Op.between]: [start, end]
        }
      },
      include: [
        {
          model: LuotKham,
          as: 'luotKham',
          include: [
            { model: BenhNhan, as: 'benhNhan' },
            { model: PhieuKham, as: 'phieuKham' }
          ]
        }
      ],
      order: [['thoi_gian_tt', 'DESC']]
    });
  }
}

module.exports = new VisitService();
