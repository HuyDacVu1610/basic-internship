const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('DichVuCLS', {
    ma_dich_vu: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    ten_dich_vu: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    gia: {
      type: DataTypes.DECIMAL(12, 0),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'dich_vu_cls',
    underscored: true,
    timestamps: false
  });
};
