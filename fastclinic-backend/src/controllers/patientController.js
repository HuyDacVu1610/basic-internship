const patientService = require('../services/patientService');
const { successResponse } = require('../utils/response');

class PatientController {
  async search(req, res, next) {
    try {
      const { q } = req.query;
      const patients = await patientService.searchPatients(q);
      res.status(200).json(
        successResponse(patients, 'Tìm kiếm bệnh nhân thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const patient = await patientService.getPatientById(id);
      res.status(200).json(
        successResponse(patient, 'Lấy thông tin bệnh nhân thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const patient = await patientService.createPatient(req.body);
      res.status(201).json(
        successResponse(patient, 'Tạo hồ sơ bệnh nhân mới thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const patient = await patientService.updatePatient(id, req.body);
      res.status(200).json(
        successResponse(patient, 'Cập nhật hồ sơ bệnh nhân thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req, res, next) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 5 } = req.query;
      const historyData = await patientService.getPatientHistory(id, page, limit);
      res.status(200).json(
        successResponse(historyData, 'Lấy lịch sử khám bệnh thành công')
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PatientController();
