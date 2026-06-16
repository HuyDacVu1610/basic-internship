const staffService = require('../services/staffService');
const { successResponse } = require('../utils/response');

class StaffController {
  async list(req, res, next) {
    try {
      const { page = 1, limit = 20, search = '' } = req.query;
      const result = await staffService.getStaffList({ page, limit, search });
      res.status(200).json(
        successResponse(result, 'Lấy danh sách nhân viên thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const staff = await staffService.createStaff(req.body);
      res.status(201).json(
        successResponse(staff, 'Tạo tài khoản nhân viên thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const requesterRole = req.user.role;
      const staff = await staffService.updateStaff(id, req.body, requesterRole);
      res.status(200).json(
        successResponse(staff, 'Cập nhật thông tin nhân viên thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async toggleLock(req, res, next) {
    try {
      const { id } = req.params;
      const staff = await staffService.toggleLock(id);
      res.status(200).json(
        successResponse(staff, 'Thay đổi trạng thái khóa nhân viên thành công')
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StaffController();
