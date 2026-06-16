const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('PhieuKham', {
    ma_phieu: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    so_thu_tu: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ngay_kham: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    thoi_gian_lay_so: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    trang_thai: {
      type: DataTypes.ENUM('CHO_DO_SINH_HIEU', 'CHO_BAC_SI', 'DANG_KHAM', 'CHO_CLS', 'CHO_THANH_TOAN', 'HOAN_TAT', 'HUY'),
      allowNull: false,
      defaultValue: 'CHO_DO_SINH_HIEU'
    },
    ma_benh_nhan: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    ma_phong: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    ma_nhan_vien_tao: {
      type: DataTypes.BIGINT,
      allowNull: false
    }
  }, {
    tableName: 'phieu_kham',
    underscored: true,
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['ngay_kham', 'ma_phong', 'so_thu_tu']
      }
    ]
  });
};
