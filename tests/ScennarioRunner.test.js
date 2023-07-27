/* eslint-disable no-magic-numbers, more/no-hardcoded-configuration-data, jest/no-done-callback */
const path = require('path');
const { EventEmitter } = require('events');
const fs = require('fs-extra');
const Debugger = require('homie-sdk/lib/utils/debugger');
const MQTT = require('homie-sdk/lib/Broker/mqtt');
const HomieMigrator = require('homie-sdk/lib/homie/HomieMigrator');
const Homie = require('homie-sdk/lib/homie/Homie');
const ScenarioRunner = require('../lib/ScenarioRunner');
const { mqtt: mqttCreds } = require('../etc/config');
const Deferred = require('./utils/Deferred');

jest.setTimeout(60000);

const scenariosDir = path.join(__dirname, './../temp/scenarios');

// local test vars
const emitter = new EventEmitter();
const homie = new Homie({ transport: new MQTT({ ...mqttCreds }) });
const homieMigrator = new HomieMigrator({ homie });

let scenarioRunner;
const scenario_file_name = 'scenario-name.js'; // eslint-disable-line camelcase

/* eslint-disable no-sync */
describe('DbListener Listener', () => {
    beforeAll(async () => {
        const debug = new Debugger();

        debug.initEvents();
        fs.ensureDirSync(scenariosDir);
        fs.emptyDirSync(scenariosDir);

        scenarioRunner = new ScenarioRunner({
            env : process.env,
            debug,
            homie,
            homieMigrator
        });
        scenarioRunner.addListener(emitter);
    });

    afterAll(() => {
        fs.ensureDirSync(scenariosDir);
        fs.emptyDirSync(scenariosDir);
        emitter.removeAllListeners();
    });

    test('POSITIVE: should start scenario on newScenario event', async (done) => {
        const file = path.join(scenariosDir, scenario_file_name);
        const key = 'scenario-id';
        const scenarioBody = 'console.log("output")';

        fs.writeFileSync(file, scenarioBody);
        emitter.emit('newScenario', { file, key, topicName: 'topic-name', language: 'js' });

        setImmediate(async () => {
            expect(scenarioRunner.processes[key]).toBeDefined();
            expect(scenarioRunner.processes[key].proc).toBeDefined();

            const proc = scenarioRunner.processes[key].proc;
            const p = new Deferred();

            p.registerTimeout(10000, () => {
                console.log('Deferred timeout;');
            });

            let str = '';

            proc.stdout.on('data', data => {
                str += data.toString();
                p.resolve();
            });
            proc.stderr.on('data', (data) => console.log(data.toString()));

            proc.on('error', p.reject.bind(p));
            await p.promise();

            expect(str.trim()).toEqual('output');
            done();
        });
    });
});
