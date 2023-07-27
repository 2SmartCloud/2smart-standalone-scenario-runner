/* eslint-disable no-empty,no-param-reassign */
/* eslint-disable newline-after-var */
/* eslint-disable guard-for-in */
/* eslint-disable more/no-hardcoded-configuration-data*/
/* eslint-disable security/detect-non-literal-regexp*/
/* eslint-disable import/order*/
const nanoid                = require('nanoid');
const fetch                 = require('node-fetch');
const _findKey              = require('lodash/findKey');
const Influx                = require('influx');
const { validateThreshold } = require('../../../validations/threshold');

const {
    mqttProcInteractionEventTypes: {
        MQTT_RECEIVE,
        MQTT_PUBLISH,
        MQTT_STATE_TRANSFER,
        MQTT_READY_TO_RECEIVE_STATE
    },
    topics: {
        ROOT_TOPIC,
        GROUPS_TOPIC,
        HOMIE_TOPIC,
        NOTIFICATION_CHANNELS_TOPIC,
        TOPICS_ALIASES_TOPIC,
        NOTIFICATIONS_TOPIC
    }
} = require('./etc/constants');

const {
    TOPIC_NAME,
    SCENARIO_PARAMS,
    INFLUX_HOST,
    INFLUX_DATABASE,
    SYSTEM_NOTIFICATIONS_HASH
} = process.env;

const rootThTopic = `${ROOT_TOPIC}/${TOPIC_NAME}`;
const _re = {
    HOMIE                 : new RegExp(`^${HOMIE_TOPIC}/`, 'g'),
    GROUPS_OF_PROPERTIES  : new RegExp(`^${GROUPS_TOPIC}/`, 'g'),
    NOTIFICATION_CHANNELS : new RegExp(`^${NOTIFICATION_CHANNELS_TOPIC}`, 'g'),
    TOPICS_ALIASES        : new RegExp(`^${TOPICS_ALIASES_TOPIC}`, 'g'),
    THRESHOLDS            : new RegExp(`^${ROOT_TOPIC}/`, 'g'),
    ROOT_TH_TOPIC         : new RegExp(`^${rootThTopic}`, 'g')
};

const DEFAULT_STATE = {
    datatype : 'string',
    unit     : '#',
    format   : '',
    name     : TOPIC_NAME
};

const thState      = {};
let thresholdsList = [];

const state                = {};
const groups               = {};
const notificationChannels = {};
const SYNC_INTERVAL = 1000;
const INIT_TIMEOUT = 1500;


/**
 * Object which has entity IDs as keys and object with alias name and topic as value
 * Example:
 * {
 *     "entityId": {
 *         "name"  : "temperature-sensor",
 *         "topic" : "sweet-home/device/node/temperature-sensor"
 *     }
 * }
 **/
const ALIASES = {};

const isAlias = string => string.startsWith('@');

function findTopicByAlias(alias) {
    alias = alias.replace('@', '');

    return Object
        .values(ALIASES)
        .reduce((targetTopicName, obj) => (obj.name === alias ? obj.topic : targetTopicName), null);
}

function findAliasByTopic(topic) {
    return Object
        .values(ALIASES)
        .reduce((targetAlias, obj) => (obj.topic === topic ? obj.name : targetAlias), null);
}

function findTopicByAliasOrGetCurrentTopic(topicOrAlias) {
    // eslint-disable-next-line no-unused-expressions
    return isAlias(topicOrAlias) ? findTopicByAlias(topicOrAlias) : topicOrAlias;
}

function logger(...args) {
    console.log(...args);
}

function getLoggers() {
    return {
        info : console.log,
        warn : console.warn
    };
}

/**
 * Creates connection and returns methods for interacting with influx
 */
function getInfluxMethods() {
    if (!INFLUX_HOST || !INFLUX_DATABASE) {
        return { error: 'INFLUX_HOST or INFLUX_DATABASE not specified!' };
    }

    const influxClient = new Influx.InfluxDB({
        host     : INFLUX_HOST,
        database : INFLUX_DATABASE,
        schema   : [
            {
                measurement : 'timelines',
                fields      : {
                    string : Influx.FieldType.STRING,
                    number : Influx.FieldType.FLOAT
                },
                tags : [ 'topic', 'alias' ]
            }
        ]
    });

    return {
        query : influxClient.query.bind(influxClient)
    };
}

