const Joi = require('joi');

const createQueueSchema = Joi.object({
  maBenhNhan: Joi.number().integer().required().messages({
    'number.base': 'Mã bệnh nhân phải là số.',
    'any.required': 'Mã bệnh nhân là trường bắt buộc.'
  }),
  maPhong: Joi.number().integer().required().messages({
    'number.base': 'Mã phòng phải là số.',
    'any.required': 'Mã phòng là trường bắt buộc.'
  })
});

module.exports = {
  createQueueSchema
};
