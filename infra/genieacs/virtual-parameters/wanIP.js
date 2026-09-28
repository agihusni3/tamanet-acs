/**
 * Virtual Parameter: VirtualParameters.wanIP
 * Mengambil IP WAN aktif (dari PPP atau DHCP/IP Connection)
 */

let val = declare("InternetGatewayDevice.WANDevice.*.WANConnectionDevice.*.WANPPPConnection.*.ExternalIPAddress", { value: 1 }).value;

if (!val || val[0] === undefined || val[0] === "0.0.0.0" || val[0] === "") {
  val = declare("InternetGatewayDevice.WANDevice.*.WANConnectionDevice.*.WANIPConnection.*.ExternalIPAddress", { value: 1 }).value;
}

if (!val || val[0] === undefined || val[0] === "0.0.0.0" || val[0] === "") {
  val = declare("Device.IP.Interface.*.IPv4Address.*.IPAddress", { value: 1 }).value;
}

let result = (val && val[0] !== undefined) ? String(val[0]) : "N/A";
return { writable: false, value: [result, "xsd:string"] };
