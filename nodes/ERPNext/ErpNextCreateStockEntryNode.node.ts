import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { postStockEntry } from '../utils/utils';

export class ErpNextCreateStockEntryNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ERPNext Create Stock Entry Node',
		name: 'erpNextCreateStockEntryNode',
		icon: 'file:erpnext.svg',
		group: ['transform'],
		version: 1,
		description: 'Creates a Stock Entry in ERPNext',
		defaults: {
			name: 'ERPNext Create Stock Entry Node',
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
				displayName: 'Stock Entry Data',
				name: 'stockEntryData',
				type: 'json',
				default: '',
				description: 'JSON object containing Stock Entry detail',
				required: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Get credentials
		const credentials = await this.getCredentials('erpNextCredentialsApi');
		const domain = credentials.erpnextDomain as string;
		const apiKey = credentials.apiKey as string;
		const apiSecret = credentials.apiSecret as string;
		const token = `${apiKey}:${apiSecret}`;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const stockEntryData = this.getNodeParameter('stockEntryData', itemIndex) as any;
				const status = items[itemIndex].json?.status;

				if (!status || status === 'not available') {
					returnData.push({
						json: {
							success: false,
							message: 'Skipped because status is not available',
						},
						pairedItem: itemIndex,
					});
					continue;
				}
				const itemData: INodeExecutionData = {
					json: stockEntryData,
				};

				const result = await postStockEntry.call(this, domain, token, itemData);

				const newItem: INodeExecutionData = {
					json: {
						stock_entry: result,
					},
				};

				returnData.push(newItem);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							success: false,
							error: error.message,
						},
						pairedItem: itemIndex,
					});
				} else {
					throw new NodeOperationError(this.getNode(), error, { itemIndex });
				}
			}
		}

		return [returnData];
	}
}
