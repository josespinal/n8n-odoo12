"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.odooDelete = exports.odooUpdate = exports.odooGetAll = exports.odooCallMethod = exports.odooGet = exports.odooCreate = exports.odooGetModelFields = exports.odooGetServerVersion = exports.odooGetUserID = exports.odooAuthenticate = exports.probeXmlRpcEndpoint = exports.processNameValueFields = exports.buildAuthenticateProbeBody = exports.odooGetDBName = exports.mapFilterOperationToXMLRPC = exports.mapOdooResources = exports.mapOperationToXMLRPC = void 0;
const http = __importStar(require("node:http"));
const https = __importStar(require("node:https"));
const xmlrpc = __importStar(require("xmlrpc"));
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
function escapeXml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
function buildAuthenticateProbeBody(db, username, password) {
    return ("<?xml version='1.0'?><methodCall><methodName>authenticate</methodName><params>" +
        `<param><value><string>${escapeXml(db)}</string></value></param>` +
        `<param><value><string>${escapeXml(username)}</string></value></param>` +
        `<param><value><string>${escapeXml(password)}</string></value></param>` +
        '<param><value><struct></struct></value></param>' +
        '</params></methodCall>');
}
exports.buildAuthenticateProbeBody = buildAuthenticateProbeBody;
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
function mergeHeaders(base, extra) {
    return { ...base, ...(normalizeHeaders(extra) || {}) };
}
function createXmlRpcClient(service, url, headers) {
    const cleanUrl = url.replace(/\/$/, '');
    const baseHeaders = {
        'User-Agent': 'n8n',
        'Content-Type': 'text/xml',
        Accept: 'text/xml',
    };
    const mergedHeaders = { ...baseHeaders, ...(normalizeHeaders(headers) || {}) };
    const endpoint = `${cleanUrl}/xmlrpc/2/${service}`;
    const isHttps = endpoint.startsWith('https:');
    return isHttps
        ? xmlrpc.createSecureClient({ url: endpoint, headers: mergedHeaders })
        : xmlrpc.createClient({ url: endpoint, headers: mergedHeaders });
}
async function xmlRpcCall(service, url, method, params, extraHeaders) {
    const client = createXmlRpcClient(service, url, extraHeaders);
    return await new Promise((resolve, reject) => {
        client.methodCall(method, params, (error, value) => {
            if (error) {
                if (typeof error?.message === 'string' && error.message.includes('Unknown XML-RPC tag')) {
                    const wrapped = new Error("Received non-XML response from Odoo. Check the base URL (e.g. 'https://your-odoo-host'), ensure /xmlrpc/2/common and /xmlrpc/2/object are reachable without redirects, and that authentication is correct.");
                    wrapped.cause = error;
                    return reject(wrapped);
                }
                return reject(error);
            }
            resolve(value);
        });
    });
}
async function jsonRpcRequest(url, body, extraHeaders) {
    const baseHeaders = {
        'User-Agent': 'n8n',
        Connection: 'keep-alive',
        Accept: '*/*',
        'Content-Type': 'application/json',
    };
    const headers = mergeHeaders(baseHeaders, extraHeaders);
    try {
        return await this.helpers.request({
            method: 'POST',
            uri: `${url.replace(/\/$/, '')}/jsonrpc`,
            headers,
            body,
            json: true,
        });
    }
    catch (error) {
        if (typeof this.getNode === 'function') {
            throw new n8n_workflow_1.NodeApiError(this.getNode(), error);
        }
        throw error;
    }
}
async function probeXmlRpcEndpoint(endpoint, headers, body = '<?xml version="1.0"?><methodCall><methodName>version</methodName><params></params></methodCall>') {
    return await new Promise((resolve) => {
        try {
            const url = new URL(endpoint);
            const transport = url.protocol === 'https:' ? https.request : http.request;
            const req = transport({
                method: 'POST',
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                headers: {
                    'Content-Type': 'text/xml',
                    'User-Agent': 'n8n',
                    Accept: 'text/xml',
                    ...(normalizeHeaders(headers) || {}),
                },
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    if (data.length < 1000)
                        data += chunk.toString();
                });
                res.on('end', () => {
                    const snippet = data.slice(0, 500).replace(/\s+/g, ' ').trim();
                    resolve(`status=${res.statusCode} location=${res.headers.location ?? ''} body="${snippet}"`);
                });
            });
            req.on('error', (err) => {
                resolve(`probe error: ${err.message}`);
            });
            req.write(body);
            req.end();
        }
        catch (err) {
            resolve(`probe error: ${err.message}`);
        }
    });
}
exports.probeXmlRpcEndpoint = probeXmlRpcEndpoint;
async function odooAuthenticate(db, username, password, url, extraHeaders, protocol = 'xmlrpc') {
    if (protocol === 'jsonrpc') {
        const body = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                service: 'common',
                method: 'login',
                args: [db, username, password],
            },
            id: Math.floor(Math.random() * 1000),
        };
        const res = (await jsonRpcRequest.call(this, url, body, extraHeaders));
        return Number(res?.result);
    }
    const uid = await xmlRpcCall('common', url, 'authenticate', [db, username, password, {}], extraHeaders);
    return Number(uid);
}
exports.odooAuthenticate = odooAuthenticate;
async function odooGetUserID(db, username, password, url, extraHeaders, protocol = 'xmlrpc') {
    try {
        let uid;
        if (protocol === 'jsonrpc') {
            const body = {
                jsonrpc: '2.0',
                method: 'call',
                params: {
                    service: 'common',
                    method: 'login',
                    args: [db, username, password],
                },
                id: Math.floor(Math.random() * 1000),
            };
            const res = (await jsonRpcRequest.call(this, url, body, extraHeaders));
            uid = res?.result;
        }
        else {
            uid = await xmlRpcCall('common', url, 'authenticate', [db, username, password, {}], extraHeaders);
        }
        return Number(uid);
    }
    catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error);
    }
}
exports.odooGetUserID = odooGetUserID;
async function odooGetServerVersion(url, extraHeaders, protocol = 'xmlrpc') {
    try {
        if (protocol === 'jsonrpc') {
            const body = {
                jsonrpc: '2.0',
                method: 'call',
                params: {
                    service: 'common',
                    method: 'version',
                    args: [],
                },
                id: Math.floor(Math.random() * 1000),
            };
            const res = (await jsonRpcRequest.call(this, url, body, extraHeaders));
            return res?.result || {};
        }
        return (await xmlRpcCall('common', url, 'version', [], extraHeaders));
    }
    catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error);
    }
}
exports.odooGetServerVersion = odooGetServerVersion;
async function executeKw(db, userID, password, model, method, args, kwargs = {}, url, extraHeaders, protocol = 'xmlrpc') {
    try {
        if (protocol === 'jsonrpc') {
            const body = {
                jsonrpc: '2.0',
                method: 'call',
                params: {
                    service: 'object',
                    method: 'execute_kw',
                    args: [db, userID, password, model, method, args, kwargs],
                },
                id: Math.floor(Math.random() * 1000),
            };
            const res = (await jsonRpcRequest.call(this, url || '', body, extraHeaders));
            return res?.result;
        }
        return await xmlRpcCall('object', url || '', 'execute_kw', [db, userID, password, model, method, args, kwargs], extraHeaders);
    }
    catch (error) {
        let probe;
        try {
            const endpoint = `${(url || '').replace(/\/$/, '')}/xmlrpc/2/object`;
            probe = await probeXmlRpcEndpoint(endpoint, extraHeaders);
            // eslint-disable-next-line no-console
            console.error('Odoo XML-RPC object call probe', { endpoint, probe });
        }
        catch (_) {
            // ignore probe errors
        }
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error, {
            message: error.message,
            description: probe ? `Probe: ${probe}` : undefined,
        });
    }
}
async function odooGetModelFields(db, userID, password, resource, url, extraHeaders, protocol = 'xmlrpc') {
    const model = exports.mapOdooResources[resource] || resource;
    const fields = (await executeKw.call(this, db, userID, password, model, 'fields_get', [], { attributes: ['string', 'type', 'help', 'required', 'name'] }, url, extraHeaders, protocol));
    return fields;
}
exports.odooGetModelFields = odooGetModelFields;
async function odooCreate(db, userID, password, resource, operation, url, newItem, extraHeaders, protocol = 'xmlrpc') {
    const model = exports.mapOdooResources[resource] || resource;
    const result = (await executeKw.call(this, db, userID, password, model, exports.mapOperationToXMLRPC[operation], [newItem || {}], {}, url, extraHeaders, protocol));
    return { id: result };
}
exports.odooCreate = odooCreate;
async function odooGet(db, userID, password, resource, operation, url, itemsID, fieldsToReturn, extraHeaders, protocol = 'xmlrpc') {
    if (!/^\d+$/.test(itemsID) || !parseInt(itemsID, 10)) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), {
            status: 'Error',
            message: `Please specify a valid ID: ${itemsID}`,
        });
    }
    const model = exports.mapOdooResources[resource] || resource;
    return (await executeKw.call(this, db, userID, password, model, exports.mapOperationToXMLRPC[operation], [[+itemsID]], { fields: fieldsToReturn || [] }, url, extraHeaders, protocol));
}
exports.odooGet = odooGet;
async function odooCallMethod(db, userID, password, resource, url, callMethod, itemsIDs, extraHeaders, protocol = 'xmlrpc') {
    const model = exports.mapOdooResources[resource] || resource;
    const ids = itemsIDs.split(',').map((x) => +x);
    return (await executeKw.call(this, db, userID, password, model, callMethod, [ids], {}, url, extraHeaders, protocol));
}
exports.odooCallMethod = odooCallMethod;
async function odooGetAll(db, userID, password, resource, operation, url, filters, fieldsToReturn, limit = 0, offset = 0, extraHeaders, protocol = 'xmlrpc') {
    const model = exports.mapOdooResources[resource] || resource;
    const domain = processFilters(filters) || [];
    const kwargs = {
        fields: fieldsToReturn || [],
    };
    if (offset)
        kwargs.offset = offset;
    if (limit)
        kwargs.limit = limit;
    return (await executeKw.call(this, db, userID, password, model, exports.mapOperationToXMLRPC[operation], [domain], kwargs, url, extraHeaders, protocol));
}
exports.odooGetAll = odooGetAll;
async function odooUpdate(db, userID, password, resource, operation, url, itemsID, fieldsToUpdate, extraHeaders, protocol = 'xmlrpc') {
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
    await executeKw.call(this, db, userID, password, model, exports.mapOperationToXMLRPC[operation], [[+itemsID], fieldsToUpdate], {}, url, extraHeaders, protocol);
    return { id: itemsID };
}
exports.odooUpdate = odooUpdate;
async function odooDelete(db, userID, password, resource, operation, url, itemsID, extraHeaders, protocol = 'xmlrpc') {
    if (!/^\d+$/.test(itemsID) || !parseInt(itemsID, 10)) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), {
            status: 'Error',
            message: `Please specify a valid ID: ${itemsID}`,
        });
    }
    const model = exports.mapOdooResources[resource] || resource;
    await executeKw.call(this, db, userID, password, model, exports.mapOperationToXMLRPC[operation], [[+itemsID]], {}, url, extraHeaders, protocol);
    return { success: true };
}
exports.odooDelete = odooDelete;
//# sourceMappingURL=GenericFunctions.js.map