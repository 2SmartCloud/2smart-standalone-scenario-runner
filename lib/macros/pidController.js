/* eslint-disable newline-after-var */
const PID = require('../PIDController');

module.exports = async (tempTopic, switchTopic, kp, ki, kd, sampleTime, outMin, outMax) => {
    try {
        if (!tempTopic) throw new Error('tempTopic is required!');
        if (!switchTopic) throw new Error('switchTopic is required!');
        if (!kp) throw new Error('kp is required!');
        if (isNaN(kp)) throw new Error('kp must be a number');
        if (isNaN(ki)) throw new Error('ki must be a number');
        if (isNaN(kd)) throw new Error('kd must be a number');
        if (!sampleTime) throw new Error('sampleTime is required!');
        if (isNaN(sampleTime)) throw new Error('sampleTime must be a number');
        if (sampleTime < 1000) throw new Error('sampleTime minimal value is 1000');

        if (!outMax) throw new Error('outMax is required!');

        const scenario = global.scenario;

        await scenario.init();
        scenario.initThreshold('setpoint', { datatype: 'float' });
        const thTopic = scenario.getThresholdTopic('setpoint');
        const switchList = Array.isArray(switchTopic) ? switchTopic : [ switchTopic ];
        const tempInit = 0;
        const targetValue = +scenario.getTarget('setpoint') || 0;
        const ctr = new PID(tempInit, targetValue, kp, ki, kd);

        ctr.setOutputLimits(outMin, outMax);
        ctr.setSampleTime(sampleTime);

        const proceed = () => {
            ctr.compute();
            const output = Math.round(ctr.getOutput());

            switchList.forEach(topic => scenario.set(`${topic}`, `${output}`));
        };

        scenario.message(topic => {
            if (topic === tempTopic) {
                const temp = +scenario.get(tempTopic);
                ctr.setInput(temp);
            }
            if (topic === thTopic) {
                const target = +scenario.getTarget('setpoint');
                ctr.setPoint(target);
            }
        });

        setInterval(() => proceed(), sampleTime);
    } catch (e) {
        console.log(e.message);
    }
};
