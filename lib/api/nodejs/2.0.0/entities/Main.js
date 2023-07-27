const { sendDataToParentProc } = require('../utils');
const BaseEntity = require('./Base');
const {
    mqttProcInteractionEventTypes: {
        MQTT_RECEIVE,
        MQTT_READY_TO_RECEIVE_STATE
    },
    topics: {
        ROOT_TOPIC,
        HOMIE_TOPIC
    }
} = require('../etc/constants'); // eslint-disable-line import/order

module.exports = class Main extends BaseEntity {
    getFromState(key) {
        return this.state[key];
    }

    getAPI() {
        return {
            init    : this.init.bind(this),
            message : this.message.bind(this),
            set     : this.set.bind(this),
            get     : this.get.bind(this),
            args    : JSON.parse(process.env.SCENARIO_PARAMS)
        };
    }

    populateState(topic, value) {
        if (RegExp(`^${HOMIE_TOPIC}/`, 'g').test(topic) || RegExp(`^${ROOT_TOPIC}/`, 'g').test(topic)) {
            this.state[topic] = value;
        }
    }

    set(topicOrAlias, value, { withRetry = false } = {}) {
        const topic = this.entities.alias.topicByAliasOrTopic(topicOrAlias);

        if (!topic) {
            this.logger.warn(`Error: there is no topic with "${topicOrAlias.replace('@', '')}" alias`);

            return;
        }

        this.entities.topic.set(topic, value, { withRetry });
    }

    get(topicOrAlias) {
        const topic = this.entities.alias.topicByAliasOrTopic(topicOrAlias);

        if (!topic) {
            this.logger.warn(`Error: there is no topic with "${topicOrAlias.replace('@', '')}" alias`);

            return null;
        }

        return this.getFromState(topic);
    }

    message(cb) {
        const onMessage = (data) => {
            const { type, data: msgData } = data;

            if (type !== MQTT_RECEIVE) return;

            const { topic, msg } = msgData;
            const alias = this.entities.alias.aliasByTopic(topic);

            if (alias) cb(`@${alias}`, msg); // eslint-disable-line callback-return
            cb(topic, msg);
        };

        process.on('message', onMessage);

        return {
            off : () => process.off('message', onMessage)
        };
    }

    async init() {
        this.logger.info('INIT');
        sendDataToParentProc({ type: MQTT_READY_TO_RECEIVE_STATE });
        await this.entities.threshold.sync();
        this.logger.info('FINISH INIT');
    }
};
