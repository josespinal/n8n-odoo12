"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tamesonodoo = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const descriptions_1 = require("./descriptions");
const GenericFunctions_1 = require("./GenericFunctions");
function getCustomHeaders(credentials) {
    if (!credentials.useCustomHeaders)
        return;
    const headers = credentials.customHeaders?.headers ?? [];
    const pairs = headers
        .filter((h) => h.headerName && h.headerValue)
        .map((h) => [h.headerName, h.headerValue]);
    if (!pairs.length)
        return;
    return Object.fromEntries(pairs);
}
class Tamesonodoo {
    constructor() {
        this.description = {
            displayName: 'Tameson Odoo',
            name: 'tamesonodoo',
            icon: 'file:odoo.svg',
            group: ['transform'],
            version: 1,
            description: 'Consume Odoo API',
            subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
            defaults: {
                name: 'Odoo',
            },
            inputs: ['main'],
            outputs: ['main'],
            credentials: [
                {
                    name: 'odooApi',
                    required: true,
                    testedBy: 'odooApiTest',
                },
            ],
            properties: [
                {
                    displayName: 'Resource',
                    name: 'resource',
                    type: 'options',
                    default: 'contact',
                    noDataExpression: true,
                    options: [
                        {
                            name: 'Contact',
                            value: 'contact',
                        },
                        {
                            name: 'Custom Resource',
                            value: 'custom',
                        },
                        {
                            name: 'Note',
                            value: 'note',
                        },
                        {
                            name: 'Opportunity',
                            value: 'opportunity',
                        },
                    ],
                },
                ...descriptions_1.customResourceOperations,
                ...descriptions_1.customResourceDescription,
                ...descriptions_1.opportunityOperations,
                ...descriptions_1.opportunityDescription,
                ...descriptions_1.contactOperations,
                ...descriptions_1.contactDescription,
                ...descriptions_1.noteOperations,
                ...descriptions_1.noteDescription,
            ],
        };
        this.methods = {
            loadOptions: {
                async getModelFields() {
                    let resource = this.getCurrentNodeParameter('resource');
                    if (resource === 'custom') {
                        resource = this.getCurrentNodeParameter('customResource');
                        if (!resource)
                            return [];
                    }
                    const credentials = (await this.getCredentials('odooApi'));
                    const url = credentials.url;
                    const username = credentials.username;
                    const password = credentials.password;
                    const customHeaders = getCustomHeaders(credentials);
                    const db = (0, GenericFunctions_1.odooGetDBName)(credentials.db, url);
                    const userID = await GenericFunctions_1.odooGetUserID.call(this, db, username, password, url, customHeaders);
                    const responce = await GenericFunctions_1.odooGetModelFields.call(this, db, userID, password, resource, url, customHeaders);
                    const options = Object.entries(responce).map(([fname, field]) => {
                        const optionField = field;
                        return {
                            name: fname,
                            value: fname,
                            description: `name: ${optionField?.string}, type: ${optionField?.type} required: ${optionField?.required}`,
                        };
                    });
                    return options.sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')));
                },
                async getModels() {
                    const credentials = (await this.getCredentials('odooApi'));
                    const url = credentials.url;
                    const username = credentials.username;
                    const password = credentials.password;
                    const customHeaders = getCustomHeaders(credentials);
                    const db = (0, GenericFunctions_1.odooGetDBName)(credentials.db, url);
                    const userID = await GenericFunctions_1.odooGetUserID.call(this, db, username, password, url, customHeaders);
                    const responce = (await GenericFunctions_1.odooGetAll.call(this, db, userID, password, 'ir.model', 'getAll', url, undefined, ['name', 'model', 'modules'], 0, 0, customHeaders));
                    const options = responce.map((model) => {
                        return {
                            name: model.name,
                            value: model.model,
                            description: `model: ${model.model}<br> modules: ${model.modules}`,
                        };
                    });
                    return options;
                },
                async getStates() {
                    const credentials = (await this.getCredentials('odooApi'));
                    const url = credentials.url;
                    const username = credentials.username;
                    const password = credentials.password;
                    const customHeaders = getCustomHeaders(credentials);
                    const db = (0, GenericFunctions_1.odooGetDBName)(credentials.db, url);
                    const userID = await GenericFunctions_1.odooGetUserID.call(this, db, username, password, url, customHeaders);
                    const responce = (await GenericFunctions_1.odooGetAll.call(this, db, userID, password, 'res.country.state', 'getAll', url, undefined, ['id', 'name'], 0, 0, customHeaders));
                    const options = responce.map((state) => {
                        return {
                            name: state.name,
                            value: state.id,
                        };
                    });
                    return options.sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')));
                },
                async getCountries() {
                    const credentials = (await this.getCredentials('odooApi'));
                    const url = credentials.url;
                    const username = credentials.username;
                    const password = credentials.password;
                    const customHeaders = getCustomHeaders(credentials);
                    const db = (0, GenericFunctions_1.odooGetDBName)(credentials.db, url);
                    const userID = await GenericFunctions_1.odooGetUserID.call(this, db, username, password, url, customHeaders);
                    const responce = (await GenericFunctions_1.odooGetAll.call(this, db, userID, password, 'res.country', 'getAll', url, undefined, ['id', 'name'], 0, 0, customHeaders));
                    const options = responce.map((country) => {
                        return {
                            name: country.name,
                            value: country.id,
                        };
                    });
                    return options.sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')));
                },
            },
            credentialTest: {
                async odooApiTest(credential) {
                    const credentials = credential.data;
                    const customHeaders = getCustomHeaders(credentials);
                    try {
                        const db = (0, GenericFunctions_1.odooGetDBName)(credentials?.db, credentials?.url);
                        const userId = await (0, GenericFunctions_1.odooAuthenticate)(db, credentials?.username, credentials?.password, credentials?.url, customHeaders);
                        if (!userId) {
                            return {
                                status: 'Error',
                                message: 'Credentials are not valid',
                            };
                        }
                    }
                    catch (error) {
                        // Emit detailed information to n8n logs to aid troubleshooting
                        console.error('Odoo credential test failed', {
                            message: error.message,
                            stack: error.stack,
                        });
                        return {
                            status: 'Error',
                            message: `Settings are not valid: ${error.message || error}`,
                        };
                    }
                    return {
                        status: 'OK',
                        message: 'Authentication successful!',
                    };
                },
            },
        };
    }
    async execute() {
        let items = this.getInputData();
        items = (0, n8n_workflow_1.deepCopy)(items);
        const returnData = [];
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        const credentials = (await this.getCredentials('odooApi'));
        const url = credentials.url.replace(/\/$/, '');
        const username = credentials.username;
        const password = credentials.password;
        const db = (0, GenericFunctions_1.odooGetDBName)(credentials.db, url);
        const customHeaders = getCustomHeaders(credentials);
        const userID = await GenericFunctions_1.odooGetUserID.call(this, db, username, password, url, customHeaders);
        for (let i = 0; i < items.length; i++) {
            try {
                if (resource === 'contact') {
                    if (operation === 'create') {
                        let additionalFields = this.getNodeParameter('additionalFields', i);
                        if (additionalFields.address) {
                            const addressFields = additionalFields.address.value;
                            if (addressFields) {
                                additionalFields = {
                                    ...additionalFields,
                                    ...addressFields,
                                };
                            }
                            delete additionalFields.address;
                        }
                        const name = this.getNodeParameter('contactName', i);
                        const fields = {
                            name,
                            ...additionalFields,
                        };
                        responseData = await GenericFunctions_1.odooCreate.call(this, db, userID, password, resource, operation, url, fields, customHeaders);
                    }
                    if (operation === 'delete') {
                        const contactId = this.getNodeParameter('contactId', i);
                        responseData = await GenericFunctions_1.odooDelete.call(this, db, userID, password, resource, operation, url, contactId, customHeaders);
                    }
                    if (operation === 'get') {
                        const contactId = this.getNodeParameter('contactId', i);
                        const options = this.getNodeParameter('options', i);
                        const fields = options.fieldsList || [];
                        responseData = await GenericFunctions_1.odooGet.call(this, db, userID, password, resource, operation, url, contactId, fields, customHeaders);
                    }
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        const fields = options.fieldsList || [];
                        if (returnAll) {
                            responseData = await GenericFunctions_1.odooGetAll.call(this, db, userID, password, resource, operation, url, undefined, fields, 0, 0, customHeaders);
                        }
                        else {
                            const limit = this.getNodeParameter('limit', i);
                            responseData = await GenericFunctions_1.odooGetAll.call(this, db, userID, password, resource, operation, url, undefined, fields, limit, 0, customHeaders);
                        }
                    }
                    if (operation === 'update') {
                        const contactId = this.getNodeParameter('contactId', i);
                        let updateFields = this.getNodeParameter('updateFields', i);
                        if (updateFields.address) {
                            const addressFields = updateFields.address.value;
                            if (addressFields) {
                                updateFields = {
                                    ...updateFields,
                                    ...addressFields,
                                };
                            }
                            delete updateFields.address;
                        }
                        responseData = await GenericFunctions_1.odooUpdate.call(this, db, userID, password, resource, operation, url, contactId, updateFields, customHeaders);
                    }
                }
                if (resource === 'custom') {
                    const customResource = this.getNodeParameter('customResource', i);
                    if (operation === 'create') {
                        const fields = this.getNodeParameter('fieldsToCreateOrUpdate', i);
                        responseData = await GenericFunctions_1.odooCreate.call(this, db, userID, password, customResource, operation, url, (0, GenericFunctions_1.processNameValueFields)(fields), customHeaders);
                    }
                    if (operation === 'delete') {
                        const customResourceId = this.getNodeParameter('customResourceId', i);
                        responseData = await GenericFunctions_1.odooDelete.call(this, db, userID, password, customResource, operation, url, customResourceId, customHeaders);
                    }
                    if (operation === 'get') {
                        const customResourceId = this.getNodeParameter('customResourceId', i);
                        const options = this.getNodeParameter('options', i);
                        const fields = options.fieldsList || [];
                        responseData = await GenericFunctions_1.odooGet.call(this, db, userID, password, customResource, operation, url, customResourceId, fields, customHeaders);
                    }
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        const fields = options.fieldsList || [];
                        const filter = this.getNodeParameter('filterRequest', i);
                        if (returnAll) {
                            responseData = await GenericFunctions_1.odooGetAll.call(this, db, userID, password, customResource, operation, url, filter, fields, 0, 0, customHeaders);
                        }
                        else {
                            const offset = this.getNodeParameter('offset', i);
                            const limit = this.getNodeParameter('limit', i);
                            responseData = await GenericFunctions_1.odooGetAll.call(this, db, userID, password, customResource, operation, url, filter, fields, limit, offset, customHeaders);
                        }
                    }
                    if (operation === 'callMethod') {
                        const methodName = this.getNodeParameter('methodName', i);
                        const itemsIDs = this.getNodeParameter('itemsIDs', i);
                        responseData = await GenericFunctions_1.odooCallMethod.call(this, db, userID, password, customResource, url, methodName, itemsIDs, customHeaders);
                    }
                    if (operation === 'update') {
                        const customResourceId = this.getNodeParameter('customResourceId', i);
                        const fields = this.getNodeParameter('fieldsToCreateOrUpdate', i);
                        responseData = await GenericFunctions_1.odooUpdate.call(this, db, userID, password, customResource, operation, url, customResourceId, (0, GenericFunctions_1.processNameValueFields)(fields), customHeaders);
                    }
                }
                if (resource === 'note') {
                    if (operation === 'create') {
                        const memo = this.getNodeParameter('memo', i);
                        const fields = {
                            memo,
                        };
                        responseData = await GenericFunctions_1.odooCreate.call(this, db, userID, password, resource, operation, url, fields, customHeaders);
                    }
                    if (operation === 'delete') {
                        const noteId = this.getNodeParameter('noteId', i);
                        responseData = await GenericFunctions_1.odooDelete.call(this, db, userID, password, resource, operation, url, noteId, customHeaders);
                    }
                    if (operation === 'get') {
                        const noteId = this.getNodeParameter('noteId', i);
                        const options = this.getNodeParameter('options', i);
                        const fields = options.fieldsList || [];
                        responseData = await GenericFunctions_1.odooGet.call(this, db, userID, password, resource, operation, url, noteId, fields, customHeaders);
                    }
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        const fields = options.fieldsList || [];
                        if (returnAll) {
                            responseData = await GenericFunctions_1.odooGetAll.call(this, db, userID, password, resource, operation, url, undefined, fields, 0, 0, customHeaders);
                        }
                        else {
                            const limit = this.getNodeParameter('limit', i);
                            responseData = await GenericFunctions_1.odooGetAll.call(this, db, userID, password, resource, operation, url, undefined, fields, limit, 0, customHeaders);
                        }
                    }
                    if (operation === 'update') {
                        const noteId = this.getNodeParameter('noteId', i);
                        const memo = this.getNodeParameter('memo', i);
                        const fields = {
                            memo,
                        };
                        responseData = await GenericFunctions_1.odooUpdate.call(this, db, userID, password, resource, operation, url, noteId, fields, customHeaders);
                    }
                }
                if (resource === 'opportunity') {
                    if (operation === 'create') {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const name = this.getNodeParameter('opportunityName', i);
                        const fields = {
                            name,
                            ...additionalFields,
                        };
                        responseData = await GenericFunctions_1.odooCreate.call(this, db, userID, password, resource, operation, url, fields, customHeaders);
                    }
                    if (operation === 'delete') {
                        const opportunityId = this.getNodeParameter('opportunityId', i);
                        responseData = await GenericFunctions_1.odooDelete.call(this, db, userID, password, resource, operation, url, opportunityId, customHeaders);
                    }
                    if (operation === 'get') {
                        const opportunityId = this.getNodeParameter('opportunityId', i);
                        const options = this.getNodeParameter('options', i);
                        const fields = options.fieldsList || [];
                        responseData = await GenericFunctions_1.odooGet.call(this, db, userID, password, resource, operation, url, opportunityId, fields, customHeaders);
                    }
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        const fields = options.fieldsList || [];
                        if (returnAll) {
                            responseData = await GenericFunctions_1.odooGetAll.call(this, db, userID, password, resource, operation, url, undefined, fields, 0, 0, customHeaders);
                        }
                        else {
                            const limit = this.getNodeParameter('limit', i);
                            responseData = await GenericFunctions_1.odooGetAll.call(this, db, userID, password, resource, operation, url, undefined, fields, limit, 0, customHeaders);
                        }
                    }
                    if (operation === 'update') {
                        const opportunityId = this.getNodeParameter('opportunityId', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        responseData = await GenericFunctions_1.odooUpdate.call(this, db, userID, password, resource, operation, url, opportunityId, updateFields, customHeaders);
                    }
                }
                if (Array.isArray(responseData)) {
                    returnData.push(...responseData);
                }
                else if (responseData !== undefined) {
                    returnData.push(responseData);
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ error: error.message });
                    continue;
                }
                throw error;
            }
        }
        return [this.helpers.returnJsonArray(returnData)];
    }
}
exports.Tamesonodoo = Tamesonodoo;
//# sourceMappingURL=Tamesonodoo.node.js.map