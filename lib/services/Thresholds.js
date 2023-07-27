// Data types enum
const DATA_TYPES = {
    integer : 'integer',
    float   : 'float',
    boolean : 'boolean',
    string  : 'string',
    enum    : 'enum',
    color   : 'color'
};

const COLOR_MODELS = [ 'rgb', 'hsv' ];

class Thresholds {
    constructor({ homieServer, debug }) {
        this.debug = debug;
        this.homieServer = homieServer;
        this._handleAttributeSet = this._handleAttributeSet.bind(this);
    }

    init() {
        this.homieServer.onNewThreshold(({ thresholdId, scenarioId }) => {
            const newThreshold = this.homieServer.getThresholdById(scenarioId, thresholdId);

            newThreshold.onAttributeSet(this._handleAttributeSet);
        });

        const thresholds = this.homieServer.getThresholds();

        Object.keys(thresholds).forEach(scenarioId => {
            thresholds[scenarioId].forEach(threshold => {
                threshold.onAttributeSet(this._handleAttributeSet);
            });
        });
    }

    _handleAttributeSet(data) {
        const { threshold, value } = data;
        const { format, dataType } = threshold;

        let isWrongType = false;

        const error = {
            message : `Wrong value for ${dataType} threshold datatype`,
            code    : 'WRONG_FORMAT'
        };

        switch (dataType) {
            case DATA_TYPES.integer:
            case DATA_TYPES.float:
                if (!new RegExp('^[+-]?\\d+(\\.\\d+)?$').test(value)) isWrongType = true; // eslint-disable-line security/detect-unsafe-regex

                if (format) {
                    if (!new RegExp('^\\d+:\\d+$').test(format)) {
                        isWrongType = true;
                    }

                    const range = format.split(':');

                    if (Number(range[0]) > Number(range[1])) {
                        isWrongType = true;
                    }
                }

                break;
            case DATA_TYPES.boolean:
                if (![ 'true', 'false' ].includes(value)) isWrongType = true;

                break;
            case DATA_TYPES.enum:
                if (!format) {
                    isWrongType = true;
                }

                break;
            case DATA_TYPES.color:
                // for $datatype -> color, $format is required and can be one of COLOR_MODELS const
                if (!format || !COLOR_MODELS.includes(format)) {
                    isWrongType = true;
                }

                break;
            default:
                break;
        }

        if (isWrongType) {
            this._publishError(data, error);
        } else {
            threshold.publishAttribute('value', value);
        }
    }

    _publishError(data, err) {
        this.debug.warning(err.message);

        const { threshold } = data;

        threshold.publishError(err);
    }
}

module.exports = Thresholds;
