# Scenario

## API 1.0.0

- async fetch: `node-fetch` npm package. Docs - https://www.npmjs.com/package/node-fetch

- async init: connect to broker/subscribe to root topic/sync broker state and create default threshold (setpoint). Returns: Promise

- set(topicOrAlias, value): set value for topic.
    - `topicOrAlias` String, that can be either topic or alias. 
    Topic consists of one or more topic levels, separated by the slash character (/).
    If topic doesn't end on '/set' add /set to the end of topic. 
    Alias must start with "@" symbol and consists of lowercase letters(a-z), whitespaces and dots.
        - example : "homie/kitchen-light/light/power/set", "@kitchen.light"
    - `value` The value published as payload MUST be valid UTF-8 encoded string for the respective property/attribute type.
        - example : "true"

- end: close connection to broker

- message(callback(topicOrAlias, message)): handle message from the broker with callback function
    - `topicOrAlias` string, that contains topic or its alias(begins with "@") name
    - `message` is a buffer

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

- initMethod(thresholdId, callback[, datatype]): initialize threshold with given datatype and threshold id, call the callback on every its publish with passed value to this threshold topic
    - `thresholdId` String, user's custom threshold id
    - `callback` Object, function to call
    - `datatype` String, datatype for threshold value. Default: 'boolean'  

- callMethod(scenarioId, thresholdId, value): publish value to threshold topic to call method which is related with passed threshold id and scenario id
    - `scenarioId` String, scenario id for threshold
    - `thresholdId` String, threshold id which is related with some method created by initMethod function
    - `value` Any, value to set for threshold

- getState: return object that has broker state

- get(topicOrAlias): get value by topic or alias. Return any UTF-8 encoded string, that contains value by current topic or alias.
    - `topicOrAlias` String, that can be either topic or alias. 
    Topic consists of one or more topic levels, separated by the slash character (/).
    If topic doesn't end on '/set' add /set to the end of topic. 
    Alias must start with "@" symbol and consists of lowercase letters(a-z), whitespaces and dots.
        - example : "homie/kitchen-light/light/power", "@kitchen.light"

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
  - async alarmSystem(activateTopics, activateMessage, deactivateMessage, sensorTopics, sensorMessage, actionTopics[, notificationChannels]):
    - `activateTopics` - `String` or `Array`. Required. Homie topics for activating alarm system;
    - `activateMessage` - `String`. Required. Value that must be in order to activate the alarm;
    - `deactivateMessage` - `String`. Required. Value that must be in order to deactivate the alarm;
    - `sensorTopics` - `String` or `Array`. Required. Homie sensor topics;
    - `sensorMessage` - `String`. Required. The value at which the alarm should be turned on;
    - `actionTopics` - `Array` of objects. Required. Exapmle: `[{topic: 'homie-topic', messageOn: 'true', messageOff: 'false'}]`, where `topic` - `String`, homie topic, `messageOn` - `String`, value to turn on during the alarm, `messageOff` - `String`, value to tuen off during the alarm;
    - `notificationChannels` - `Array` of objects. Send messages to Telegram, Slack during alarm. Exampe: `[{channel: 'sweetBot', message: 'Alarm!'`, where `channel` - `String`, notification channel alias, `message` - `String`, message to be send.
  - async schedule(scheduleConfig, outputTopic, onStartValue, onEndValue[, wheatherTopic, wheatherMessage, timeDelay]). Perform some actions at the beginning and at the end of the set time. Also, if mascros is used as scenario of watering, it is possible to control it by wheather conditions:
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

  `global.scenario.macros.digitalPidController(INPUT_TOPIC, SWITCH_TOPIC, KP, KI, KD, SAMPLE_TIME)`;

  `global.scenario.macros.mixedThermostat(TEMP_TOPIC, HEATING_SWITCH_TOPIC, COOLING_SWITCH_TOPIC, MIXED_HYSTERESIS, HYSTERESIS)`;

  `global.scenario.macros.alarmSystem(ACTIVATE_TOPIC, ACTIVATE_MESSAGE, DEACTIVATE_MESSAGE, SENSOR_TOPIC, SENSOR_MESSAGE, ACTION_TOPIC, NOTIFICATION_CHANNEL)`.

  `global.scenario.macros.schedule(SCHEDULE_CONFIG, OUTPUT_TOPIC, START_TIME_VALUE, END_TIME_VALUE, WHEATHER_TOPIC, WHEATHER_CONDITION, TIME_DELAY)`;

  `global.scenario.macros.lightingControl(SWITCH_TOPIC, MOTION_TOPIC, TRIGGER_MESSAGE, SHUTDOWN_TIME, LIGHTING_TOPIC)`.
  ```

- getThresholdTopic(id): return threshold topic by id
    - `id` String, threshold id

- getThresholdTopicByScenarioId(scenarioId, thresholdId): return threshold topic for specific scenario
    - `scenarioId` String, scenario id
    - `thresholdId` String, threshold id

- async notify('alias', 'Message to send')
    - no need to choose the type of messenger, because it already indicated in the alias
    - the rest of the method works similarly to the above

- setGroupValue(groupName, value): set value to group with current name
    - `groupName` String, that is group name you want to set value for
    - `value` any, that contains value to set for group with current name

- getGroupValue(groupName): get group value by group name. Return any UTF-8 encoded string, that contains value by current group name
    - `groupName` String, that is group name you want to get value of

- findTopicByAlias(alias): return topic related with this alias or null if there is no such one
    - `alias` String, topic alias
  
- startScenario(scenarioId): starts the scenario by given id
    - `scenarioId` String, id of scenario to start

- stopScenario(scenarioId): stops the scenario by given id
  - `scenarioId` String, id of scenario to stop

## Examples of pro scenarios

- Sending notification to Telegram or Slack

```javascript
const scenario = global.scenario;

