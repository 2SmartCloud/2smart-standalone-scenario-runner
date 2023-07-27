const thermostat = require('./thermostat');
const pidController = require('./pidController');
const timeRelay = require('./timeRelay');
const sunriseSunset = require('./sunrise-sunset');
const digitalPidController = require('./pwm-pidController');
const mixedThermostat = require('./mixedThermostat');
const schedule = require('./schedule');
const alarmSystem = require('./alarmSystem');
const lightingControl = require('./lighting-control');
const watering = require('./watering');

module.exports = {
    thermostat,
    pidController,
    timeRelay,
    sunriseSunset,
    digitalPidController,
    mixedThermostat,
    schedule,
    alarmSystem,
    lightingControl,
    watering
};
