# Web ACS TR-069 + FTTH GIS Mapping + Remote Modem Platform

Platform Web terpadu untuk ISP / RT-RW Net berbasis **GenieACS (TR-069 / CWMP)**, **FTTH GIS Mapping (MapLibre GL)**, **Remote Modem Management**, dan **OLT Collector (Hioso & Hisfocus)**.

---

## 1. Arsitektur Layanan (Docker Compose)

| Layanan | Container | Port Host | Akses & Keterangan |
| :--- | :--- | :--- | :--- |
| **GenieACS CWMP** | `acs_genieacs_cwmp` | `0.0.0.0:7547` | **Publik / VLAN ONT**: Jalur komunikasi Inform TR-069 |
| **GenieACS NBI** | `acs_genieacs_nbi` | `127.0.0.1:7557` | **Internal**: REST API untuk Backend (TIDAK diekspos keluar) |
| **GenieACS FS** | `acs_genieacs_fs` | `127.0.0.1:7567` | **Internal**: Server penyimpanan file firmware & backup |
| **GenieACS UI** | `acs_genieacs_ui` | `127.0.0.1:3001` | **Management Internal**: Debugging engine GenieACS |
| **MongoDB** | `acs_mongo` | Internal | Database dokumen GenieACS TR-069 |
| **PostgreSQL + PostGIS** | `acs_postgres` | `127.0.0.1:5432` | Database relasional spasial (Pelanggan, ODP, ODC, Kabel) |
| **Redis** | `acs_redis` | `127.0.0.1:6379` | Message broker antrean tugas BullMQ & caching sesi |
| **Backend API** | `acs_backend` | `127.0.0.1:4000` | REST API NestJS + Task Engine + OLT Collector |
| **Frontend Web** | `acs_frontend` | Internal | Dashboard React + Vite + Tailwind + MapLibre GL |
| **Nginx Gateway** | `acs_nginx` | `80`, `443` | Reverse proxy utama & SSL termination |

---

## 2. Cara Menjalankan Sistem

### Persyaratan:
* Docker & Docker Compose (`docker compose version` >= 2.20)
* Node.js v20+ (untuk development lokal)

### Langkah Cepat:
```bash
# 1. Salin konfigurasi environment
cp .env.example .env

# 2. Sesuaikan konfigurasi IP di file .env (terutama GENIEACS_EXT_URL)
nano .env

# 3. Jalankan seluruh kontainer
docker compose up -d

# 4. Sinkronisasi provision dan preset ke GenieACS NBI
node infra/genieacs/sync-genieacs.js

# 5. Buka dashboard di browser:
# http://localhost (Aplikasi Utama)
# http://localhost:3001 (GenieACS UI - debug internal)
```

---

## 3. Panduan Onboarding Modem / ONT ke ACS

Agar modem pelanggan (Huawei, Zimlink, dll.) otomatis terhubung ke sistem ACS ini:

### Metode 1: VLAN Manajemen + DHCP Option 43 (Otomatis & Direkomendasikan)
1. Buat VLAN khusus manajemen di MikroTik/OLT (misal: VLAN 200).
2. Aktifkan DHCP Server di VLAN tersebut dengan mengisi **DHCP Option 43**:
   * Isi value Option 43 dengan URL ACS: `http://<IP_ACS_SERVER>:7547/`
3. Pada profil ONU di OLT atau modem, tambahkan WAN kedua bertipe **TR-069** yang mengarah ke VLAN 200 dengan mode DHCP.
4. Modem otomatis mendapat IP manajemen dan langsung mengirim event `0 BOOTSTRAP` ke GenieACS.

### Metode 2: Konfigurasi Manual via Web Admin Modem (Saat Pemasangan)
1. Buka Web Admin modem (misal: `192.168.1.1` atau `192.168.100.1`).
2. Masuk ke menu **Network** / **System Tools** -> **TR-069** atau **CWMP Configuration**.
3. Isi parameter berikut:
   * **Enable TR-069:** Checked / Enable
   * **ACS URL:** `http://<IP_ACS_SERVER>:7547/`
   * **ACS User Name:** `acs_user` *(sesuai .env)*
   * **ACS Password:** `acs_password_secret_cpe` *(sesuai .env)*
   * **Periodic Inform:** Enable
   * **Periodic Inform Interval:** `300` detik
   * **Connection Request Username:** `cr_admin`
   * **Connection Request Password:** `cr_secret_password_random`
