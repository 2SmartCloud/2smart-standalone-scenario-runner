/* eslint-disable newline-after-var */
module.exports = async (switchTopics, motionTopic, triggerMessage, shutdownTime = 10, lightingTopic = '') => {
    try {
        if (!switchTopics) throw new Error('switchTopic is required!');
        if (!motionTopic) throw new Error('motionTopic is required!');
        if (!triggerMessage) throw new Error('triggerMessage is required!');
        if (isNaN(shutdownTime)) throw new Error('shutdownTime must be a number');
        if (shutdownTime < 1) throw new Error('shutdownTime min value is 1');

        const scenario = global.scenario;

        await scenario.init();
        const thresholdId = 'setpoint';
        const switchList = Array.isArray(switchTopics) ? switchTopics : [ switchTopics ];
        const ms = +shutdownTime * 1000;
        const isLightingMetric = !!lightingTopic;

        let thTopic = null;
        let timeout = null;
        let isLightly = false;

        if (isLightingMetric) {
            scenario.initThreshold(thresholdId, { datatype: 'float' });
            thTopic = scenario.getThresholdTopic(thresholdId);
        }

        const changeSwitchState = (state = false) => {
            switchList.forEach(topic => scenario.set(topic, state));
        };

        const onMotion = (value) => {
            if (isLightly) return;

            const isTriggered = value === triggerMessage;

            if (isTriggered) {
                if (timeout) clearTimeout(timeout);

                changeSwitchState(isTriggered);
                timeout = setTimeout(() => changeSwitchState(), ms);
            }
        };

        const onLighting = (value, target) => {
            if (isNaN(target)) return;

            if (value >= target) {
                isLightly = true;
                changeSwitchState();
            } else if (value < target) {
                isLightly = false;
            }
        };

        const init = () => {
            if (!isLightingMetric) return;
            const thValue = scenario.getTarget(thresholdId);
            const lightingValue = +scenario.get(lightingTopic);

            if (thValue === undefined) return;

            onLighting(lightingValue, thValue);
        };

        init();

        scenario.message((topic, message) => {
            const value = message.toString();

            if (topic === motionTopic) onMotion(value);
            else if (isLightingMetric && [ lightingTopic, thTopic ].includes(topic)) {
                const lightingValue = +scenario.get(lightingTopic);
                const thValue = +scenario.getTarget(thresholdId);

                onLighting(lightingValue, thValue);
            }
        });
    } catch (e) {
        console.log(e.message);
    }
};
