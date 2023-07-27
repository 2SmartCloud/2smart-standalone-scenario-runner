const nanoid = require('nanoid');
const { context : { mode : MODE } } = require('../../../../etc/config');
const {
    mqttProcInteractionEventTypes: {
        MQTT_RECEIVE,
        MQTT_PUBLISH,
        MQTT_STATE_TRANSFER
    }
} = require('./etc/constants');

const logger = {
    info : (...args) => console.log(...args),
    warn : (...args) => console.warn(...args)
};

function getUniqueId() {
    return nanoid.customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 20)(); // eslint-disable-line no-magic-numbers
}

function onMessageFromMqtt(cb) {
    const onMessage = (data) => {
        const { type, data: msgData } = data;

        if (type === MQTT_RECEIVE) {
            const { topic, msg } = msgData;

            return cb(topic, msg);
        } else if (type === MQTT_STATE_TRANSFER) {
            const { state: newState } = msgData;

            Object.keys(newState).forEach(key => cb(key, newState[key]));
        }
    };

    process.on('message', onMessage);

    return {
        off : () => process.off('message', onMessage)
    };
}

function publishMessage(topic, msg, options) {
    const payloadToSend = { type: MQTT_PUBLISH, data: { topic, msg, options } };

    process.send(payloadToSend);

    if (MODE === 'test') {
        process.emit('message:test', payloadToSend);
    }
}

function sendDataToParentProc({ type, data }) {
    process.send({ type, data });
}

module.exports = {
    getUniqueId,
    logger,
    onMessageFromMqtt,
    publishMessage,
    sendDataToParentProc
};
