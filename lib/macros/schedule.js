/* eslint-disable newline-after-var */
const CronJob = require('cron').CronJob;
const CronTime = require('cron').CronTime;
const parser = require('cron-parser/lib/expression');

module.exports = async (scheduleConfig, outputTopic, onStartValue, onEndValue,
    wheatherTopic, wheatherMessage = '', timeDelay = 0, humidityTopic = '') => {
    try {
        if (!scheduleConfig.length) throw new Error('scheduleConfig is required');
        if (!outputTopic) throw new Error('outputTopic is required');
        if (!onStartValue) throw new Error('onStartValue is required');
        if (!onEndValue) throw new Error('endValue is required');
        if (typeof wheatherTopic !== 'string') throw new Error('wheatherTopic must be a string');
        if (typeof wheatherMessage !== 'string') throw new Error('wheatherMessage must be a string');
        if (isNaN(timeDelay)) throw new Error('timeDelay must be a number');

        const scenario = global.scenario;

        await scenario.init();
        const thresholdId = 'setpoint';
        let thTopic = null;

        const outputTopicsList = Array.isArray(outputTopic) ? outputTopic : [ outputTopic ];
        const wheatherMessagesList = wheatherMessage.split(',').map(m => m.trim().toLowerCase());
        const timeZone = process.env.TZ || 'Etc/Greenwich';
        const isMetrics = !!(wheatherTopic || humidityTopic);
        const isHumidityTopic = !!humidityTopic;

        if (isHumidityTopic) {
            scenario.initThreshold(thresholdId, { datatype: 'float' });
            thTopic = scenario.getThresholdTopic(thresholdId);
        }

        let timeout;
        let isRaining = false;
        let isHumidity = false;
        let isInterval = false;

        const getTimeDelay = (offset = 0) => offset * 60 * 1000;
        const convertTime = (obj, month = false) => {
            return Object.keys(obj).map(key => !month ? +key : +key + 1);
        };
        const isLater = (date1, date2) => {
            return new Date(date1) > new Date(date2);
        };

        const getConditions = (data) => {
            return {
                second     : convertTime(data.second),
                minute     : convertTime(data.minute),
                hour       : convertTime(data.hour),
                dayOfMonth : convertTime(data.dayOfMonth),
                month      : convertTime(data.month, true),
                dayOfWeek  : convertTime(data.dayOfWeek)
            };
        };

        // set values to outputs topics for start, end schedule intervals

        const switchOnDevices = () => outputTopicsList.forEach(topic => scenario.set(topic, onStartValue));
        const switchOffDevices = () => outputTopicsList.forEach(topic => scenario.set(topic, onEndValue));

        // set initial values for output topics on start interval, depending on wheatherTopic state

        const compare = (topic) => {
            if (!isInterval) return;
            console.log(topic);
            const topicValue = scenario.get(topic);
            if (isRaining || isHumidity) {
                if (topicValue === onStartValue) scenario.set(topic, onEndValue);
            }
            if (!isRaining && !isHumidity) {
                if (topicValue === onEndValue) scenario.set(topic, onStartValue);
            }
        };

        /*
            function for init start, end schedule tasks,
            create list of intervals - intervalsList
        */

        const initSchedule = () => {
            scheduleConfig.forEach(interval => {
                const taskOnStart = new CronJob(interval.start, () => {
                    if (isMetrics) {
                        isInterval = true;
                        proceedMetrics();

                        return;
                    }
                    switchOnDevices();
                    isInterval = true;
                }, null, true, timeZone);

                const taskAtEnd = new CronJob(interval.end, () => {
                    isRaining = false;
                    isInterval = false;
                    switchOffDevices();
                }, null, true, timeZone);

                taskOnStart.start();
                taskAtEnd.start();
            });
        };

        // check is interval on init

        const onInitScenario = () => {
            scheduleConfig.forEach(cron => {
                const startCron = new CronTime(cron.start);
                const endCron = new CronTime(cron.end);

                const startConditions = getConditions(startCron);
                const endConditions = getConditions(endCron);

                const start = new parser(startConditions, { tz: timeZone });
                const end = new parser(endConditions, { tz: timeZone });

                const startPrev = start.prev().toString();
                const endPrev = end.prev().toString();

                if (isLater(startPrev, endPrev)) {
                    isInterval = true;
                }
            });

            if (isInterval) {
                switchOnDevices();

                if (isMetrics) {
                    proceedMetrics();

                    return;
                }
            }
        };

        const proceedMetrics = () => {
            if (!isInterval) return;
            if (wheatherTopic) proceedWheatherMetric(wheatherTopic);
            if (humidityTopic) proceedHumidityMetric();
        };

        const proceedWheatherMetric = (topic) => {
            if (!isInterval) return;

            const skyState = scenario.get(topic);
            const isConditionMessage = wheatherMessagesList.includes(skyState.toLowerCase());

            if (isConditionMessage && !isRaining) {
                if (timeout) clearTimeout(timeout);
                isRaining = true;

                switchOffDevices();
            } else if (!isConditionMessage && isRaining) {
                switchOnDevicesIfStopRainning();
            }
        };

        const switchOnDevicesIfStopRainning = () => {
            if (timeout) clearTimeout(timeout);
            const delay = getTimeDelay(timeDelay);

            timeout = setTimeout(() => {
                if (!isInterval || isHumidity) return;
                isRaining = false;
                switchOnDevices();
            }, delay);
        };

        const proceedHumidityMetric = () => {
            if (isRaining) return;
            const humidity = +scenario.get(humidityTopic);
            const target = +scenario.getTarget(thresholdId);

            outputTopicsList.forEach(t => setValuesByHumidity(t, target, humidity));
        };

        const setValuesByHumidity = (topic, targetValue, humidity) => {
            const topicValue = scenario.get(topic);
            const target = targetValue;

            if (!target) return;

            if (humidity >= target) {
                isHumidity = true;
                if (topicValue !== onEndValue) scenario.set(topic, onEndValue);
            } else if (humidity < target) {
                isHumidity = false;
                if (topicValue !== onStartValue) scenario.set(topic, onStartValue);
            }
        };

        initSchedule();
        onInitScenario();

        scenario.message(topic => {
            if (topic === wheatherTopic) proceedWheatherMetric(topic);
            else if (isHumidityTopic && [ humidityTopic, thTopic ].includes(topic)) {
                proceedHumidityMetric();
            } else if (outputTopicsList.includes(topic)) {
                compare(topic);
            }
        });
    } catch (e) {
        console.log(e.message);
    }
};
