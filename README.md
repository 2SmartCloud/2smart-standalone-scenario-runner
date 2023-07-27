# scenario-runner

Service to manage scenarios. Scenario runner service listen changes in target directory(`scenarios`) and can perform next actions:
- execute file after creation in target directory;
- stop and execute updated file;
- kill running process when file is deleted.

If process was killed or exited by error, scenario runner will automatically restart it after 10s. Restart time can be managed by `SR_TIME_TO_RESTART` (ms) env variable.

Scenario runner currently supports files with `.js` extension.

Runner injects `scenario` object with build-in methods into scenario env. Usage example:

## Available methods in scenario:
- async fetch: `node-fetch` npm package. Docs - https://www.npmjs.com/package/node-fetch
- async init: connect to broker/subscribe to root topic/sync broker state and create default threshold (setpoint). Returns: Promise
- set(topic, value): set value for topic.
    - `topic` String, that consist of one or more topic levels, separated by the slash character (/). If topic doesn't end on '/set' add /set to the end of topic.
    - example : homie/kitchen-light/light/power/set 
    - `value` The value published as payload MUST be valid UTF-8 encoded string for the respective property/attribute type.
    - example : "true"
- message(callback(topic, message)): handle message from broker with callback function
    - `topic` string, that contains topic from broker 
    - `value` any UTF-8 encoded string, that contains value by current topic
- initThreshold(thresholdId[, attributes]): for creating custom threshold. `attributes` is optional object that contains threshold attributes.
    - `thresholdId` string with user's custom threshold id
    - `attributes` (optional) object with threshold attributes (name, datatype, unit, format)
        - name: `String` Threshold name;
        - datatype: `String`. One of: `integer`, `float`, `boolean`, `string`, `enum`, `color`. Default: `string`;
        - unit: `String`. A string containing the unit of this property. You are not limited to the recommended values, although they are the only well known ones that will have to be recognized by any Homie consumer;
        - format: `String`. Describes what are valid values for this property. Required for data types `enum` and `color`.
        Formats for data types:
            - `integer`, `float`: `from:to` (for example - `10:15`);
            - `enum`: `value,value,value` (for example - `ON,OFF,PAUSE`);
            - `color`: `rgb` or `hsv` (for example - `255,255,0` or `60,100,100`)
- getState: return object that has broker state
- get(topic): get value by topic. Return any UTF-8 encoded string, that contains value by current topic.
    - `topic` String, that consist of one or more topic levels, separated by the slash character (/).
- getTarget(id): get threshold value by id.
    - `id` string with threshold name
