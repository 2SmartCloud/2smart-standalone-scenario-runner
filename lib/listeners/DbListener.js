/* eslint-disable no-sync */
const path           = require('path');
const fs             = require('fs-extra');
const BaseListener   = require('./BaseListener');
const { sequelize }  = require('./../sequelize');

const Scenarios           = sequelize.model('Scenarios');
const SimpleScenarioTypes = sequelize.model('SimpleScenarioTypes');

const LANGUAGE_TO_EXT = {
    'JS' : 'js'
};
const DEFAULT_CHECK_INTERVAL = 2000; // ms

class DbListener extends BaseListener {
    constructor({
        tempScenariosDir,
        templatesPath,
        checkInterval,
        forceWatch,
        debug,
        scenarioInstallPath,
        homieSynchronizer
    }) {
        super();

        if (!fs.lstatSync(tempScenariosDir).isDirectory()) {
            throw new Error('Temp directory do db scenarios doesn\'t exist!');
        }

        fs.emptyDirSync(tempScenariosDir);
        this.tempScenariosDir = tempScenariosDir;
        this.templatesPath = templatesPath;
        this.scenarioInstallPath = scenarioInstallPath;

        this.cached = {};
        this.watching = false;
        this.checkInterval = checkInterval || DEFAULT_CHECK_INTERVAL;
        if (forceWatch) process.nextTick(this.watch.bind(this));

        this._onError = this._onError.bind(this);
        this.debug = debug;
        this.homieSynchronizer = homieSynchronizer;
    }

    watch() {
        if (this.watching) return;
        this.watching = true;
        this._checkDb();
    }

    stop() {
        if (!this.watching) return;
        this.watching = false;
        clearTimeout(this.timeout);
    }

    async _checkDb() {
        if (!this.watching) return;

        try {
            const scenarios = await Scenarios.findAll({
                where   : {},
                include : [ {
                    model : SimpleScenarioTypes,
                    as    : 'simpleScenarioType'
                } ]
            });
            const hashScenarios = {};

            scenarios.forEach((scenario) => {
                hashScenarios[scenario.id] = scenario;
            });
            for (const key of Object.keys(this.cached)) {
                const cached = this.cached[key];
                const scenario = hashScenarios[key];

                delete hashScenarios[key];

                /**
                 * Scenario events:
                 *
                 * when we doesn't recieve scenario record on current db checking -> delete scenario event
                 *
                 * when scenario status changes from 'INACTIVE' to 'ACTIVE' -> start scenario event
                 *
                 * when scenario status changes from 'ACTIVE' to 'INACTIVE' -> stop scenario event
                 *
                 * when scenario status was 'ACTIVE' and stay 'ACTIVE' and scenario have different updated time
                 *     -> change scenario event
                 */
                if (scenario) {
                    // Scenario STARTED
                    if (cached.status === 'INACTIVE' && scenario.status === 'ACTIVE') {
                        await this._onNewScenario(scenario).catch(this._onError);
                    }

                    // Scenario STOPPED
                    if (cached.status === 'ACTIVE' && scenario.status === 'INACTIVE') {
                        await this._onScenarioStop(scenario).catch(this._onError);
                    }

                    // Scenario CHANGED
                    if (cached.status === 'ACTIVE' && scenario.status === 'ACTIVE' &&
                        cached.updatedAt.getTime() !== scenario.updatedAt.getTime()) {
                        await this._onScenarioChange(scenario).catch(this._onError);
                    }
                } else {
                    // Scenario DELETED
                    await this._onScenarioDelete(key).catch(this._onError);
                }
            }
            /**
             * Start scenarios what have ACTIVE status and which are
             * not present in cached object(when we just start app)
             */

            for (const key of Object.keys(hashScenarios)) {
                const scenario = hashScenarios[key];

                this._syncWithHomie(scenario);

                if (scenario.status === 'ACTIVE') await this._onNewScenario(hashScenarios[key]).catch(this._onError);
                else await this._updateScenario(hashScenarios[key]).catch(this._onError);
            }
        } catch (e) {
            this._onError(e);
        }

        this.timeout = setTimeout(this._checkDb.bind(this), this.checkInterval);
    }

