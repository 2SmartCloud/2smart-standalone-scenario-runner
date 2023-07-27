const path     = require('path');
const fs       = require('fs-extra');

const Debugger       = require('homie-sdk/lib/utils/debugger');
const MQTT           = require('homie-sdk/lib/Broker/mqtt');
const Homie          = require('homie-sdk/lib/homie/Homie');
const HomieMigrator  = require('homie-sdk/lib/homie/HomieMigrator');

const HomieSynchronizer = require('./lib/homieSynchronizer');
const ScenarioRunner    = require('./lib/ScenarioRunner');
const DbListener        = require('./lib/listeners/DbListener');
// const FsListener     = require('./lib/listeners/FsListener');

const {
    MQTT_URI,
    MQTT_USER,
    MQTT_PASS,
    DEBUG,
    TZ,
    INFLUX_HOST,
    INFLUX_DATABASE,
    SYSTEM_NOTIFICATIONS_HASH
} = process.env;

const tempScenariosDir = path.resolve('./tempScenarios');
const scenariosDir     = path.resolve('./scenarios');
const templatesPath    = path.resolve('./etc/templates');

const { extensions, mqtt: mqttCreds } = require('./etc/config');

// eslint-disable-next-line no-sync
fs.ensureDirSync(tempScenariosDir);
// eslint-disable-next-line no-sync
fs.ensureDirSync(scenariosDir);

const debug = new Debugger(DEBUG || '*');
const homie = new Homie({ transport: new MQTT({ ...mqttCreds }) });
const homieMigrator = new HomieMigrator({ homie });
const homieSynchronizer = new HomieSynchronizer({ debug, homie, homieMigrator });

debug.initEvents();

(async () => {
    const scenarioRunner = new ScenarioRunner({
        env : {
            MQTT_URI,
            MQTT_USER,
            MQTT_PASS,
            DEBUG,
            TZ,
            INFLUX_HOST,
            INFLUX_DATABASE,
            SYSTEM_NOTIFICATIONS_HASH
        },
        debug,
        homie,
        homieMigrator
    });

    await scenarioRunner.initWorld();

    scenarioRunner.addListener(new DbListener({
        tempScenariosDir,
        templatesPath,
        debug,
        forceWatch          : true,
        scenarioInstallPath : extensions.installPath,
        homieSynchronizer
    }));
    // scenarioRunner.addListener(new FsListener({ scenariosDir, forceWatch: true, debug }));
})();
