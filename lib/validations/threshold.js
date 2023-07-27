const LIVR = require('livr');

const DATA_TYPES = [ 'integer', 'float', 'boolean', 'string', 'enum', 'color' ];

LIVR.Validator.defaultAutoTrim(true);

const thValidator = new LIVR.Validator({
    id  : [ 'required', { like: '(^[a-z0-9]$|^[a-z0-9][a-z0-9]$|^[a-z0-9][a-z-0-9-]+[a-z0-9]$)' } ],
    obj : { 'nested_object' : {
        'name'     : [ 'required', 'string' ],
        'datatype' : [ 'required', { 'one_of': DATA_TYPES } ],
        'unit'     : 'string',
        'format'   : 'string',
        'settable' : [ 'string', { one_of: [ 'true', 'false' ] } ],
        'retained' : [ 'string', { one_of: [ 'true', 'false' ] } ]
    } }
});
const COLOR_MODELS = [ 'rgb', 'hsv' ];

function validateThreshold(params) {
    const validated = thValidator.validate(params);

    LIVR.Validator.defaultAutoTrim(true);

    if (!validated) {
        throw new Error(`Attributes validation error. ${JSON.stringify(thValidator.getErrors())}`);
    }

    const errors = {};

    let isWrongType = false;
    const { datatype, format, value } = validated.obj;

    if (!value) return validated;

    switch (datatype) {
        case 'integer':
        case 'float':
            if (!new RegExp('^[+-]?\\d+(\\.\\d+)?$').test(value)) isWrongType = true; // eslint-disable-line security/detect-unsafe-regex

            if (format) {
                if (!new RegExp('^\\d+:\\d+$').test(format)) {
                    errors.format = 'WRONG_FORMAT';
                    isWrongType = true;
                }

                const range = format.split(':');

                if (Number(range[0]) > Number(range[1])) {
                    errors.format = 'WRONG_FORMAT';
                    isWrongType = true;
                }
            }

            break;
        case 'boolean':
            if (![ 'true', 'false' ].includes(value)) isWrongType = true;

            break;
        case 'enum':
            if (!format) {
                isWrongType = true;
                errors.format = 'WRONG_FORMAT';
            }

            break;
        case 'color':
            // for $datatype -> color, $format is required and can be one of COLOR_MODELS const
            if (!format || !COLOR_MODELS.includes(format)) {
                isWrongType = true;
                errors.format = 'WRONG_FORMAT';
            }

            break;
        default:
            break;
    }

    if (isWrongType) {
        errors.value = 'WRONG_TYPE';
        throw new Error(`Attributes validation error. ${JSON.stringify(errors)}`);
    }

    return validated;
}

module.exports = { thValidator, COLOR_MODELS, DATA_TYPES, validateThreshold };
