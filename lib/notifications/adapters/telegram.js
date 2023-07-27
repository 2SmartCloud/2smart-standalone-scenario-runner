/* eslint-disable func-names */
/* eslint-disable no-param-reassign */
const rp = require('request-promise');
const _ = require('underscore');

class TelegramNotifications {
    constructor(config) {
        this.chat_id = config.chatId;
        this.token = config.token;
    }

    async sendMessage(message) {
        if (!this.chat_id) throw new Error('Wrong configuration. "chat_id" is required!');
        switch (typeof message) {
            case 'object':
                if (!message.hasOwnProperty('text')) throw new Error('"text" property is required!');
                break;
            default:
                message = { text: `${message}` };
                break;
        }

        const data = { ... _.pick(message, 'text', 'parse_mode', 'disable_web_page_preview', 'disable_notification'), 'chat_id': this.chat_id };
        const results = await rp.post(`https://api.telegram.org/${this.token}/sendMessage`, { json: data });

        return results;
    }

    async sendAlias(message) {
        return this.sendMessage(message);
    }
}

module.exports = TelegramNotifications;
