/* eslint-disable newline-after-var */
/* eslint-disable no-case-declarations */
module.exports = async (activateTopics = null, activateMessage = null, deactivateMessage = null, sensorTopics,
    sensorMessage, actionTopics, notificationChannels) => {
    try {
        if (!sensorTopics) throw new Error('sensorTopics is required');
        if (!sensorMessage) throw new Error('sensorMessage is required');
        if (!actionTopics) throw new Error('actionTopics is required');

        const scenario = global.scenario;

        await scenario.init();
        const thAlarmStateId = 'alarm-state';
        const thEmergencyStateId = 'emergency-state';

        scenario.initMethod('alarm-button', () => notify());
        scenario.initThreshold(thAlarmStateId, { datatype: 'boolean' });
        scenario.initThreshold(thEmergencyStateId, { datatype: 'boolean', settable: false });
        const thAlarmStateTopic = scenario.getThresholdTopic(thAlarmStateId);
        const thEmergencyStateTopic = scenario.getThresholdTopic(thEmergencyStateId);
        const activateTopicsList = Array.isArray(activateTopics) ? activateTopics : [ activateTopics ];

        let isActive = false;
        let isAlarm = false;

        const init = () => {
            initThresholdStatus();
            proceedThreshold();
        };

        const initThresholdStatus = () => {
            const thValue = scenario.getTarget(thAlarmStateId);
            if (thValue === undefined) return;

            isActive = thValue === 'true';

            if (isActive) scenario.set(thAlarmStateTopic, isActive);
            else changeActiveStatusOnInit();
        };

        const changeActiveStatusOnInit = () => {
            const thValue = scenario.getTarget(thAlarmStateId);

            const isActivateTopicsOn = activateTopicsList.some(topic => {
                const value = scenario.get(topic);

                return value === activateMessage;
            });

            const isActivateTopicsOff = activateTopicsList.some(topic => {
                const value = scenario.get(topic);

                return value === deactivateMessage;
            });

            // Threshold is not synced yet and action topics are not triggered
            if (thValue === undefined && !isActivateTopicsOn) return;

            if (isActivateTopicsOn) {
                isActive = isActivateTopicsOn;
                scenario.set(thAlarmStateTopic, isActive);
            } else if (isActivateTopicsOff) {
                isActive = !isActivateTopicsOff;
                scenario.set(thAlarmStateTopic, isActive);
            }
        };

        const changeActiveStatus = (topicValue) => {
            if (topicValue === activateMessage) {
                isActive = true;
                scenario.set(thAlarmStateTopic, isActive);
            } else if (topicValue === deactivateMessage) {
                isActive = false;
                scenario.set(thAlarmStateTopic, isActive);
            }
        };

        const alarm = (status = true) => {
            if (status) notify();

            isAlarm = status;

            scenario.set(thEmergencyStateTopic, isAlarm);

            actionTopics.forEach(({ topic, messageOn, messageOff }) => {
                const value = status ? messageOn : messageOff;

                scenario.set(topic, value);
            });
        };

        const proceedThreshold = () => {
            const thValue = scenario.getTarget(thAlarmStateId);
            const status = thValue === 'true';

            if (thValue === undefined) return;

            alarm(status && isAlarm);
            isActive = status;
        };

        /**
         * Call alarm or ignore when new msg received
         * @param {String} value
         */
        const processActionTopic = (value) => {
            if (!isActive || sensorMessage !== value) return;

            alarm();
        };

        /**
         * Send notifications to messangers if specified
         */
        const notify = () => {
            if (!Array.isArray(notificationChannels)) return;

            notificationChannels.forEach(obj => {
                scenario.notify(obj.channel, obj.message);
            });
        };

        const compare = (topic) => {
            if (!isAlarm) return;
            const actionData = actionTopics.find(obj => obj.topic === topic);

            if (!actionData) return;

            const state = scenario.get(actionData.topic);

            if (state === actionData.messageOff) {
                scenario.set(actionData.topic, actionData.messageOn);
            }
        };

        init();

        scenario.message((topic, msg) => {
            const value = msg.toString();

            if (activateTopicsList.includes(topic)) changeActiveStatus(value); // активировать сценарий сигналки
            else if (sensorTopics.includes(topic)) processActionTopic(value); // включить звук
            else if (topic === thAlarmStateTopic) proceedThreshold();
            else compare(topic, value);
        });
    } catch (e) {
        console.log(e);
    }
};
