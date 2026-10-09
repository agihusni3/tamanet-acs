/**
 * Shared Helper: Pemuatan Data Perangkat ONT Sistem
 * Menghilangkan duplikasi logika parsing di DashboardPage dan OltsPage
 */

export interface SystemOntDevice {
  id: string;
  serial: string;
  mac: string;
  customerName: string;
  customerNo: string;
  manufacturer: string;
  model: string;
  status: 'ONLINE' | 'OFFLINE' | string;
  rxPower: string;
  rxPowerAcs: string;
  wanIp: string;
  uptime: string;
  pppoeUser?: string;
  oltId?: string;
  oltName?: string;
  ponPort?: number | string;
}

export function loadAllOntDevices(): SystemOntDevice[] {
  const list: SystemOntDevice[] = [];
  const seenSerials = new Set<string>();

  try {
    const saved = localStorage.getItem('acs_devices_list');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        parsed.forEach((d: any) => {
          if (!d) return;
          const sn = (d.serial || d.serialNumber || '').trim().toUpperCase();
          if (sn) seenSerials.add(sn);
          list.push({
            id: d.id || `dev-${sn || Math.random()}`,
            serial: d.serial || d.serialNumber || '-',
            mac: d.mac || '-',
            customerName: d.customerName || d.name || 'Pelanggan',
            customerNo: d.customerNo || '-',
            manufacturer: d.manufacturer || d.vendor || '-',
            model: d.model || 'ONT',
            status: d.status || 'ONLINE',
            rxPower: d.rxPowerAcs || d.rxPower || '-',
            rxPowerAcs: d.rxPowerAcs || d.rxPower || '-',
            wanIp: d.wanIp || '-',
            uptime: d.uptime || '-',
            pppoeUser: d.pppoeUser,
            oltId: d.oltId,
            oltName: d.oltName,
            ponPort: d.ponPort,
          });
        });
      }
    }
  } catch {}

  try {
    const gisSaved = localStorage.getItem('acs_gis_nodes');
    if (gisSaved) {
      const parsed = JSON.parse(gisSaved);
      if (Array.isArray(parsed)) {
        parsed
          .filter((n: any) => n && n.type === 'ONT')
          .forEach((n: any) => {
            const sn = (n.serial || '').trim().toUpperCase();
            if (!sn || !seenSerials.has(sn)) {
              if (sn) seenSerials.add(sn);
              list.push({
                id: n.id || `gis-${sn || Math.random()}`,
                serial: n.serial || n.name || '-',
                mac: n.mac || '-',
                customerName: n.name || 'Pelanggan',
                customerNo: n.customerNo || '-',
                manufacturer: n.model ? n.model.split(' ')[0] : '-',
                model: n.model || 'ONT',
                status: n.status || 'ONLINE',
                rxPower: n.rxPower || '-',
                rxPowerAcs: n.rxPower || '-',
                wanIp: n.wanIp || '-',
                uptime: n.uptime || '-',
                pppoeUser: n.pppoeUser,
                oltId: n.oltId,
                oltName: n.oltName,
                ponPort: n.ponPort,
              });
            }
          });
      }
    }
  } catch {}

  return list;
}
