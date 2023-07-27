function AliasNotify(channel, msg) {
    const { type, configuration } = channel;

    const Adapter = require(`./adapters/${type}`);

    return new Adapter(configuration).sendAlias(msg);
}

module.exports = { AliasNotify };
