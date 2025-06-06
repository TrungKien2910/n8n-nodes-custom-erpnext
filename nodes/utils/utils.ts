import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

interface BinItem {
	item_code: string;
	warehouse: string;
	actual_qty: number;
}

interface MaterialCheckResult {
	item_code: string;
	warehouse: string;
	status: string;
	required_qty: number;
	available_qty: number;
	request_qty: number;
}

// interface material_check_result {
// 	item_code: string;
// 	warehouse: string;
// 	required_qty: number;
// }

export async function getBinData(
	this: IExecuteFunctions,
	domain: string,
	token: string,
	itemCode: string,
	warehouse: string,
): Promise<BinItem | null> {
	const filters = JSON.stringify({
		warehouse,
		item_code: itemCode,
	});

	const fields = JSON.stringify(['item_code', 'warehouse', 'actual_qty']);

	const response = await this.helpers.request({
		method: 'GET',
		url: `${domain}/api/resource/Bin`,
		headers: {
			Authorization: `token ${token}`,
			'Content-Type': 'application/json',
		},
		qs: {
			filters,
			fields,
		},
	});

	const binData = typeof response === 'string' ? JSON.parse(response) : response;

	if (binData.data && binData.data.length > 0) {
		return binData.data[0];
	}

	return null;
}

export async function getWorkOrderData(
	this: IExecuteFunctions,
	domain: string,
	token: string,
	workOrderName: string,
): Promise<any> {
	const response = await this.helpers.request({
		method: 'GET',
		url: `${domain}/api/resource/Work Order/${workOrderName}`,
		headers: {
			Authorization: `token ${token}`,
			'Content-Type': 'application/json',
		},
	});

	return typeof response === 'string' ? JSON.parse(response) : response;
}

export async function checkMaterialAvailability(
	this: IExecuteFunctions,
	domain: string,
	token: string,
	requiredItems: any[],
): Promise<{ overallStatus: string; materialCheckResult: MaterialCheckResult[] }> {
	const materialCheckResult: MaterialCheckResult[] = [];
	let overallStatus = 'available';

	for (const item of requiredItems) {
		const itemCode = item.item_code;
		const warehouse = item.source_warehouse;
		const requiredQty = item.required_qty;
		let request_qty = 0;
		const binItem = await getBinData.call(this, domain, token, itemCode, warehouse);
		const actualQty = binItem?.actual_qty || 0;

		const status = actualQty >= requiredQty ? 'available' : 'not available';
		if (status === 'not available') {
			request_qty = requiredQty - actualQty;
			overallStatus = 'not available';
		}

		materialCheckResult.push({
			item_code: itemCode,
			warehouse,
			status,
			required_qty: requiredQty,
			available_qty: actualQty,
			request_qty: request_qty,
		});
	}

	return { overallStatus, materialCheckResult };
}

export async function postStockEntry(
	this: IExecuteFunctions,
	domain: string,
	token: string,
	item: INodeExecutionData,
): Promise<{ success: boolean; data?: any; error?: string }> {
	try {
		const workOrder = item.json.work_order as string;
		const t_warehouse = item.json.wip_warehouse as string;
		const materialCheckResult = item.json.material_check_result as Array<MaterialCheckResult>;

		const body = {
			stock_entry_type: 'Material Transfer for Manufacture',
			work_order: workOrder,
			items: materialCheckResult.map((material) => ({
				s_warehouse: material.warehouse,
				item_code: material.item_code,
				qty: material.required_qty,
				t_warehouse: t_warehouse,
			})),
			docstatus: 1,
		};

		const response = await this.helpers.request({
			method: 'POST',
			url: `${domain}/api/resource/Stock Entry`,
			headers: {
				Authorization: `token ${token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});
const parsedResponse = typeof response === 'string' ? JSON.parse(response) : response;
		return { success: true, data: parsedResponse.data || parsedResponse };
	} catch (error) {
		return { success: false, error: error.message };
	}
}
export async function createMaterialRequest(
	this: IExecuteFunctions,
	domain: string,
	token: string,
	item: INodeExecutionData,
): Promise<{ success: boolean; data?: any; error?: string }> {
	try {
		const materialCheckResult = item.json.material_check_result as Array<MaterialCheckResult>;
		const materialRequestData = {
			material_request_type: 'Purchase',
			schedule_date: new Date().toISOString().split('T')[0],
			items: materialCheckResult
				.filter((item: MaterialCheckResult) => item.request_qty !== 0) // Skip items with request_qty = 0
				.map((item: MaterialCheckResult) => ({
					item_code: item.item_code,
					warehouse: item.warehouse,
					qty: item.request_qty,
				})),
			docstatus: 0,
		};
		const response = await this.helpers.request({
			method: 'POST',
			url: `${domain}/api/resource/Material Request`,
			headers: {
				Authorization: `token ${token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(materialRequestData),
		});

		return { success: true, data: typeof response === 'string' ? JSON.parse(response).data : response.data };
	} catch (error) {
		return { success: false, error: error.message };
	}
}
