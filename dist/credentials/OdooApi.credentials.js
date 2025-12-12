"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OdooApi = void 0;
class OdooApi {
    constructor() {
        this.name = 'odooApi';
        this.displayName = 'Odoo API';
        this.documentationUrl = 'https://docs.n8n.io/credentials/odoo';
        this.properties = [
            {
                displayName: 'URL',
                name: 'url',
                type: 'string',
                default: '',
                placeholder: 'https://your-odoo-instance.com',
                required: true,
            },
            {
                displayName: 'Database',
                name: 'db',
                type: 'string',
                default: '',
                placeholder: 'Database name (optional)',
            },
            {
                displayName: 'Username',
                name: 'username',
                type: 'string',
                default: '',
                required: true,
            },
            {
                displayName: 'Password',
                name: 'password',
                type: 'string',
                typeOptions: { password: true },
                default: '',
                required: true,
            },
            {
                displayName: 'Use Custom Headers',
                name: 'useCustomHeaders',
                type: 'boolean',
                default: false,
            },
            {
                displayName: 'Custom Headers',
                name: 'customHeaders',
                type: 'fixedCollection',
                placeholder: 'Add Header',
                typeOptions: {
                    multipleValues: true,
                    multipleValueButtonText: 'Add Header',
                },
                default: {},
                displayOptions: {
                    show: {
                        useCustomHeaders: [true],
                    },
                },
                options: [
                    {
                        name: 'headers',
                        displayName: 'Header',
                        values: [
                            {
                                displayName: 'Header Name',
                                name: 'headerName',
                                type: 'string',
                                default: '',
                            },
                            {
                                displayName: 'Header Value',
                                name: 'headerValue',
                                type: 'string',
                                default: '',
                            },
                        ],
                    },
                ],
            },
        ];
    }
}
exports.OdooApi = OdooApi;
//# sourceMappingURL=OdooApi.credentials.js.map