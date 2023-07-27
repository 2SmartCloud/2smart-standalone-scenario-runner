# Scenario

## API 2.0.0

- async `init`: connect to broker/subscribe to root topic/sync broker state and create default threshold (setpoint). Returns: Promise
- `message(callback(topicOrAlias, message))`: handle message from the broker with callback function
    - `topicOrAlias` String, that contains topic or its alias(begins with "@") name
    - `message` is a Buffer
- `get(topicOrAlias)`: get value by topic or alias. Return any UTF-8 encoded String, that contains value by current topic or alias.
    - `topicOrAlias` String, that can be either topic or alias. 
    Topic consists of one or more topic levels, separated by the slash character (/).
    If topic doesn't end on '/set' add /set to the end of topic. 
    Alias must start with "@" symbol and consists of lowercase letters(a-z), whitespaces and dots.
        - example : "homie/kitchen-light/light/power", "@kitchen.light"
- `set(topicOrAlias, value, options)`: set value for topic.
    - `topicOrAlias` String, that can be either topic or alias. 
    Topic consists of one or more topic levels, separated by the slash character (/).
    If topic doesn't end on '/set' add /set to the end of topic. 
    Alias must start with "@" symbol and consists of lowercase letters(a-z), whitespaces and dots.
        - example : "homie/kitchen-light/light/power/set", "@kitchen.light"
    - `value` The value published as payload MUST be valid UTF-8 encoded String for the respective property/attribute type.
      - example : "true"
    - `options` - Object with params:
      - `withRetry`: Boolean. Default false. Defines whether topic will be published several times until success.
- `args`: Object with params passed to scenario.

### topic
- `get(topic)`: get value by topic. Return any UTF-8 encoded String, that contains value.
    - `topic` String. Topic consists of one or more topic levels, separated by the slash character (/).
    If topic doesn't end on '/set' add /set to the end of topic.
- `set(topic, value, options)`: set value for topic.
  - `topic` String. Topic consists of one or more topic levels, separated by the slash character (/).
  If topic doesn't end on '/set' add /set to the end of topic.
    - example : "homie/kitchen-light/light/power/set", "@kitchen.light"
  - `value` The value published as payload MUST be valid UTF-8 encoded String for the respective property/attribute type.
    - example : "true"
  - `options` - Object with params:
    - `withRetry`: Boolean. Default false. Defines whether topic will be published several times until success. 

### alias
- `topic(alias)`: return topic related with this alias or `null` if there is no such one
  - `alias` - String. Alias must consists of lowercase letters(a-z), whitespaces and dots.
- `get(alias)`: get value of topic by alias. Return any UTF-8 encoded String.
    - `alias` String. Must start with "@" symbol and consists of lowercase letters(a-z), whitespaces and dots.
        - example : "homie/kitchen-light/light/power", "@kitchen.light"
- `set(alias, value, options)`: set value for topic.
    - `alias` String. Must start with "@" symbol and consists of lowercase letters(a-z), whitespaces and dots.
        - example : "homie/kitchen-light/light/power", "@kitchen.light"
    - `value` The value published as payload MUST be valid UTF-8 encoded String for the respective property/attribute type.
        - example : "true"
    - `options` - Object with params:
      - `withRetry`: Boolean. Default false. Defines whether topic will be published several times until success.

### threshold
- `init(thresholdId[, attributes])`: creates custom threshold. `attributes` is optional object that contains threshold attributes.
  - `thresholdId` String, threshold name
  - `attributes` (optional) Object with threshold attributes (name, datatype, unit, format)
      - name: `String` Threshold name;
      - datatype: `String`. One of: `Integer`, `Float`, `Boolean`, `String`, `Enum`, `Color`. Default: `String`;
      - unit: `String`. A String containing the unit of this property. You are not limited to the recommended values, although they are the only well known ones that will have to be recognized by any Homie consumer;
      - format: `String`. Describes what are valid values for this property. Required for data types `Enum` and `Color`.
      Formats for data types:
          - `Integer`, `Float`: `from:to` (for example - `10:15`);
          - `Enum`: `value,value,value` (for example - `ON,OFF,PAUSE`);
          - `Color`: `rgb` or `hsv` (for example - `255,255,0` or `60,100,100`)
- `value(thresholdId)`: get threshold value by id.
  - `thresholdId` String, threshold name