function subscribeToMessages() {
    try {
        const onMessage = (data) => {
            const { type, data: msgData } = data;

            if (type === MQTT_RECEIVE) {
                const { topic, msg } = msgData;

                return handleMessage(topic, msg);
            } else if (type === MQTT_STATE_TRANSFER) {
                const { state: newState } = msgData;
                Object.keys(newState).forEach(key => handleMessage(key, newState[key]));
            }
        };

        process.on('message', onMessage);

        return {
            off : () => process.off('message', onMessage)
        };
    } catch (e) {
        console.log(e);
    }
}

function publishMessage(topic, msg, options) {
    sendDataToParentProc({ type: MQTT_PUBLISH, data: { topic, msg, options } });
}

function sendDataToParentProc({ type, data = {} }) {
    process.send({ type, data });
}

function handleMessage(topic, value) {
    const msg = value.toString();

    if (topic.search(_re.ROOT_TH_TOPIC) !== -1) handleThresholdMsg(topic, msg);
    else if (topic.search(_re.HOMIE) !== -1 || topic.search(_re.THRESHOLDS) !== -1) handleHomieTopic(topic, msg);
    else if (topic.search(_re.GROUPS_OF_PROPERTIES) !== -1) handleGroupTopic(topic, msg);
    else if (topic.search(_re.NOTIFICATION_CHANNELS) !== -1) handleNotificationChannelsTopic(topic, msg);
    else if (topic.search(_re.TOPICS_ALIASES) !== -1) handleTopicsAliasesTopic(topic, msg);
}

function handleTopicsAliasesTopic(topic, value) {
    let [ , entityId, attribute ] = topic.split('/'); // eslint-disable-line prefer-const

    attribute = attribute.replace('$', '');

    if (!ALIASES[entityId]) ALIASES[entityId] = {};

    ALIASES[entityId][attribute] = value;
}

function handleNotificationChannelsTopic(topic, value) {
    try {
        const [ , channelId, attributeOrEvent, event ] = topic.split('/');

        // Ignore events
        if (event || [ 'create', 'update', 'delete', 'set' ].includes(attributeOrEvent)) return;

        if (attributeOrEvent) {
            if (!notificationChannels[channelId]) notificationChannels[channelId] = {};

            const attributeName = attributeOrEvent.replace('$', '');

            if (attributeName === 'configuration') {
                notificationChannels[channelId][attributeName] = JSON.parse(value);
            } else {
                notificationChannels[channelId][attributeName] = value;
            }
        }
    } catch (err) {
        logger(err);
    }
}

function handleGroupTopic(topic, value) {
    const map = topic.split('/');
    // ignore set event
    if (map[3] === 'set') return;

    if (map[2]) {
        if (!groups[map[1]]) groups[map[1]] = {};

        const key = map[2].replace('$', '');
        groups[map[1]][key] = value;
    }
}

function handleHomieTopic(topic, value) {
    state[topic] = value;
}

function handleThresholdMsg(topic, msgBuffer) {
    const msg = msgBuffer.toString();
    const parsedTopics = topic.split('/');
    const thId = parsedTopics[2];
    const key = topic.replace(`${rootThTopic}/${thId}/$`, '');

    if (!thId) {
        logger(`handleThresholdMsg wrong threshold id - ${thId}`);

        return;
    }

    if (topic === `${rootThTopic}/$thresholds`) {
        if (msg) thresholdsList = msg.split(',').filter(id => !id.includes('$') && !id.includes('undefined'));

        return;
    }

    thState[thId] = thState[thId] || {};

    if (thId === '$state') {
        thState[thId].name = '$state';
        thState[thId].datatype = 'string';
    }

    if (parsedTopics.length === 3) { // eslint-disable-line no-magic-numbers
        thState[thId].value = msg;

        return;
    }

    thState[thId][key] = msg;
}


function getThState(id) {
    return thState[id] ? thState[id].value : undefined;
}

function getState() {
    return state;
}

function getThId(topicOrAlias) {
    const topic = findTopicByAliasOrGetCurrentTopic(topicOrAlias);

    if (!topic) {
        logger(`Error: there is no topic with "${topicOrAlias.replace('@', '')}" alias`);

        return null;
    }

    return state[topic];
}

