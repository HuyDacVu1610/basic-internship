const Joi = require('joi');

const prescriptionSchema = Joi.object({
  ghiChu: Joi.string().allow(null, ''),
  thuocs: Joi.array().items(
    Joi.object({
      maThuoc: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).required().messages({
        'any.required': 'Mã thuốc là bắt buộc.'
      }),
      soLuong: Joi.number().integer().positive().min(1).required().messages({
        'any.required': 'Số lượng thuốc là bắt buộc.',
        'number.min': 'Số lượng thuốc phải lớn hơn hoặc bằng 1.'
      }),
      lieuDung: Joi.string().max(200).allow(null, ''),
      cachDung: Joi.string().max(200).allow(null, '')
    })
  ).min(1).required().messages({
    'array.min': 'Đơn thuốc phải chứa ít nhất một loại thuốc.'
  })
});

module.exports = {
  prescriptionSchema
};
