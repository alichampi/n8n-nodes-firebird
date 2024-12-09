import { INodeProperties } from 'n8n-workflow';

const operationParameters: INodeProperties[] = [
	// ----------------------------------
	//         executeQuery
	// ----------------------------------
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				operation: ['executeQuery'],
			},
		},
		default: '',
		placeholder: 'SELECT id, name FROM product WHERE id == :param1 and value > :param2',
		required: true,
		description: 'The SQL query to execute',
	},
	{
		displayName: 'Parameters',
		name: 'params',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['executeQuery'],
			},
		},
		default: '',
		placeholder: 'param1, param2',
		description:
			'Comma-separated list of named parameters that are used in the query and should be provided by the previous node output. Allowed characters in parameter name: _a-zA-Z0-9.',
	},

	// ----------------------------------
	//         insert
	// ----------------------------------
	{
		displayName: 'Table',
		name: 'table',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['insert'],
			},
		},
		default: '',
		required: true,
		description: 'Name of the table in which to insert data to',
	},
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['insert'],
			},
		},
		default: '',
		placeholder: 'id,name,description',
		description:
			'Comma-separated list of the properties which should used as columns for the new rows',
	},

	// ----------------------------------
	//         update
	// ----------------------------------
	{
		displayName: 'Table',
		name: 'table',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['update'],
			},
		},
		default: '',
		required: true,
		description: 'Name of the table in which to update data in',
	},
	{
		displayName: 'Update Key',
		name: 'updateKey',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['update'],
			},
		},
		default: 'id',
		required: true,
		description:
			'Name of the property which decides which rows in the database should be updated. Normally that would be "ID".',
	},
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['update'],
			},
		},
		default: '',
		placeholder: 'name,description',
		description:
			'Comma-separated list of the properties which should used as columns for rows to update',
	},
	{
		displayName: 'Timeout',
		name: 'timeout',
		type: 'number',
		typeOptions: {
			minValue: 1,
			numberStepSize: 1,
		},
		default: 10,
		description: 'Timeout for the operation',
	},
];

const operationOptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Execute Query',
				value: 'executeQuery',
				action: 'Execute an sql query',
			},
			{
				name: 'Insert',
				value: 'insert',
				action: 'Insert rows in database',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update rows in database',
			},
		],
		default: 'insert',
	},
	...operationParameters,
];

export const queryOperationOptions = operationOptions;
