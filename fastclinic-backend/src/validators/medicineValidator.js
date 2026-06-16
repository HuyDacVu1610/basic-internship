const Joi = require('joi');

const createMedicineSchema = Joi.object({
  ten_thuoc: Joi.string().max(200).required().messages({
    'any.required': 'Tên thuốc là bắt buộc.',
    'string.empty': 'Tên thuốc không được để trống.',
    'string.max': 'Tên thuốc không được vượt quá 200 ký tự.'
  }),
  hoat_chat: Joi.string().max(200).allow(null, '').messages({
    'string.max': 'Hoạt chất không được vượt quá 200 ký tự.'
  }),
  don_vi: Joi.string().max(50).required().messages({
    'any.required': 'Đơn vị tính là bắt buộc.',
    'string.empty': 'Đơn vị tính không được để trống.',
    'string.max': 'Đơn vị tính không được vượt quá 50 ký tự.'
  }),
  gia: Joi.number().integer().min(0).required().messages({
    'any.required': 'Giá thuốc là bắt buộc.',
    'number.base': 'Giá thuốc phải là số.',
    'number.min': 'Giá thuốc không được âm.'
  }),
  so_luong_ton: Joi.number().integer().min(0).default(0).messages({
    'number.base': 'Số lượng tồn phải là số nguyên.',
    'number.min': 'Số lượng tồn không được âm.'
  }),
  han_dung: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null, '').messages({
    'string.pattern.base': 'Hạn dùng phải tuân theo định dạng YYYY-MM-DD.'
  }),
  is_active: Joi.boolean().default(true)
});

const updateMedicineSchema = Joi.object({
  ten_thuoc: Joi.string().max(200).messages({
    'string.empty': 'Tên thuốc không được để trống.',
    'string.max': 'Tên thuốc không được vượt quá 200 ký tự.'
  }),
  hoat_chat: Joi.string().max(200).allow(null, '').messages({
    'string.max': 'Hoạt chất không được vượt quá 200 ký tự.'
  }),
  don_vi: Joi.string().max(50).messages({
    'string.empty': 'Đơn vị tính không được để trống.',
    'string.max': 'Đơn vị tính không được vượt quá 50 ký tự.'
  }),
  gia: Joi.number().integer().min(0).messages({
    'number.base': 'Giá thuốc phải là số.',
    'number.min': 'Giá thuốc không được âm.'
  }),
  so_luong_ton: Joi.number().integer().min(0).messages({
    'number.base': 'Số lượng tồn phải là số nguyên.',
    'number.min': 'Số lượng tồn không được âm.'
  }),
  han_dung: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null, '').messages({
    'string.pattern.base': 'Hạn dùng phải tuân theo định dạng YYYY-MM-DD.'
  }),
  is_active: Joi.boolean()
});

module.exports = {
  createMedicineSchema,
  updateMedicineSchema
};
