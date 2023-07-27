/* eslint-disable func-names */
module.exports = async function () {
    await global.__SEQUELIZE__.close();
};
