const { Thuoc } = require('../models');
const { Op } = require('sequelize');

class MedicineService {
  async searchMedicines(q) {
    if (!q || q.trim().length < 2) {
      return [];
    }

    const keyword = q.trim();
    return await Thuoc.findAll({
      where: {
        is_active: true,
        [Op.or]: [
          { ten_thuoc: { [Op.like]: `%${keyword}%` } },
          { hoat_chat: { [Op.like]: `%${keyword}%` } }
        ]
      },
      order: [['ten_thuoc', 'ASC']]
    });
  }

  async getMedicinesList({ page = 1, limit = 20, search = '' }) {
    const offset = (page - 1) * limit;
    const whereClause = {};

    if (search && search.trim()) {
      const keyword = search.trim();
      whereClause[Op.or] = [
        { ten_thuoc: { [Op.like]: `%${keyword}%` } },
        { hoat_chat: { [Op.like]: `%${keyword}%` } }
      ];
    }

    const { count, rows } = await Thuoc.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['ten_thuoc', 'ASC']]
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page, 10),
      medicines: rows
    };
  }

  async createMedicine(data) {
    return await Thuoc.create({
      ten_thuoc: data.ten_thuoc,
      hoat_chat: data.hoat_chat || null,
      don_vi: data.don_vi,
      gia: data.gia,
      so_luong_ton: data.so_luong_ton !== undefined ? data.so_luong_ton : 0,
      han_dung: data.han_dung || null,
      is_active: data.is_active !== undefined ? data.is_active : true
    });
  }

  async updateMedicine(id, data) {
    const medicine = await Thuoc.findByPk(id);
    if (!medicine) {
      const err = new Error('Thuốc không tồn tại.');
      err.statusCode = 404;
      err.code = 'MEDICINE_NOT_FOUND';
      throw err;
    }

    return await medicine.update({
      ten_thuoc: data.ten_thuoc !== undefined ? data.ten_thuoc : medicine.ten_thuoc,
      hoat_chat: data.hoat_chat !== undefined ? data.hoat_chat : medicine.hoat_chat,
      don_vi: data.don_vi !== undefined ? data.don_vi : medicine.don_vi,
      gia: data.gia !== undefined ? data.gia : medicine.gia,
      so_luong_ton: data.so_luong_ton !== undefined ? data.so_luong_ton : medicine.so_luong_ton,
      han_dung: data.han_dung !== undefined ? data.han_dung : medicine.han_dung,
      is_active: data.is_active !== undefined ? data.is_active : medicine.is_active
    });
  }

  async deleteMedicine(id) {
    const medicine = await Thuoc.findByPk(id);
    if (!medicine) {
      const err = new Error('Thuốc không tồn tại.');
      err.statusCode = 404;
      err.code = 'MEDICINE_NOT_FOUND';
      throw err;
    }

    return await medicine.update({ is_active: false });
  }

  getLocalDateStringPlus30() {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  }

  async getLowStockAlerts() {
    const limitDateStr = this.getLocalDateStringPlus30();
    return await Thuoc.findAll({
      where: {
        is_active: true,
        [Op.or]: [
          { so_luong_ton: { [Op.lte]: 10 } },
          { han_dung: { [Op.lte]: limitDateStr } }
        ]
      },
      order: [
        ['so_luong_ton', 'ASC'],
        ['han_dung', 'ASC']
      ]
    });
  }
}

module.exports = new MedicineService();
