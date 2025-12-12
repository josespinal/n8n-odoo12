"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.odooDelete = exports.odooUpdate = exports.odooGetAll = exports.odooCallMethod = exports.odooGet = exports.odooCreate = exports.odooGetModelFields = exports.odooGetServerVersion = exports.odooGetUserID = exports.processNameValueFields = exports.odooGetDBName = exports.mapFilterOperationToXMLRPC = exports.mapOdooResources = exports.mapOperationToXMLRPC = void 0;
const xmlrpc_1 = require("xmlrpc");
const n8n_workflow_1 = require("n8n-workflow");
exports.mapOperationToXMLRPC = {
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
exports.mapFilterOperationToXMLRPC = {
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
        item.operator = exports.mapFilterOperationToXMLRPC[operator];
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
function normalizeHeaders(headers) {
    if (!headers || typeof headers !== 'object')
        return;
    const normalized = {};
    for (const [key, value] of Object.entries(headers)) {
        if (value === undefined || value === null)
            continue;
        normalized[key] = String(value);
    }
    return Object.keys(normalized).length ? normalized : undefined;
}
function createXmlRpcClient(service, url, headers) {
    const cleanUrl = url.replace(/\/$/, '');
    return (0, xmlrpc_1.createClient)({
        url: `${cleanUrl}/xmlrpc/2/${service}`,
        headers: normalizeHeaders(headers),
    });
}
async function xmlRpcCall(client, method, params) {
    return await new Promise((resolve, reject) => {
        client.methodCall(method, params, (error, value) => {
            if (error)
                return reject(error);
            resolve(value);
        });
    });
}
async function odooGetUserID(db, username, password, url, extraHeaders) {
    try {
        const client = createXmlRpcClient('common', url, extraHeaders);
        const uid = await xmlRpcCall(client, 'authenticate', [db, username, password, {}]);
        return Number(uid);
    }
    catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error);
    }
}
exports.odooGetUserID = odooGetUserID;
async function odooGetServerVersion(url, extraHeaders) {
    try {
        const client = createXmlRpcClient('common', url, extraHeaders);
        return await xmlRpcCall(client, 'version', []);
    }
    catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error);
    }
}
exports.odooGetServerVersion = odooGetServerVersion;
async function executeKw(db, userID, password, model, method, args, kwargs = {}, url, extraHeaders) {
    try {
        const client = createXmlRpcClient('object', url || '', extraHeaders);
        return await xmlRpcCall(client, 'execute_kw', [db, userID, password, model, method, args, kwargs]);
    }
    catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error);
    }
}
async function odooGetModelFields(db, userID, password, resource, url, extraHeaders) {
    const model = exports.mapOdooResources[resource] || resource;
    const fields = await executeKw.call(this, db, userID, password, model, 'fields_get', [], { attributes: ['string', 'type', 'help', 'required', 'name'] }, url, extraHeaders);
    return fields;
}
exports.odooGetModelFields = odooGetModelFields;
async function odooCreate(db, userID, password, resource, operation, url, newItem, extraHeaders) {
    const model = exports.mapOdooResources[resource] || resource;
    const result = await executeKw.call(this, db, userID, password, model, exports.mapOperationToXMLRPC[operation], [newItem || {}], {}, url, extraHeaders);
    return { id: result };
}
exports.odooCreate = odooCreate;
async function odooGet(db, userID, password, resource, operation, url, itemsID, fieldsToReturn, extraHeaders) {
    if (!/^\d+$/.test(itemsID) || !parseInt(itemsID, 10)) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), {
            status: 'Error',
            message: `Please specify a valid ID: ${itemsID}`,
        });
    }
    const model = exports.mapOdooResources[resource] || resource;
    return await executeKw.call(this, db, userID, password, model, exports.mapOperationToXMLRPC[operation], [[+itemsID]], { fields: fieldsToReturn || [] }, url, extraHeaders);
}
exports.odooGet = odooGet;
async function odooCallMethod(db, userID, password, resource, url, callMethod, itemsIDs, extraHeaders) {
    const model = exports.mapOdooResources[resource] || resource;
    const ids = itemsIDs.split(',').map((x) => +x);
    return await executeKw.call(this, db, userID, password, model, callMethod, [ids], {}, url, extraHeaders);
}
exports.odooCallMethod = odooCallMethod;
async function odooGetAll(db, userID, password, resource, operation, url, filters, fieldsToReturn, limit = 0, offset = 0, extraHeaders) {
    const model = exports.mapOdooResources[resource] || resource;
    const domain = processFilters(filters) || [];
    const kwargs = {
        fields: fieldsToReturn || [],
    };
    if (offset)
        kwargs.offset = offset;
    if (limit)
        kwargs.limit = limit;
    return await executeKw.call(this, db, userID, password, model, exports.mapOperationToXMLRPC[operation], [domain], kwargs, url, extraHeaders);
}
exports.odooGetAll = odooGetAll;
async function odooUpdate(db, userID, password, resource, operation, url, itemsID, fieldsToUpdate, extraHeaders) {
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
    const model = exports.mapOdooResources[resource] || resource;
    await executeKw.call(this, db, userID, password, model, exports.mapOperationToXMLRPC[operation], [[+itemsID], fieldsToUpdate], {}, url, extraHeaders);
    return { id: itemsID };
}
exports.odooUpdate = odooUpdate;
async function odooDelete(db, userID, password, resource, operation, url, itemsID, extraHeaders) {
    if (!/^\d+$/.test(itemsID) || !parseInt(itemsID, 10)) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), {
            status: 'Error',
            message: `Please specify a valid ID: ${itemsID}`,
        });
    }
    const model = exports.mapOdooResources[resource] || resource;
    await executeKw.call(this, db, userID, password, model, exports.mapOperationToXMLRPC[operation], [[+itemsID]], {}, url, extraHeaders);
    return { success: true };
}
exports.odooDelete = odooDelete;
//# sourceMappingURL=GenericFunctions.js.map