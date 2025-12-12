import { createClient, type Client } from 'xmlrpc';

import type {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export const mapOperationToXMLRPC = {
	create: 'create',
	get: 'read',
	getAll: 'search_read',
	update: 'write',
	delete: 'unlink',
};

export const mapOdooResources: Record<string, string> = {
	contact: 'res.partner',
	opportunity: 'crm.lead',
	note: 'note.note',
};

export const mapFilterOperationToXMLRPC = {
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

export interface IOdooFilterOperations {
	filter: Array<{
		fieldName: string;
		operator: string;
		value: string;
	}>;
}

export interface IOdooNameValueFields {
	fields: Array<{
		fieldName: string;
		fieldValue: string;
	}>;
}

export interface IOdooResponceFields {
	fields: Array<{
		field: string;
		fromList?: boolean;
	}>;
}

type OdooCRUD = 'create' | 'update' | 'delete' | 'get' | 'getAll';

export function odooGetDBName(databaseName: string | undefined, url: string): string {
	if (databaseName) return databaseName;

	const odooURL = new URL(url);
	const hostname = odooURL.hostname;
	if (!hostname) return '';

	return odooURL.hostname.split('.')[0];
}

function processFilters(value?: IDataObject) {
	const filters = (value as IOdooFilterOperations | undefined)?.filter;
	return filters?.map((item) => {
		const operator = item.operator;
		item.operator = mapFilterOperationToXMLRPC[operator as keyof typeof mapFilterOperationToXMLRPC];
		return Object.values(item);
	});
}

export function processNameValueFields(value?: IDataObject): IDataObject {
	if (!value || typeof value !== 'object') return {};
	const data = value as unknown as IOdooNameValueFields;
	if (!Array.isArray(data.fields)) return {};

	return data.fields.reduce((acc, record) => {
		return { ...acc, [record.fieldName]: record.fieldValue };
	}, {} as IDataObject);
}

function normalizeHeaders(headers?: IDataObject): Record<string, string> | undefined {
	if (!headers || typeof headers !== 'object') return;
	const normalized: Record<string, string> = {};
	for (const [key, value] of Object.entries(headers)) {
		if (value === undefined || value === null) continue;
		normalized[key] = String(value);
	}
	return Object.keys(normalized).length ? normalized : undefined;
}

function createXmlRpcClient(service: 'common' | 'object', url: string, headers?: IDataObject): Client {
	const cleanUrl = url.replace(/\/$/, '');
	return createClient({
		url: `${cleanUrl}/xmlrpc/2/${service}`,
		headers: normalizeHeaders(headers),
	});
}

async function xmlRpcCall(client: Client, method: string, params: unknown[]): Promise<any> {
	return await new Promise((resolve, reject) => {
		client.methodCall(method, params, (error, value) => {
			if (error) return reject(error);
			resolve(value);
		});
	});
}

export async function odooAuthenticate(
	db: string,
	username: string,
	password: string,
	url: string,
	extraHeaders?: IDataObject,
): Promise<number> {
	const client = createXmlRpcClient('common', url, extraHeaders);
	const uid = await xmlRpcCall(client, 'authenticate', [db, username, password, {}]);
	return Number(uid);
}

export async function odooGetUserID(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	db: string,
	username: string,
	password: string,
	url: string,
	extraHeaders?: IDataObject,
): Promise<number> {
	try {
		const client = createXmlRpcClient('common', url, extraHeaders);
		const uid = await xmlRpcCall(client, 'authenticate', [db, username, password, {}]);
		return Number(uid);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function odooGetServerVersion(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	url: string,
	extraHeaders?: IDataObject,
): Promise<IDataObject | IDataObject[]> {
	try {
		const client = createXmlRpcClient('common', url, extraHeaders);
		return await xmlRpcCall(client, 'version', []);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

async function executeKw(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	db: string,
	userID: number,
	password: string,
	model: string,
	method: string,
	args: unknown[],
	kwargs: IDataObject = {},
	url?: string,
	extraHeaders?: IDataObject,
	) {
	try {
		const client = createXmlRpcClient('object', url || '', extraHeaders);
		return await xmlRpcCall(client, 'execute_kw', [db, userID, password, model, method, args, kwargs]);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function odooGetModelFields(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	db: string,
	userID: number,
	password: string,
	resource: string,
	url: string,
	extraHeaders?: IDataObject,
): Promise<IDataObject> {
	const model = mapOdooResources[resource] || resource;
	const fields = await executeKw.call(
		this,
		db,
		userID,
		password,
		model,
		'fields_get',
		[],
		{ attributes: ['string', 'type', 'help', 'required', 'name'] },
		url,
		extraHeaders,
	);
	return fields as IDataObject;
}

export async function odooCreate(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	db: string,
	userID: number,
	password: string,
	resource: string,
	operation: OdooCRUD,
	url: string,
	newItem: IDataObject,
	extraHeaders?: IDataObject,
): Promise<{ id: IDataObject | IDataObject[] }> {
	const model = mapOdooResources[resource] || resource;
	const result = await executeKw.call(
		this,
		db,
		userID,
		password,
		model,
		mapOperationToXMLRPC[operation],
		[newItem || {}],
		{},
		url,
		extraHeaders,
	);
	return { id: result };
}

export async function odooGet(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	db: string,
	userID: number,
	password: string,
	resource: string,
	operation: OdooCRUD,
	url: string,
	itemsID: string,
	fieldsToReturn?: IDataObject[],
	extraHeaders?: IDataObject,
): Promise<IDataObject | IDataObject[]> {
	if (!/^\d+$/.test(itemsID) || !parseInt(itemsID, 10)) {
		throw new NodeApiError(this.getNode(), {
			status: 'Error',
			message: `Please specify a valid ID: ${itemsID}`,
		});
	}

	const model = mapOdooResources[resource] || resource;
	return await executeKw.call(
		this,
		db,
		userID,
		password,
		model,
		mapOperationToXMLRPC[operation],
		[[+itemsID]],
		{ fields: fieldsToReturn || [] },
		url,
		extraHeaders,
	);
}

export async function odooCallMethod(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	db: string,
	userID: number,
	password: string,
	resource: string,
	url: string,
	callMethod: string,
	itemsIDs: string,
	extraHeaders?: IDataObject,
): Promise<IDataObject | IDataObject[]> {
	const model = mapOdooResources[resource] || resource;
	const ids = itemsIDs.split(',').map((x) => +x);
	return await executeKw.call(
		this,
		db,
		userID,
		password,
		model,
		callMethod,
		[ids],
		{},
		url,
		extraHeaders,
	);
}

export async function odooGetAll(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	db: string,
	userID: number,
	password: string,
	resource: string,
	operation: OdooCRUD,
	url: string,
	filters?: IDataObject,
	fieldsToReturn?: IDataObject[],
	limit = 0,
	offset = 0,
	extraHeaders?: IDataObject,
): Promise<IDataObject | IDataObject[]> {
	const model = mapOdooResources[resource] || resource;
	const domain = processFilters(filters) || [];
	const kwargs: IDataObject = {
		fields: fieldsToReturn || [],
	};
	if (offset) kwargs.offset = offset;
	if (limit) kwargs.limit = limit;

	return await executeKw.call(
		this,
		db,
		userID,
		password,
		model,
		mapOperationToXMLRPC[operation],
		[domain],
		kwargs,
		url,
		extraHeaders,
	);
}

export async function odooUpdate(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	db: string,
	userID: number,
	password: string,
	resource: string,
	operation: OdooCRUD,
	url: string,
	itemsID: string,
	fieldsToUpdate: IDataObject,
	extraHeaders?: IDataObject,
): Promise<{ id: string }> {
	if (!Object.keys(fieldsToUpdate).length) {
		throw new NodeApiError(this.getNode(), {
			status: 'Error',
			message: 'Please specify at least one field to update',
		});
	}

	if (!/^\d+$/.test(itemsID) || !parseInt(itemsID, 10)) {
		throw new NodeApiError(this.getNode(), {
			status: 'Error',
			message: `Please specify a valid ID: ${itemsID}`,
		});
	}

	const model = mapOdooResources[resource] || resource;
	await executeKw.call(
		this,
		db,
		userID,
		password,
		model,
		mapOperationToXMLRPC[operation],
		[[+itemsID], fieldsToUpdate],
		{},
		url,
		extraHeaders,
	);
	return { id: itemsID };
}

export async function odooDelete(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	db: string,
	userID: number,
	password: string,
	resource: string,
	operation: OdooCRUD,
	url: string,
	itemsID: string,
	extraHeaders?: IDataObject,
): Promise<{ success: boolean }> {
	if (!/^\d+$/.test(itemsID) || !parseInt(itemsID, 10)) {
		throw new NodeApiError(this.getNode(), {
			status: 'Error',
			message: `Please specify a valid ID: ${itemsID}`,
		});
	}

	const model = mapOdooResources[resource] || resource;
	await executeKw.call(
		this,
		db,
		userID,
		password,
		model,
		mapOperationToXMLRPC[operation],
		[[+itemsID]],
		{},
		url,
		extraHeaders,
	);
	return { success: true };
}
