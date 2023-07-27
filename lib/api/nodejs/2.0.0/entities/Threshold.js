/* eslint-disable guard-for-in, import/order */
const BaseEntity = require('./Base');
const { validateThreshold } = require('../../../../validations/threshold');
const { publishMessage } = require('../utils');
const {
    topics: { ROOT_TOPIC },
    entities: {
        threshold: { SYNC_INTERVAL }
    }
} = require('../etc/constants');

const { TOPIC_NAME } = process.env;

const DEFAULT_STATE = {
    datatype : 'string',
    unit     : '#',
    format   : '',
    name     : TOPIC_NAME
};

module.exports = class Threshold extends BaseEntity {
    constructor() {
        super();

        this.thList = [];
        this.rootThTopic = `${ROOT_TOPIC}/${TOPIC_NAME}`;
    }

    getAPI() {
        return {
            init  : this.init.bind(this),
            value : this.value.bind(this),
            topic : this.topic.bind(this)
        };
    }

    populateState(topic, value) {
        if (RegExp(`^${this.rootThTopic}`, 'g').test(topic) === false) return;

        const parsedTopics = topic.split('/');
        const thId = parsedTopics[2];
        const key = topic.replace(`${this.rootThTopic}/${thId}/$`, '');

        if (!thId) {
            this.logger.info(`handleThresholdMsg wrong threshold id - ${thId}`);

            return;
        }

        if (topic === `${this.rootThTopic}/$thresholds`) {
            if (value) this.thList.push(...value.split(',').filter(id => !id.includes('$') && !id.includes('undefined')));

            return;
        }

        this.state[thId] = this.state[thId] || {};

        if (thId === '$state') {
            this.state[thId].name = '$state';
            this.state[thId].datatype = 'string';
        }

        if (parsedTopics.length === 3) { // eslint-disable-line no-magic-numbers
            this.state[thId].value = value;

            return;
        }

        this.state[thId][key] = value;
    }

    getList() {
        return this.thList;
    }

    value(id) {
        return this.state[id] ? this.state[id].value : undefined;
    }

    async sync() {
        let ok;

        const int = setInterval(() => {
            let valid = true;

            for (const id of this.thList) {
                try {
                    if (![ '$state', '$thresholds', 'undefined' ].includes(id)) validateThreshold({ id, obj: this.state[id] });
                } catch (e) {
                    valid = false;
                }
            }

            if (valid) {
                clearInterval(int);
                ok();

                return;
            }
        }, SYNC_INTERVAL);

        return new Promise(resolve => (ok = resolve));
    }

    init(id, obj = {}) {
        try {
            const userInput = { id, obj: { ...DEFAULT_STATE, ...obj } };
            const validData = validateThreshold(userInput);

            const newObj = {
                settable : 'true',
                retained : 'true',
                ...validData.obj
            };

            /**
             * If user want to change datatype for existing threshold then reset value
             * for this threshold
             */
            if (this.state[id]) {
                if (this.state[id].retained === 'true' && newObj.retained === 'false') {
                    publishMessage(`${this.rootThTopic}/${id}`, '', { retain: true });

                    delete this.state[id].value;
                } else if (this.state[id].retained === 'false' && newObj.retained === 'true') {
                    // skip
                } else {
                    let needPublishValue = false;

                    if (this.state[id].datatype !== newObj.datatype) {
                        if (this.state[id].datatype === 'float' && newObj.datatype === 'integer') { // float -> integer
                            const thValue = this.state[id].value;

                            this.state[id].value = (thValue) ? `${Math.floor(this.state[id].value)}` : thValue;
                            if (this.state[id].value === 'NaN') this.state[id].value = '';
                            needPublishValue = true;
                        } else if (this.state[id].datatype === 'integer' && newObj.datatype === 'float') {// integer -> float
                            // stay
                        } else {
                            this.state[id].value = '';
                            needPublishValue = true;
                        }
                    }

                    if (needPublishValue) {
                        publishMessage(`${this.rootThTopic}/${id}`, this.state[id].value, { retain: newObj.retained === 'true' });
                    }
                }
            }

            // publish other attributes
            for (const attribute in newObj) {
                publishMessage(`${this.rootThTopic}/${id}/$${attribute}`, `${newObj[attribute]}`, { retain: true });
            }

            this.state[id] = {
                ...this.state[id],
                ...newObj
            };
            const thresholds = Object.keys(this.state).toString().split(',')
                .filter(key => !key.includes('$') && !key.includes('undefined')).join(','); // threshold IDs

            publishMessage(`${this.rootThTopic}/$thresholds`, thresholds, { retain: true });
        } catch (e) { // eslint-disable-line no-empty
            this.logger.warn(e);
        }
    }

    topic(thresholdId, scenarioId = null) {
        if (scenarioId) return `${ROOT_TOPIC}/${scenarioId}/${thresholdId}`;

        return `${this.rootThTopic}/${thresholdId}`;
    }
};
