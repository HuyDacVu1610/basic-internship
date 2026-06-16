const visitService = require('../services/visitService');
const { successResponse } = require('../utils/response');
const { getIo } = require('../socket');

class VisitController {
  async waiting(req, res, next) {
    try {
      const { role, maPhong } = req.query;
      const waitingList = await visitService.getWaitingList(role, maPhong);
      
      res.status(200).json(
        successResponse(waitingList, 'Lấy danh sách hàng chờ thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async saveVitals(req, res, next) {
    try {
      const { maLuotKham } = req.params;
      const maDieuDuong = req.user.userId;
      
      const vitalSigns = await visitService.recordVitalSigns(maLuotKham, req.body, maDieuDuong);
      
      // Emit queue-updated to refresh TV displays immediately
      const io = getIo();
      if (io) {
        io.emit('queue-updated');
      }

      res.status(200).json(
        successResponse(vitalSigns, 'Nhập sinh hiệu bệnh nhân thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async detail(req, res, next) {
    try {
      const { maLuotKham } = req.params;
      const result = await visitService.getVisitDetail(maLuotKham);
      res.status(200).json(
        successResponse(result, 'Lấy chi tiết lượt khám thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async examine(req, res, next) {
    try {
      const { maLuotKham } = req.params;
      const result = await visitService.updateExamination(maLuotKham, req.body);
      
      // Emit queue-updated to keep screen state accurate
      const io = getIo();
      if (io) {
        io.emit('queue-updated');
      }

      res.status(200).json(
        successResponse(result, 'Lưu kết quả khám bệnh thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async getServices(req, res, next) {
    try {
      const services = await visitService.getClsServices();
      res.status(200).json(
        successResponse(services, 'Lấy danh sách dịch vụ cận lâm sàng thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async createLabOrders(req, res, next) {
    try {
      const { maLuotKham } = req.params;
      
      // Flexible body parser for service IDs
      let maDichVus = [];
      if (Array.isArray(req.body)) {
        maDichVus = req.body.map(item => typeof item === 'object' ? (item.maDichVu || item.ma_dich_vu || item.maDV) : item);
      } else if (req.body && Array.isArray(req.body.maDichVus)) {
        maDichVus = req.body.maDichVus;
      }

      const results = await visitService.createLabOrders(maLuotKham, maDichVus);

      // Emit queue-updated to keep dashboards and TV updated
      const io = getIo();
      if (io) {
        io.emit('queue-updated');
      }

      res.status(200).json(
        successResponse(results, 'Chỉ định cận lâm sàng thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async updateLabResult(req, res, next) {
    try {
      const { maKetQua } = req.params;
      const maNhanVienNhap = req.user.userId;

      const result = await visitService.updateLabResult(maKetQua, req.body, req.file, maNhanVienNhap);

      // Emit socket.io events
      const io = getIo();
      if (io) {
        io.emit('queue-updated');
        io.emit('lab-result-updated', {
          maLuotKham: result.ma_luot_kham,
          hoTen: result.luotKham?.benhNhan?.ho_ten || '',
          maPhong: result.luotKham?.ma_phong
        });
      }

      res.status(200).json(
        successResponse(result, 'Cập nhật kết quả cận lâm sàng thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async createPrescription(req, res, next) {
    try {
      const { maLuotKham } = req.params;
      const prescription = await visitService.createPrescription(maLuotKham, req.body);

      // Emit queue-updated to update doctor/reception dashboards
      const io = getIo();
      if (io) {
        io.emit('queue-updated');
      }

      res.status(201).json(
        successResponse(prescription, 'Kê đơn thuốc thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async checkout(req, res, next) {
    try {
      const { maLuotKham } = req.params;
      const maThuNgan = req.user.userId;
      
      const result = await visitService.checkout(maLuotKham, req.body, maThuNgan);

      // Emit queue-updated to update dashboards in real-time
      const io = getIo();
      if (io) {
        io.emit('queue-updated');
      }

      res.status(200).json(
        successResponse(result, 'Thanh toán hóa đơn và hoàn tất khám thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async getTodayPayments(req, res, next) {
    try {
      const results = await visitService.getTodayPayments();
      res.status(200).json(
        successResponse(results, 'Lấy danh sách phiếu thu hôm nay thành công')
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VisitController();
