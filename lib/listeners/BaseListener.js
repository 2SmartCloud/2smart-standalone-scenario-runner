const EventEmitter = require('events').EventEmitter;

/*
should emit event
    new
        with data {file:'path_to_file', language:'js', topicName:'topic-name' }
    chaged
        with data {file:'path_to_file', language:'js', topicName:'topic-name' }
    deleted
        with 'path_to_file',
    error
        with error object
watch() - starts listening
 */
class BaseListener extends EventEmitter {
    async watch() {
        throw new Error('Watch is not implemented!');
    }

    async stop() {
        throw new Error('Stop is not implemented!');
    }
}

module.exports = BaseListener;
