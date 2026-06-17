const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('SinhHieu', {
    ma_sinh_hieu: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    huyet_ap: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    nhip_tim: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    nhiet_do: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: false
    },
    chieu_cao: {
      type: DataTypes.DECIMAL(5, 1),
      allowNull: false
    },
    can_nang: {
      type: DataTypes.DECIMAL(5, 1),
      allowNull: false
    },
    thoi_gian_do: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    ma_luot_kham: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true
    },
    ma_dieu_duong: {
      type: DataTypes.BIGINT,
      allowNull: false
    }
  }, {
    tableName: 'sinh_hieu',
    underscored: true,
    timestamps: false
  });
};
