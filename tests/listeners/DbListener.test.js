/* eslint-disable more/no-hardcoded-configuration-data */
const path = require('path');
const fs = require('fs-extra');
const Debugger = require('homie-sdk/lib/utils/debugger');
const DbListener = require('../../lib/listeners/DbListener');
const TestFactory = require('../utils/DbTestFactory');
const PromiseEventEmitter = require('../utils/PromiseEventEmitter');
const { sequelize } = require('../../lib/sequelize.js');

const factory = new TestFactory();
const Scenarios = sequelize.models.Scenarios;
const tempScenariosDir = path.join(__dirname, './../../temp/tempScenarios');
const templatesPath = path.resolve('./../../etc/templates');

const debug = new Debugger('*');

jest.setTimeout(60000); // eslint-disable-line no-magic-numbers

// local test vars
let listener;

let scenario;

const scenarioData = {
    name     : 'topic',
    title    : 'title',
    status   : 'ACTIVE',
    mode     : 'ADVANCED',
    script   : 'console.log("hello");',
    language : 'JS'
};

/* eslint-disable no-sync, max-lines-per-function */
describe('DbListener Lisntener', () => {
    beforeAll(async () => {
        await factory.cleanup();
        fs.ensureDirSync(tempScenariosDir);

        listener = new DbListener({
            tempScenariosDir,
            templatesPath,
            debug,
            forceWatch        : true,
            homieSynchronizer : {
                sync : () => {}
            }
        });
    });

    afterAll(async () => {
        await factory.cleanup();
        await factory.end();
        listener.stop();
    });

    test('POSITIVE: should emit newScenario event after scenario added', async () => {
        const data = await PromiseEventEmitter({
            targetEvent : 'newScenario',
            wrongEvents : [ 'changedScenario', 'deletedScenario' ],
            errorEvent  : 'error',
            timeout     : 10000,
            emitter     : listener,
            action      : async () => {
                listener.watch();
                scenario = await Scenarios.create(scenarioData, { returning: true, individualHooks: true });
            }
        });

        expect(data).toMatchObject({
            language  : 'js',
            topicName : 'topic'
        });
    });

    test('POSITIVE: should emit changedScenario event after scenario has been changed', async () => {
        const data = await PromiseEventEmitter({
            targetEvent : 'changedScenario',
            wrongEvents : [ 'newScenario', 'deletedScenario' ],
            errorEvent  : 'error',
            timeout     : 5000,
            emitter     : listener,
            action      : async () => {
                await scenario.update({ script: "console.log('hello 2');" });
            }
        });

        expect(data).toMatchObject({
            language  : 'js',
            topicName : 'topic'
        });
    });

    test('POSITIVE: should emit deletedScenario event after scenario\'s status has been put to inactive', async () => {
        const { file } = await PromiseEventEmitter({
            targetEvent : 'stoppedScenario',
            wrongEvents : [ 'newScenario', 'changedScenario' ],
            errorEvent  : 'error',
            timeout     : 10000,
            emitter     : listener,
            action      : async () => {
                await scenario.update({ status: 'INACTIVE' });
            }
        });

        expect(file).toEqual(path.join(tempScenariosDir, `${scenario.name}.js`));
    });

    test('POSITIVE: should emit newScenario event after scenario\'s status has been put to active', async () => {
        const data = await PromiseEventEmitter({
            targetEvent : 'newScenario',
            wrongEvents : [ 'changedScenario', 'deletedScenario' ],
            errorEvent  : 'error',
            timeout     : 10000,
            emitter     : listener,
            action      : async () => {
                await scenario.update({ status: 'ACTIVE' });
            }
        });

        expect(data).toMatchObject({
            language  : 'js',
            topicName : 'topic'
        });
        expect(data.file).toEqual(path.join(tempScenariosDir, `${scenario.name}.js`));
    });

    test('POSITIVE: should emit deletedScenario event after scenario has been deleted', async () => {
        const { file } = await PromiseEventEmitter({
            targetEvent : 'deletedScenario',
            wrongEvents : [ 'newScenario', 'changedScenario' ],
            errorEvent  : 'error',
            timeout     : 10000,
            emitter     : listener,
            action      : async () => {
                await scenario.destroy();
            }
        });

        expect(file).toEqual(path.join(tempScenariosDir, `${scenario.name}.js`));
    });
});
