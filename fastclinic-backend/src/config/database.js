const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.NODE_ENV === 'test') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    define: {
      freezeTableName: true,
      underscored: true,
      timestamps: true,
    }
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'fastclinic',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      define: {
        freezeTableName: true,
        underscored: true,
        timestamps: true,
      },
      timezone: '+07:00', // Set GMT+7 for timezone
    }
  );
}

module.exports = sequelize;