- macros: `Object`. Contains next macros:
  - async thermostat(tempTopic, switchTopic[, hysteresis, mode]). Macro controls thermostat based on current temperature and target temperature. Macro supports two modes: heating and cooling.
    - `tempTopic` - `String`. Required. Homie topic for temperature sensor;
    - `switchTopic` - `String` or `Array`. Required. Homie topic to turn on/off thermostat;
    - `hysteresis` - `Number`. Default: `2`. Hysteresis value;
    - `mode` - `String`. Default: `'heating'`. Mode value, supports: `'heating'` or `'cooling'`.
  - async pidController(inputTopic, outputTopic, kp, ki, kd, sampleTime, outMin, outMax) Macro controls PID controller based on current input value and its parameters:
    - `inputTopic` - `String`. Required. Homie topic for current input value;
    - `outputTopic` - `String` or `Array`. Required. Homie topic for PID controller output signal;
    - `kp` - `Number`. Required. Proportional gain value;
    - `ki` - `Number`. Required. Integral gain value;
    - `kd` - `Number`. Required. Derivative gain value;
    - `sampleTime` - `Number`. Required. Sample time value;
    - `outMin` - `Number`. Required. Min range value;
    - `outMax` - `Number`. Required. Max range value.
  - async timeRelay(schedule, topic, message). Macro is used in cases when it is necessary to automatically perform some action:
    -  `schedule` - `String`. Required. Cron expression. Example: `'* * * * *'`. Full information about cron ranges look [HERE](https://www.npmjs.com/package/cron#cron-ranges);
    -  `topic` - `String` or `Array`. Required. Homie topic to set message value at the indicated time;
    -  `message` - `String`. Required. Value message to set.
  - async sunriseSunset(latlng, sunriseTopic, sunriseMessage, sunriseOffset, sunsetTopic, sunsetMessage, sunsetOffset) Macro sets values on sunrise or sunset time based on location coordinates. For using only sunrise mode, sunset arguments should be `null` and vice versa:
    - `latlng` - `String`. Required. location coordinates. Example: `'50.45466,30.5238'`;
    - `sunriseTopic` - `String` or `Array`. Homie topic for action on sunrise;
    - `sunriseMessage` - `String`. Message value for sunrise action;
    - `sunriseOffset` - `Number`. Time offset value for sunrise. Set in minutes;
    - `sunsetTopic` - `String` or `Array`. Homie topic for action on sunset;
    - `sunsetMessage` - `String`. Message value for sunset action;
    - `sunsetOffset` - `Number`. Time offset value for sunset. Set in minutes.
  - async digitalPidController(inputTopic, switchTopic, kp, ki, kd, sampleTime). Macro controls digital PID controller based on current input value and its parameters:
    - `inputTopic` - `String`. Required. Homie topic for current input value;
    - `switchTopic` - `String` or `Array`. Required. Homie topic for PID controller output signal;
    - `kp` - `Number`. Required. Proportional gain value;
    - `ki` - `Number`. Required. Integral gain value;
    - `kd` - `Number`. Required. Derivative gain value;
    - `sampleTime` - `Number`. Required. Min value `1000`. Sample time value.
  - async mixedThermostat(tempTopic, heatingSwitchTopic, coolingSwitchTopic, mixedHysteresis[, hysteresis]). Macro controls automatic on/off heating, cooling switches, that based on current temperature and target temperature. When temperature less than target, thermostat goes into heating mode, at temperature more than target - cooling mode. Mixed hysteresis and hysteresis arguments are the sum, that sets step to switch mode:
    - `tempTopic` - `String`. Required. Homie topic for temperature sensor;
    - `heatingSwitchTopic` - `String` or `Array`. Required. Homie topic to turn on/off heating;
    - `coolingSwitchTopic` - `String` or `Array`. Required. Homie topic to turn on/off cooling;
    - `mixedHysteresis` - `Number`. Required. Mixed hysteresis value;
    - `hysteresis` - `Number`. Default: `2`. Hysteresis value.
  - async alarmSystem(activateTopics, activateMessage, deactivateMessage, sensorTopics, sensorMessage, actionTopics[, notificationChannels]):
    - `activateTopics` - `String` or `Array`. Required. Homie topics for activating alarm system;
    - `activateMessage` - `String`. Required. Value that must be in order to activate the alarm;
    - `deactivateMessage` - `String`. Required. Value that must be in order to deactivate the alarm;
    - `sensorTopics` - `String` or `Array`. Required. Homie sensor topics;
    - `sensorMessage` - `String`. Required. The value at which the alarm should be turned on;
    - `actionTopics` - `Array` of objects. Required. Exapmle: `[{topic: 'homie-topic', messageOn: 'true', messageOff: 'false'}]`, where `topic` - `String`, homie topic, `messageOn` - `String`, value to turn on during the alarm, `messageOff` - `String`, value to tuen off during the alarm;
    - `notificationChannels` - `Array` of objects. Send messages to Telegram, Slack during alarm. Exampe: `[{channel: 'sweetBot', message: 'Alarm!'`, where `channel` - `String`, notification channel alias, `message` - `String`, message to be send.
  - async schedule(scheduleConfig, outputTopic, onStartValue, onEndValue[, wheatherTopic, wheatherMessage, timeDelay]). Perform some actions at the beginning and at the end of the set time:
    - scheduleConfig - `Array` of objects. Required. Example: `[{start: '0 6 * * *', end: '0 10 * * *'}]`, where `start` - `String`, cron expression for start some action, `end` - `String`, cron expression for end some action;
    - outputTopic - `String` or `Array`. Required. Homie topics to perform actions at chosen time intervals;
    - onStartValue - `String`. Required. Value to set at the beginnig of the set time;
    - onEndValue - `String`. Required. Value to set at the end of the set time;
    - wheatherTopic - `String`. Homie topic to get wheather condition state;
    - wheatherMessage - `String`. Value(s) at which watering is turned off. Value must be the same with values from wheatherTopic. Example: `'rain, snow'`;
    - timeDelay - `Number`. Time for which watering is delayed, set in minutes.
  - async lightingControl(switchTopics, motionTopic, triggerMessage[, shutdownTime, lightingTopic]) Macro provides lighting control:
    - `switchTopics` - `String` or `Array`. Required. Homie topics to turn on/off lighting;
    - `motionTopic` - `String`. Required. Motion sensor topic;
    - `triggerMessage` - `String`. Required. Message to trigger lighting;
    - `shutdownTime` - `Number`. Default `10`. Lighting duration after motion sensor was triggered. Set in seconds;
    - `lightingTopic` - `String`. Lighting sensor topic.
- getThresholdTopic(id): return threshold topic by id
  Example: 
  `global.scenario.macros.thermostat(TEMP_TOPIC, SWITCH_TOPIC, HYSTERESIS, MODE)`;
  
  `global.scenario.macros.timeRelay(SCHEDULE, TOPIC, MESSAGE)`;

  `global.scenario.macros.pidController(INPUT_TOPIC, OUTPUT_TOPIC, KP, KI, KD, SAMPLE_TIME, OUT_MIN, OUT_MAX)`;
  
  `global.scenario.macros.sunriseSunset(LAT_LNG, SUNRISE_TOPIC, SUNRISE_MESSAGE, SUNRISE_OFFSET, SUNSET_TOPIC, SUNSET_MESSAGE, SUNSET_OFFSET)`;
  
  `global.scenario.macros.mixedThermostat(TEMP_TOPIC, HEATING_SWITCH_TOPIC, COOLING_SWITCH_TOPIC, MIXED_HYSTERESIS, HYSTERESIS)`;
  
  `global.scenario.macros.schedule(SCHEDULE_CONFIG, OUTPUT_TOPIC, START_TIME_VALUE, END_TIME_VALUE, WHEATHER_TOPIC, WHEATHER_CONDITION, TIME_DELAY)`;
  
  `global.scenario.macros.digitalPidController(INPUT_TOPIC, SWITCH_TOPIC, KP, KI, KD, SAMPLE_TIME)`;

  `global.scenario.macros.alarmSystem(ACTIVATE_TOPIC, ACTIVATE_MESSAGE, DEACTIVATE_MESSAGE, SENSOR_TOPIC, SENSOR_MESSAGE, ACTION_TOPIC, NOTIFICATION_CHANNEL)`;

  `global.scenario.macros.lightingControl(SWITCH_TOPIC, MOTION_TOPIC, TRIGGER_MESSAGE, SHUTDOWN_TIME, LIGHTING_TOPIC)`.

- async notifications.slack.send('channel_alias',message)
    - message could be a plain text
    - or object with fields 'text', 'type', 'emoji', 'verbatim' described here: https://api.slack.com/reference/block-kit/composition-objects#text-object
    - in case of good response returns string 'ok'
    - throws an Error if there is any problem
    - is async function
- async notifications.telegram.send('channel_alias',message)
    - message could be a plain text
    - or object with fields 'text', 'parse_mode', 'disable_web_page_preview', 'disable_notification' described here: https://core.telegram.org/bots/api#sendmessage
    - throws an Error if there is any problem
    - in case of good response returns object like this:
    - is async function
- async notify('alias', 'Message to send')
    - no need to choose the type of messenger, because it already indicated in the alias
    - the rest of the method works similarly to the above
- async notify('Message to send')
    - creates system notification
- influx: `Object`. Contains next methods for interacting with Influx:
    - async query(queryStrOrQueryArr). Run the query(or list of queries), and returns the array of query results.   
      If you run multiple queries, an array of results will be returned, otherwise a single result (array of objects) will be returned.
        - `queryStrOrQueryArr` - `String|String[]`. Required. Single query string or array of query strings to run;

## Configuration notifications
Config example: ./etc/config.notifications.example.js. 

Guide:
* [Telegram](docs/notifications/telegram.md)
* [Slack](docs/notifications/slack.md)

## How to publish a simple scenario to NPM
- Make a directory for a module
```shell
mkdir <simple-scenario-name> # replace <simple-scenario-name> with your simple scenario name
cd <simple-scenario-name>
```

- Next, create a package.json file by executing "npm init" command  
**Important:** you must add "2smart" and "simple-scenario" keywords when configure a package.json file for recognizing your scenario by the system  
**Important:** if you enter a version with major version 0 than users will be able to update your package only for the next patch releases in current minor version  
Example: if you enter version "0.1.0" then users will be able to update your package only in versions range '>=0.1.0' and '<0.2.0'  
See details: <https://nodesource.com/blog/semver-tilde-and-caret/> ("Caret: Major Zero" point)
               
```shell
npm init
```

- Add your scenario icon(in SVG) and scenario scheme(description of environment variables that should be passed to your 
scenario from user's input, in JSON) to the directory  
Scheme JSON file must contain the array of input configuration objects which will be rendered on 2smart UI  
Configuration object fields:
  - **label** - input label
  - **name** - name of the environment variable for current input that should be passed to your scenario
  - **type** - input type, current available types: 'string', 'number', 'integer', 'id', 'enum', 'boolean', 'topic', 'topics', 'javascript', 'json'
  - **validation** - LIVR validation for the current input, see docs for details: [LIVR docs](https://livr-spec.org/)
  - **placeholder** - input placeholder

Example of **scheme.json:**
```json
[
    {
        "label": "Schedule*", 
        "name": "SCHEDULE",
        "type": "schedule",
        "validation": [
            "required",
            "string"
        ],
        "placeholder": "Set schedule"
    }
    ...
    ...
    ...
]
```

- Next, you must specify paths for this files in package.json, simple by adding "iconPath" and "schemePath" fields  
If you would not specify this fields the default value for "iconPath" will be "/etc/icon.svg" and for "schemePath" - "/etc/scheme.svg"  
**package.json:**
```json
{
    ...
    "iconPath": "/etc/your-simple-scenario-icon.svg",
    "schemePath": "/etc/your-simple-scenario-scheme.json",  
    ...
}
```

- Add all of your simple scenario files to the directory and put a call of your scenario main function to the file
specified in "main" field of package.json  
**Important:** HFS+ journaling file system used in macOS is case-insensitive, so don't make a files in same directory with same names but in different cases(e.g. "/lib/foo.js" and "/lib/Foo.js")

Example of **index.js:**
```javascript
const simpleScenario = require('./simpleScenario.js');

const {            //
    FIRST_PARAM,   // all fields, specified in scheme file should be passed to scenario.args object
    SECOND_PARAM   // so, you have access to them by its names
} = scenario.args; //

simpleScenario(FIRST_PARAM, SECOND_PARAM); // IMPORTANT: you must put the call of your main scenario function in this "main" file 
```

- Add all of required dependencies by executing "npm install <package-name>"

- Publish the package in public access to the NPM and it will appear in "Market" -> "Extensions" tab on 2smart UI
```shell
npm publish --access public
```
