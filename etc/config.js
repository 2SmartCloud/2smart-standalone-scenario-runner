module.exports = {
    mqtt : {
        uri      : process.env.MQTT_URI  || 'mqtt://localhost:1883',
        username : process.env.MQTT_USER || '',
        password : process.env.MQTT_PASS || ''
    },
    extensions : {
        installPath : `${process.env.EXTENSIONS_INSTALL_PATH}/simple-scenario`
    },
    context : {
        mode : process.env.MODE
    }
};
