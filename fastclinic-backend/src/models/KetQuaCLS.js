const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('KetQuaCLS', {
    ma_ket_qua: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    loai_cls: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    noi_dung: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    file_dinh_kem: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    thoi_gian_nhap: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    ma_luot_kham: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    ma_dich_vu: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    ma_nhan_vien_nhap: {
      type: DataTypes.BIGINT,
      allowNull: true
    }
  }, {
    tableName: 'ket_qua_cls',
    underscored: true,
    timestamps: false
  });
};
