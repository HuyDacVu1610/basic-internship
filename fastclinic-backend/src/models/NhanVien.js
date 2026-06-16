const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('NhanVien', {
    ma_nhan_vien: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    ho_ten: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    vai_tro: {
      type: DataTypes.ENUM('ADMIN', 'LE_TAN', 'BAC_SI', 'DIEU_DUONG', 'THU_NGAN', 'NV_CLS'),
      allowNull: false
    },
    ten_dang_nhap: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    mat_khau_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    so_lan_dang_nhap_sai: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    khoa_den: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'nhan_vien',
    underscored: true
  });
};
