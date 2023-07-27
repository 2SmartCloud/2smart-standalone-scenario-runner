/* eslint-disable jest/no-mocks-import, import/order, jest/no-done-callback */
/* eslint-disable jest/no-conditional-expect, more/no-hardcoded-configuration-data */
process.env.TOPIC_NAME      = 'scenario1';
process.env.SCENARIO_PARAMS = '{}';

const mockedState        = require('./fixtures/__mocks__/2.0.0_state');
const TestFactory        = require('./utils/MqttTestFactory');

const { wait }           = require('../../lib/utils');

const Notification = require('../../lib/api/nodejs/2.0.0/entities/Notification');
const Threshold    = require('../../lib/api/nodejs/2.0.0/entities/Threshold');
const Group        = require('../../lib/api/nodejs/2.0.0/entities/Group');
const Alias        = require('../../lib/api/nodejs/2.0.0/entities/Alias');
const Main         = require('../../lib/api/nodejs/2.0.0/entities/Main');
const Topic        = require('../../lib/api/nodejs/2.0.0/entities/Topic');
const API          = require('../../lib/api/nodejs/2.0.0/index');

const entities = {
    alias     : new Alias(),
    threshold : new Threshold(),
    main      : new Main(),
    topic     : new Topic(),
    group     : new Group(),
    notify    : new Notification()
};


Object.values(entities).forEach(entity => entity.initialize({ entities }));

const testFactory = new TestFactory(mockedState);

jest.setTimeout(10000); // eslint-disable-line no-magic-numbers

describe('SCENARIO API 2.0.0 : ALIAS', () => {
    beforeAll(() => {
        testFactory.populateState('alias');
    });

    describe('Public methods', () => {
        test('POSITIVE: should return alias state', () => {
            const aliasState = entities.alias.getState();

            expect(aliasState).toMatchObject({
                alias1 : {
                    createdAt : '1608556276585',
                    name      : 'test_alias',
                    topic     : 'sweet-home/cb0wfwefmlwefwe/sensors/sky-sensor'
                }
            });
        });

        test('POSITIVE: should find alias by topic', () => {
            const alias = entities.alias.aliasByTopic('sweet-home/cb0wfwefmlwefwe/sensors/sky-sensor');

            expect(alias).toEqual('test_alias');
        });

        test('POSITIVE: should find topic by alias or topic', () => {
            const topic = 'sweet-home/cb0wfwefmlwefwe/sensors/sky-sensor';
            const topicByAlias = entities.alias.topicByAliasOrTopic('@test_alias');
            const topicByTopic = entities.alias.topicByAliasOrTopic(topic);

            expect(topicByAlias).toEqual(topic);
            expect(topicByTopic).toEqual(topic);
        });
    });

    describe('API methods', () => {
        test('POSITIVE: should find topic by alias', () => {
            const topic = API.alias.topic('@test_alias');

            expect(topic).toEqual('sweet-home/cb0wfwefmlwefwe/sensors/sky-sensor');
        });
        test('POSITIVE: should set value to topic', (done) => {
            const aliasName = '@test_alias';
            const aliasTopic = 'sweet-home/cb0wfwefmlwefwe/sensors/sky-sensor';
            const aliasValue = 'some value';

            testFactory.onMsgFromScenario((receivedTopic, receivedValue) => {
                if (receivedTopic === `${aliasTopic}/set`) {
                    expect(receivedValue).toEqual(aliasValue);
                    done();
                }
            });

            API.alias.set(aliasName, aliasValue);
        });

        test('POSITIVE: should get topic`s value', () => {
            testFactory.sendMsgToScenario('sweet-home/cb0wfwefmlwefwe/sensors/sky-sensor', 'some value');

            const alias = '@test_alias';
            const value = 'some value';
            const actValueByAlias = API.alias.get(alias);

            expect(actValueByAlias).toEqual(value);
        });
    });
});


describe('SCENARIO API 2.0.0 : NOTIFICATION', () => {
    beforeAll(() => {
        testFactory.populateState('notification');
    });

    describe('Public methods', () => {
        test('POSITIVE: should return notification channels state', () => {
            const notificationState = entities.notify.getState();

            expect(notificationState).toMatchObject({
                channel1 : {
                    type          : 'telegram',
                    alias         : 'Test_telegram',
                    configuration : { chatId: '368289958', token: 'bot110208322323' },
                    state         : 'enabled'
                }
            });
        });
    });
});

