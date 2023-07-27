const EventEmitter = require('events').EventEmitter;
const X            = require('homie-sdk/lib/utils/X');

module.exports = class HomieSynchronizer extends EventEmitter {
    constructor({
        debug,
        homie,
        homieMigrator
    }) {
        super();

        this.debug = debug;
        this.homie = homie;
        this.homieMigrator = homieMigrator;
    }

    sync({ scenario, updateStorage }) {
        const homieScenario = this.homieMigrator.attachScenario({ id: scenario.name, state: scenario.status === 'ACTIVE' ? 'true' : 'false' });

        homieScenario.onAttributeSet(async ({ field, value, type }) => {
            try {
                if (type !== 'SCENARIO' && field !== 'state') return;
                if (value !== 'true' && value !== 'false') {
                    throw new X({ code: 'ERROR', message: 'Wrong value' });
                }

                const newStatus = value === 'true' ? 'ACTIVE' : 'INACTIVE';

                await updateStorage({ status: newStatus, name: scenario.name });

                homieScenario.publishAttribute('state', value);
            } catch (e) {
                homieScenario.publishError(e, `${homieScenario.getRootTopic()}/$state`);
            }
        });
    }
};
