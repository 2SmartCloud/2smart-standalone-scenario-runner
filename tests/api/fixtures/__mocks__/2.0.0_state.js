/* eslint-disable more/no-hardcoded-configuration-data */

module.exports = {
    'group' : {
        'groups-of-properties/group1/$name'  : 'Test group',
        'groups-of-properties/group1/$value' : 'value'
    },
    'threshold' : {
        'scenarios/scenario1/$thresholds'        : 'setpoint',
        'scenarios/scenario1/setpoint'           : '10',
        'scenarios/scenario1/setpoint/$name'     : 'name',
        'scenarios/scenario1/setpoint/$settable' : 'true',
        'scenarios/scenario1/setpoint/$retained' : 'true',
        'scenarios/scenario1/setpoint/$datatype' : 'integer',
        'scenarios/scenario1/setpoint/$unit'     : '#',
        'scenarios/scenario1/setpoint/$format'   : ''
    },
    'notification' : {
        'notification-channels/channel1/$type'          : 'telegram',
        'notification-channels/channel1/$alias'         : 'Test_telegram',
        'notification-channels/channel1/$configuration' : '{"chatId": "368289958", "token": "bot110208322323"}',
        'notification-channels/channel1/$state'         : 'enabled'
    },
    'alias' : {
        'topics-aliases/alias1/$createdAt' : '1608556276585',
        'topics-aliases/alias1/$name'      : 'test_alias',
        'topics-aliases/alias1/$topic'     : 'sweet-home/cb0wfwefmlwefwe/sensors/sky-sensor'
    },
    'main' : {
        'sweet-home/device1/$name'    : 'Yahoo Weather',
        'sweet-home/device1/$localip' : '127.0.0.1',
        'scenarios/scenario1/someTh1' : 'value',
        'scenarios/scenario1/someTh2' : 'value'
    }
};
