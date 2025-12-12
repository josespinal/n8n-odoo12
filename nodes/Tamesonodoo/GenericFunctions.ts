import type {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export const mapOperationToJSONRPC = {
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

export const mapFilterOperationToJSONRPC = {
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
		item.operator = mapFilterOperationToJSONRPC[operator as keyof typeof mapFilterOperationToJSONRPC];
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

export async function odooJSONRPCRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	body: IDataObject,
	url: string,
	extraHeaders?: IDataObject,
): Promise<any> {
	try {
		const baseHeaders = {
			'User-Agent': 'n8n',
			Connection: 'keep-alive',
			Accept: '*/*',
			'Content-Type': 'application/json',
		};

		const headers = extraHeaders ? { ...baseHeaders, ...extraHeaders } : baseHeaders;

		const options: IRequestOptions = {
			headers,
			method: 'POST',
			body,
			uri: `${url}/jsonrpc`,
			json: true,
		};

		const responce = await this.helpers.request(options);
		if (responce.error) {
			throw new NodeApiError(this.getNode(), responce.error.data as JsonObject, {
				message: (responce.error.data as IDataObject)?.message as string,
			});
		}

		return responce.result;
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
					mapOdooResources[resource] || resource,
					'fields_get',
					[],
					['string', 'type', 'help', 'required', 'name'],
				],
			},
			id: Math.floor(Math.random() * 100),
		};

		return (await odooJSONRPCRequest.call(this, body, url, extraHeaders)) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
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
					mapOdooResources[resource] || resource,
					mapOperationToJSONRPC[operation],
					newItem || {},
				],
			},
			id: Math.floor(Math.random() * 100),
		};

		const result = await odooJSONRPCRequest.call(this, body, url, extraHeaders);
		return { id: result };
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
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
	try {
		if (!/^\d+$/.test(itemsID) || !parseInt(itemsID, 10)) {
			throw new NodeApiError(this.getNode(), {
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
					mapOdooResources[resource] || resource,
					mapOperationToJSONRPC[operation],
					[+itemsID],
					fieldsToReturn || [],
				],
			},
			id: Math.floor(Math.random() * 100),
		};

		return await odooJSONRPCRequest.call(this, body, url, extraHeaders);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
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
					mapOdooResources[resource] || resource,
					callMethod,
					itemsIDs.split(',').map((x) => +x),
				],
			},
			id: Math.floor(Math.random() * 100),
		};

		return await odooJSONRPCRequest.call(this, body, url, extraHeaders);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
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
					mapOdooResources[resource] || resource,
					mapOperationToJSONRPC[operation],
					processFilters(filters) || [],
					fieldsToReturn || [],
					offset,
					limit,
				],
			},
			id: Math.floor(Math.random() * 100),
		};

		return await odooJSONRPCRequest.call(this, body, url, extraHeaders);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
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
	try {
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
					mapOdooResources[resource] || resource,
					mapOperationToJSONRPC[operation],
					[+itemsID],
					fieldsToUpdate,
				],
			},
			id: Math.floor(Math.random() * 100),
		};

		await odooJSONRPCRequest.call(this, body, url, extraHeaders);
		return { id: itemsID };
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
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
					mapOdooResources[resource] || resource,
					mapOperationToJSONRPC[operation],
					[+itemsID],
				],
			},
			id: Math.floor(Math.random() * 100),
		};

		await odooJSONRPCRequest.call(this, body, url, extraHeaders);
		return { success: true };
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
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
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
