const { SCENARIO_PATH } = process.env;

global.scenario = require('../api/nodejs/1.0.0'); // for backward compatibility

global.apiVersions = {
    '2.0.0' : require('../api/nodejs/2.0.0')
};

require(SCENARIO_PATH);