4. Klik **Save/Apply**. Status Inform pertama akan masuk dalam hitungan detik.

### Metode 3: Import Backup Configuration Massal
* Simpan backup konfigurasi modem Huawei / Zimlink yang sudah aktif TR-069-nya, lalu restore ke modem baru sebelum dipasang ke rumah pelanggan.

---

## 4. Status Fase Pengerjaan (Plan.md)

- [x] **FASE 1: Infrastruktur dan GenieACS Core**
  - [x] `docker-compose.yml` multi-container (CWMP :7547, NBI internal :7557, FS, UI :3001, Mongo, Postgres PostGIS, Redis, Nginx)
  - [x] `.env.example` kredensial terisolasi
  - [x] `infra/nginx/default.conf` reverse proxy aman
  - [x] `infra/genieacs/provisions/default.js` (Periodic Inform 300s & refresh)
  - [x] `infra/genieacs/presets/00-default.json` (Event 0, 1, 2)
  - [x] Skrip sinkronisasi otomatis NBI `infra/genieacs/sync-genieacs.js`
- [x] **FASE 2: Device Profile dan Virtual Parameters**
  - [x] Skrip Virtual Parameters GenieACS (`rxPower`, `ssid24`, `ssid5`, `pppoeUser`, `wanIP`, `uptime`, `model`, `firmware`)
  - [x] Entitas database `DeviceProfile` & Default Profiles Seed (Semua lini Huawei: HG8245H5, HG8245H, HG8546M, HG8546M5, EG8145V5 Dual-Band, EG8141A5, HG8310M Bridge, dan Zimlink)
  - [x] `ProfileResolverService` dengan resolusi OUI/ProductClass dan fallback aman
  - [x] 4 unit tests lolos verifikasi (`profile-resolver.spec.ts`)
- [x] **FASE 3: Backend Inti (NestJS + TypeORM + PostGIS + Remote Tasks)**
  - [x] Database Schema lengkap (Users, Customers, Devices, OLT, PonPort, ONU, NetworkAsset, Cable, CoverageArea, Task, Alert, AuditLog)
  - [x] Modul Auth (JWT, Refresh Token, Role Guards: ADMIN, NOC, TEKNISI, CS)
  - [x] Modul Devices (Sinkronisasi NBI, assign customer, dan remote actions: Reboot, Reset, WiFi, PPPoE, Refresh)
  - [x] Modul Tasks (`TaskPayloadBuilderService` dengan validasi kapabilitas) & Audit Logs
  - [x] Modul Customers & Network Assets (GeoJSON export `/geo/devices` dan `/geo/assets` untuk GIS)
  - [x] 6 unit tests lolos verifikasi (`task-payload-builder.spec.ts`)
- [x] **FASE 4: OLT Collector (Hioso & Hisfocus SNMP/CLI Worker)**
  - [x] Abstraksi `OltDriver` & `MockOltDriver`
  - [x] `CliParserService` untuk membaca output status, sinyal optik dBm, dan jarak OLT Hioso / Hisfocus
  - [x] Korelasi otomatis ONU ke modem ACS via MAC address (khusus EPON)
  - [x] Deteksi gangguan massal (*Mass Outage*) dan klasifikasi kabel putus (LOS) vs mati listrik (Dying-Gasp)
  - [x] 4 unit tests lolos verifikasi (`cli-parser.spec.ts`)
- [x] **FASE 5: Frontend Dashboard & FTTH GIS Mapping (MapLibre GL)**
  - [x] Desain modern ISP NOC (Dark Mode, Plus Jakarta Sans, JetBrains Mono)
  - [x] Halaman GIS Mapping interaktif satelit Esri World Imagery dengan marker Server, ODC, ODP, ONT
  - [x] Drawer detail perangkat dan aksi remote instan (Reboot, Ganti WiFi, Refresh, Factory Reset) dari peta
  - [x] Halaman Dashboard (KPI 1.000 pelanggan, status OLT Hioso/Hisfocus, distribusi Huawei 76% & Zimlink 24%)
  - [x] Halaman Devices, Pelanggan, Alerts & Gangguan, dan Pengaturan Sistem
  - [x] Build produksi teruji (`dist/` siap deploy via Nginx)
- [ ] **FASE 6: Monitoring, Alarm, Telegram Notifikasi**
- [ ] **FASE 7: Hardening, Keamanan, Backup**
