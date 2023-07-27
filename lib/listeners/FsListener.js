const path = require('path');
const fs = require('fs-extra');
const chokidar = require('chokidar');
const BaseListener = require('./BaseListener');

const EXT_TO_LANGUAGE = {
    'js' : 'js'
};

class FsListener extends BaseListener {
    constructor({ scenariosDir, forceWatch, debug }) {
        super();
        // eslint-disable-next-line no-sync
        if (!fs.lstatSync(scenariosDir).isDirectory()) throw new Error('Directory \'scenarios\' doesn\'t exist!');
        this.scenariosDir = scenariosDir;
        this._w = null;

        if (forceWatch) process.nextTick(this.watch.bind(this));
        this.debug = debug;
    }

    watch() {
        if (this.watching) return;
        this.watching = true;
        this._w = chokidar.watch(this.scenariosDir, {
            // eslint-disable-next-line no-useless-escape
            ignored    : /(^|[\/\\])\../,
            persistent : true
        });

        this._w.on('add', this._onNewFile.bind(this))
            .on('change', this._onFileChange.bind(this))
            .on('unlink', this._onFileUnlink.bind(this))
            .on('error', this._onError.bind(this));
    }

    stop() {
        if (!this.watching) return;
        this.watching = false;
        this._w.close();
        this._w = null;
    }

    _onNewFile(file) {
        const ext = path.extname(file).replace('.', '');
        const { name } = path.parse(file);

        this.emit('newScenario', {
            file,
            language  : EXT_TO_LANGUAGE[ext],
            topicName : name
        });
    }

    _onFileChange(file) {
        const ext = path.extname(file).replace('.', '');
        const { name } = path.parse(file);

        this.emit('changedScenario', {
            file,
            language  : EXT_TO_LANGUAGE[ext],
            topicName : name
        });
    }

    _onFileUnlink(file) {
        this.emit('deletedScenario', file);
    }

    _onError(error) {
        this.emit('error', error);
    }
}

module.exports = FsListener;
