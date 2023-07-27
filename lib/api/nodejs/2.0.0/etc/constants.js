const topics = {
    ROOT_TOPIC                  : 'scenarios',
    GROUPS_TOPIC                : 'groups-of-properties',
    HOMIE_TOPIC                 : 'sweet-home',
    NOTIFICATION_CHANNELS_TOPIC : 'notification-channels',
    TOPICS_ALIASES_TOPIC        : 'topics-aliases',
    NOTIFICATIONS_TOPIC         : 'notifications'
};

const mqttProcInteractionEventTypes = {
    MQTT_PUBLISH                : 'MQTT_PUBLISH',
    MQTT_RECEIVE                : 'MQTT_RECEIVE',
    MQTT_STATE_TRANSFER         : 'MQTT_STATE_TRANSFER',
    MQTT_READY_TO_RECEIVE_STATE : 'MQTT_READY_TO_RECEIVE_STATE'
};

const entities = {
    threshold : {
        SYNC_INTERVAL : 1000
    }
};

module.exports = {
    topics,
    mqttProcInteractionEventTypes,
    entities
};

