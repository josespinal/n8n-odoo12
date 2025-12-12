"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.odooGetServerVersion = exports.odooGetUserID = exports.odooDelete = exports.odooUpdate = exports.odooGetAll = exports.odooCallMethod = exports.odooGet = exports.odooCreate = exports.odooGetModelFields = exports.odooJSONRPCRequest = exports.processNameValueFields = exports.odooGetDBName = exports.mapFilterOperationToJSONRPC = exports.mapOdooResources = exports.mapOperationToJSONRPC = void 0;
const n8n_workflow_1 = require("n8n-workflow");
exports.mapOperationToJSONRPC = {
    create: 'create',
    get: 'read',
    getAll: 'search_read',
    update: 'write',
    delete: 'unlink',
};
exports.mapOdooResources = {
    contact: 'res.partner',
    opportunity: 'crm.lead',
    note: 'note.note',
};
exports.mapFilterOperationToJSONRPC = {
    equal: '=',
    notEqual: '!=',
    greaterThen: '>',
    lesserThen: '<',
    greaterOrEqual: '>=',
    lesserOrEqual: '<=',
    like: 'like',
    in: 'in',
    notIn: 'not in',
    childOf: 'child_of',
};
function odooGetDBName(databaseName, url) {
    if (databaseName)
        return databaseName;
    const odooURL = new URL(url);
    const hostname = odooURL.hostname;
    if (!hostname)
        return '';
    return odooURL.hostname.split('.')[0];
}
exports.odooGetDBName = odooGetDBName;
function processFilters(value) {
    const filters = value?.filter;
    return filters?.map((item) => {
        const operator = item.operator;
        item.operator = exports.mapFilterOperationToJSONRPC[operator];
        return Object.values(item);
    });
}
function processNameValueFields(value) {
    if (!value || typeof value !== 'object')
        return {};
    const data = value;
    if (!Array.isArray(data.fields))
        return {};
    return data.fields.reduce((acc, record) => {
        return { ...acc, [record.fieldName]: record.fieldValue };
    }, {});
}
exports.processNameValueFields = processNameValueFields;
async function odooJSONRPCRequest(body, url, extraHeaders) {
    try {
        const baseHeaders = {
            'User-Agent': 'n8n',
            Connection: 'keep-alive',
            Accept: '*/*',
            'Content-Type': 'application/json',
        };
        const headers = extraHeaders ? { ...baseHeaders, ...extraHeaders } : baseHeaders;
        const options = {
            headers,
            method: 'POST',
            body,
            uri: `${url}/jsonrpc`,
            json: true,
        };
        const responce = await this.helpers.request(options);
        if (responce.error) {
            throw new n8n_workflow_1.NodeApiError(this.getNode(), responce.error.data, {
                message: responce.error.data?.message,
            });
        }
        return responce.result;
    }
    catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error);
    }
}
exports.odooJSONRPCRequest = odooJSONRPCRequest;
async function odooGetModelFields(db, userID, password, resource, url, extraHeaders) {
    try {
        const body = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                service: 'object',
                method: 'execute',
                args: [
                    db,
                    userID,
                    password,
                    exports.mapOdooResources[resource] || resource,
                    'fields_get',
                    [],
                    ['string', 'type', 'help', 'required', 'name'],
                ],
            },
            id: Math.floor(Math.random() * 100),
        };
        return (await odooJSONRPCRequest.call(this, body, url, extraHeaders));
    }
    catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error);
    }
}
exports.odooGetModelFields = odooGetModelFields;
async function odooCreate(db, userID, password, resource, operation, url, newItem, extraHeaders) {
    try {
        const body = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                service: 'object',
                method: 'execute',
                args: [
                    db,
                    userID,
                    password,
                    exports.mapOdooResources[resource] || resource,
                    exports.mapOperationToJSONRPC[operation],
                    newItem || {},
                ],
            },
            id: Math.floor(Math.random() * 100),
        };
        const result = await odooJSONRPCRequest.call(this, body, url, extraHeaders);
        return { id: result };
    }
    catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error);
    }
}
exports.odooCreate = odooCreate;
async function odooGet(db, userID, password, resource, operation, url, itemsID, fieldsToReturn, extraHeaders) {
    try {
        if (!/^\d+$/.test(itemsID) || !parseInt(itemsID, 10)) {
            throw new n8n_workflow_1.NodeApiError(this.getNode(), {
                status: 'Error',
                message: `Please specify a valid ID: ${itemsID}`,
            });
        }
        const body = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                service: 'object',
                method: 'execute',
                args: [
                    db,
                    userID,
                    password,
                    exports.mapOdooResources[resource] || resource,
                    exports.mapOperationToJSONRPC[operation],
                    [+itemsID],
                    fieldsToReturn || [],
                ],
            },
            id: Math.floor(Math.random() * 100),
        };
        return await odooJSONRPCRequest.call(this, body, url, extraHeaders);
    }
    catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error);
    }
}
exports.odooGet = odooGet;
async function odooCallMethod(db, userID, password, resource, url, callMethod, itemsIDs, extraHeaders) {
    try {
        const body = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                service: 'object',
                method: 'execute',
                args: [
                    db,
                    userID,
                    password,
                    exports.mapOdooResources[resource] || resource,
                    callMethod,
                    itemsIDs.split(',').map((x) => +x),
                ],
            },
            id: Math.floor(Math.random() * 100),
        };
        return await odooJSONRPCRequest.call(this, body, url, extraHeaders);
    }
    catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error);
    }
}
exports.odooCallMethod = odooCallMethod;
async function odooGetAll(db, userID, password, resource, operation, url, filters, fieldsToReturn, limit = 0, offset = 0, extraHeaders) {
    try {
        const body = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                service: 'object',
                method: 'execute',
                args: [
                    db,
                    userID,
                    password,
                    exports.mapOdooResources[resource] || resource,
                    exports.mapOperationToJSONRPC[operation],
                    processFilters(filters) || [],
                    fieldsToReturn || [],
                    offset,
                    limit,
                ],
            },
            id: Math.floor(Math.random() * 100),
        };
        return await odooJSONRPCRequest.call(this, body, url, extraHeaders);
    }
    catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error);
    }
}
exports.odooGetAll = odooGetAll;
async function odooUpdate(db, userID, password, resource, operation, url, itemsID, fieldsToUpdate, extraHeaders) {
    try {
        if (!Object.keys(fieldsToUpdate).length) {
            throw new n8n_workflow_1.NodeApiError(this.getNode(), {
                status: 'Error',
                message: 'Please specify at least one field to update',
            });
        }
        if (!/^\d+$/.test(itemsID) || !parseInt(itemsID, 10)) {
            throw new n8n_workflow_1.NodeApiError(this.getNode(), {
                status: 'Error',
                message: `Please specify a valid ID: ${itemsID}`,
            });
        }
        const body = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                service: 'object',
                method: 'execute',
                args: [
                    db,
                    userID,
                    password,
                    exports.mapOdooResources[resource] || resource,
                    exports.mapOperationToJSONRPC[operation],
                    [+itemsID],
                    fieldsToUpdate,
                ],
            },
            id: Math.floor(Math.random() * 100),
        };
        await odooJSONRPCRequest.call(this, body, url, extraHeaders);
        return { id: itemsID };
    }
    catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error);
    }
}
exports.odooUpdate = odooUpdate;
async function odooDelete(db, userID, password, resource, operation, url, itemsID, extraHeaders) {
    if (!/^\d+$/.test(itemsID) || !parseInt(itemsID, 10)) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), {
            status: 'Error',
            message: `Please specify a valid ID: ${itemsID}`,
        });
    }
    try {
        const body = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                service: 'object',
                method: 'execute',
                args: [
                    db,
                    userID,
                    password,
                    exports.mapOdooResources[resource] || resource,
                    exports.mapOperationToJSONRPC[operation],
                    [+itemsID],
                ],
            },
            id: Math.floor(Math.random() * 100),
        };
        await odooJSONRPCRequest.call(this, body, url, extraHeaders);
        return { success: true };
    }
    catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error);
    }
}
exports.odooDelete = odooDelete;
async function odooGetUserID(db, username, password, url, extraHeaders) {
    try {
        const body = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                service: 'common',
                method: 'login',
                args: [db, username, password],
            },
            id: Math.floor(Math.random() * 100),
        };
        const loginResult = await odooJSONRPCRequest.call(this, body, url, extraHeaders);
        return Number(loginResult);
    }
    catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error);
    }
}
exports.odooGetUserID = odooGetUserID;
async function odooGetServerVersion(url, extraHeaders) {
    try {
        const body = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                service: 'common',
                method: 'version',
                args: [],
            },
            id: Math.floor(Math.random() * 100),
        };
        return await odooJSONRPCRequest.call(this, body, url, extraHeaders);
    }
    catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error);
    }
}
exports.odooGetServerVersion = odooGetServerVersion;
//# sourceMappingURL=GenericFunctions.js.map