const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('BenhNhan', {
    ma_benh_nhan: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    ho_ten: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    so_dien_thoai: {
      type: DataTypes.STRING(15),
      allowNull: false,
      unique: true
    },
    cccd: {
      type: DataTypes.STRING(12),
      unique: true,
      allowNull: true
    },
    ngay_sinh: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    gioi_tinh: {
      type: DataTypes.ENUM('Nam', 'Nu', 'Khac'),
      allowNull: true
    },
    dia_chi: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    tien_su_di_ung: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'benh_nhan',
    underscored: true
  });
};
