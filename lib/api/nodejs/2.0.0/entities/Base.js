const { onMessageFromMqtt, logger } = require('../utils');

module.exports = class Base {
    constructor() {
        this.logger = logger;

        this.state = {};
        this.entities = {};
    }

    initialize({ entities = {} }) {
        this.entities = entities;

        this.startStatePopulating();
    }

    getAPI() {
        throw new Error('getApi method should be implemented');
    }

    getState() {
        return this.state;
    }

    startStatePopulating() {
        if (this.populateState) onMessageFromMqtt(this.populateState.bind(this));
    }
};
