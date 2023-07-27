const sequelize = require('./sequelizeSingleton.js');

const Scenarios = require('./models/Scenarios');
const SimpleScenarioTypes = require('./models/SimpleScenarioTypes');
const NotificationChannels = require('./models/NotificationChannels');

Scenarios.initRelation();
SimpleScenarioTypes.initRelation();
NotificationChannels.initRelation();

module.exports = {
    sequelize
};
