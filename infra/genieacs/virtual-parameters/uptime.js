/**
 * Virtual Parameter: VirtualParameters.uptime
 * Mengambil nilai UpTime perangkat (dalam detik)
 */

let val = declare("InternetGatewayDevice.DeviceInfo.UpTime", { value: 1 }).value;

if (!val || val[0] === undefined) {
  val = declare("Device.DeviceInfo.UpTime", { value: 1 }).value;
}

let result = 0;
if (val && val[0] !== undefined) {
  result = parseInt(val[0], 10) || 0;
}

return { writable: false, value: [result, "xsd:unsignedInt"] };