describe('SCENARIO API 2.0.0 : GROUP', () => {
    beforeAll(() => {
        testFactory.populateState('group');
    });

    describe('Public methods', () => {
        test('POSITIVE: should return group state', () => {
            const groupState = entities.group.getState();

            expect(groupState).toMatchObject({ group1: { name: 'Test group', value: 'value' } });
        });
    });

    describe('API methods', () => {
        test('POSITIVE: should return groups value by groupName', () => {
            const value = API.group.get('Test group');

            expect(value).toEqual('value');
        });

        test('POSITIVE: should set value to group', (done) => {
            const value = 'new-value';
            const topic = 'groups-of-properties/group1/$value/set';

            testFactory.onMsgFromScenario((receivedTopic, receivedValue) => {
                if (receivedTopic === topic) {
                    expect(receivedValue).toEqual(value);
                    done();
                }
            });

            API.group.set('Test group', value);
        });
    });
});

describe('SCENARIO API 2.0.0 : THRESHOLD', () => {
    beforeAll(() => {
        testFactory.populateState('threshold');
    });

    describe('Public methods', () => {
        test('POSITIVE: should return threshold state and list', () => {
            const thresholdState = entities.threshold.getState();
            const thresholdList = entities.threshold.getList();

            expect(thresholdState).toMatchObject({
                setpoint : {
                    value    : '10',
                    name     : 'name',
                    settable : 'true',
                    retained : 'true',
                    datatype : 'integer',
                    unit     : '#',
                    format   : ''
                }
            });
            expect(thresholdList).toEqual([ 'setpoint' ]);
        });

        // eslint-disable-next-line jest/expect-expect
        test('POSITIVE: should validate threshold stored in the state', async (done) => {
            await entities.threshold.sync();
            done();
        });

        test('POSITIVE: should add threshold to state and to MQTT broker', (done) => {
            const thresholdId = 'threshold-test';
            const shouldBeReceived = {
                'scenarios/scenario1/threshold-test/$settable' : 'true',
                'scenarios/scenario1/threshold-test/$retained' : 'false',
                'scenarios/scenario1/threshold-test/$name'     : 'scenario1',
                'scenarios/scenario1/threshold-test/$datatype' : 'float',
                'scenarios/scenario1/threshold-test/$unit'     : '#'
            };

            const msgFromScenarioCb = async (receivedTopic, receivedValue) => {
                const value = shouldBeReceived[receivedTopic];

                if (value && value === receivedValue) delete shouldBeReceived[receivedTopic];

                if (Object.keys(shouldBeReceived).length === 0) {
                    // eslint-disable-next-line no-magic-numbers
                    await wait(1000); // wait till new threshold will be added to state

                    const thState = entities.threshold.getState();

                    expect(thState[thresholdId]).toMatchObject({
                        name     : 'scenario1',
                        settable : 'true',
                        retained : 'false',
                        datatype : 'float',
                        unit     : '#',
                        format   : ''
                    });
                    testFactory.offMsgFromScenario(msgFromScenarioCb);
                    done();
                }
            };

            testFactory.onMsgFromScenario(msgFromScenarioCb, { once: false });
            entities.threshold.init(thresholdId, { datatype: 'float', retained: false });
        });
    });

    describe('API methods', () => {
        test('POSITIVE: should return threshold value by id', () => {
            const value = API.threshold.value('setpoint');

            expect(value).toEqual('10');
        });

        test('POSITIVE: should return topic for passed threshold id', () => {
            const topic = API.threshold.topic('threshold-test');

            expect(topic).toEqual('scenarios/scenario1/threshold-test');
        });

        test('POSITIVE: should return topic for passed scenario id and threshold id', () => {
            const topic = API.threshold.topic('threshold-test', 'scenario1');

            expect(topic).toEqual('scenarios/scenario1/threshold-test');
        });
    });
});

