/* eslint-disable no-empty, no-param-reassign, import/order */
const BaseEntity = require('./Base');
const {
    topics: { TOPICS_ALIASES_TOPIC }
} = require('../etc/constants');

module.exports = class Alias extends BaseEntity {
    getAPI() {
        return {
            topic : this.topic.bind(this),
            get   : this.get.bind(this),
            set   : this.set.bind(this)
        };
    }

    populateState(topic, value) {
        if (RegExp(`^${TOPICS_ALIASES_TOPIC}`, 'g').test(topic) === false) return;

        let [ , entityId, attribute ] = topic.split('/'); // eslint-disable-line prefer-const

        attribute = attribute.replace('$', '');

        if (!this.state[entityId]) this.state[entityId] = {};

        this.state[entityId][attribute] = value;
    }

    set(alias, value, { withRetry = false } = {}) {
        const topic = this.topic(alias);

        if (!topic) {
            this.logger.warn(`Error: there is no topic with "${topic.replace('@', '')}" alias`);

            return;
        }

        this.entities.topic.set(topic, value, { withRetry });
    }

    get(alias) {
        const topic = this.topic(alias);

        if (!topic) {
            this.logger.warn(`Error: there is no topic with "${topic.replace('@', '')}" alias`);

            return null;
        }

        return this.entities.main.getFromState(topic);
    }

    topic(alias) {
        alias = alias.replace('@', '');

        return Object
            .values(this.state)
            .reduce((targetTopicName, obj) => (obj.name === alias ? obj.topic : targetTopicName), null);
    }

    aliasByTopic(topic) {
        return Object
            .values(this.state)
            .reduce((targetAlias, obj) => (obj.topic === topic ? obj.name : targetAlias), null);
    }

    topicByAliasOrTopic(topicOrAlias) {
        // eslint-disable-next-line no-unused-expressions
        return this.isAlias(topicOrAlias) ? this.topic(topicOrAlias) : topicOrAlias;
    }

    isAlias(string) {
        return string.startsWith('@');
    }
};
