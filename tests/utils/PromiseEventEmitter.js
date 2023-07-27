const Deferred = require('./Deferred');

function wrongEvent() {
    this.reject(new Error('Wrong event.'));
}

async function PromiseEventEmitter({ targetEvent, wrongEvents, errorEvent, timeout, action, emitter }) {
    // eslint-disable-next-line no-param-reassign
    errorEvent = (errorEvent === true ? 'error' : errorEvent) || false;

    const p = new Deferred();

    if (timeout) {
        p.registerTimeout(timeout, () => {
            console.log('Deferred timeout;');
        });
    }

    const fres =  p.resolve.bind(p);
    const frej =  p.reject.bind(p);
    const fwe =  wrongEvent.bind(p);

    emitter.on(targetEvent, fres);

    if (wrongEvents) {
        wrongEvents.forEach((eventName) => {
            emitter.on(eventName, fwe);
        });
    }

    if (errorEvent) emitter.on(errorEvent, frej);

    await action();

    const res = await p.promise();

    emitter.removeListener(targetEvent, fres);

    if (wrongEvents) {
        wrongEvents.forEach((eventName) => {
            emitter.removeListener(eventName, fwe);
        });
    }

    if (errorEvent) emitter.removeListener(errorEvent, frej);

    return res;
}

module.exports = PromiseEventEmitter;