function message(cb) {
    const onMessage = (data) => {
        const { type, data: msgData } = data;

        if (type !== MQTT_RECEIVE) return;

        const { topic, msg } = msgData;
        const alias = findAliasByTopic(topic);

        if (alias) cb(`@${alias}`, msg); // eslint-disable-line callback-return
        cb(topic, msg);
    };

    process.on('message', onMessage);

    return {
        off : () => process.off('message', onMessage)
    };
}

// eslint-disable-next-line no-magic-numbers
function setWithRetry(topic, value, retriesNumber = 10, retriesInterval = 1500) {
    return new Promise(async (resolve, reject) => {  // eslint-disable-line no-async-promise-executor
        const publishTopic = topic.replace('/set', '');
        let done = false;
        const { off } = scenario.message((receivedTopic, receivedMessage) => { // eslint-disable-line no-undef
            if (receivedTopic === publishTopic && receivedMessage.toString() === value) {
                off();
                done = true;
            }
        });

        for (let i = 0; i < retriesNumber; i++) { // eslint-disable-line more/no-c-like-loops
            if (!done) {
                // mqttClient.publish(topic, `${value}`, { retain: false });
                publishMessage(topic, `${value}`, { retain: false });
                // sleep some time between publishes
                await new Promise(res => setTimeout(res, retriesInterval));
            } else {
                resolve();
            }
        }

        reject(new Error(`Error with setting "${topic}" topic, after ${retriesNumber} retries`));
    });
}

function set(topicOrAlias, value, { withRetry = false } = {}) {
    let topic = findTopicByAliasOrGetCurrentTopic(topicOrAlias);

    if (!topic) {
        logger(`Error: there is no topic with "${topicOrAlias.replace('@', '')}" alias`);

        return;
    }

    if (value === null || value === undefined) value = '';
    else if (typeof value === 'string');
    else if (typeof value === 'boolean' || typeof value === 'number' || Array.isArray(value) || typeof value === 'object') value = JSON.stringify(value);
    else value = `${value}`;

    if (!/\/set$/.exec(topic)) topic = `${topic}/set`; // eslint-disable-line security/detect-child-process

    if (withRetry) {
        return setWithRetry(topic, value);
    }

    publishMessage(topic, value, { retain: false });
}

function setGroupValue(groupName, value) {
    const groupId = _findKey(groups, g => g.name === groupName);

    if (!groupId) {
        logger(`Grоup with name - ${groupName} not found!`);

        return;
    }

    set(`${GROUPS_TOPIC}/${groupId}/$value/set`, value);
}

function getGroupValue(groupName) {
    const groupId = _findKey(groups, g => g.name === groupName);

    if (!groupId) {
        logger(`Group with name - ${groupName} not found!`);

        return;
    }

    return groups[groupId].value;
}


function _sync() {
    let ok;

    const int = setInterval(() => {
        let valid = true;

        for (const id of thresholdsList) {
            try {
                if (![ '$state', '$thresholds', 'undefined' ].includes(id)) validateThreshold({ id, obj: thState[id] });
            } catch (e) {
                valid = false;
            }
        }

        if (valid) {
            clearInterval(int);
            ok();

            return;
        }
    }, SYNC_INTERVAL);

    return new Promise(resolve => (ok = resolve));
}

async function init() {
    logger('INIT');
    subscribeToMessages();
    sendDataToParentProc({ type: MQTT_READY_TO_RECEIVE_STATE });
    await _sync();

    return new Promise(resolve => {
        setTimeout(() => {
            logger('FINISH INIT');
            resolve();
        }, INIT_TIMEOUT);
    });
}

