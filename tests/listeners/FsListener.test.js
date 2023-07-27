/* eslint-disable more/no-hardcoded-configuration-data */
const path = require('path');
const fs = require('fs-extra');
const FsListener = require('../../lib/listeners/FsListener');
const PromiseEventEmitter = require('../utils/PromiseEventEmitter');

const scenariosDir = path.join(__dirname, './../../temp/scenarios');

jest.setTimeout(60000); // eslint-disable-line no-magic-numbers

// local test vars
let listener;
// eslint-disable-next-line camelcase
const scenario_file_name = 'scenario-name.js';

/* eslint-disable no-sync */
describe('FsListener Listener', () => {
    beforeAll(async () => {
        fs.ensureDirSync(scenariosDir);
        fs.emptyDirSync(scenariosDir);
        listener = new FsListener({ scenariosDir });
    });

    afterAll(async () => {
        fs.ensureDirSync(scenariosDir);
        fs.emptyDirSync(scenariosDir);
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
                const file = path.join(scenariosDir, scenario_file_name);

                fs.writeFileSync(file, 'console.log("hello");');
            }
        });

        expect(data).toMatchObject({
            language  : 'js',
            topicName : 'scenario-name'
        });
    });

    test('POSITIVE: should emit changedScenario event after scenario has been changed', async () => {
        const data = await PromiseEventEmitter({
            targetEvent : 'changedScenario',
            wrongEvents : [ 'newScenario', 'deletedScenario' ],
            errorEvent  : 'error',
            timeout     : 10000,
            emitter     : listener,
            action      : async () => {
                const file = path.join(scenariosDir, scenario_file_name);

                fs.writeFileSync(file, 'console.log("hello 2");');
            }
        });

        expect(data).toMatchObject({
            language  : 'js',
            topicName : 'scenario-name'
        });
    });

    test('POSITIVE: should emit deletedScenario event after scenario has been deleted', async () => {
        const file = await PromiseEventEmitter({
            targetEvent : 'deletedScenario',
            wrongEvents : [ 'newScenario', 'changedScenario' ],
            errorEvent  : 'error',
            timeout     : 10000,
            emitter     : listener,
            action      : async () => {
                // eslint-disable-next-line no-shadow
                const file = path.join(scenariosDir, scenario_file_name);

                fs.unlinkSync(file);
            }
        });

        expect(file).toEqual(path.join(scenariosDir, scenario_file_name));
    });
});
