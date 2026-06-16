const queueService = require('../services/queueService');
const { successResponse } = require('../utils/response');
const { getIo } = require('../socket');

class QueueController {
  async issue(req, res, next) {
    try {
      const { maBenhNhan, maPhong } = req.body;
      const maNhanVien = req.user.userId;
      
      const ticket = await queueService.issueTicket(maBenhNhan, maPhong, maNhanVien);
      
      // Emit queue-updated websocket event
      const io = getIo();
      if (io) {
        io.emit('queue-updated');
      }

      res.status(251).json(
        successResponse(ticket, 'Cấp số thứ tự khám bệnh thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const { maPhong, ngay } = req.query;
      const queueList = await queueService.getQueueList(maPhong, ngay);
      res.status(200).json(
        successResponse(queueList, 'Lấy danh sách hàng đợi thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async stats(req, res, next) {
    try {
      const { ngay } = req.query;
      const stats = await queueService.getQueueStats(ngay);
      res.status(200).json(
        successResponse(stats, 'Lấy thống kê hàng đợi thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async rooms(req, res, next) {
    try {
      const roomsList = await queueService.getActiveRooms();
      res.status(200).json(
        successResponse(roomsList, 'Lấy danh sách phòng khám hoạt động thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async display(req, res, next) {
    try {
      const displayData = await queueService.getQueueDisplayData();
      res.status(200).json(
        successResponse(displayData, 'Lấy dữ liệu hiển thị hàng đợi thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async call(req, res, next) {
    try {
      const { maPhieu } = req.params;
      const maBacSi = req.user.userId;
      
      const result = await queueService.callPatient(maPhieu, maBacSi);
      
      // Emit socket.io events
      const io = getIo();
      if (io) {
        io.emit('queue-updated');
        io.emit('patient-called', {
          soThuTu: result.so_thu_tu,
          phongKham: result.ten_phong,
          hoTen: result.ho_ten,
          maPhong: result.ma_phong
        });
      }

      res.status(200).json(
        successResponse(result, 'Gọi khám bệnh nhân thành công')
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new QueueController();
