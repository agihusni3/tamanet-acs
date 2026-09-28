/**
 * Virtual Parameter: VirtualParameters.ssid5
 * Mengambil nama SSID Wi-Fi 5 GHz (Dual Band ONU)
 */

// Model Huawei biasanya menempatkan radio 5G di WLANConfiguration.5
let val = declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID", { value: 1 }).value;

if (!val || val[0] === undefined) {
  // Sebagian vendor menempatkan di WLANConfiguration.2
  val = declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID", { value: 1 }).value;
}

if (!val || val[0] === undefined) {
  // TR-181
  val = declare("Device.WiFi.SSID.2.SSID", { value: 1 }).value;
}

let result = (val && val[0] !== undefined) ? String(val[0]) : "N/A";
return { writable: false, value: [result, "xsd:string"] };
