import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

import {
	contactDescription,
	contactOperations,
	customResourceDescription,
	customResourceOperations,
	noteDescription,
	noteOperations,
	opportunityDescription,
	opportunityOperations,
} from './descriptions';
import {
	odooCallMethod,
	odooCreate,
	odooDelete,
	odooGet,
	odooGetAll,
	odooAuthenticate,
	odooGetDBName,
	odooGetModelFields,
	odooGetUserID,
	odooUpdate,
	probeXmlRpcEndpoint,
	buildAuthenticateProbeBody,
	processNameValueFields,
} from './GenericFunctions';

type OdooCredentials = {
	url: string;
	username: string;
	password: string;
	db?: string;
	useCustomHeaders?: boolean;
	customHeaders?: {
		headers?: Array<{
			headerName: string;
			headerValue: string;
		}>;
	};
};

function getCustomHeaders(credentials: OdooCredentials): IDataObject | undefined {
	if (!credentials.useCustomHeaders) return;
	const headers = credentials.customHeaders?.headers ?? [];
	const pairs = headers
		.filter((h) => h.headerName && h.headerValue)
		.map((h) => [h.headerName, h.headerValue]);

	if (!pairs.length) return;
	return Object.fromEntries(pairs);
}

export class Tamesonodoo implements INodeType {
	description: INodeTypeDescription = {
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
			...customResourceOperations,
			...customResourceDescription,
			...opportunityOperations,
			...opportunityDescription,
			...contactOperations,
			...contactDescription,
			...noteOperations,
			...noteDescription,
		],
	};

	methods = {
		loadOptions: {
			async getModelFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				let resource = this.getCurrentNodeParameter('resource') as string;

				if (resource === 'custom') {
					resource = this.getCurrentNodeParameter('customResource') as string;
					if (!resource) return [];
				}

				const credentials = (await this.getCredentials('odooApi')) as unknown as OdooCredentials;
				const url = credentials.url;
				const username = credentials.username;
				const password = credentials.password;
				const customHeaders = getCustomHeaders(credentials);
				const db = odooGetDBName(credentials.db, url);
				const userID = await odooGetUserID.call(this, db, username, password, url, customHeaders);
				const responce = await odooGetModelFields.call(
					this,
					db,
					userID,
					password,
					resource,
					url,
					customHeaders,
				);

				const options = Object.entries(responce).map(([fname, field]) => {
					const optionField = field as IDataObject;

					return {
						name: fname,
						value: fname,
						description: `name: ${optionField?.string}, type: ${optionField?.type} required: ${optionField?.required}`,
					};
				});

				return options.sort((a, b) =>
					String(a.name ?? '').localeCompare(String(b.name ?? '')),
				);
			},
			async getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = (await this.getCredentials('odooApi')) as unknown as OdooCredentials;
				const url = credentials.url;
				const username = credentials.username;
				const password = credentials.password;
				const customHeaders = getCustomHeaders(credentials);
				const db = odooGetDBName(credentials.db, url);
				const userID = await odooGetUserID.call(this, db, username, password, url, customHeaders);

				const responce = (await odooGetAll.call(
					this,
					db,
					userID,
					password,
					'ir.model',
					'getAll',
					url,
					undefined,
					['name', 'model', 'modules'] as unknown as IDataObject[],
					0,
					0,
					customHeaders,
				)) as IDataObject[];
				const options = responce.map((model) => {
					return {
						name: model.name as string,
						value: model.model as string,
						description: `model: ${model.model}<br> modules: ${model.modules}`,
					};
				});

				return options;
			},
			async getStates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = (await this.getCredentials('odooApi')) as unknown as OdooCredentials;
				const url = credentials.url;
				const username = credentials.username;
				const password = credentials.password;
				const customHeaders = getCustomHeaders(credentials);
				const db = odooGetDBName(credentials.db, url);
				const userID = await odooGetUserID.call(this, db, username, password, url, customHeaders);

				const responce = (await odooGetAll.call(
					this,
					db,
					userID,
					password,
					'res.country.state',
					'getAll',
					url,
					undefined,
					['id', 'name'] as unknown as IDataObject[],
					0,
					0,
					customHeaders,
				)) as IDataObject[];
				const options = responce.map((state) => {
					return {
						name: state.name as string,
						value: state.id as string,
					};
				});

				return options.sort((a, b) =>
					String(a.name ?? '').localeCompare(String(b.name ?? '')),
				);
			},
			async getCountries(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = (await this.getCredentials('odooApi')) as unknown as OdooCredentials;
				const url = credentials.url;
				const username = credentials.username;
				const password = credentials.password;
				const customHeaders = getCustomHeaders(credentials);
				const db = odooGetDBName(credentials.db, url);
				const userID = await odooGetUserID.call(this, db, username, password, url, customHeaders);

				const responce = (await odooGetAll.call(
					this,
					db,
					userID,
					password,
					'res.country',
					'getAll',
					url,
					undefined,
					['id', 'name'] as unknown as IDataObject[],
					0,
					0,
					customHeaders,
				)) as IDataObject[];
				const options = responce.map((country) => {
					return {
						name: country.name as string,
						value: country.id as string,
					};
				});

				return options.sort((a, b) =>
					String(a.name ?? '').localeCompare(String(b.name ?? '')),
				);
			},
		},
		credentialTest: {
			async odooApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as OdooCredentials;
				const customHeaders = getCustomHeaders(credentials);

				try {
					const db = odooGetDBName(credentials?.db, credentials?.url);
					const userId = await odooAuthenticate(
						db,
						credentials?.username,
						credentials?.password,
						credentials?.url,
						customHeaders,
					);

					if (!userId) {
						return {
							status: 'Error',
							message: 'Credentials are not valid',
						};
					}
				} catch (error) {
					// Emit detailed information to n8n logs to aid troubleshooting
					const endpoint = `${credentials?.url.replace(/\/$/, '')}/xmlrpc/2/common`;
					const versionProbe = await probeXmlRpcEndpoint(endpoint, customHeaders);
					const authProbeBody = buildAuthenticateProbeBody(
						odooGetDBName(credentials?.db, credentials?.url),
						credentials?.username || '',
						credentials?.password || '',
					);
					const authProbe = await probeXmlRpcEndpoint(endpoint, customHeaders, authProbeBody);
					console.error('Odoo credential test failed', {
						message: (error as Error).message,
						stack: (error as Error).stack,
						versionProbe,
						authProbe,
					});

					return {
						status: 'Error',
						message: `Settings are not valid: ${(error as Error).message || error}`,
					};
				}

				return {
					status: 'OK',
					message: 'Authentication successful!',
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let items = this.getInputData();
		items = deepCopy(items);

		const returnData: IDataObject[] = [];
		let responseData: IDataObject | IDataObject[] | undefined;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const credentials = (await this.getCredentials('odooApi')) as unknown as OdooCredentials;
		const url = credentials.url.replace(/\/$/, '');
		const username = credentials.username;
		const password = credentials.password;
		const db = odooGetDBName(credentials.db, url);
		const customHeaders = getCustomHeaders(credentials);
		const userID = await odooGetUserID.call(this, db, username, password, url, customHeaders);

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'contact') {
					if (operation === 'create') {
						let additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						if (additionalFields.address) {
							const addressFields = (additionalFields.address as IDataObject).value as IDataObject;
							if (addressFields) {
								additionalFields = {
									...additionalFields,
									...addressFields,
								};
							}
							delete additionalFields.address;
						}

						const name = this.getNodeParameter('contactName', i) as string;
						const fields = {
							name,
							...additionalFields,
						};

						responseData = await odooCreate.call(
							this,
							db,
							userID,
							password,
							resource,
							operation,
							url,
							fields,
							customHeaders,
						);
					}

					if (operation === 'delete') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						responseData = await odooDelete.call(
							this,
							db,
							userID,
							password,
							resource,
							operation,
							url,
							contactId,
							customHeaders,
						);
					}

					if (operation === 'get') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						const fields = (options.fieldsList as IDataObject[]) || [];

						responseData = await odooGet.call(
							this,
							db,
							userID,
							password,
							resource,
							operation,
							url,
							contactId,
							fields,
							customHeaders,
						);
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const options = this.getNodeParameter('options', i) as IDataObject;
						const fields = (options.fieldsList as IDataObject[]) || [];

						if (returnAll) {
							responseData = await odooGetAll.call(
								this,
								db,
								userID,
								password,
							resource,
							operation,
							url,
							undefined,
							fields,
							0,
							0,
							customHeaders,
						);
					} else {
						const limit = this.getNodeParameter('limit', i) as number;
						responseData = await odooGetAll.call(
							this,
								db,
								userID,
								password,
								resource,
								operation,
								url,
								undefined,
								fields,
								limit,
								0,
								customHeaders,
							);
						}
					}

					if (operation === 'update') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						let updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						if (updateFields.address) {
							const addressFields = (updateFields.address as IDataObject).value as IDataObject;
							if (addressFields) {
								updateFields = {
									...updateFields,
									...addressFields,
								};
							}
							delete updateFields.address;
						}

						responseData = await odooUpdate.call(
							this,
							db,
							userID,
							password,
							resource,
							operation,
							url,
							contactId,
							updateFields,
							customHeaders,
						);
					}
				}

				if (resource === 'custom') {
					const customResource = this.getNodeParameter('customResource', i) as string;

					if (operation === 'create') {
						const fields = this.getNodeParameter('fieldsToCreateOrUpdate', i) as IDataObject;

						responseData = await odooCreate.call(
							this,
							db,
							userID,
							password,
							customResource,
							operation,
							url,
							processNameValueFields(fields),
							customHeaders,
						);
					}

					if (operation === 'delete') {
						const customResourceId = this.getNodeParameter('customResourceId', i) as string;
						responseData = await odooDelete.call(
							this,
							db,
							userID,
							password,
							customResource,
							operation,
							url,
							customResourceId,
							customHeaders,
						);
					}

					if (operation === 'get') {
						const customResourceId = this.getNodeParameter('customResourceId', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						const fields = (options.fieldsList as IDataObject[]) || [];

						responseData = await odooGet.call(
							this,
							db,
							userID,
							password,
							customResource,
							operation,
							url,
							customResourceId,
							fields,
							customHeaders,
						);
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const options = this.getNodeParameter('options', i) as IDataObject;
						const fields = (options.fieldsList as IDataObject[]) || [];
						const filter = this.getNodeParameter('filterRequest', i) as IDataObject;

						if (returnAll) {
							responseData = await odooGetAll.call(
								this,
								db,
								userID,
								password,
								customResource,
								operation,
								url,
								filter,
								fields,
								0,
								0,
								customHeaders,
							);
						} else {
							const offset = this.getNodeParameter('offset', i) as number;
							const limit = this.getNodeParameter('limit', i) as number;

							responseData = await odooGetAll.call(
								this,
								db,
								userID,
								password,
								customResource,
								operation,
								url,
								filter,
								fields,
								limit,
								offset,
								customHeaders,
							);
						}
					}

					if (operation === 'callMethod') {
						const methodName = this.getNodeParameter('methodName', i) as string;
						const itemsIDs = this.getNodeParameter('itemsIDs', i) as string;

						responseData = await odooCallMethod.call(
							this,
							db,
							userID,
							password,
							customResource,
							url,
							methodName,
							itemsIDs,
							customHeaders,
						);
					}

					if (operation === 'update') {
						const customResourceId = this.getNodeParameter('customResourceId', i) as string;
						const fields = this.getNodeParameter('fieldsToCreateOrUpdate', i) as IDataObject;

						responseData = await odooUpdate.call(
							this,
							db,
							userID,
							password,
							customResource,
							operation,
							url,
							customResourceId,
							processNameValueFields(fields),
							customHeaders,
						);
					}
				}

				if (resource === 'note') {
					if (operation === 'create') {
						const memo = this.getNodeParameter('memo', i) as string;
						const fields = {
							memo,
						};

						responseData = await odooCreate.call(
							this,
							db,
							userID,
							password,
							resource,
							operation,
							url,
							fields,
							customHeaders,
						);
					}

					if (operation === 'delete') {
						const noteId = this.getNodeParameter('noteId', i) as string;
						responseData = await odooDelete.call(
							this,
							db,
							userID,
							password,
							resource,
							operation,
							url,
							noteId,
							customHeaders,
						);
					}

					if (operation === 'get') {
						const noteId = this.getNodeParameter('noteId', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						const fields = (options.fieldsList as IDataObject[]) || [];

						responseData = await odooGet.call(
							this,
							db,
							userID,
							password,
							resource,
							operation,
							url,
							noteId,
							fields,
							customHeaders,
						);
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const options = this.getNodeParameter('options', i) as IDataObject;
						const fields = (options.fieldsList as IDataObject[]) || [];

						if (returnAll) {
							responseData = await odooGetAll.call(
								this,
								db,
								userID,
								password,
								resource,
								operation,
								url,
								undefined,
								fields,
								0,
								0,
								customHeaders,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = await odooGetAll.call(
								this,
								db,
								userID,
								password,
								resource,
								operation,
								url,
								undefined,
								fields,
								limit,
								0,
								customHeaders,
							);
						}
					}

					if (operation === 'update') {
						const noteId = this.getNodeParameter('noteId', i) as string;
						const memo = this.getNodeParameter('memo', i) as string;
						const fields = {
							memo,
						};

						responseData = await odooUpdate.call(
							this,
							db,
							userID,
							password,
							resource,
							operation,
							url,
							noteId,
							fields,
							customHeaders,
						);
					}
				}

				if (resource === 'opportunity') {
					if (operation === 'create') {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const name = this.getNodeParameter('opportunityName', i) as string;
						const fields = {
							name,
							...additionalFields,
						};

						responseData = await odooCreate.call(
							this,
							db,
							userID,
							password,
							resource,
							operation,
							url,
							fields,
							customHeaders,
						);
					}

					if (operation === 'delete') {
						const opportunityId = this.getNodeParameter('opportunityId', i) as string;
						responseData = await odooDelete.call(
							this,
							db,
							userID,
							password,
							resource,
							operation,
							url,
							opportunityId,
							customHeaders,
						);
					}

					if (operation === 'get') {
						const opportunityId = this.getNodeParameter('opportunityId', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						const fields = (options.fieldsList as IDataObject[]) || [];

						responseData = await odooGet.call(
							this,
							db,
							userID,
							password,
							resource,
							operation,
							url,
							opportunityId,
							fields,
							customHeaders,
						);
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const options = this.getNodeParameter('options', i) as IDataObject;
						const fields = (options.fieldsList as IDataObject[]) || [];

						if (returnAll) {
							responseData = await odooGetAll.call(
								this,
								db,
								userID,
								password,
								resource,
								operation,
								url,
								undefined,
								fields,
								0,
								0,
								customHeaders,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;

							responseData = await odooGetAll.call(
								this,
								db,
								userID,
								password,
								resource,
								operation,
								url,
								undefined,
								fields,
								limit,
								0,
								customHeaders,
							);
						}
					}

					if (operation === 'update') {
						const opportunityId = this.getNodeParameter('opportunityId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						responseData = await odooUpdate.call(
							this,
							db,
							userID,
							password,
							resource,
							operation,
							url,
							opportunityId,
							updateFields,
							customHeaders,
						);
					}
				}

				if (Array.isArray(responseData)) {
					returnData.push(...responseData);
				} else if (responseData !== undefined) {
					returnData.push(responseData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: (error as Error).message });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