scenario.init() // initialize scenario
    .then(() => {
        // ...
        // ...
        // ...

        scenario.notify('someAlias', 'message').then(() => { // send message to notification channel(Telegram or Slack) with current alias
            // paste your next code here
            // it will be executed both on successful and unsuccessful sending
        });
    });
```

- Initializing threshold and processing its value

```javascript
const scenario = global.scenario;

scenario.init() // initialize scenario
  .then(() => {
    const thresholdId = 'example-threshold-id';
    const thresholdTopic = scenario.getThresholdTopic(thresholdId); // get threshold topic by thresold ID

    const thresholdAttributes = {
      name: 'threshold-name',
      datatype: 'string',
      unit: '#'
    };
  
    scenario.initThreshold(thresholdId, thresholdAttributes); // initialize threshold
  
    // Subscribe on all incoming messages from broker to track changes of threshold value
    scenario.message((topic, message) => {
      if (topic === thresholdTopic) {
        const value = message.toString(); // parse buffer to string

        // process threshold value
        // ...
        // ...
        // ...
      }
    });
  });
```

- Setting topic value

```javascript
const scenario = global.scenario;


// In this example we will change default location value from Kyiv to Lviv
// for Yahoo Weather virtual device
scenario.init()
  .then(() => {
    const topic = 'sweet-home/yahoo-weather/$options/location'; // replace this topic with your location topic
    const valueToSet = 'Lviv';

    scenario.set(topic, valueToSet);
  });
```

- Setting group value

```javascript
const scenario = global.scenario;

// In this example we will set a new location value for Yahoo Weather virtual device
// Before creating scenario you need to create group "city"(or any other name you want) and attach
// it to location option in Yahoo Weather
scenario.init()
  .then(() => {
    const groupName = 'city';
    const valueToSet = 'Lviv';

    scenario.setGroupValue(groupName, valueToSet);
  });
```

- Complex example

```javascript
const scenario = global.scenario;

// In this example we will create threshold for min temperature and track changes of temperature
// sensor value, if value will become less than threshold then we will send notification with warning
// message
scenario.init() // initialize scenario
  .then(() => {
    const thresholdId = 'min-temperature';
    // Replace this topic with your thermometer temperature sensor topic
    const thermometerTemperatureSensorTopic = 'sweet-home/yahoo-weather/thermometer/temperature-sensor';

    const thresholdAttributes = {
      name: 'Min temperature',
      datatype: 'integer',
    };
  
    scenario.initThreshold(thresholdId, thresholdAttributes); // initialize threshold
  
    // Subscribe on all incoming messages from broker to track changes of temperature sensor value
    scenario.message((topic, message) => {
      if (topic === thermometerTemperatureSensorTopic) {
        const temperature = +message.toString(); // parse buffer to string and then to number
        const thresholdTemperature = +scenario.getTarget(thresholdId); // get current threshold value

        // Compare new temperature value with threshold
        // and send notification if temperature is less
        if (temperature < thresholdTemperature) {
          scenario.notify('someAlias', `Temperature in the city is less than ${thresholdTemperature} °C!`);
        }
      }
    });
  });
```

- Publish inverted topic value in interval

```javascript
const scenario = global.scenario;


// Replace this with topic you want to switch value for(you can paste any topic which is related with boolean value datatype)
const SWITCH_TOPIC = 'topic_here';
const INTERVAL_TIME = 10000; // 10 seconds interval


// In this example we will get value for SWITCH_TOPIC and publish its inverted value every 10 seconds
scenario.init() // initialize scenario
  .then(() => {
    setInterval(() => {
      const topicValue = scenario.get(SWITCH_TOPIC);
      const valueToPublish = topicValue === 'true' || false;

      scenario.set(SWITCH_TOPIC, !valueToPublish);
    }, INTERVAL_TIME);
  });
```

- Enable socket if water detector detects water

```javascript
const scenario = global.scenario;

const WATER_DETECTOR = 'topic_here'; // replace this with you water detector topic
// Replace this with topic which is related with boolean value datatype(it is socket topic in current example)
const SWITCH_TOPIC = 'topic_here';

scenario.init() // initialize scenario
  .then(() => {
    scenario.message((topic, message) => {
      if (topic === WATER_DETECTOR) {
        const value = message.toString();

        // If water detector topic publish true value(it detect water) then publish "true" value to SWITCH_TOPIC
        // For example, if water detector detects water, we can enable socket by setting "true" value to its topic
        if (value === 'true') scenario.set(SWITCH_TOPIC, true);
      }
    });
  });
```
