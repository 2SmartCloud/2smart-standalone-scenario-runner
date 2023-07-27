/* eslint-disable more/no-hardcoded-configuration-data*/
/* eslint-disable security/detect-child-process*/
/* eslint-disable security/detect-non-literal-regexp*/
const { fork }                = require('child_process');
const path                    = require('path');
const _                       = require('underscore');
const HomieServer             = require('homie-sdk/lib/homie/HomieServer');
const MqttConnection          = require('./mqttConnection');

const NotificationChannels    = require('./../lib/services/NotificationChannels');
const Thresholds              = require('./../lib/services/Thresholds');

const {
    topics: {
        ROOT_TOPIC,
        GROUPS_TOPIC,
        HOMIE_TOPIC,
        NOTIFICATION_CHANNELS_TOPIC,
        TOPICS_ALIASES_TOPIC
    },
    mqttProcInteractionEventTypes: { MQTT_STATE_TRANSFER }
} = require('../etc/constants'); // eslint-disable-line import/order

const RUNNERS = {
    js : 'node.js'
};
const DEFAULT_RESTART_INTERVAL = 10000;

/*
env - object, default env for child processes, SCENARIO_PATH, TOPIC_NAME fields will be rewritten
runnersDir - runnersDir
runnersSDK - object with keys - languages, and values - names of runners
 */
class ScenarioRunner {
    constructor({ env, runnersDir, runnersSDK, restartInterval, debug, homie, homieMigrator }) {
        this.listeners = [];
        this.processes = {};
        this.defaultEnv = env || {};
        this.runnersDir = runnersDir || path.join(__dirname, './runners');
        this.runnersSDK = _.defaults(runnersSDK, RUNNERS);
        this.restartInterval = restartInterval || DEFAULT_RESTART_INTERVAL;
        this.debug = debug;

        this.homie = homie;
        this.homieMigrator = homieMigrator;
        this.homieServer = new HomieServer({ homie: this.homie });

        this.notificationChannels = new NotificationChannels({ homieMigrator: this.homieMigrator, debug });
        this.thresholds = new Thresholds({ homieServer: this.homieServer, debug });
        this.mqttConnection = new MqttConnection(debug);

        this._sendToProcess = this._sendToProcess.bind(this);

        this.mqttConnection.addOnMessageAction(this._sendToProcess);
    }

    get messageFromScenarioHandlers() {
        return { // msg type: msg handler
            MQTT_READY_TO_RECEIVE_STATE : ({ proc }) => this._sendStateToScenario(proc),
            MQTT_PUBLISH                : ({ data }) => this.mqttConnection.publishMessage(data)
        };
    }

    async initWorld() {
        await this.homie.init();
        await this.notificationChannels.init();
        await this.mqttConnection.start();
        await this.mqttConnection.subscribe([
            `${NOTIFICATION_CHANNELS_TOPIC}/#`,
            `${TOPICS_ALIASES_TOPIC}/#`,
            `${GROUPS_TOPIC}/#`,
            `${HOMIE_TOPIC}/#`,
            `${ROOT_TOPIC}/#`
        ]);

        await this.mqttConnection.waitSyncing();

        this.thresholds.init();
    }

    addListener(listener) {
        listener.on('newScenario', this.onNewScenario.bind(this));
        listener.on('changedScenario', this.onChangedScenario.bind(this));
        listener.on('stoppedScenario', this.onStoppedScenario.bind(this));
        listener.on('deletedScenario', this.onDeletedScenario.bind(this));
        listener.on('error', this.onError.bind(this));
        this.listeners.push(listener);
    }

    async onNewScenario(data) {
        this.debug.info('ScenarioRunner.onNewScenario', data);
        try {
            await this._proceed(data);
        } catch (e) {
            this.onError(e);
        }
    }

    async onChangedScenario(data) {
        this.debug.info('ScenarioRunner.onChangedScenario', data);
        try {
            this._cancelRestart(data.key);
            this._killProc(data.key);
            await this._proceed(data);
        } catch (e) {
            this.onError(e);
        }
    }

    onStoppedScenario(data) {
        this.debug.info('ScenarioRunner.onStoppedScenario', data);
        try {
            this._cancelRestart(data.key);
            this._killProc(data.key);
        } catch (e) {
            this.onError(e);
        }
    }

    onDeletedScenario(data) {
        this.debug.info('ScenarioRunner.onDeletedScenario', data);
        try {
            this._deleteScenario(data.topicName);

            if (!this.processes[data.key]) {
                this.debug.info('ScenarioRunner.onDeletedScenario', `Process "${data.key}" already stopped!`);

                return;
            }

            this._cancelRestart(data.key);
            this._killProc(data.key);
        } catch (e) {
            this.onError(e);
        }
    }

