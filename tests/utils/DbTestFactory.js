const { sequelize } = require('../../lib/sequelize.js');

class DbTestFactory {
    constructor() {
        if (process.env.MODE !== 'test') throw new Error('Wrong mode');
        if (!sequelize.config.database.match(/test/i)) throw new Error(`DATABASE [${sequelize.config.database}] DOES NOT HAVE "test" IN ITS NAME`);
    }

    async cleanup() {
        await this._dropDatabase();
    }

    async end() {
        await sequelize.close();
    }

    async _dropDatabase() {
        await sequelize.models.Scenarios.destroy({ where: {} });
    }
}

module.exports = DbTestFactory;
