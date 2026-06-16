const reportService = require('../services/reportService');
const { successResponse, errorResponse } = require('../utils/response');

class ReportController {
  async getPatientsReport(req, res, next) {
    try {
      const { from, to } = req.query;
      if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return res.status(400).json(
          errorResponse('INVALID_DATE_RANGE', 'Tham số ngày bắt đầu và kết thúc không hợp lệ (định dạng YYYY-MM-DD).')
        );
      }
      const data = await reportService.getPatientsReport(from, to);
      res.status(200).json(successResponse(data, 'Lấy báo cáo lượt khám thành công'));
    } catch (error) {
      next(error);
    }
  }

  async getRevenueReport(req, res, next) {
    try {
      const { from, to } = req.query;
      if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return res.status(400).json(
          errorResponse('INVALID_DATE_RANGE', 'Tham số ngày bắt đầu và kết thúc không hợp lệ (định dạng YYYY-MM-DD).')
        );
      }
      const data = await reportService.getRevenueReport(from, to);
      res.status(200).json(successResponse(data, 'Lấy báo cáo doanh thu thành công'));
    } catch (error) {
      next(error);
    }
  }

  async getMedicinesReport(req, res, next) {
    try {
      const { from, to } = req.query;
      if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return res.status(400).json(
          errorResponse('INVALID_DATE_RANGE', 'Tham số ngày bắt đầu và kết thúc không hợp lệ (định dạng YYYY-MM-DD).')
        );
      }
      const data = await reportService.getMedicinesReport(from, to);
      res.status(200).json(successResponse(data, 'Lấy báo cáo dược phẩm tiêu thụ thành công'));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportController();