    onError(error) {
        this.debug.info('ScenarioRunner.onError', error);
    }

    _cancelRestart(key) {
        const data = this.processes[key];

        clearTimeout(data.restartTimeoutId);
        data.restarting = false;
    }

    _restartProcess(key) {
        this.debug.info('ScenarioRunner._restartProcess', `Start - ${key}`);

        const procData = this.processes[key];
        const { file, running, restarting } = procData;

        this.debug.info('ScenarioRunner._restartProcess', { file, running, restarting, key });

        if (procData.running) return;
        if (procData.restarting) return;

        this.debug.info('ScenarioRunner._restartProcess', `Restarting - ${key}`);

        procData.restarting = true;
        procData.restartTimeoutId = setTimeout(async () => {
            if (procData !== this.processes[key]) {
                this.debug.warning('ScenarioRunner._restartProcess', `Another process started with the same file. Key - ${key}, File - ${procData.file}}`);

                return;
            }

            this._cancelRestart(key);
            await this._proceed(procData);
        }, this.restartInterval);
    }

    async _proceed({ key, file, language, topicName, params = {} }) {
        const runner = path.join(this.runnersDir, this.runnersSDK[language]);

        await this.mqttConnection.subscribe(`${ROOT_TOPIC}/${topicName}/$thresholds`);

        if (!runner) throw new Error(`No available runner for current language(${language}).`);

        const procData = {
            key,
            file,
            topicName,
            language,
            params,
            proc             : null,
            running          : true,
            restarting       : false,
            restartTimeoutId : null
        };
        const proc = fork(
            runner,
            {
                env : {
                    ...this.defaultEnv,
                    SCENARIO_PATH   : file,
                    TOPIC_NAME      : topicName,
                    SCENARIO_PARAMS : JSON.stringify(params)
                },
                silent : true
            }
        );

        proc.on('message', data => this._onScenarioMessage(data, proc));
        proc.on('error', e => {
            this.debug.info('ScenarioRunner._proceed.error', { key, file });
            this.onError(e);

            this._killOrRestartProc(procData);
        });
        proc.on('exit', () => {
            this.debug.info('ScenarioRunner._proceed.exit', { key, file });

            this._killOrRestartProc(procData);
        });

        proc.stdout.on('data', data => this.debug.info(
            `ScenarioRunner.process.stdout ${topicName}:`,
            data.toString()
        ));
        proc.stderr.on('data', data => this.debug.warning(
            `ScenarioRunner.process.stderr ${topicName}:`,
            data.toString()
        ));

        procData.proc = proc;
        this.processes[key] = procData;
    }

    _onScenarioMessage(data, proc) {
        const messageHandler = this.messageFromScenarioHandlers[data.type];

        if (messageHandler) messageHandler({ data, proc });
    }

    _killOrRestartProc(procData) {
        const { key } = procData;

        // eslint-disable-next-line no-param-reassign
        procData.running = false;
        if (procData === this.processes[key]) {
            this._restartProcess(key);
        } else if (!procData.proc.exitCode && !procData.proc.killed) {
            procData.proc.kill();
        }
    }

    _killProc(key) {
        this.processes[key].proc.kill();
        delete this.processes[key];
    }

    _deleteScenario(scenarioId) {
        try {
            const scenario = this.homie.getScenarioById(scenarioId);

            this.homieMigrator.deleteScenario(scenario);
        } catch (e) {
            this.onError(e);
        }
    }

    _sendToProcess(data) {
        /** Send topic related to scenario
        const { data: msgData } = data;
        const isDataForTargetScenario = RegExp(`^${ROOT_TOPIC}/`, 'g').test(msgData.topic);

        if (isDataForTargetScenario) {
            const procData = Object
                .values(this.processes)
                .find(pData => RegExp(`^${ROOT_TOPIC}/${pData.topicName}/`, 'g').test(msgData.topic));

            if (procData) procData.proc.send(data);
        } else {
            Object.values(this.processes).forEach((procData) => procData.proc.send(data));
        }
        */

        Object.values(this.processes).forEach(({ proc }) => proc.send(data));
    }

    _sendStateToScenario(proc) {
        proc.send({ type: MQTT_STATE_TRANSFER, data: { state: this.mqttConnection.getState() } });
    }
}

module.exports = ScenarioRunner;
