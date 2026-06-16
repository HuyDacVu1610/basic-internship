const { sequelize } = require('../models');

class ReportService {
  async getPatientsReport(from, to) {
    const sql = `
      SELECT 
        ngay_kham AS date,
        COUNT(ma_phieu) AS count
      FROM phieu_kham
      WHERE ngay_kham BETWEEN :from AND :to
        AND trang_thai != 'HUY'
      GROUP BY ngay_kham
      ORDER BY ngay_kham ASC
    `;
    
    const results = await sequelize.query(sql, {
      replacements: { from, to },
      type: sequelize.QueryTypes.SELECT
    });
    
    return results;
  }

  async getRevenueReport(from, to) {
    const sqlBreakdown = `
      SELECT 
        DATE(thoi_gian_tt) AS date,
        SUM(tien_kham) AS tienKham,
        SUM(tong_phi_cls) AS tongPhiCls,
        SUM(tong_tien_thuoc) AS tongTienThuoc,
        SUM(tong_tien) AS tongTien
      FROM phieu_thu
      WHERE trang_thai = 'DA_THANH_TOAN'
        AND DATE(thoi_gian_tt) BETWEEN :from AND :to
      GROUP BY DATE(thoi_gian_tt)
      ORDER BY DATE(thoi_gian_tt) ASC
    `;

    const sqlOverall = `
      SELECT 
        SUM(tien_kham) AS totalTienKham,
        SUM(tong_phi_cls) AS totalTongPhiCls,
        SUM(tong_tien_thuoc) AS totalTongTienThuoc,
        SUM(tong_tien) AS totalRevenue,
        COUNT(ma_phieu_thu) AS totalInvoices
      FROM phieu_thu
      WHERE trang_thai = 'DA_THANH_TOAN'
        AND DATE(thoi_gian_tt) BETWEEN :from AND :to
    `;

    const sqlPaymentMethods = `
      SELECT 
        phuong_thuc_tt AS method,
        COUNT(*) AS count,
        SUM(tong_tien) AS amount
      FROM phieu_thu
      WHERE trang_thai = 'DA_THANH_TOAN'
        AND DATE(thoi_gian_tt) BETWEEN :from AND :to
      GROUP BY phuong_thuc_tt
    `;

    const [breakdown, overallRaw, paymentMethods] = await Promise.all([
      sequelize.query(sqlBreakdown, {
        replacements: { from, to },
        type: sequelize.QueryTypes.SELECT
      }),
      sequelize.query(sqlOverall, {
        replacements: { from, to },
        type: sequelize.QueryTypes.SELECT
      }),
      sequelize.query(sqlPaymentMethods, {
        replacements: { from, to },
        type: sequelize.QueryTypes.SELECT
      })
    ]);

    const overall = overallRaw[0] || {};

    return {
      totalRevenue: overall.totalRevenue ? parseFloat(overall.totalRevenue) : 0,
      totalTienKham: overall.totalTienKham ? parseFloat(overall.totalTienKham) : 0,
      totalTongPhiCls: overall.totalTongPhiCls ? parseFloat(overall.totalTongPhiCls) : 0,
      totalTongTienThuoc: overall.totalTongTienThuoc ? parseFloat(overall.totalTongTienThuoc) : 0,
      totalInvoices: overall.totalInvoices ? parseInt(overall.totalInvoices, 10) : 0,
      breakdown: breakdown.map(row => ({
        date: row.date,
        tienKham: parseFloat(row.tienKham || 0),
        tongPhiCls: parseFloat(row.tongPhiCls || 0),
        tongTienThuoc: parseFloat(row.tongTienThuoc || 0),
        tongTien: parseFloat(row.tongTien || 0)
      })),
      paymentMethods: paymentMethods.map(row => ({
        method: row.method || 'OTHER',
        count: parseInt(row.count || 0, 10),
        amount: parseFloat(row.amount || 0)
      }))
    };
  }

  async getMedicinesReport(from, to) {
    const sql = `
      SELECT 
        t.ma_thuoc AS maThuoc,
        t.ten_thuoc AS tenThuoc,
        t.hoat_chat AS hoatChat,
        t.don_vi AS donVi,
        SUM(ct.so_luong) AS totalQuantity,
        SUM(ct.thanh_tien) AS totalRevenue
      FROM chi_tiet_don_thuoc ct
      JOIN don_thuoc d ON ct.ma_don_thuoc = d.ma_don_thuoc
      JOIN luot_kham l ON d.ma_luot_kham = l.ma_luot_kham
      JOIN phieu_thu pt ON l.ma_luot_kham = pt.ma_luot_kham
      JOIN thuoc t ON ct.ma_thuoc = t.ma_thuoc
      WHERE pt.trang_thai = 'DA_THANH_TOAN'
        AND DATE(pt.thoi_gian_tt) BETWEEN :from AND :to
      GROUP BY t.ma_thuoc, t.ten_thuoc, t.hoat_chat, t.don_vi
      ORDER BY totalQuantity DESC
      LIMIT 10
    `;

    const results = await sequelize.query(sql, {
      replacements: { from, to },
      type: sequelize.QueryTypes.SELECT
    });

    return results.map(row => ({
      maThuoc: row.maThuoc,
      tenThuoc: row.tenThuoc,
      hoatChat: row.hoatChat || '',
      donVi: row.donVi,
      totalQuantity: parseInt(row.totalQuantity || 0, 10),
      totalRevenue: parseFloat(row.totalRevenue || 0)
    }));
  }
}

module.exports = new ReportService();
