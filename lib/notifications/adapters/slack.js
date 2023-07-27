/* eslint-disable func-names */
/* eslint-disable no-undef */
/* eslint-disable no-param-reassign */
const rp = require('request-promise');
const _ = require('underscore');

class SlackNotifications {
    constructor(config) {
        this.webhook = config.webhook;
    }

    async sendMessage(message) {
        if (!this.webhook) throw new Error('Wrong configuration. "webhook" is required!');
        switch (typeof message) {
            case 'object':
                if (!message.hasOwnProperty('text')) throw new Error('"text" property is required!');
                break;
            default:
                message = { text: `${message}` };
                break;
        }

        const data = { ... _.pick(message, 'text', 'type', 'emoji', 'verbatim') };
        const results = await rp.post(this.webhook, { json: data });

        return results;
    }

    async sendAlias(message) {
        return this.sendMessage(message);
    }
}

module.exports = SlackNotifications;