describe('SCENARIO API 2.0.0 : METHOD', () => {
    beforeAll(() => {
        testFactory.populateState('threshold');
    });

    describe('API methods', () => {
        test('POSITIVE: should call callback on message to specified topic', (done) => {
            const value = 'some-value';
            const thId = 'method-test';
            const thTopic = `scenarios/scenario1/${thId}`;

            const callback = receivedValue => {
                expect(receivedValue).toEqual(value);
                done();
            };

            API.method.init(thId, callback);

            testFactory.sendMsgToScenario(thTopic, value);
        });

        test('POSITIVE: should set some value to threshold topic', (done) => {
            const scenarioId = 'scenario1';
            const thresholdId = 'threshold-test';
            const value = 'some-new-value';
            const topic = `scenarios/${scenarioId}/${thresholdId}/set`;

            testFactory.onMsgFromScenario((receivedTopic, receivedValue) => {
                if (receivedTopic === topic) {
                    expect(receivedValue).toEqual(value);
                    done();
                }
            });

            API.method.call(scenarioId, thresholdId, value);
        });
    });
});

describe('SCENARIO API 2.0.0 : TOPIC', () => {
    beforeAll(() => {
        testFactory.populateState('main');
    });

    describe('API methods', () => {
        test('POSITIVE: should set value to topic', (done) => {
            const value = 'SCENARIO API 2.0.0 : TOPIC';
            const topic = 'sweet-home/some-topic1/some-topic2/$value';

            testFactory.onMsgFromScenario((receivedTopic, receivedValue) => {
                if (receivedTopic === `${topic}/set`) {
                    expect(receivedValue).toEqual(value);
                    done();
                }
            });

            API.topic.set(topic, value);
        });

        test('POSITIVE: should get topic`s value', () => {
            const value = 'Yahoo Weather';
            const topic = 'sweet-home/device1/$name';
            const actValue = API.topic.get(topic);

            expect(actValue).toEqual(value);
        });
    });
});

describe('SCENARIO API 2.0.0 : MAIN', () => {
    beforeAll(() => {
        testFactory.populateState('alias');
        testFactory.populateState('main');
    });

    describe('Public methods', () => {
        test('POSITIVE: should return main state', () => {
            const mainState = entities.main.getState();

            expect(mainState).toHaveProperty('sweet-home/device1/$name', 'Yahoo Weather');
            expect(mainState).toHaveProperty('scenarios/scenario1/someTh1', 'value');
        });
    });

    describe('API methods', () => {
        test('POSITIVE: should call callback on processes `message` event and pass alias', () => {
            function testCb(receivedTopic) {
                expect(receivedTopic === '@test_alias' ||
                        receivedTopic === 'sweet-home/cb0wfwefmlwefwe/sensors/sky-sensor').toBe(true);
            }

            API.message(testCb);

            testFactory.sendMsgToScenario('sweet-home/cb0wfwefmlwefwe/sensors/sky-sensor', 'some value');
        });

        test('POSITIVE: should set value to topic by topic', (done) => {
            const value = 'SCENARIO API 2.0.0 : MAIN';
            const topic = 'sweet-home/some-topic1/some-topic2/$value';

            testFactory.onMsgFromScenario((receivedTopic, receivedValue) => {
                if (receivedTopic === `${topic}/set`) {
                    expect(receivedValue).toEqual(value);
                    done();
                }
            });

            API.set(topic, value);
        });

        test('POSITIVE: should set value to topic by alias', (done) => {
            const aliasName = '@test_alias';
            const aliasTopic = 'sweet-home/cb0wfwefmlwefwe/sensors/sky-sensor';
            const aliasValue = 'some value';

            testFactory.onMsgFromScenario((receivedTopic, receivedValue) => {
                if (receivedTopic === `${aliasTopic}/set`) {
                    expect(receivedValue).toEqual(aliasValue);
                    done();
                }
            });

            API.set(aliasName, aliasValue);
        });

        test('POSITIVE: should get topic`s value by alias or topic', () => {
            const value = 'Yahoo Weather';
            const topic = 'sweet-home/device1/$name';
            const actValue = API.get(topic);

            expect(actValue).toEqual(value);

            const alias = '@test_alias';
            const actValueByAlias = API.get(alias);

            expect(actValueByAlias).toEqual('some value');
        });
    });
});
