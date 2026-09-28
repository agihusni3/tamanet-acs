/**
 * Sync Script untuk GenieACS NBI
 * File: infra/genieacs/sync-genieacs.js
 * 
 * Mengirimkan otomatis file provisions, presets, dan virtual-parameters
 * ke GenieACS NBI API (http://localhost:7557).
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const NBI_URL = process.env.GENIEACS_NBI_URL || 'http://127.0.0.1:7557';

function putNbi(endpoint, body, isJson = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, NBI_URL);
    const postData = isJson ? JSON.stringify(body) : body;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'PUT',
      headers: {
        'Content-Type': isJson ? 'application/json' : 'text/plain',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data });
        } else {
          reject(new Error(`Failed ${url.pathname} (${res.statusCode}): ${data}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

async function syncAll() {
  console.log(`[GenieACS Sync] Menghubungkan ke ${NBI_URL}...`);

  // 1. Sync Provisions
  const provDir = path.join(__dirname, 'provisions');
  if (fs.existsSync(provDir)) {
    const files = fs.readdirSync(provDir).filter((f) => f.endsWith('.js'));
    for (const f of files) {
      const name = path.basename(f, '.js');
      const content = fs.readFileSync(path.join(provDir, f), 'utf-8');
      try {
        await putNbi(`/provisions/${encodeURIComponent(name)}`, content, false);
        console.log(`  ✓ Provision terpasang: ${name}`);
      } catch (err) {
        console.error(`  ✗ Gagal sync provision ${name}:`, err.message);
      }
    }
  }

  // 2. Sync Presets
  const presetDir = path.join(__dirname, 'presets');
  if (fs.existsSync(presetDir)) {
    const files = fs.readdirSync(presetDir).filter((f) => f.endsWith('.json'));
    for (const f of files) {
      const name = path.basename(f, '.json');
      const content = JSON.parse(fs.readFileSync(path.join(presetDir, f), 'utf-8'));
      try {
        await putNbi(`/presets/${encodeURIComponent(name)}`, content, true);
        console.log(`  ✓ Preset terpasang: ${name}`);
      } catch (err) {
        console.error(`  ✗ Gagal sync preset ${name}:`, err.message);
      }
    }
  }

  // 3. Sync Virtual Parameters
  const vpDir = path.join(__dirname, 'virtual-parameters');
  if (fs.existsSync(vpDir)) {
    const files = fs.readdirSync(vpDir).filter((f) => f.endsWith('.js'));
    for (const f of files) {
      const name = path.basename(f, '.js');
      const content = fs.readFileSync(path.join(vpDir, f), 'utf-8');
      try {
        await putNbi(`/virtual_parameters/${encodeURIComponent(name)}`, content, false);
        console.log(`  ✓ Virtual Parameter terpasang: ${name}`);
      } catch (err) {
        console.error(`  ✗ Gagal sync virtual parameter ${name}:`, err.message);
      }
    }
  }

  console.log('[GenieACS Sync] Selesai sinkronisasi.');
}

if (require.main === module) {
  syncAll().catch((e) => {
    console.error('Fatal error saat sync:', e.message);
    process.exit(1);
  });
}

module.exports = { syncAll };
