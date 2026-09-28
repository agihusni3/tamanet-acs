/**
 * Default Provision Script for GenieACS
 * File: infra/genieacs/provisions/default.js
 * 
 * Dijalankan pada event: 0 BOOTSTRAP, 1 BOOT, 2 PERIODIC INFORM
 * Tugas:
 * 1. Mengaktifkan Periodic Inform (300s / 5 menit)
 * 2. Mengatur kredensial Connection Request untuk remote trigger
 * 3. Merefresh parameter penting (Uptime, WAN IP, Sinyal Optik, WiFi)
 */

const now = Date.now();

// 1. Tentukan Root Data Model (TR-098 vs TR-181)
let root = "InternetGatewayDevice";
if (declare("Device", { value: 1 }).value !== undefined) {
  root = "Device";
}

// 2. Konfigurasi Management Server (Periodic Inform 300 detik)
const mgmtPath = `${root}.ManagementServer`;
declare(`${mgmtPath}.PeriodicInformEnable`, { value: 1 }, { value: true });
declare(`${mgmtPath}.PeriodicInformInterval`, { value: 1 }, { value: 300 });

// 3. Konfigurasi Kredensial Connection Request (Untuk remote trigger HTTP dari ACS)
// Menggunakan kredensial konsisten per perangkat atau kredensial default sistem
declare(`${mgmtPath}.ConnectionRequestUsername`, { value: 1 }, { value: "cr_admin" });
declare(`${mgmtPath}.ConnectionRequestPassword`, { value: 1 }, { value: "cr_secret_password_random" });

// 4. Refresh Parameter Identitas & Status Sistem Setiap 1 Jam (atau saat Boot)
const deviceInfoPath = `${root}.DeviceInfo`;
declare(`${deviceInfoPath}.HardwareVersion`, { value: now - 3600000 });
declare(`${deviceInfoPath}.SoftwareVersion`, { value: now - 3600000 });
declare(`${deviceInfoPath}.ModelName`, { value: now - 3600000 });
declare(`${deviceInfoPath}.Manufacturer`, { value: now - 3600000 });
declare(`${deviceInfoPath}.UpTime`, { value: now - 300000 });

// 5. Refresh Parameter WAN (IP Address & Status Koneksi)
if (root === "InternetGatewayDevice") {
  // TR-098 WAN Refresh
  declare("InternetGatewayDevice.WANDevice.*.WANConnectionDevice.*.WANIPConnection.*.ExternalIPAddress", { value: now - 300000 });
  declare("InternetGatewayDevice.WANDevice.*.WANConnectionDevice.*.WANIPConnection.*.ConnectionStatus", { value: now - 300000 });
  declare("InternetGatewayDevice.WANDevice.*.WANConnectionDevice.*.WANPPPConnection.*.ExternalIPAddress", { value: now - 300000 });
  declare("InternetGatewayDevice.WANDevice.*.WANConnectionDevice.*.WANPPPConnection.*.ConnectionStatus", { value: now - 300000 });
  declare("InternetGatewayDevice.WANDevice.*.WANConnectionDevice.*.WANPPPConnection.*.Username", { value: now - 3600000 });

  // Refresh WiFi 2.4GHz & 5GHz
  declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.SSID", { value: now - 3600000 });
  declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.Enable", { value: now - 300000 });
  declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.Channel", { value: now - 3600000 });
  declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.TotalAssociations", { value: now - 300000 });

  // Cek Parameter Khusus Vendor (Huawei Optical RX Power)
  declare("InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.RXPower", { value: now - 300000 });
  declare("InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.TXPower", { value: now - 300000 });
} else {
  // TR-181 WAN & WiFi Refresh
  declare("Device.IP.Interface.*.IPv4Address.*.IPAddress", { value: now - 300000 });
  declare("Device.WiFi.SSID.*.SSID", { value: now - 3600000 });
  declare("Device.WiFi.SSID.*.Enable", { value: now - 300000 });
  declare("Device.Optical.Interface.*.OpticalSignalLevel", { value: now - 300000 });
}
