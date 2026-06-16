const medicineService = require('../services/medicineService');
const { successResponse } = require('../utils/response');

class MedicineController {
  async search(req, res, next) {
    try {
      const { q } = req.query;
      const results = await medicineService.searchMedicines(q);
      res.status(200).json(
        successResponse(results, 'Tìm kiếm danh mục thuốc thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const { page = 1, limit = 20, search = '' } = req.query;
      const result = await medicineService.getMedicinesList({ page, limit, search });
      res.status(200).json(
        successResponse(result, 'Lấy danh sách thuốc thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const medicine = await medicineService.createMedicine(req.body);
      res.status(201).json(
        successResponse(medicine, 'Thêm thuốc mới thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const medicine = await medicineService.updateMedicine(id, req.body);
      res.status(200).json(
        successResponse(medicine, 'Cập nhật thông tin thuốc thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const result = await medicineService.deleteMedicine(id);
      res.status(200).json(
        successResponse(result, 'Xóa thuốc thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async getAlerts(req, res, next) {
    try {
      const results = await medicineService.getLowStockAlerts();
      res.status(200).json(
        successResponse(results, 'Lấy danh sách cảnh báo tồn kho và hạn dùng thành công')
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MedicineController();
