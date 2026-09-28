/**
 * Virtual Parameter: VirtualParameters.pppoeUser
 * Mengambil Username PPPoE dari koneksi WAN
 */

let val = declare("InternetGatewayDevice.WANDevice.*.WANConnectionDevice.*.WANPPPConnection.*.Username", { value: 1 }).value;

if (!val || val[0] === undefined) {
  val = declare("Device.PPP.Interface.*.Username", { value: 1 }).value;
}

let result = (val && val[0] !== undefined) ? String(val[0]) : "N/A";
return { writable: false, value: [result, "xsd:string"] };
