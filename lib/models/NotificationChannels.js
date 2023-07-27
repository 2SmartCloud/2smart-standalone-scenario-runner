const Sequelize = require('sequelize');
const sequelize = require('../sequelizeSingleton');

const DATE_PRECISION = 3;

class NotificationChannels extends Sequelize.Model {}

NotificationChannels.init({
    id            : { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    name          : { type: Sequelize.STRING, allowNull: false },
    type          : { type: Sequelize.STRING, allowNull: false, unique: true },
    configuration : { type: Sequelize.JSON, defaultValue: null },
    icon          : { type: Sequelize.STRING, defaultValue: null },
    createdAt     : { type: Sequelize.DATE(DATE_PRECISION) },
    updatedAt     : { type: Sequelize.DATE(DATE_PRECISION) }
}, { sequelize });

NotificationChannels.initRelation = function initRelation() {};

module.exports = NotificationChannels;
