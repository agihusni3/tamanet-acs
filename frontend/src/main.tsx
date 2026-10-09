import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// ─── Pembersihan Menyeluruh Seluruh Data Demo & Dummy ───────────────────────
const DATA_CLEAN_VERSION = 'v7.0.0-pureclean';
if (localStorage.getItem('acs_data_version') !== DATA_CLEAN_VERSION) {
  const KEYS_TO_PURGE = [
    'acs_olts',
    'acs_olts_list',
    'acs_pppoe_sessions',
    'acs_mikrotik_pppoe_sessions',
    'acs_kpi_data',
    'acs_modem_list',
    'acs_device_list',
  ];
  KEYS_TO_PURGE.forEach((key) => localStorage.removeItem(key));

  // 1. Bersihkan Node GIS dari node demo/dummy (termasuk POP Air Naningan, dummy OLT, dll)
  try {
    const rawNodes = localStorage.getItem('acs_gis_nodes');
    if (rawNodes) {
      const nodes = JSON.parse(rawNodes);
      if (Array.isArray(nodes)) {
        const cleanedNodes = nodes
          .filter((n: any) => {
            const nameLower = (n.name || '').toLowerCase();
            const idLower = (n.id || '').toLowerCase();
            return !(
              nameLower.includes('air naningan') ||
              nameLower.includes('dummy') ||
              nameLower.includes('demo') ||
              nameLower.includes('sample') ||
              nameLower.includes('contoh') ||
              idLower.startsWith('demo-') ||
              idLower.startsWith('dummy-')
            );
          })
          .map((n: any) => {
            if (n.type === 'SERVER' && n.popFacility?.devices) {
              n.popFacility.devices = n.popFacility.devices.filter((dev: any) => {
                const dName = (dev.name || '').toLowerCase();
                return !(
                  dName.includes('dummy') ||
                  dName.includes('demo') ||
                  dName.includes('air naningan') ||
                  dName.includes('core router pop') ||
                  dev.id.startsWith('dev-olt-') ||
                  dev.ipAddress === '192.168.10.2' ||
                  dev.ipAddress === '192.168.10.1' ||
                  dev.ipAddress === '192.168.10.3'
                );
              });
            }
            if (n.type === 'SERVER' && (n.ip === '192.168.10.2' || n.name === '2')) {
              n.ip = undefined;
              n.vendor = undefined;
              n.model = undefined;
              n.ponType = undefined;
              n.ponPortsCount = undefined;
            }
            return n;
          });
        localStorage.setItem('acs_gis_nodes', JSON.stringify(cleanedNodes));
      }
    }
  } catch {}

  // 2. Bersihkan Jalur Kabel Fiber GIS dari rute demo
  try {
    const rawRoutes = localStorage.getItem('acs_gis_routes');
    if (rawRoutes) {
      const routes = JSON.parse(rawRoutes);
      if (Array.isArray(routes)) {
        const cleanedRoutes = routes.filter((r: any) => {
          const nameLower = (r.name || '').toLowerCase();
          const idLower = (r.id || '').toLowerCase();
          return !(
            nameLower.includes('air naningan') ||
            nameLower.includes('dummy') ||
            nameLower.includes('demo') ||
            nameLower.includes('sample') ||
            nameLower.includes('contoh') ||
            idLower.startsWith('demo-') ||
            idLower.startsWith('dummy-')
          );
        });
        localStorage.setItem('acs_gis_routes', JSON.stringify(cleanedRoutes));
      }
    }
  } catch {}

  // 3. Bersihkan Data Pelanggan Demo
  try {
    const rawCust = localStorage.getItem('acs_customers_list');
    if (rawCust) {
      const custs = JSON.parse(rawCust);
      if (Array.isArray(custs)) {
        const cleanedCusts = custs.filter((c: any) => {
          const name = c.name || '';
          const no = c.customerNo || '';
          const id = c.id || '';
          return !(
            ['c1', 'c2', 'c3', 'c4'].includes(id) ||
            id.startsWith('cust-sample') ||
            no.startsWith('PLG-100') ||
            ['Ahmad Fauzi', 'Siti Rahma', 'Budi Santoso'].includes(name) ||
            name.toLowerCase().includes('demo') ||
            name.toLowerCase().includes('dummy')
          );
        });
        localStorage.setItem('acs_customers_list', JSON.stringify(cleanedCusts));
      }
    }
  } catch {}

  // 4. Bersihkan Devices & Alerts Demo
  try {
    const rawDevs = localStorage.getItem('acs_devices_list');
    if (rawDevs) {
      const devs = JSON.parse(rawDevs);
      if (Array.isArray(devs)) {
        const cleanedDevs = devs.filter((d: any) => {
          const id = d.id || '';
          const sn = (d.serial || d.serialNumber || '').toLowerCase();
          return !(
            ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'].includes(id) ||
            id.startsWith('dev-dummy-') ||
            sn.includes('dummy') ||
            sn.includes('demo')
          );
        });
        localStorage.setItem('acs_devices_list', JSON.stringify(cleanedDevs));
      }
    }
  } catch {}

  try {
    const rawAlerts = localStorage.getItem('acs_alerts') || localStorage.getItem('acs_alerts_list');
    if (rawAlerts) {
      const alerts = JSON.parse(rawAlerts);
      if (Array.isArray(alerts)) {
        const cleanedAlerts = alerts.filter((a: any) => {
          const id = a.id || '';
          return !(
            ['a1', 'a2', 'a3'].includes(id) ||
            id.startsWith('alert-test-')
          );
        });
        localStorage.setItem('acs_alerts', JSON.stringify(cleanedAlerts));
        localStorage.setItem('acs_alerts_list', JSON.stringify(cleanedAlerts));
      }
    }
  } catch {}

  localStorage.setItem('acs_data_version', DATA_CLEAN_VERSION);
  console.info('[ACS] Pembersihan mendalam: Semua data demo/dummy telah dihapus permanen.');
}

// 5. Sanitasi otomatis IP OLT & Server (menghilangkan http:// atau trailing colon)
try {
  const sanitizeIpStr = (raw?: string): string => {
    if (!raw) return '';
    return raw.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/:.*$/, '').trim();
  };

  const rawOlts = localStorage.getItem('acs_olts_list');
  if (rawOlts) {
    const olts = JSON.parse(rawOlts);
    if (Array.isArray(olts)) {
      let changed = false;
      olts.forEach((o: any) => {
        const clean = sanitizeIpStr(o.ip);
        if (o.ip !== clean) {
          o.ip = clean;
          changed = true;
        }
        if (o.uptime && o.uptime.includes('Source Server')) {
          o.uptime = 'Aktif';
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem('acs_olts_list', JSON.stringify(olts));
      }
    }
  }

  const rawGis = localStorage.getItem('acs_gis_nodes');
  if (rawGis) {
    const nodes = JSON.parse(rawGis);
    if (Array.isArray(nodes)) {
      let changed = false;
      nodes.forEach((n: any) => {
        if (n.type === 'SERVER' && n.popFacility?.devices) {
          n.popFacility.devices.forEach((d: any) => {
            if (d.ipAddress) {
              const clean = sanitizeIpStr(d.ipAddress);
              if (d.ipAddress !== clean) {
                d.ipAddress = clean;
                changed = true;
              }
            }
          });
        }
      });
      if (changed) {
        localStorage.setItem('acs_gis_nodes', JSON.stringify(nodes));
      }
    }
  }
} catch {}
// ─────────────────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
