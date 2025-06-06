import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { getWorkOrderData, checkMaterialAvailability } from '../utils/utils';

export class ErpNextMaterialCheckingNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ERPNext Material Checking Node',
		name: 'erpNextMaterialCheckingNode',
		icon: 'file:erpnext.svg',
		group: ['transform'],
		version: 1,
		description: 'ERPNext Node',
		defaults: {
			name: 'ERPNext Material Checking Node',
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
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'Work Order Name',
				name: 'workOrderName',
				type: 'string',
				default: '',
				placeholder: 'Enter Work Order Name',
				description: 'The name of the work order to check',
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
				const workOrderName = this.getNodeParameter('workOrderName', itemIndex, '') as string;

				if (!workOrderName) {
					throw new NodeApiError(this.getNode(), {
						message: 'Work Order Name is required',
					});				}

				// Get work order data
				const workOrderData = await getWorkOrderData.call(this, domain, token, workOrderName);
				const itemName = workOrderData.data.item_name || null;
				const requiredItems = workOrderData.data.required_items || [];
				const wip_warehouse = workOrderData.data.wip_warehouse || null;	
				const salesOrder = workOrderData.data.sales_order || null;
				const triggeredBy = workOrderData.data.owner || null;
				const triggeredOn = workOrderData.data.creation || null;
				const { overallStatus, materialCheckResult } = await checkMaterialAvailability.call(
					this,
					domain,
					token,
					requiredItems,
				);

				const newItem: INodeExecutionData = {
					json: {
						status: overallStatus,
						work_order: workOrderName,
						item_name: itemName,
						sales_order: salesOrder,
						triggered_by: triggeredBy,
						triggered_on: triggeredOn,
						wip_warehouse: wip_warehouse,
						material_check_result: materialCheckResult,
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
					if (error.context) {
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return [returnData];
	}
}
