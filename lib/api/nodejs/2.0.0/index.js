const Alias = require('./entities/Alias');
const Group = require('./entities/Group');
const Main = require('./entities/Main');
const Method = require('./entities/Method');
const Notification = require('./entities/Notification');
const Threshold = require('./entities/Threshold');
const Topic = require('./entities/Topic');
const Utils = require('./entities/Utils');

const entities = {
    alias     : new Alias(),
    threshold : new Threshold(),
    main      : new Main(),
    topic     : new Topic(),
    group     : new Group(),
    method    : new Method(),
    notify    : new Notification(),
    utils     : new Utils()
};


Object.values(entities).forEach(entity => entity.initialize({ entities }));

module.exports = {
    ...entities.main.getAPI(),
    topic     : entities.topic.getAPI(),
    alias     : entities.alias.getAPI(),
    threshold : entities.threshold.getAPI(),
    group     : entities.group.getAPI(),
    method    : entities.method.getAPI(),
    notify    : entities.notify.getAPI(),
    utils     : entities.utils.getAPI()
};
