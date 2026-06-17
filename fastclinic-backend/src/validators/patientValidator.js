const Joi = require('joi');

const createPatientSchema = Joi.object({
  hoTen: Joi.string().max(100).required().messages({
    'string.empty': 'Họ tên không được để trống.',
    'any.required': 'Họ tên là trường bắt buộc.'
  }),
  soDienThoai: Joi.string().pattern(/^[0-9]{10,15}$/).required().messages({
    'string.pattern.base': 'Số điện thoại không hợp lệ (phải từ 10 đến 15 chữ số).',
    'any.required': 'Số điện thoại là trường bắt buộc.'
  }),
  cccd: Joi.string().pattern(/^[0-9]{12}$/).allow(null, '').messages({
    'string.pattern.base': 'CCCD phải chứa chính xác 12 chữ số.'
  }),
  ngaySinh: Joi.date().iso().required().messages({
    'any.required': 'Ngày sinh là bắt buộc.',
    'date.format': 'Ngày sinh không đúng định dạng YYYY-MM-DD.'
  }),
  gioiTinh: Joi.string().valid('Nam', 'Nu', 'Khac').allow(null, '').messages({
    'any.only': 'Giới tính phải là Nam, Nu hoặc Khac.'
  }),
  diaChi: Joi.string().max(255).required().messages({
    'any.required': 'Địa chỉ là bắt buộc.',
    'string.empty': 'Địa chỉ không được để trống.'
  }),
  tienSuDiUng: Joi.string().allow(null, '')
});

const updatePatientSchema = Joi.object({
  hoTen: Joi.string().max(100).messages({
    'string.empty': 'Họ tên không được để trống.'
  }),
  soDienThoai: Joi.string().pattern(/^[0-9]{10,15}$/).messages({
    'string.pattern.base': 'Số điện thoại không hợp lệ (phải từ 10 đến 15 chữ số).'
  }),
  cccd: Joi.string().pattern(/^[0-9]{12}$/).allow(null, '').messages({
    'string.pattern.base': 'CCCD phải chứa chính xác 12 chữ số.'
  }),
  ngaySinh: Joi.date().iso().messages({
    'date.format': 'Ngày sinh không đúng định dạng YYYY-MM-DD.'
  }),
  gioiTinh: Joi.string().valid('Nam', 'Nu', 'Khac').allow(null, '').messages({
    'any.only': 'Giới tính phải là Nam, Nu hoặc Khac.'
  }),
  diaChi: Joi.string().max(255),
  tienSuDiUng: Joi.string().allow(null, '')
});

module.exports = {
  createPatientSchema,
  updatePatientSchema
};
