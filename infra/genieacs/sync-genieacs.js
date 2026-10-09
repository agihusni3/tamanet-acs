/**
 * Sync Script untuk GenieACS NBI
 * File: infra/genieacs/sync-genieacs.js
 *
 * Mengirimkan otomatis file provisions, presets, dan virtual-parameters
 * ke GenieACS NBI API (http://localhost:7557).
 *
 * Fitur:
 *  - Substitusi template {{VAR_NAME}} dengan nilai dari environment variables
 *  - Health-check NBI sebelum push (retry hingga 30x / 60 detik)
 *  - Upload semua provisions, presets, dan virtual-parameters
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const NBI_URL = process.env.GENIEACS_NBI_URL || 'http://127.0.0.1:7557';

// =============================================================================
// TEMPLATE SUBSTITUTION
// Ganti placeholder {{VAR_NAME}} dengan nilai dari process.env
// =============================================================================
const TEMPLATE_VARS = {
  GENIEACS_CR_USERNAME:  process.env.GENIEACS_CR_USERNAME  || 'cr_admin',
  GENIEACS_CR_PASSWORD:  process.env.GENIEACS_CR_PASSWORD  || 'cr_secret_password_random',
  GENIEACS_CPE_USERNAME: process.env.GENIEACS_CPE_USERNAME || 'acs_user',
  GENIEACS_CPE_PASSWORD: process.env.GENIEACS_CPE_PASSWORD || 'acs_password_secret_cpe',
  GENIEACS_EXT_URL:      process.env.GENIEACS_EXT_URL      || 'http://localhost:7548/',
};

function applyTemplates(content) {
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (TEMPLATE_VARS[key] !== undefined) {
      return TEMPLATE_VARS[key];
    }
    console.warn(`  ⚠ Template key tidak ditemukan di env: ${key}`);
    return match;
  });
}

// =============================================================================
// HTTP HELPER
// =============================================================================
function httpRequest(method, endpoint, body, isJson = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, NBI_URL);
    const postData = isJson ? JSON.stringify(body) : (body || '');

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
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
          reject(new Error(`HTTP ${res.statusCode} pada ${url.pathname}: ${data}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

function putNbi(endpoint, body, isJson = false) {
  return httpRequest('PUT', endpoint, body, isJson);
}

// =============================================================================
// HEALTH CHECK — tunggu NBI siap (max 30 percobaan x 2 detik = 60 detik)
// =============================================================================
async function waitForNbi(maxRetries = 30, intervalMs = 2000) {
  console.log(`[GenieACS Sync] Menunggu NBI siap di ${NBI_URL}...`);
  for (let i = 1; i <= maxRetries; i++) {
    try {
      await httpRequest('GET', '/devices/', '', false);
      console.log(`[GenieACS Sync] NBI siap setelah ${i * intervalMs / 1000}s.`);
      return true;
    } catch {
      process.stdout.write(`  Percobaan ${i}/${maxRetries}...\r`);
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  throw new Error('NBI tidak dapat dijangkau setelah 60 detik. Pastikan container genieacs-nbi berjalan.');
}

// =============================================================================
// SYNC FUNCTIONS
// =============================================================================
async function syncProvisions() {
  const provDir = path.join(__dirname, 'provisions');
  if (!fs.existsSync(provDir)) return;

  const files = fs.readdirSync(provDir).filter((f) => f.endsWith('.js'));
  console.log(`\n[Provisions] Mengunggah ${files.length} file...`);

  for (const f of files) {
    const name = path.basename(f, '.js');
    const raw = fs.readFileSync(path.join(provDir, f), 'utf-8');
    const content = applyTemplates(raw);

    try {
      await putNbi(`/provisions/${encodeURIComponent(name)}`, content, false);
      console.log(`  ✓ Provision: ${name}`);
    } catch (err) {
      console.error(`  ✗ Gagal provision '${name}': ${err.message}`);
    }
  }
}

async function syncPresets() {
  const presetDir = path.join(__dirname, 'presets');
  if (!fs.existsSync(presetDir)) return;

  const files = fs.readdirSync(presetDir).filter((f) => f.endsWith('.json'));
  console.log(`\n[Presets] Mengunggah ${files.length} file...`);

  for (const f of files) {
    const name = path.basename(f, '.json');
    const content = JSON.parse(fs.readFileSync(path.join(presetDir, f), 'utf-8'));

    try {
      await putNbi(`/presets/${encodeURIComponent(name)}`, content, true);
      console.log(`  ✓ Preset: ${name}`);
    } catch (err) {
      console.error(`  ✗ Gagal preset '${name}': ${err.message}`);
    }
  }
}

async function syncVirtualParameters() {
  const vpDir = path.join(__dirname, 'virtual-parameters');
  if (!fs.existsSync(vpDir)) return;

  const files = fs.readdirSync(vpDir).filter((f) => f.endsWith('.js'));
  console.log(`\n[Virtual Parameters] Mengunggah ${files.length} file...`);

  for (const f of files) {
    const name = path.basename(f, '.js');
    const raw = fs.readFileSync(path.join(vpDir, f), 'utf-8');
    const content = applyTemplates(raw);

    try {
      await putNbi(`/virtual_parameters/${encodeURIComponent(name)}`, content, false);
      console.log(`  ✓ VirtualParameter: ${name}`);
    } catch (err) {
      console.error(`  ✗ Gagal virtual parameter '${name}': ${err.message}`);
    }
  }
}

// =============================================================================
// MAIN
// =============================================================================
async function syncAll(skipWait = false) {
  console.log('');
  console.log('══════════════════════════════════════════════');
  console.log('  GenieACS Config Sync');
  console.log(`  NBI URL : ${NBI_URL}`);
  console.log(`  CR User : ${TEMPLATE_VARS.GENIEACS_CR_USERNAME}`);
  console.log('══════════════════════════════════════════════');

  if (!skipWait) {
    await waitForNbi();
  }

  await syncProvisions();
  await syncPresets();
  await syncVirtualParameters();

  console.log('\n[GenieACS Sync] ✅ Sinkronisasi selesai.\n');
}

if (require.main === module) {
  const skipWait = process.argv.includes('--no-wait');
  syncAll(skipWait).catch((e) => {
    console.error('\n[GenieACS Sync] ❌ Fatal error:', e.message);
    process.exit(1);
  });
}

module.exports = { syncAll };
