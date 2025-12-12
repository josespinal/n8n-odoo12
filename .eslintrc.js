module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint', 'n8n-nodes-base'],
	extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
	env: {
		es2020: true,
		node: true,
	},
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: 'module',
	},
	rules: {
		'@typescript-eslint/no-explicit-any': 'off',
		'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
	},
};
