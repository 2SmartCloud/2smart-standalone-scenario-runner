const Sequelize = require('sequelize');

const sequelize = require('../sequelizeSingleton');

const DATE_PRECISION = 3;

class Scenarios extends Sequelize.Model {}

Scenarios.init({
    id        : { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    name      : { type: Sequelize.STRING, allowNull: false, unique: true },
    title     : { type: Sequelize.STRING, allowNull: false },
    mode      : { type: Sequelize.ENUM('ADVANCED', 'SIMPLE'), defaultValue: 'ADVANCED' },
    status    : { type: Sequelize.ENUM('ACTIVE', 'INACTIVE'), defaultValue: 'INACTIVE' },
    script    : { type: Sequelize.TEXT, defaultValue: '' },
    typeId    : { type: Sequelize.INTEGER, allowNull: true, references: { model: 'SimpleScenarioTypes', key: 'id' } },
    params    : { type: Sequelize.JSON, defaultValue: null },
    language  : { type: Sequelize.ENUM('JS'), defaultValue: 'JS' },
    type      : { type: Sequelize.STRING, allowNull: true },
    createdAt : { type: Sequelize.DATE(DATE_PRECISION) },
    updatedAt : { type: Sequelize.DATE(DATE_PRECISION) }
}, { sequelize });

Scenarios.initRelation = function initRelation() {
    const SimpleScenarioTypes = sequelize.model('SimpleScenarioTypes');

    this.belongsTo(SimpleScenarioTypes, { foreignKey: 'typeId', as: 'simpleScenarioType' });
};

module.exports = Scenarios;
