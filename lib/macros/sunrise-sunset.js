/* eslint-disable newline-after-var */
const CronJob = require('cron').CronJob;
const { getSunrise, getSunset } = require('sunrise-sunset-js');

module.exports = async (latlng, sunriseTopic = null, sunriseMessage = null, sunriseOffset = 0,
    sunsetTopic = null, sunsetMessage = null, sunsetOffset = 0) => {
    try {
        if (!latlng) throw new Error('latlng is required');
        if (!sunriseTopic && !sunsetTopic) throw new Error('one of sunriseTopic, sunsetTopic is required');

        const scenario = global.scenario;

        await scenario.init();
        const coordinates = latlng.split(',');

        let sunrise = getSunrise(+coordinates[0], +coordinates[1]);
        let sunset = getSunset(+coordinates[0], +coordinates[1]);

        const sunriseTime = new Date(sunrise).getTime();
        const sunsetTime = new Date(sunset).getTime();

        const sunriseTopicList = Array.isArray(sunriseTopic) ? sunriseTopic : [ sunriseTopic ];
        const sunsetTopicList = Array.isArray(sunsetTopic) ? sunsetTopic : [ sunsetTopic ];

        const getCronExp = (currentTime, offset = 0) => {
            const offsetInMillisecons = offset * 60 * 1000;
            const total = currentTime + offsetInMillisecons;

            const date = new Date(total);
            const m = date.getMinutes();
            const hr = date.getHours();

            return `${m} ${hr} * * *`;
        };

        const cronExpOnSunrise = getCronExp(sunriseTime, sunriseOffset);
        const cronExpOnSunset = getCronExp(sunsetTime, sunsetOffset);
        const timeZone = process.env.TZ || 'Etc/Greenwich';

        const taskOnSunrise = new CronJob(cronExpOnSunrise, () => {
            sunriseTopicList.forEach(topic => scenario.set(`${topic}`, sunriseMessage));
        }, null, true, timeZone);

        const taskOnSunset = new CronJob(cronExpOnSunset, () => {
            sunsetTopicList.forEach(topic => scenario.set(`${topic}`, sunsetMessage));
        }, null, true, timeZone);


        const reset = new CronJob('0 0 * * *', () => {
            sunrise = getSunrise(+coordinates[0], +coordinates[1]);
            sunset = getSunset(+coordinates[0], +coordinates[1]);
        }, null, true, timeZone);

        if (reset) reset.stop();
        if (taskOnSunrise) taskOnSunrise.stop();
        if (taskOnSunset) taskOnSunset.stop();

        if (sunriseTopicList.length) taskOnSunrise.start();
        if (sunsetTopicList.length) taskOnSunset.start();
        reset.start();
    } catch (e) {
        console.log(e.message);
    }
};