function initThreshold(id, obj = {}) {
    try {
        const userInput = { id, obj: { ...DEFAULT_STATE, ...obj } };
        const validData = validateThreshold(userInput);

        const newObj = {
            settable : 'true',
            retained : 'true',
            ...validData.obj
        };

        /**
         * If user want to change datatype for existing threshold then reset value
         * for this threshold
         */
        if (thState[id]) {
            if (thState[id].retained === 'true' && newObj.retained === 'false') {
                publishMessage(`${rootThTopic}/${id}`, '', { retain: true });

                delete thState[id].value;
            } else if (thState[id].retained === 'false' && newObj.retained === 'true') {
                // skip
            } else {
                let needPublishValue = false;

                if (thState[id].datatype !== newObj.datatype) {
                    if (thState[id].datatype === 'float' && newObj.datatype === 'integer') { // float -> integer
                        const value = thState[id].value;
                        thState[id].value = (value) ? `${Math.floor(thState[id].value)}` : value;
                        if (thState[id].value === 'NaN') thState[id].value = '';
                        needPublishValue = true;
                    } else if (thState[id].datatype === 'integer' && newObj.datatype === 'float') {// integer -> float
                        // stay
                    } else {
                        thState[id].value = '';
                        needPublishValue = true;
                    }
                }

                if (needPublishValue) {
                    publishMessage(`${rootThTopic}/${id}`, thState[id].value, { retain: newObj.retained === 'true' });
                }
            }
        }

        // publish other attributes
        for (const attribute in newObj) {
            publishMessage(`${rootThTopic}/${id}/$${attribute}`, `${newObj[attribute]}`, { retain: true });
        }

        thState[id] = {
            ...thState[id],
            ...newObj
        };

        const thresholds = Object.keys(thState)
            .toString().split(',')
            .filter(key => !key.includes('$') && !key.includes('undefined')).join(','); // threshold IDs

        publishMessage(`${rootThTopic}/$thresholds`, thresholds, { retain: true });
    } catch (e) { // eslint-disable-line no-empty
        logger(e);
    }
}

function getThresholdTopic(id) {
    return `${rootThTopic}/${id}`;
}

function getThresholdTopicByScenarioId(scenarioId, thresholdId) {
    return `${ROOT_TOPIC}/${scenarioId}/${thresholdId}`;
}

const { AliasNotify } = require('../../../notifications');

function getUniqueId() {
    return nanoid.customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 20)(); // eslint-disable-line no-magic-numbers
}

function systemNotify(msg) {
    const topic = `${NOTIFICATIONS_TOPIC}/${getUniqueId()}/create`;

    publishMessage(topic, JSON.stringify({ type: 'text', message: msg, senderType: 'scenario-runner', senderHash: SYSTEM_NOTIFICATIONS_HASH, logLevel: 'info' }), { retain: false });
}

async function notify(alias, msg) {
    if (!msg || alias === '@system') {
        if (!msg) msg = alias;

        return systemNotify(msg);
    }

    // Find channel with current alias
    const channel = Object.values(notificationChannels).find(el => el.alias === alias);

    if (channel) {
        if (channel.state === 'enabled') {
            try {
                await AliasNotify(channel, msg);
            } catch (error) {
                logger(error);
            }
        }
    } else {
        logger('There is no notification channel with such alias');
    }
}

/**
 * Initialize threshold with given datatype and call the callback
 * on every its publish with passed value to this threshold topic
 * @param thresholdId  {String}  - threshold ID to create
 * @param callback     {Object}  - a callback to call
 * @param datatype     {String} [datatype='boolean'] - datatype for threshold value
 */
function initMethod(thresholdId, callback, datatype = 'boolean') {
    initThreshold(thresholdId, { // create threshold and listen to its publishing to trigger target callback
        datatype,
        retained : 'false'
    });

    const thresholdTopic = getThresholdTopic(thresholdId);

    message((topic, msg) => {
        if (topic === thresholdTopic) {
            try {
                const value = msg.toString();

                return callback(value); // on current threshold publish call the callback with passed params
            } catch (err) {
                logger(err);
            }
        }
    });
}

/**
 * Call method which is related with passed threshold id and scenario id
 * @param scenarioId  {String} - scenario id for threshold
 * @param thresholdId {String} - threshold id which is related with some method created by initMethod function
 * @param value       {Any}    - value to set for threshold
 */
function callMethod(scenarioId, thresholdId, value) {
    const thresholdTopicByScenarioId = getThresholdTopicByScenarioId(scenarioId, thresholdId);
    set(thresholdTopicByScenarioId, value);
}

const macros = require('../../../macros');

module.exports = {
    fetch,
    init,
    set,
    message,
    initThreshold,
    getState,
    get       : getThId,
    getTarget : getThState,
    influx    : getInfluxMethods(),
    notify,
    macros,
    setGroupValue,
    getGroupValue,
    getThresholdTopic,
    getThresholdTopicByScenarioId,
    initMethod,
    callMethod,
    findTopicByAlias,
    args      : JSON.parse(SCENARIO_PARAMS),
    log       : getLoggers()
};
