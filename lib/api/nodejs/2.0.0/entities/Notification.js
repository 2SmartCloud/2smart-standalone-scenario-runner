/* eslint-disable security/detect-non-literal-regexp, import/order*/
const BaseEntity = require('./Base');
const { AliasNotify } = require('../../../../notifications');
const { getUniqueId, publishMessage } = require('../utils');
const {
    topics: {
        NOTIFICATION_CHANNELS_TOPIC,
        NOTIFICATIONS_TOPIC
    }
} = require('../etc/constants');

const {
    SYSTEM_NOTIFICATIONS_HASH
} = process.env;

module.exports = class Notify extends BaseEntity {
    getAPI() {
        return {
            channel : this.channel.bind(this),
            system  : this.system.bind(this)
        };
    }

    populateState(topic, value) {
        try {
            if (RegExp(`^${NOTIFICATION_CHANNELS_TOPIC}`, 'g').test(topic) === false) return;

            const [ , channelId, attributeOrEvent, event ] = topic.split('/');

            // Ignore events
            if (event || [ 'create', 'update', 'delete', 'set' ].includes(attributeOrEvent)) return;

            if (attributeOrEvent) {
                if (!this.state[channelId]) this.state[channelId] = {};

                const attributeName = attributeOrEvent.replace('$', '');

                if (attributeName === 'configuration') {
                    this.state[channelId][attributeName] = JSON.parse(value);
                } else {
                    this.state[channelId][attributeName] = value;
                }
            }
        } catch (err) {
            this.logger.warn(err);
        }
    }

    async system(alias, msg) {
        if (alias !== '@system' && msg) return;
        if (!msg) msg = alias; // eslint-disable-line no-param-reassign

        const topic = `${NOTIFICATIONS_TOPIC}/${getUniqueId()}/create`;

        publishMessage(topic, JSON.stringify({
            type       : 'text',
            message    : msg,
            senderType : 'scenario-runner',
            senderHash : SYSTEM_NOTIFICATIONS_HASH,
            logLevel   : 'info'
        }), { retain: false });
    }

    async channel(alias, msg) {
        // Find channel with current alias
        const channel = Object.values(this.state).find(el => el.alias === alias);

        if (channel) {
            if (channel.state === 'enabled') {
                try {
                    await AliasNotify(channel, msg);
                } catch (error) {
                    this.logger.warn(error);
                }
            }
        } else {
            this.logger.warn('There is no notification channel with such alias');
        }
    }
};

