const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('ChiTietDonThuoc', {
    ma_ct: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    so_luong: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    lieu_dung: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    cach_dung: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    don_gia: {
      type: DataTypes.DECIMAL(12, 0),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    thanh_tien: {
      type: DataTypes.DECIMAL(12, 0),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    ma_don_thuoc: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    ma_thuoc: {
      type: DataTypes.BIGINT,
      allowNull: false
    }
  }, {
    tableName: 'chi_tiet_don_thuoc',
    underscored: true,
    timestamps: false
  });
};
