/* eslint-disable import/order*/
const BaseEntity = require('./Base');
const _findKey = require('lodash/findKey');
const {
    topics: { GROUPS_TOPIC }
} = require('../etc/constants');

module.exports = class Group extends BaseEntity {
    getAPI() {
        return {
            get : this.get.bind(this),
            set : this.set.bind(this)
        };
    }

    populateState(topic, value) {
        if (RegExp(`^${GROUPS_TOPIC}/`, 'g').test(topic) === false) return;

        const map = topic.split('/');

        // ignore set event
        if (map[3] === 'set') return;

        if (map[2]) {
            if (!this.state[map[1]]) this.state[map[1]] = {};

            const key = map[2].replace('$', '');

            this.state[map[1]][key] = value;
        }
    }

    set(groupName, value) {
        const groupId = _findKey(this.state, g => g.name === groupName);

        if (!groupId) {
            this.logger.info(`Group with name - ${groupName} not found!`);

            return;
        }

        this.entities.topic.set(`${GROUPS_TOPIC}/${groupId}/$value/set`, value);
    }

    get(groupName) {
        const groupId = _findKey(this.state, g => g.name === groupName);

        if (!groupId) {
            this.logger.info(`Group with name - ${groupName} not found!`);

            return;
        }

        return this.state[groupId].value;
    }
};