- `topic(thresholdId[, scenarioId])`: return threshold topic for specific scenario. If `scenarioId` is not specified topic for current scenario will be returned.
  - `scenarioId` String, scenario id`
  - `thresholdId` String, threshold id

### group
- `set(groupName, value)`: set value to group with current name
    - `groupName` String, that is group name you want to set value for
    - `value` Any, that contains value to set for group with current name
- `get(groupName)`: get group value by group name. Return any UTF-8 encoded String, that contains value by current group name
    - `groupName` String, that is group name you want to get value of

### method
- `call(scenarioId, thresholdId, value)`: publish value to threshold topic to call method which is related with passed threshold id and scenario id
    - `scenarioId` String, scenario id for threshold
    - `thresholdId` String, threshold id which is related with some method created by initMethod function
    - `value` Any, value to set for threshold
- `init(thresholdId, callback[, datatype])`: initialize threshold with given datatype and threshold id, call the callback on every its publish with passed value to this threshold topic
    - `thresholdId` String, user's custom threshold id
    - `callback` Object, function to call
    - `datatype` String, datatype for threshold value. Default: 'Boolean'

### notify
- `system(message)` - send system notification message
- `channel(alias, message)` - send notification message to specific channel
  - `alias` - String, must consist of lowercase letters(a-z), whitespaces and dots.
  - `message` - String.

### utils
- async `fetch`: `node-fetch` npm package. Docs - https://www.npmjs.com/package/node-fetch
- `influx`: Object with `query` method from https://www.npmjs.com/package/influx package.
- `log`: Object with two methods:
  - `info` - alias for `console.log`
  - `warn` - alias fon `console.warn`

## Examples of pro scenarios

- Sending notification to Telegram or Slack

```javascript
const scenario = global.apiVersions['2.0.0'];

scenario.init() // initialize scenario
    .then(() => {
        // ...
        // ...
        // ...
       scenario.notify.channel('someAlias', 'message').then(() => { // send message to notification channel(Telegram or Slack) with current alias
            // paste your next code here
            // it will be executed both on successful and unsuccessful sending
        });
    });
```


- Initializing threshold and processing its value

```javascript
const scenario = global.apiVersions['2.0.0'];

scenario.init()
  .then(() => {
    const thresholdId = 'put-threshold-id-here';
    const thresholdTopic = scenario.threshold.topic(thresholdId); // get threshold topic by thresold ID
    
    const thresholdAttributes = {
      name: 'someTh',
      datatype: 'string',
      unit: '#'
    };
  
    scenario.threshold.init(thresholdId, thresholdAttributes); // initialize threshold
  
    // Subscribe on all incoming messages from broker to track changes of threshold value
    scenario.message((topic, message) => {
      if (topic === thresholdTopic) {
        const value = message.toString(); // parse buffer to string

        console.log(value);
        
        // process threshold value
        // ...
        // ...
        // ...
      }
    });
  })
```

- Setting group value

```javascript
// In this example we will set a new location value for Yahoo Weather virtual device
// Before creating scenario you need to create group "city"(or any other name you want) and attach
// it to location option in Yahoo Weather
const scenario = global.apiVersions['2.0.0'];

scenario.init()
  .then(() => {
    const groupName = 'city'; // put your group name here
    const valueToSet = 'Kiev'; // put a value your want to set to a group here
    
    scenario.group.set(groupName, valueToSet);
  });
```


- Complex example

```javascript
const scenario = global.apiVersions['2.0.0'];
scenario.init() // initialize scenario
  .then(() => {
    const thresholdId = 'min-temperature';
    // Replace this topic with your thermometer temperature sensor topic
    const thermometerTemperatureSensorTopic = 'sweet-home/yahoo-weather/thermometer/temperature-sensor';

    const thresholdAttributes = {
      name: 'Min temperature',
      datatype: 'integer',
    };
  
    scenario.threshold.init(thresholdId, thresholdAttributes); // initialize threshold
  
    // Subscribe on all incoming messages from broker to track changes of temperature sensor value
    scenario.message((topic, message) => {
      if (topic === thermometerTemperatureSensorTopic) {
        const temperature = +message.toString(); // parse buffer to string and then to number
        const thresholdTemperature = +scenario.threshold.value(thresholdId); // get current threshold value

        // Compare new temperature value with threshold
        // and send notification if temperature is less
        if (temperature < thresholdTemperature) {
          scenario.notify.channel('someAlias', `Temperature in the city is less than ${thresholdTemperature} °C!`);
        }
      }
    });
  });
```