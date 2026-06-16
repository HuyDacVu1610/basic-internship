const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('DonThuoc', {
    ma_don_thuoc: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    ngay_ke: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    ghi_chu: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tong_tien_thuoc: {
      type: DataTypes.DECIMAL(12, 0),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    ma_luot_kham: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true
    }
  }, {
    tableName: 'don_thuoc',
    underscored: true,
    timestamps: false
  });
};
