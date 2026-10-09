/**
 * Virtual Parameter: VirtualParameters.mac
 * File: infra/genieacs/virtual-parameters/mac.js
 *
 * Mengambil MAC Address perangkat dengan prioritas:
 * 1. TR-098: LANDevice.1 Ethernet MAC (Huawei & generic GPON/EPON)
 * 2. TR-098: WANDevice MAC (fallback untuk perangkat bridge)
 * 3. TR-181: Device.Ethernet.Interface.1.MACAddress
 * 4. TR-181: Device.WiFi.Radio.1.MACAddress
 * 5. Fallback: string 'N/A'
 */

// 1. TR-098 — MAC dari LAN interface utama
let val = declare("InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.1.MACAddress", { value: 1 }).value;

// 2. TR-098 — MAC dari WAN Ethernet interface (fallback bridge)
if (!val || val[0] === undefined || val[0] === "") {
  val = declare("InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.MACAddress", { value: 1 }).value;
}

// 3. TR-181 — Ethernet Interface MAC
if (!val || val[0] === undefined || val[0] === "") {
  val = declare("Device.Ethernet.Interface.1.MACAddress", { value: 1 }).value;
}

// 4. TR-181 — WiFi Radio MAC (fallback)
if (!val || val[0] === undefined || val[0] === "") {
  val = declare("Device.WiFi.Radio.1.MACAddress", { value: 1 }).value;
}

let macResult = "N/A";
if (val && val[0] !== undefined && val[0] !== "") {
  // Normalisasi ke format XX:XX:XX:XX:XX:XX uppercase
  let raw = String(val[0]).trim().toUpperCase();
  // Beberapa modem mengembalikan format tanpa separator (AABBCCDDEEFF)
  if (raw.length === 12 && !raw.includes(":") && !raw.includes("-")) {
    raw = raw.match(/.{2}/g).join(":");
  }
  macResult = raw;
}

return { writable: false, value: [macResult, "xsd:string"] };
