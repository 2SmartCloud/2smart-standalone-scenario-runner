process.env.MODE = 'test'; // override env mode to use test database
const Promise = require('bluebird');
/* eslint-disable no-sync */
// eslint-disable-next-line func-names
const WAIT_TIME_LIMIT = 60; // s
const WAIT_TIME_STEP = 5; // s

async function WaitTillDbIsReady(waitLimit) {
    // eslint-disable-next-line no-param-reassign
    waitLimit = (waitLimit === undefined) ? WAIT_TIME_LIMIT : waitLimit;
    const sequelize = global.__SEQUELIZE__;
    // eslint-disable-next-line more/no-then

    try {
        await sequelize.authenticate();
        // okey, we have the DB
    } catch (e) {
        if (e.parent && e.parent.code === 'ER_DBACCESS_DENIED_ERROR') {
            if (waitLimit > 0) {
                console.log(`Waiting, left ${waitLimit}second(s).`);
                const delay = Math.min(waitLimit, WAIT_TIME_STEP);

                await Promise.delay(delay);
                await WaitTillDbIsReady(waitLimit - delay);
            } else throw new Error();
        } else throw e;
    }
}

// eslint-disable-next-line func-names
module.exports = async function () {
    const { sequelize } = require('./../lib/sequelize.js');

    global.__SEQUELIZE__ = sequelize;
    await WaitTillDbIsReady();
};
