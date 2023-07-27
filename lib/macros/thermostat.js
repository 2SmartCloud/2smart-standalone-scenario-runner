module.exports = async (tempTopic, switchTopic, hysteresis = 2, mode = 'heating') => {
    try {
        if (!tempTopic) throw new Error('tempTopic is required!');
        if (!switchTopic) throw new Error('switchTopic is required!');
        if (isNaN(hysteresis)) throw new Error('hysteresis must be a number');
        if (!mode) throw new Error('mode is required!');
        if (mode !== 'heating' && mode !== 'cooling') throw new Error('mode must be heating or cooling');

        const scenario = global.scenario;

        await scenario.init();
        scenario.initThreshold('setpoint', { datatype: 'float' });
        const thTopic = scenario.getThresholdTopic('setpoint');
        const switchList = Array.isArray(switchTopic) ? switchTopic : [ switchTopic ];

        const proceed = (topic, targetValue, temp) => {
            let target = targetValue;
            const topicValue = scenario.get(topic);

            if (!target) return;

            target = +target;

            const moreCmd = mode === 'heating' ? 'false' : 'true';

            const lessCmd = mode === 'heating' ? 'true' : 'false';

            if (temp > target + hysteresis) {
                if (topicValue !== moreCmd) scenario.set(`${topic}`, moreCmd);
            } else if (temp < target - hysteresis) {
                if (topicValue !== lessCmd) scenario.set(`${topic}`, lessCmd);
            }
        };

        const initTemp = () => {
            const temp = +scenario.get(tempTopic);
            const target = scenario.getTarget('setpoint');

            switchList.forEach(t => proceed(t, target, temp));
        };

        scenario.message((topic) => {
            if ([ tempTopic, thTopic ].includes(topic)) {
                const temp = +scenario.get(tempTopic);
                const target = scenario.getTarget('setpoint');

                switchList.forEach(t => proceed(t, target, temp));
            }
        });

        initTemp();
    } catch (e) {
        console.error(e.message);
    }
};
