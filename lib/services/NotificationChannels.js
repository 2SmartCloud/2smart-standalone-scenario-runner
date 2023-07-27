const LIVR          = require('livr');
const X             = require('homie-sdk/lib/utils/X');
const {
    ERROR_CODES
}                   = require('homie-sdk/lib/etc/config');
const {
    VALIDATION,
    UNKNOWN_ERROR,
    EXISTS
}                   = require('homie-sdk/lib/utils/errors');

const {
    AliasNotify
}                   = require('../notifications');

const { sequelize } = require('./../sequelize');

LIVR.Validator.defaultAutoTrim(true);

const NotificationChannelsModel = sequelize.model('NotificationChannels');

class NotificationChannels {
    constructor({ homieMigrator, debug }) {
        this.homieMigrator = homieMigrator;
        this.homie = this.homieMigrator.homie;
        this.debug = debug;

        this.entityType = 'NOTIFICATION_CHANNELS';
        this.rootTopic = undefined;
        this.errorTopic = undefined;

        this.handleSetEvent = this.handleSetEvent.bind(this);
    }

    async init() {
        this.debug.info('NotificationChannels.init');

        this.rootTopic = this.homie.getEntityRootTopicByType(this.entityType);
        this.errorTopic = `${this.homie.errorTopic}/${this.rootTopic}`;

        this.homie.on(`homie.entity.${this.entityType}.create`, this.handleCreateRequest.bind(this));
        this.homie.on('new_entity', this.handleNewEntity.bind(this));

        const notificationChannels = this.getNotificationChannels();

        for (const id of Object.keys(notificationChannels)) {
            this.attachNewChannel(notificationChannels[id]);
        }
    }

    getNotificationChannels() {
        return this.homie.getEntities(this.entityType);
    }

    handleNewEntity({ entityId, type }) {
        if (type !== this.entityType) return;

        this.debug.info('NotificationChannels.handleNewEntity', entityId);

        let channelEntity = null;

        try {
            channelEntity  = this.homie.getEntityById(this.entityType, entityId);
        } catch (err) {
            this.debug.warning('NotificationChannels.handleNewEntity', err);

            return;
        }

        this.attachNewChannel(channelEntity);
    }

    attachNewChannel(channel) {
        const channelId = channel.id;

        const deleteEvent = `homie.entity.${this.entityType}.${channelId}.delete`;
        const updateEvent = `homie.entity.${this.entityType}.${channelId}.update`;
        const publishError = this.publishError.bind(this);

        const handleUpdateRequest = (data) => this.handleUpdateRequest(data, channel);

        const handleDeleteRequest = async () => {
            this.debug.info('NotificationChannels.handleDeleteRequest');

            try {
                await this.homieMigrator.deleteEntity(channel);

                this.homie.off(deleteEvent, handleDeleteRequest);
                this.homie.off(updateEvent, handleUpdateRequest);
            } catch (err) {
                publishError(err, `${channelId}/delete`);
            }
        };

        this.homie.on(deleteEvent, handleDeleteRequest);
        this.homie.on(updateEvent, handleUpdateRequest);

        channel.onAttributeSet(this.handleSetEvent);
    }

    async handleSetEvent(data) {
        const { entity, field, value } = data;

        try {
            switch (field) {
                case 'state':
                    if (value !== 'enabled' && value !== 'disabled') {
                        throw new VALIDATION({
                            fields : {
                                state : 'NOT_ALLOWED_VALUE'
                            },
                            message : `Wrong value - ${value} for field - ${field}`
                        });
                    }

                    break;
                case 'event': {
                    const channelObject = {
                        type          : entity.type,
                        configuration : entity.configuration
                    };

                    try {
                        await AliasNotify(channelObject, 'Test message from 2Smart');
                    } catch (err) {
                        this.debug.warning('NotificationChannels.handleSetEvent.event', err);

                        throw new X({
                            code    : ERROR_CODES.UNKNOWN_ERROR,
                            fields  : {},
                            message : 'Error with sending test message'
                        });
                    }

                    break;
                }

                case 'alias':
                    if (value === '') {
                        throw new VALIDATION({
                            fields : {
                                alias : 'CANNOT_BE_EMPTY'
                            },
                            message : 'Alias cannot be empty string'
                        });
                    }

                    // eslint-disable-next-line no-case-declarations
                    const channels = this.getNotificationChannels();

                    // Check if there is already another channel with current alias
                    // eslint-disable-next-line no-case-declarations
                    const isAnotherChannelWithCurrentAlias = Object
                        .values(channels)
                        .some(el => el.alias === value && el.id !== entity.id);

                    if (isAnotherChannelWithCurrentAlias) {
                        throw new EXISTS({
                            fields : {
                                alias : 'EXISTS'
                            },
                            message : `Channel with alias "${value}" already exists`
                        });
                    }

                    break;
                case 'configuration':
                    // eslint-disable-next-line no-case-declarations
                    const notificationChannels = await NotificationChannelsModel.findOne({
                        where : { type: entity.type },
                        raw   : true
                    });

                    // eslint-disable-next-line no-case-declarations
                    const configuration = {};

                    for (const { name, validation } of notificationChannels.configuration.fields) {
                        configuration[name] = validation;
                    }

                    // eslint-disable-next-line no-case-declarations
                    const validator = new LIVR.Validator(configuration);
                    // eslint-disable-next-line no-case-declarations
                    const validData = validator.validate(value);

                    if (!validData) {
                        throw new VALIDATION({
                            fields  : validator.getErrors(),
                            message : 'Validation errors'
                        });
                    }

                    break;
                default:
                    return;
            }

            await entity.publishAttribute(field, value);
        } catch (e) {
            this.publishEntityError(e, entity, field);
        }
    }

