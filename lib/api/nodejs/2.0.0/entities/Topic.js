/* eslint-disable newline-after-var */
/* eslint-disable no-param-reassign */
const { publishMessage, onMessageFromMqtt } = require('../utils');
const BaseEntity = require('./Base');

module.exports = class Topic extends BaseEntity {
    getAPI() {
        return {
            get : this.get.bind(this),
            set : this.set.bind(this)
        };
    }

    set(topic, value, { withRetry = false } = {}) {
        if (value === null || value === undefined) value = '';
        else if (typeof value === 'string');
        else if (typeof value === 'boolean'
                || typeof value === 'number'
                || Array.isArray(value)
                || typeof value === 'object') value = JSON.stringify(value);
        else value = `${value}`;

        if (!/\/set$/.exec(topic)) topic = `${topic}/set`; // eslint-disable-line security/detect-child-process

        if (withRetry) {
            return this._setWithRetry(topic, value);
        }

        publishMessage(topic, value, { retain: false });
    }

    get(topic) {
        return this.entities.main.getFromState(topic);
    }

    // eslint-disable-next-line no-magic-numbers
    _setWithRetry(topic, value, retriesNumber = 10, retriesInterval = 1500) {
        return new Promise(async (resolve, reject) => {// eslint-disable-line no-async-promise-executor
            const publishTopic = topic.replace('/set', '');
            let done = false;

            const { off } = onMessageFromMqtt((receivedTopic, receivedMessage) => {
                const alias = this.entities.alias.aliasByTopic(receivedTopic);
                if (alias) receivedTopic = `@${alias}`;

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
};
