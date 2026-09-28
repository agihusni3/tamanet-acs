/**
 * Virtual Parameter: VirtualParameters.model
 * Mengambil Model Name perangkat
 */

let val = declare("InternetGatewayDevice.DeviceInfo.ModelName", { value: 1 }).value;

if (!val || val[0] === undefined) {
  val = declare("Device.DeviceInfo.ModelName", { value: 1 }).value;
}

if (!val || val[0] === undefined) {
  val = declare("InternetGatewayDevice.DeviceInfo.ProductClass", { value: 1 }).value;
}

let result = (val && val[0] !== undefined) ? String(val[0]) : "Unknown Model";
return { writable: false, value: [result, "xsd:string"] };
