const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('PhongKham', {
    ma_phong: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    ten_phong: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    chuyen_khoa: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    trang_thai: {
      type: DataTypes.ENUM('HOAT_DONG', 'TAM_NGUNG'),
      allowNull: false,
      defaultValue: 'HOAT_DONG'
    }
  }, {
    tableName: 'phong_kham',
    underscored: true,
    timestamps: false
  });
};
