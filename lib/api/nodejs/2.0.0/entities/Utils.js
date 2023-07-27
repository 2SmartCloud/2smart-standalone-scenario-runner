const fetch  = require('node-fetch');
const Influx = require('influx');
const BaseEntity = require('./Base');

const {
    INFLUX_HOST,
    INFLUX_DATABASE
} = process.env;

module.exports = class Utils extends BaseEntity {
    getAPI() {
        return {
            log    : this.getLoggers(),
            influx : this.getInfluxMethods(),
            fetch
        };
    }

    getLoggers() {
        return {
            info : console.log,
            warn : console.warn
        };
    }

    getInfluxMethods() {
        if (!INFLUX_HOST || !INFLUX_DATABASE) {
            return { error: 'INFLUX_HOST or INFLUX_DATABASE not specified!' };
        }

        const influxClient = new Influx.InfluxDB({
            host     : INFLUX_HOST,
            database : INFLUX_DATABASE,
            schema   : [
                {
                    measurement : 'timelines',
                    fields      : {
                        string : Influx.FieldType.STRING,
                        number : Influx.FieldType.FLOAT
                    },
                    tags : [ 'topic', 'alias' ]
                }
            ]
        });

        return {
            query : influxClient.query.bind(influxClient)
        };
    }
};