    _syncWithHomie(scenario) {
        const updateDb = async ({ status, name }) => {
            await Scenarios.update({ status }, { where: { name } });
        };

        this.homieSynchronizer.sync({ scenario, updateStorage: updateDb });
    }

    // _updateScenario saves or updates temp file, update cached object and return event object
    async _updateScenario(scenario) {
        const key = scenario.id;

        let script;

        this.cached[key] = {
            key,
            status    : scenario.status,
            language  : scenario.language.toLowerCase(),
            updatedAt : scenario.updatedAt,
            topicName : scenario.name
        };

        if (scenario.type && fs.existsSync(path.join(this.scenarioInstallPath, 'node_modules', scenario.type))) {
            const simpleScenarioAbsolutePath = path.join(
                this.scenarioInstallPath,
                'node_modules',
                scenario.type
            );

            const pathToScenarioConfigFile = path.join(simpleScenarioAbsolutePath, 'package.json');
            const scenarioConfigFile = await fs.promises.readFile(pathToScenarioConfigFile, 'utf-8');
            const scenarioMainFile = JSON.parse(scenarioConfigFile).main;
            const pathToScenarioScript = path.join(simpleScenarioAbsolutePath, scenarioMainFile);

            this.cached[key] = {
                ...this.cached[key],
                type   : scenario.type,  // npm package name
                params : scenario.params,
                file   : pathToScenarioScript
            };
        } else {
            // logic below is deprecated now, it will be removed in the next versions
            // now simple
            const file = path.join(this.tempScenariosDir, `${scenario.name}.${LANGUAGE_TO_EXT[scenario.language]}`);

            /* DEPRECATED */
            // eslint-disable-next-line no-lonely-if
            if (scenario.mode === 'SIMPLE') {
                if (!scenario.simpleScenarioType) return; // throw new Error('!scenario.simpleScenarioType = false');
                const { script: scriptname } = scenario.simpleScenarioType;

                script = fs.readFileSync(path.join(this.templatesPath, `${scriptname}.${LANGUAGE_TO_EXT[scenario.language]}`)).toString().replace(
                    /{\s*([A-Za-z][A-Za-z_0-9]*)\s*}/g,
                    (str, varname) => {
                        const field = scenario.simpleScenarioType.configuration
                            .fields.find(({ name }) => name === varname);

                        if (!field) return str;

                        return JSON.stringify(scenario.params[varname]);
                    }
                );
            } else {
                script = scenario.script;
            }

            fs.writeFileSync(file, script);

            this.cached[key] = {
                ...this.cached[key],
                file
            };
        }

        return this.cached[key];
    }

    async _onNewScenario(scenario) {
        try {
            this.emit('newScenario', await this._updateScenario(scenario));
        } catch (e) {
            this.debug.warning('DbListener.newScenario', e);
        }
    }

    async _onScenarioChange(scenario) {
        try {
            this.emit('changedScenario', await this._updateScenario(scenario));
        } catch (e) {
            this.debug.warning('DbListener.changedScenario', e);
        }
    }

    async _onScenarioDelete(key) {
        const cached = this.cached[key];

        delete this.cached[key];

        /**
         * scenario-runner must handle removing only of pro scenario files,
         * removing of simple scenarios is handled by 2smart-core
         */
        if (!cached.type) { // pro scenarios doesn't have a type(name of installed package for current scenario)
            try {
                fs.unlinkSync(cached.file);
            } catch (e) {
                this._onError(e);
            }
        }

        this.emit('deletedScenario', cached);
    }

    async _onScenarioStop(scenario) {
        try {
            const key = scenario.id;

            this.cached[key].status = scenario.status;
            this.emit('stoppedScenario', this.cached[key]);
        } catch (e) {
            this.debug.warning('DbListener.stoppedScenario', e);
        }
    }

    _onError(error) {
        this.emit('error', error);
    }
}

module.exports = DbListener;
