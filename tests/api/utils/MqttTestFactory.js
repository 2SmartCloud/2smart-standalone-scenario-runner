const { mqttProcInteractionEventTypes: { MQTT_RECEIVE, MQTT_PUBLISH } } = require('../../../etc/constants.js');
const { context : { mode : MODE } } = require('../../../etc/config');

class MqttTestFactory {
    constructor(mockedState) {
        if (MODE !== 'test') throw new Error('Wrong mode');

        this.mockedState = mockedState;
        this.MSG_FROM_SCENARIO_EVENT = 'message:test';
    }

    populateState(key) {
        const stateMock = this.mockedState[key];

        Object.keys(stateMock).forEach(topic => {
            const msg = stateMock[topic];

            this.sendMsgToScenario(topic, msg);
        });
    }

    sendMsgToScenario(topic, msg) {
        process.emit('message', { type: MQTT_RECEIVE, data: { topic, msg, options: {} } });
    }

    onMsgFromScenario(cb, options = { callOnce: true }) {
        const decoratedCb = data => {
            const { type, data: msgData } = data;

            if (type === MQTT_PUBLISH) {
                const { msg, topic, options: opt } = msgData;

                return cb(topic, msg, opt);
            }
        };

        options.callOnce // eslint-disable-line no-unused-expressions
            ? process.once(this.MSG_FROM_SCENARIO_EVENT, decoratedCb)
            : process.on(this.MSG_FROM_SCENARIO_EVENT, decoratedCb);
    }

    offMsgFromScenario(cb) {
        process.off(this.MSG_FROM_SCENARIO_EVENT, cb);
    }
}

module.exports = MqttTestFactory;
