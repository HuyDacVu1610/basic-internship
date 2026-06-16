const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('LuotKham', {
    ma_luot_kham: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    thoi_gian_kham: {
      type: DataTypes.DATE,
      allowNull: true
    },
    trieu_chung: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    chan_doan: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ghi_chu: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    trang_thai: {
      type: DataTypes.ENUM('CHO_DO', 'CHO_BAC_SI', 'DANG_KHAM', 'CHO_CLS', 'CHO_THANH_TOAN', 'HOAN_TAT'),
      allowNull: false,
      defaultValue: 'CHO_DO'
    },
    ma_phieu: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    ma_benh_nhan: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    ma_bac_si: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    ma_phong: {
      type: DataTypes.BIGINT,
      allowNull: false
    }
  }, {
    tableName: 'luot_kham',
    underscored: true,
    timestamps: false
  });
};
