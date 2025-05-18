import {
	// IAuthenticateGeneric,
	// ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ERPNextCredentials implements ICredentialType {
	name = 'erpnextCredentials';
	displayName = 'ERPNext Credentials';

	// documentationUrl = 'https://erpnext.com/docs/user/manual-setup/setting-up-erpnext-server/authentication';

	properties: INodeProperties[] = [
		// The credentials to get from user and save encrypted.
		// Properties can be defined exactly in the same way
		// as node properties.
		{
			displayName: 'ERPNext Domain',
			name: 'erpnextDomain',
			type: 'string',
			default: '',
			placeholder: 'https://your-erpnext-instance.com',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
		{
			displayName: 'API Secret',
			name: 'apiSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
	];

	// Authenticate using Bearer token
	// authenticate: IAuthenticateGeneric = {
	// 	type: 'generic',
	// 	properties: {
	// 		headers: {
	// 			Authorization: '=token {{ $credentials.apiKey }}:{{ $credentials.apiSecret }}',
	// 		},
	// 	},
	// };

	// Test the credentials
	// test: ICredentialTestRequest = {
	// 	request: {
	// 		baseURL: '={{ $credentials.erpnextDomain }}',
	// 		url: '/api/method/frappe.auth.get_logged_user',
	// 	},
	// };
}
