const sequelize = require('../config/database');
const initModels = require('./index.init');

const db = initModels(sequelize);

module.exports = {
  sequelize,
  ...db
};
