const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('PhieuThu', {
    ma_phieu_thu: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    tien_kham: {
      type: DataTypes.DECIMAL(12, 0),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    tong_phi_cls: {
      type: DataTypes.DECIMAL(12, 0),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    tong_tien_thuoc: {
      type: DataTypes.DECIMAL(12, 0),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    tong_tien: {
      type: DataTypes.DECIMAL(12, 0),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    phuong_thuc_tt: {
      type: DataTypes.ENUM('TIEN_MAT', 'CHUYEN_KHOAN', 'THE'),
      allowNull: true
    },
    trang_thai: {
      type: DataTypes.ENUM('CHO_THANH_TOAN', 'DA_THANH_TOAN', 'HUY'),
      allowNull: false,
      defaultValue: 'CHO_THANH_TOAN'
    },
    thoi_gian_tt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ma_luot_kham: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true
    },
    ma_thu_ngan: {
      type: DataTypes.BIGINT,
      allowNull: true
    }
  }, {
    tableName: 'phieu_thu',
    underscored: true,
    timestamps: false
  });
};
