const Joi = require('joi');

const loginSchema = Joi.object({
  tenDangNhap: Joi.string().required().messages({
    'any.required': 'Tên đăng nhập là bắt buộc',
    'string.empty': 'Tên đăng nhập không được để trống'
  }),
  matKhau: Joi.string().required().messages({
    'any.required': 'Mật khẩu là bắt buộc',
    'string.empty': 'Mật khẩu không được để trống'
  })
});

module.exports = {
  loginSchema
};
