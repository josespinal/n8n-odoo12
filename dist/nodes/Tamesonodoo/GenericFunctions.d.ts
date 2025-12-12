import type { IDataObject, IExecuteFunctions, IExecuteSingleFunctions, IHookFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
export declare const mapOperationToXMLRPC: {
    create: string;
    get: string;
    getAll: string;
    update: string;
    delete: string;
};
export declare const mapOdooResources: Record<string, string>;
export declare const mapFilterOperationToXMLRPC: {
    equal: string;
    notEqual: string;
    greaterThen: string;
    lesserThen: string;
    greaterOrEqual: string;
    lesserOrEqual: string;
    like: string;
    in: string;
    notIn: string;
    childOf: string;
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
export declare function odooGetDBName(databaseName: string | undefined, url: string): string;
export declare function processNameValueFields(value?: IDataObject): IDataObject;
export declare function probeXmlRpcEndpoint(endpoint: string, headers?: IDataObject, body?: string): Promise<string>;
export declare function odooAuthenticate(db: string, username: string, password: string, url: string, extraHeaders?: IDataObject): Promise<number>;
export declare function odooGetUserID(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, db: string, username: string, password: string, url: string, extraHeaders?: IDataObject): Promise<number>;
export declare function odooGetServerVersion(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, url: string, extraHeaders?: IDataObject): Promise<IDataObject | IDataObject[]>;
export declare function odooGetModelFields(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, db: string, userID: number, password: string, resource: string, url: string, extraHeaders?: IDataObject): Promise<IDataObject>;
export declare function odooCreate(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, db: string, userID: number, password: string, resource: string, operation: OdooCRUD, url: string, newItem: IDataObject, extraHeaders?: IDataObject): Promise<{
    id: IDataObject | IDataObject[];
}>;
export declare function odooGet(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, db: string, userID: number, password: string, resource: string, operation: OdooCRUD, url: string, itemsID: string, fieldsToReturn?: IDataObject[], extraHeaders?: IDataObject): Promise<IDataObject | IDataObject[]>;
export declare function odooCallMethod(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, db: string, userID: number, password: string, resource: string, url: string, callMethod: string, itemsIDs: string, extraHeaders?: IDataObject): Promise<IDataObject | IDataObject[]>;
export declare function odooGetAll(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, db: string, userID: number, password: string, resource: string, operation: OdooCRUD, url: string, filters?: IDataObject, fieldsToReturn?: IDataObject[], limit?: number, offset?: number, extraHeaders?: IDataObject): Promise<IDataObject | IDataObject[]>;
export declare function odooUpdate(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, db: string, userID: number, password: string, resource: string, operation: OdooCRUD, url: string, itemsID: string, fieldsToUpdate: IDataObject, extraHeaders?: IDataObject): Promise<{
    id: string;
}>;
export declare function odooDelete(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, db: string, userID: number, password: string, resource: string, operation: OdooCRUD, url: string, itemsID: string, extraHeaders?: IDataObject): Promise<{
    success: boolean;
}>;
export {};
//# sourceMappingURL=GenericFunctions.d.ts.map