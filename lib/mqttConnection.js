const mqtt = require('mqtt');

const {
    mqttProcInteractionEventTypes : {
        MQTT_RECEIVE,
        MQTT_PUBLISH
    }
} = require('../etc/constants');

const {
    mqtt: {
        uri: MQTT_URI,
        username: MQTT_USER,
        password: MQTT_PASS
    }
} = require('../etc/config');

class MqttConnection {
    constructor(debug) {
        this.onMessageActions = [];
        this.debug = debug;
        this.state = {};

        this.onNewMessage = this.onNewMessage.bind(this);
    }

    async start() {
        this.mqttClient = mqtt.connect(MQTT_URI, {
            username : MQTT_USER,
            password : MQTT_PASS
        });
        this.mqttClient.on('error', error => this.debug.warning(error));

        return new Promise(resolve => {
            this.mqttClient.once('connect', async () => {
                this._logOnConnect();
                this.subscribeOnEvent('message', this.onNewMessage);
                resolve();
            });
        });
    }

    async subscribe(topic) {
        try {
            await new Promise((res, rej) => this.mqttClient.subscribe(topic, err => err ? rej(err) : res()));
        } catch (err) {
            this.debug.warning('SUBSCRIBE ERROR', err);
        }
    }

    onNewMessage(topic, msg) {
        const payload = {  type: MQTT_RECEIVE, data: { topic, msg: msg.toString() } };

        this.state[topic] = msg.toString();

        this.onMessageActions.forEach(actionCb => actionCb(payload));
    }

    subscribeOnEvent(event, cb) {
        this.mqttClient.on(event, cb);
    }

    unsubscribeFromEvent(event, cb) {
        this.mqttClient.off(event, cb);
    }

    addOnMessageAction(cb) {
        this.onMessageActions.push(cb);
    }

    publishMessage(data) {
        const { type, data: msgData } = data;

        if (type === MQTT_PUBLISH) {
            const { msg, topic, options } = msgData;

            return this.mqttClient.publish(topic, msg, options);
        }
    }

    getState() {
        return this.state;
    }

    async waitSyncing() {
        let timeout;
        const MAX_DELAY = 10000;
        const startedAt = Date.now();

        return new Promise((res, rej) => {
            try {
                const resetTimeout = () => {
                    if (MAX_DELAY < (Date.now() - startedAt)) return synced();

                    clearTimeout(timeout);
                    // eslint-disable-next-line no-magic-numbers
                    timeout = setTimeout(synced, 1000);
                };

                const synced = () => {
                    clearTimeout(timeout);
                    this.unsubscribeFromEvent('message', resetTimeout);
                    res();
                };

                setTimeout(resetTimeout, MAX_DELAY);

                this.subscribeOnEvent('message', resetTimeout);
            } catch (e) {
                rej(e);
            }
        });
    }

    _logOnConnect() {
        this.debug.info(`CONNECTED TO ${MQTT_URI}`);
    }
}

module.exports = MqttConnection;
