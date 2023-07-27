/* eslint-disable import/order*/
const BaseEntity = require('./Base');
const { onMessageFromMqtt } = require('../utils');

module.exports = class Method extends BaseEntity {
    getAPI() {
        return {
            call : this.call.bind(this),
            init : this.init.bind(this)
        };
    }

    call(scenarioId, thresholdId, value) {
        const thresholdTopicByScenarioId = this.entities.threshold.topic(thresholdId, scenarioId);

        this.entities.topic.set(thresholdTopicByScenarioId, value);
    }

    init(thresholdId, callback, datatype = 'boolean') {
        // create threshold and listen to its publishing to trigger target callback
        this.entities.threshold.init(thresholdId, {
            datatype,
            retained : 'false'
        });

        const thresholdTopic = this.entities.threshold.topic(thresholdId);

        onMessageFromMqtt((receivedTopic, msg) => {
            let topic = receivedTopic;
            const alias = this.entities.alias.aliasByTopic(receivedTopic);

            if (alias) topic = `@${alias}`;

            if (topic === thresholdTopic) {
                try {
                    const value = msg.toString();

                    return callback(value); // on current threshold publish call the callback with passed params
                } catch (err) {
                    this.logger.warn(err);
                }
            }
        });
    }
};