    async handleCreateRequest(options) {
        const { translated: { value } } = options;

        const validationRules = {
            alias : [ 'required', 'not_empty' ],
            type  : [ 'required', 'not_empty' ]
        };

        const channels = this.getNotificationChannels();

        const errors = {};

        for (const key of Object.keys(value)) {
            const validatorsByKey = {
                alias() {
                    // Check if there is already channel with current alias
                    const isChannelWithCurrentAlias = Object.values(channels).some(el => el.alias === value.alias);

                    if (isChannelWithCurrentAlias) {
                        errors.alias = 'EXISTS';
                    }
                },
                async configuration() {
                    const notificationChannels = await NotificationChannelsModel.findOne({
                        where : { type: value.type },
                        raw   : true
                    });

                    const configuration = {};

                    for (const { name, validation } of notificationChannels.configuration.fields) {
                        configuration[name] = validation;
                    }

                    validationRules.configuration = {
                        'nested_object' : configuration
                    };
                }
            };

            const validationFunction = validatorsByKey[key];

            if (!validationFunction) {
                continue;
            }

            const isAsync = validationFunction.constructor.name === 'AsyncFunction';

            // Call specific validation function for current key
            if (isAsync) {
                await validationFunction();
            } else {
                validationFunction();
            }
        }

        const validator = new LIVR.Validator(validationRules);
        const validData = validator.validate(value);

        if (validData && !Object.keys(errors).length) {
            const {
                alias,
                type,
                configuration
            } = validData;

            const channel = await this.homieMigrator.attachEntity(this.entityType, {
                id    : options.entityId,
                state : 'enabled',
                type,
                configuration,
                alias
            });

            this.attachNewChannel(channel);
        } else {
            try {
                throw new VALIDATION({
                    fields : {
                        ...errors,
                        ...validator.getErrors()
                    },
                    message : 'Validation errors'
                });
            } catch (validationErrors) {
                this.publishError(validationErrors, `${options.entityId}/create`);
            }
        }
    }

    async handleUpdateRequest(data, channel) {
        const { value } = data;

        const validationRules = {
            alias : [ 'string', 'not_empty' ]
        };

        const channels = this.getNotificationChannels();

        const errors = {};

        for (const key of Object.keys(value)) {
            const validatorsByKey = {
                alias() {
                    // Check if there is already another channel with current alias
                    const isAnotherChannelWithCurrentAlias = Object
                        .values(channels)
                        .some(el => el.alias === value.alias && el.id !== channel.id);

                    if (isAnotherChannelWithCurrentAlias) {
                        errors.alias = 'EXISTS';
                    }
                },
                async configuration() {
                    const notificationChannels = await NotificationChannelsModel.findOne({
                        where : { type: channel.type },
                        raw   : true
                    });

                    const configuration = {};

                    for (const { name, validation } of notificationChannels.configuration.fields) {
                        configuration[name] = validation;
                    }

                    validationRules.configuration = {
                        'nested_object' : configuration
                    };
                }
            };

            const validationFunction = validatorsByKey[key];

            if (!validationFunction) {
                continue;
            }

            const isAsync = validationFunction.constructor.name === 'AsyncFunction';

            // Call specific validation function for current key
            if (isAsync) {
                await validationFunction();
            } else {
                validationFunction();
            }
        }

        const validator = new LIVR.Validator(validationRules);
        const validData = validator.validate(value);

        if (validData && !Object.keys(errors).length) {
            for (const key of Object.keys(validData)) {
                await channel.publishAttribute(key, validData[key]);
            }
        } else {
            try {
                throw new VALIDATION({
                    fields : {
                        ...errors,
                        ...validator.getErrors()
                    },
                    message : 'Validation errors'
                });
            } catch (validationErrors) {
                this.publishError(validationErrors, `${channel.id}/update`);
            }
        }
    }

    async publishEntityError(error, entity, key) {
        try {
            if (!(error instanceof X)) {
                // eslint-disable-next-line no-param-reassign
                error = new UNKNOWN_ERROR();
            }

            await entity.publishError(key, error);
        } catch (err) {
            this.debug.warning('NotificationChannels.publishEntityError', err);
        }
    }

    publishError(error, topic) {
        try {
            const preparedError = this.prepareError(error);
            const jsonErrorString = JSON.stringify(preparedError);

            this.debug.info('NotificationChannels.publishError', {
                code    : preparedError.code,
                fields  : preparedError.fields,
                message : preparedError.message
            });

            this.homie.publishToBroker(`${this.errorTopic}/${topic}`, jsonErrorString, { retain: false });
        } catch (err) {
            this.debug.warning('NotificationChannels.publishError', err);
        }
    }

    prepareError(error) {
        if (!(error instanceof X)) {
            // eslint-disable-next-line no-param-reassign
            error = new X({
                code    : ERROR_CODES.UNKNOWN_ERROR,
                fields  : {},
                message : 'Something went wrong'
            });
        }

        return error;
    }
}

module.exports = NotificationChannels;
