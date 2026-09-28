/**
 * Virtual Parameter: VirtualParameters.ssid24
 * Mengambil nama SSID Wi-Fi 2.4 GHz
 */

let val = declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID", { value: 1 }).value;

if (!val || val[0] === undefined) {
  val = declare("Device.WiFi.SSID.1.SSID", { value: 1 }).value;
}

let result = (val && val[0] !== undefined) ? String(val[0]) : "N/A";
return { writable: false, value: [result, "xsd:string"] };
