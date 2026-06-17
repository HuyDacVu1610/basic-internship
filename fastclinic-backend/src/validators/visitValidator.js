const Joi = require('joi');

const vitalSignsSchema = Joi.object({
  huyetAp: Joi.string().pattern(/^\d{2,3}\/\d{2,3}$/).required().custom((value, helpers) => {
    const [sys, dia] = value.split('/').map(Number);
    if (sys < 50 || sys > 250) {
      return helpers.message('Huyết áp tâm thu không hợp lệ (từ 50 đến 250 mmHg).');
    }
    if (dia < 30 || dia > 150) {
      return helpers.message('Huyết áp tâm trương không hợp lệ (từ 30 đến 150 mmHg).');
    }
    if (sys <= dia) {
      return helpers.message('Huyết áp tâm thu phải lớn hơn huyết áp tâm trương.');
    }
    return value;
  }).messages({
    'any.required': 'Huyết áp là bắt buộc.',
    'string.empty': 'Huyết áp không được để trống.',
    'string.pattern.base': 'Huyết áp phải có định dạng chuẩn (ví dụ: 120/80).'
  }),
  nhipTim: Joi.number().integer().min(30).max(200).required().messages({
    'any.required': 'Nhịp tim là bắt buộc.',
    'number.base': 'Nhịp tim phải là số nguyên.',
    'number.min': 'Nhịp tim không hợp lệ (thấp nhất 30).',
    'number.max': 'Nhịp tim không hợp lệ (cao nhất 200).'
  }),
  nhietDo: Joi.number().min(30.0).max(45.0).required().messages({
    'any.required': 'Nhiệt độ là bắt buộc.',
    'number.base': 'Nhiệt độ phải là số.',
    'number.min': 'Nhiệt độ không hợp lệ (thấp nhất 30.0°C).',
    'number.max': 'Nhiệt độ không hợp lệ (cao nhất 45.0°C).'
  }),
  chieuCao: Joi.number().min(30.0).max(250.0).required().messages({
    'any.required': 'Chiều cao là bắt buộc.',
    'number.base': 'Chiều cao phải là số.',
    'number.min': 'Chiều cao không hợp lệ (thấp nhất 30.0 cm).',
    'number.max': 'Chiều cao không hợp lệ (cao nhất 250.0 cm).'
  }),
  canNang: Joi.number().min(1.0).max(500.0).required().messages({
    'any.required': 'Cân nặng là bắt buộc.',
    'number.base': 'Cân nặng phải là số.',
    'number.min': 'Cân nặng không hợp lệ (thấp nhất 1.0 kg).',
    'number.max': 'Cân nặng không hợp lệ (cao nhất 500.0 kg).'
  })
});

const examineSchema = Joi.object({
  trieuChung: Joi.string().allow(null, '').max(2000).messages({
    'string.max': 'Triệu chứng không được dài quá 2000 ký tự.'
  }),
  chanDoan: Joi.string().allow(null, '').max(2000).messages({
    'string.max': 'Chẩn đoán không được dài quá 2000 ký tự.'
  }),
  ghiChu: Joi.string().allow(null, '').max(2000).messages({
    'string.max': 'Ghi chú không được dài quá 2000 ký tự.'
  }),
  trangThai: Joi.string().valid('CHO_DO', 'CHO_BAC_SI', 'DANG_KHAM', 'CHO_CLS', 'CHO_THANH_TOAN', 'HOAN_TAT').optional().messages({
    'any.only': 'Trạng thái lượt khám không hợp lệ.'
  })
});

const checkoutSchema = Joi.object({
  phuongThucTT: Joi.string().valid('TIEN_MAT', 'CHUYEN_KHOAN', 'THE').required().messages({
    'any.required': 'Phương thức thanh toán là bắt buộc.',
    'any.only': 'Phương thức thanh toán phải là TIEN_MAT, CHUYEN_KHOAN hoặc THE.'
  }),
  tienKham: Joi.number().integer().min(0).default(150000).messages({
    'number.min': 'Tiền khám không được âm.'
  })
});

module.exports = {
  vitalSignsSchema,
  examineSchema,
  checkoutSchema
};
