/**
 * Virtual Parameter: VirtualParameters.firmware
 * Mengambil Versi Software / Firmware perangkat
 */

let val = declare("InternetGatewayDevice.DeviceInfo.SoftwareVersion", { value: 1 }).value;

if (!val || val[0] === undefined) {
  val = declare("Device.DeviceInfo.SoftwareVersion", { value: 1 }).value;
}

let result = (val && val[0] !== undefined) ? String(val[0]) : "Unknown Firmware";
return { writable: false, value: [result, "xsd:string"] };
