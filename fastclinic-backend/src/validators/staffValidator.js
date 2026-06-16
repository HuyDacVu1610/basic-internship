const Joi = require('joi');

const createStaffSchema = Joi.object({
  hoTen: Joi.string().max(100).required().messages({
    'any.required': 'Họ tên nhân viên là bắt buộc.',
    'string.empty': 'Họ tên nhân viên không được để trống.',
    'string.max': 'Họ tên không được vượt quá 100 ký tự.'
  }),
  vaiTro: Joi.string().valid('ADMIN', 'LE_TAN', 'BAC_SI', 'DIEU_DUONG', 'THU_NGAN', 'NV_CLS').required().messages({
    'any.required': 'Vai trò nhân viên là bắt buộc.',
    'any.only': 'Vai trò không hợp lệ.'
  }),
  tenDangNhap: Joi.string().max(50).required().messages({
    'any.required': 'Tên đăng nhập là bắt buộc.',
    'string.empty': 'Tên đăng nhập không được để trống.',
    'string.max': 'Tên đăng nhập không được vượt quá 50 ký tự.'
  }),
  matKhau: Joi.string().min(4).max(100).required().messages({
    'any.required': 'Mật khẩu là bắt buộc.',
    'string.empty': 'Mật khẩu không được để trống.',
    'string.min': 'Mật khẩu phải chứa ít nhất 4 ký tự.'
  }),
  isActive: Joi.boolean().default(true)
});

const updateStaffSchema = Joi.object({
  hoTen: Joi.string().max(100).messages({
    'string.empty': 'Họ tên nhân viên không được để trống.',
    'string.max': 'Họ tên không được vượt quá 100 ký tự.'
  }),
  vaiTro: Joi.string().valid('ADMIN', 'LE_TAN', 'BAC_SI', 'DIEU_DUONG', 'THU_NGAN', 'NV_CLS').messages({
    'any.only': 'Vai trò không hợp lệ.'
  }),
  tenDangNhap: Joi.string().max(50).messages({
    'string.empty': 'Tên đăng nhập không được để trống.',
    'string.max': 'Tên đăng nhập không được vượt quá 50 ký tự.'
  }),
  matKhau: Joi.string().min(4).max(100).allow('', null).messages({
    'string.min': 'Mật khẩu phải chứa ít nhất 4 ký tự.'
  }),
  isActive: Joi.boolean()
});

module.exports = {
  createStaffSchema,
  updateStaffSchema
};
