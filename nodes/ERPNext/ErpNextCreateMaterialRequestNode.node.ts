import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { createMaterialRequest } from '../utils/utils';

export class ErpNextCreateMaterialRequestNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ERPNext Create Material Request Node',
		name: 'erpNextCreateMaterialRequestNode',
		icon: 'file:erpnext.svg',
		group: ['transform'],
		version: 1,
		description: 'Creates a Material Request in ERPNext',
		defaults: {
			name: 'ERPNext Create Material Request Node',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'erpNextCredentialsApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Material Check Result',
				name: 'materialCheckResult',
				type: 'string',
				default: '',
				placeholder: 'Enter Material Check Result',
				description: 'The material check result to create a material request for',
				required: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Get credentials for API
		const credentials = await this.getCredentials('erpNextCredentialsApi');
		const domain = credentials.erpnextDomain as string;
		const apiKey = credentials.apiKey as string;
		const apiSecret = credentials.apiSecret as string;
		const token = `${apiKey}:${apiSecret}`;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const status = items[itemIndex].json?.status;

				if (!status || status === 'available') {
					returnData.push({
						json: {
							success: false,
							message: 'Skipped because status is available',
						},
						pairedItem: itemIndex,
					});
					continue;
				}
				const materialRequestData = await createMaterialRequest.call(
					this,
					domain,
					token,
					items[itemIndex],
				);

				const newItem: INodeExecutionData = {
					json: {
						material_request: materialRequestData,
					},
				};
				returnData.push(newItem);
			} catch (error) {
				throw new NodeOperationError(this.getNode(), error as Error);
			}
		}

		return this.prepareOutputData(returnData);
	}
}
