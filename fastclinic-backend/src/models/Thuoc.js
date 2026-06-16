const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Thuoc', {
    ma_thuoc: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    ten_thuoc: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    hoat_chat: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    don_vi: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    gia: {
      type: DataTypes.DECIMAL(12, 0),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    so_luong_ton: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    han_dung: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'thuoc',
    underscored: true
  });
};
