/**
 * Virtual Parameter: VirtualParameters.rxPower
 * 
 * Mengambil nilai sinyal optik RX (dBm) dengan prioritas:
 * 1. Huawei GPON / EPON standard node: X_GponInterafceConfig / X_HW_GponOptical
 * 2. Zimlink / Realtek / CData vendor node
 * 3. TR-181 Device.Optical.Interface.1.OpticalSignalLevel
 * 4. Fallback 'N/A'
 */

// 1. Huawei GPON/EPON Node (Catatan: vendor Huawei kadang memiliki typo 'Interafce' di firmwarenya)
let val = declare("InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.RXPower", { value: 1 }).value;

if (!val || val[0] === undefined) {
  val = declare("InternetGatewayDevice.WANDevice.1.X_HW_GponOptical.RxPower", { value: 1 }).value;
}

if (!val || val[0] === undefined) {
  val = declare("InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.OPTIC.RxPower", { value: 1 }).value;
}

// 2. Zimlink / Cortina / Realtek XPON Node
if (!val || val[0] === undefined) {
  val = declare("InternetGatewayDevice.WANDevice.1.X_CT-COM_Gpon.RxPower", { value: 1 }).value;
}

if (!val || val[0] === undefined) {
  val = declare("InternetGatewayDevice.WANDevice.1.X_ZTE-COM_PON.RxPower", { value: 1 }).value;
}

// 3. TR-181 Standard Node
if (!val || val[0] === undefined) {
  val = declare("Device.Optical.Interface.1.OpticalSignalLevel", { value: 1 }).value;
}

let rxPowerResult = "N/A";
if (val && val[0] !== undefined) {
  let raw = String(val[0]).trim();
  // Sebagian modem mengembalikan nilai dikali 100 atau 1000 (misal -2150 berarti -21.5 dBm)
  let num = parseFloat(raw);
  if (!isNaN(num)) {
    if (num < -100) {
      rxPowerResult = (num / 100).toFixed(2);
    } else {
      rxPowerResult = num.toFixed(2);
    }
  } else {
    rxPowerResult = raw;
  }
}

return { writable: false, value: [rxPowerResult, "xsd:string"] };
