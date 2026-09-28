# PLAN: Web ACS TR-069 + GIS Mapping + Remote Modem

> Dokumen ini adalah instruksi kerja untuk AI agent (Antigravity).
> Kerjakan **per fase secara berurutan**. Selesaikan dan verifikasi acceptance criteria satu fase sebelum lanjut ke fase berikutnya.
> Jika ada informasi yang belum pasti (nama parameter modem, OID OLT), **jangan mengarang**. Tandai dengan `TODO(verify)` dan buat konfigurasi yang mudah diubah.

---

## 1. Tujuan

Membangun platform web untuk ISP yang:

1. Mengelola modem/ONU pelanggan lewat **TR-069 (CWMP)** memakai **GenieACS** sebagai ACS core.
2. Menampilkan semua perangkat pada **peta GIS** (status, sinyal, lokasi, jaringan ODP/ODC/OLT).
3. Bisa **remote modem** dari web: reboot, factory reset, ubah WiFi, ubah PPPoE, diagnostik, firmware upgrade.
4. Mengambil data optik dan status ONU dari **OLT** (SNMP/CLI) untuk deteksi gangguan.

## 2. Lingkungan Jaringan (fakta yang diketahui)

| Item | Nilai |
|---|---|
| Merek modem/ONU | Huawei dan Zimlink |
| Merek OLT | Hioso dan Hisfocus (HSGQ) |
| Teknologi PON | Kemungkinan EPON 
| Model persis modem | Masukkan semua list modem huawei
| Model persis OLT |Hioso dan Hisfocus (HSGQ)
| Jumlah pelanggan | 1000
| ACS URL bawaan modem | kosong 

**Konsekuensi desain:**
- Data model modem berbeda antar merek dan firmware. Wajib ada lapisan **device profile** dan **virtual parameter**.
- Fitur TR-069 provisioning via OLT ekonomis tidak bisa diasumsikan ada. Jalur utama: **VLAN manajemen + WAN TR069 di ONU** (DHCP Option 43 atau ACS URL manual).
- RX power tidak selalu tersedia lewat TR-069. Sumber utama sinyal optik: **OLT collector**, cadangan: TR-069.

## 3. Arsitektur

```
Modem/ONU (CPE) <--CWMP--> GenieACS (CWMP :7547) <--> MongoDB
                                  |
                          GenieACS NBI (:7557, internal only)
                                  |
            Backend API (NestJS, TypeScript) <--> PostgreSQL + PostGIS
                  |         |                     Redis (queue/cache)
                  |         +-- OLT Collector (SNMP/CLI worker)
                  |
            Frontend (React + Vite + MapLibre GL)
                  |
            Nginx reverse proxy (HTTPS)
```

**Stack (ikuti, jangan ganti tanpa alasan kuat):**

- ACS: GenieACS (versi stabil terbaru)
- Backend: Node.js 20+, TypeScript, NestJS, TypeORM (atau query raw untuk PostGIS)
- DB: PostgreSQL 16 + PostGIS, MongoDB (khusus GenieACS), Redis
- Job queue: BullMQ
- Frontend: React + Vite + TypeScript, TanStack Query, Tailwind CSS, MapLibre GL JS (+ clustering)
- Deploy: Docker Compose, Nginx
- Auth: JWT (access + refresh), password hash argon2/bcrypt

## 4. Struktur Repo

```
/
├─ docker-compose.yml
├─ .env.example
├─ README.md
├─ plan.md
├─ infra/
│  ├─ nginx/
│  └─ genieacs/
│     ├─ provisions/          # script provision GenieACS (JS)
│     ├─ virtual-parameters/  # script virtual parameter (JS)
│     └─ presets/             # JSON preset
├─ backend/
│  └─ src/
│     ├─ auth/
│     ├─ users/
│     ├─ devices/             # sinkron + aksi remote via NBI
│     ├─ profiles/            # device_profiles (mapping parameter)
│     ├─ customers/
│     ├─ network-assets/      # OLT, PON, ODC, ODP, kabel (PostGIS)
│     ├─ olt-collector/       # SNMP/CLI worker
│     ├─ tasks/               # riwayat task remote
│     ├─ alerts/
│     ├─ audit/
│     └─ genieacs/            # client NBI
└─ frontend/
   └─ src/
      ├─ pages/ (Login, Dashboard, Devices, DeviceDetail, Map, Customers, Alerts, Settings)
      ├─ components/
      ├─ api/
      └─ store/
```

## 5. Aturan untuk Agent

1. Jangan pernah hardcode kredensial. Semua lewat `.env`. Sediakan `.env.example`.
2. NBI GenieACS (`:7557`) **tidak boleh** diekspos ke publik. Hanya backend yang mengaksesnya.
3. Semua aksi remote harus: (a) cek role, (b) masuk `tasks`, (c) masuk `audit_logs`.
4. Nama parameter TR-069 **tidak boleh hardcode di frontend**. Frontend hanya memakai nama seragam (`ssid24`, `rxPower`, dst.). Mapping ada di `device_profiles` dan virtual parameter.
5. Jika path parameter belum diketahui, buat entri di profile dengan `TODO(verify)` dan fallback aman. Jangan menebak lalu mengirim SetParameterValues ke modem sungguhan.
6. Tambahkan validasi input (DTO), rate limit pada endpoint aksi remote, dan penanganan error yang jelas.
7. Tulis test minimal untuk logika inti (pemilihan profile, pembentukan payload task, parsing OLT).
8. Setiap fase diakhiri dengan update `README.md` (cara menjalankan dan apa yang sudah jadi).
9. Commit kecil dan bermakna per fitur.

---

## FASE 1: Infrastruktur dan GenieACS

**Tugas**
- Buat `docker-compose.yml`: `genieacs` (cwmp, nbi, fs, ui), `mongo`, `postgres` (image PostGIS), `redis`, `backend`, `frontend`, `nginx`.
- Port CWMP `7547` terbuka ke jaringan modem. NBI `7557` dan UI GenieACS `3000` hanya internal/management.
- Konfigurasi autentikasi CPE (username/password ACS) lewat env.
- Buat provision dasar `infra/genieacs/provisions/default.js`:
  - Set `Device.ManagementServer.PeriodicInformInterval` / `InternetGatewayDevice.ManagementServer.PeriodicInformInterval` = 300.
  - Aktifkan periodic inform.
  - Set kredensial Connection Request.
  - Refresh parameter dasar tiap Inform.
- Buat preset yang memicu provision pada event `0 BOOTSTRAP`, `1 BOOT`, `2 PERIODIC`.
- Dokumentasi di `README.md`: cara mengarahkan modem ke ACS (lihat bagian 10).

**Acceptance criteria**
- `docker compose up` menjalankan semua layanan tanpa error.
- Minimal 1 modem (atau simulator seperti `genieacs-sim`) muncul di GenieACS UI setelah Inform.
- Dump parameter tree bisa diekspor ke `infra/genieacs/dumps/<model>.json` untuk tiap model modem.

---

## FASE 2: Device Profile dan Virtual Parameters

**Tugas**
- Buat tabel `device_profiles` dan CRUD API-nya.
- Tulis virtual parameter di `infra/genieacs/virtual-parameters/` dengan pola: **cek path Huawei dulu, lalu fallback ke Zimlink, lalu TR-181**. Nama seragam:
  - `VirtualParameters.rxPower`
  - `VirtualParameters.ssid24`, `VirtualParameters.ssid5`
  - `VirtualParameters.pppoeUser`
  - `VirtualParameters.wanIP`
  - `VirtualParameters.uptime`
  - `VirtualParameters.model`, `VirtualParameters.firmware`
- Contoh path (WAJIB diverifikasi dengan dump nyata, ini hanya titik awal):
  - Huawei RX power: `InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.RXPower` (ejaan bawaan vendor). `TODO(verify)` untuk EPON: kemungkinan path berbeda.
  - WiFi 2.4G: `InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID`
  - WiFi 5G: `InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID` (`TODO(verify)` per model)
  - Password WiFi: `...WLANConfiguration.N.PreSharedKey.1.KeyPassphrase`
  - PPPoE: `InternetGatewayDevice.WANDevice.1.WANConnectionDevice.*.WANPPPConnection.*.Username`
  - Zimlink: semua `TODO(verify)` sampai ada dump.
- Backend: service `ProfileResolver` yang memilih profile berdasarkan `oui` + `productClass` (+ versi firmware opsional) dan mengembalikan mapping parameter.

**Skema `device_profiles`**
```
id, name, manufacturer, oui, product_class, firmware_pattern,
root_model ('TR098'|'TR181'),
params JSONB  -- {ssid24, ssid5, wifiPass24, wifiPass5, rxPower, pppoeUser, pppoePass, wanIP, hosts, ...}
capabilities JSONB -- {reboot, factoryReset, wifi, pppoe, firmware, ping, traceroute, hosts, rxPower}
created_at, updated_at
```

**Acceptance criteria**
- Untuk modem Huawei yang terhubung, virtual parameter terisi di GenieACS.
- Endpoint `GET /profiles/resolve?deviceId=` mengembalikan profile yang benar.
- Modem tanpa profile cocok ditandai `profile_missing` di UI, bukan error.

---

## FASE 3: Backend Inti

**Skema database (PostgreSQL + PostGIS)**

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

users(id, username, password_hash, role, totp_secret NULL, active, created_at)
-- role: ADMIN | NOC | TEKNISI | CS

customers(id, customer_no, name, phone, address, odp_id NULL, geom geography(Point,4326) NULL, created_at)

devices(id, genie_id UNIQUE, serial, mac NULL, oui, product_class, manufacturer,
        model, firmware, profile_id, customer_id NULL,
        wan_ip, uptime, rx_power_acs, status, last_inform, created_at, updated_at)

olts(id, name, vendor, model, ip, snmp_community, snmp_version, cli_user NULL, cli_pass NULL,
     pon_type ('EPON'|'GPON'), geom geography(Point,4326) NULL)
pon_ports(id, olt_id, slot, port, label)
onus(id, olt_id, pon_port_id, onu_index, mac NULL, sn NULL, name NULL,
     status, offline_reason NULL, rx_power, tx_power, distance NULL,
     device_id NULL, last_seen)

network_assets(id, type ('ODC'|'ODP'|'TIANG'|'JOINT_CLOSURE'), name, capacity, used,
               parent_id NULL, geom geography(Point,4326))
cables(id, name, type, core_count, from_asset_id, to_asset_id, geom geography(LineString,4326))
coverage_areas(id, name, geom geography(Polygon,4326))

tasks(id, device_id, type, payload JSONB, status ('PENDING'|'RUNNING'|'SUCCESS'|'FAILED'),
      result JSONB NULL, error NULL, user_id, created_at, finished_at)
alerts(id, type, severity, device_id NULL, asset_id NULL, message, status, created_at, resolved_at)
audit_logs(id, user_id, action, target_type, target_id, detail JSONB, ip, created_at)
```
Buat index GiST pada semua kolom `geom`, dan index pada `devices.serial`, `devices.genie_id`, `onus.mac`, `onus.sn`.

**Modul dan endpoint**

Auth
- `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`
- Guard role di semua endpoint.

Devices
- `GET /devices` (filter: status, merek, model, firmware, area, search serial/nama/no pelanggan; paginasi)
- `GET /devices/:id` (detail + parameter penting)
- `POST /devices/sync` (tarik dari NBI ke PostgreSQL) dan sync terjadwal tiap 1-2 menit lewat BullMQ
- `PATCH /devices/:id/assign-customer`

Aksi remote (semua lewat `tasks`, memanggil `POST {NBI}/devices/{id}/tasks?connection_request`)
- `POST /devices/:id/reboot`  -> task `reboot`
- `POST /devices/:id/factory-reset`  -> task `factoryReset` (**ADMIN saja**, wajib konfirmasi)
- `POST /devices/:id/wifi` body `{band:'2.4'|'5', ssid?, password?}` -> `setParameterValues` sesuai profile
- `POST /devices/:id/pppoe` body `{username, password}` -> `setParameterValues`
- `POST /devices/:id/refresh` -> `refreshObject` / `getParameterValues`
- `POST /devices/:id/firmware` body `{fileName}` -> task `download` (ADMIN, cek kecocokan model)
- `POST /devices/:id/diagnostic/ping` body `{host, count}` -> set parameter diagnostik lalu baca hasil
- `GET /devices/:id/hosts` -> daftar client tersambung
- `GET /tasks`, `GET /tasks/:id` (status dan riwayat)

Aturan eksekusi task:
- Jika Connection Request gagal (modem di belakang NAT), task tetap ditaruh di antrean GenieACS tanpa `connection_request` dan diproses saat Inform berikutnya. Tampilkan status "menunggu modem" di UI.
- Cek `capabilities` profile sebelum mengirim. Jika tidak didukung, kembalikan `422` dengan pesan jelas.
- Semua request dicatat di `audit_logs` (siapa, apa, ke perangkat mana, kapan).

Customers dan aset jaringan
- CRUD `customers`, `olts`, `network_assets`, `cables`, `coverage_areas`
- `POST /customers/import` (CSV: no_pelanggan, nama, alamat, lat, lng, serial/mac)
- `POST /assets/import` (CSV atau KML/GeoJSON)
- `GET /geo/devices?bbox=` -> GeoJSON perangkat dalam viewport
- `GET /geo/assets?types=&bbox=` -> GeoJSON aset

**Acceptance criteria**
- Semua endpoint punya validasi dan role guard.
- Reboot dari API benar-benar me-reboot modem uji dan tercatat di `tasks` dan `audit_logs`.
- Test unit lolos untuk ProfileResolver dan pembentuk payload task.

---

## FASE 4: OLT Collector (Hioso dan Hisfocus)

**Tugas**
- Buat modul `olt-collector` sebagai worker terpisah (BullMQ, interval bisa diatur, default 2-5 menit).
- Buat interface `OltDriver`:
  ```ts
  interface OltDriver {
    listOnus(): Promise<OnuInfo[]>          // pon, index, mac/sn, status, offline_reason, rx, tx, distance
    getOnu(ref): Promise<OnuInfo>
    listPonPorts(): Promise<PonPort[]>
  }
  ```
- Implementasi driver:
  - `SnmpDriver` (library `net-snmp`): OID disimpan di konfigurasi per model OLT, **bukan hardcode**. `TODO(verify)`: OID Hioso dan Hisfocus harus diambil dari MIB/`snmpwalk` OLT nyata.
  - `CliDriver` (Telnet/SSH): fallback jika SNMP tidak menyediakan data power. Parser output CLI per model, dengan test memakai contoh output.
  - Sediakan mode `mock` untuk pengembangan tanpa OLT.
- Simpan hasil ke `onus`, lalu **korelasikan dengan `devices`** lewat MAC (utama) atau SN. Kolom `onus.device_id` diisi jika cocok.
- Untuk EPON, MAC adalah kunci utama. Sediakan halaman manual-mapping untuk ONU yang tidak cocok otomatis.
- Bedakan alasan offline: `LOS`, `DYING_GASP` (listrik pelanggan mati), `UNKNOWN`.

**Deteksi gangguan massal**
- Jika >= N ONU (default 5, atau >= 30 persen) di PON port atau ODP yang sama offline dengan alasan `LOS` dalam window 5 menit, buat alert `MASS_OUTAGE` dengan lokasi (PON/ODP) dan tandai area di peta.
- Jika offline dengan `DYING_GASP`, tandai sebagai "kemungkinan listrik mati", bukan gangguan kabel.

**Acceptance criteria**
- Dengan driver `mock`, sistem mengisi `onus` dan menghasilkan alert massal sesuai skenario uji.
- Dengan OLT nyata (jika tersedia): daftar ONU dan RX power tampil. Bagian yang tidak bisa diambil ditandai jelas di UI, bukan diam-diam kosong.

---

## FASE 5: Frontend

**Halaman**
1. **Login**
2. **Dashboard**: total online/offline, distribusi merek/model/firmware, top ONU sinyal lemah, alert aktif, ringkasan per OLT/PON.
3. **Devices**: tabel dengan filter, search, badge status dan sinyal. Aksi massal terbatas (reboot terpilih untuk NOC/Admin).
4. **Device Detail**: info lengkap, grafik uptime/RX (jika ada histori), tombol aksi remote (Reboot, Refresh, Ubah WiFi, Ubah PPPoE, Ping, Daftar Client, Firmware, Factory Reset). Tombol dinonaktifkan sesuai `capabilities` dan role. Konfirmasi dialog untuk aksi berbahaya. Panel riwayat task dengan status live (polling atau WebSocket).
5. **Map (GIS)**: lihat bagian di bawah.
6. **Customers**: CRUD, import CSV, daftar "belum punya koordinat".
7. **Alerts**: daftar, filter, acknowledge, resolve.
8. **Settings**: users, profiles, OLT, ambang batas sinyal, notifikasi.

**Halaman Map (MapLibre GL)**
- Basemap OpenStreetMap (raster tile) dan opsi satelit. `TODO`: tentukan sumber tile yang boleh dipakai.
- Marker perangkat dengan clustering; warna:
  - hijau = online, sinyal baik
  - kuning = online, sinyal lemah (default lebih rendah dari -25 dBm, bisa diatur)
  - merah = offline
  - abu-abu = tidak diketahui
- Klik marker: panel samping berisi nama pelanggan, merek/model, firmware, RX power, uptime, status, dan tombol aksi remote yang sama dengan halaman detail.
- Layer yang bisa di-toggle: OLT, PON, ODC, ODP, tiang, kabel (garis), coverage area (poligon), heatmap offline.
- Area gangguan massal ditampilkan sebagai lingkaran/poligon merah berkedip pelan.
- Filter: status, merek, model, firmware, OLT/PON/ODP, rentang sinyal.
- Search serial/nama/no pelanggan lalu `flyTo` ke lokasi.
- Mode edit (role ADMIN/TEKNISI): klik peta atau drag marker untuk set/ubah koordinat, gambar kabel dan poligon.
- Muat data berdasarkan viewport (`bbox`) agar ringan untuk ribuan titik.
- Responsif, dan teknisi bisa memakai dari HP di lapangan.

**Acceptance criteria**
- Semua aksi remote bisa dijalankan dari peta maupun halaman detail dan menampilkan status task.
- Peta tetap lancar dengan >= 5.000 marker (clustering dan bbox).
- Tampilan berfungsi di layar HP.

---

## FASE 6: Monitoring, Alarm, Notifikasi

**Tugas**
- Rule alert:
  - Device offline > X menit (default 15)
  - RX power di bawah ambang (default -27 dBm)
  - `MASS_OUTAGE` dari OLT collector
  - Modem tidak Inform > 2x interval
  - Task remote gagal berulang
- Notifikasi: Telegram bot (utama), email (opsional), WhatsApp gateway (opsional, `TODO(verify)` provider). Konfigurasi lewat Settings, dengan anti-spam (cooldown, dedup).
- Histori metrik ringan (RX power, status) untuk grafik: simpan per jam per perangkat, retensi bisa diatur (mis. 90 hari).

**Acceptance criteria**
- Mematikan modem uji memunculkan alert dan mengirim notifikasi Telegram dalam waktu wajar.
- Alert yang sama tidak dikirim berulang (dedup/cooldown).

---

## FASE 7: Keamanan, Hardening, Dokumentasi

**Tugas**
- HTTPS di Nginx. NBI dan UI GenieACS hanya dari jaringan management/VPN.
- Autentikasi CPE (Basic/Digest), Connection Request username/password unik per perangkat (di-generate provision).
- Rate limit, helmet, CORS ketat, validasi upload file (CSV/KML/firmware).
- 2FA TOTP opsional untuk ADMIN.
- Enkripsi field sensitif (kredensial OLT) di database.
- Backup terjadwal PostgreSQL dan MongoDB (script + dokumentasi restore).
- Load test sederhana (simulasi banyak Inform dengan `genieacs-sim`).
- Dokumentasi: `README.md`, `docs/DEPLOY.md`, `docs/ONBOARDING-MODEM.md`, `docs/ADD-DEVICE-PROFILE.md`, `docs/OLT-DRIVER.md`.

**Acceptance criteria**
- Checklist keamanan di bawah terpenuhi.
- Dokumentasi cukup bagi orang baru untuk deploy dari nol.

---

## 10. Onboarding Modem ke ACS (untuk dokumentasi)

Urutan dari yang paling praktis:
1. **VLAN manajemen + WAN TR069 di ONU**: buat VLAN manajemen di OLT, set WAN tipe TR069 pada ONU dengan VLAN itu, IP via DHCP (Option 43 berisi ACS URL) atau ACS URL manual.
2. **Isi ACS URL lewat web admin modem** saat instalasi (buat template panduan teknisi).
3. **Config file massal** (import config Huawei/Zimlink) yang sudah berisi ACS URL.
4. **Lewat OLT** hanya jika manual/firmware OLT Hioso/Hisfocus terbukti mendukung (`TODO(verify)`).

Catatan NAT/CGNAT: jika Connection Request tidak bisa masuk, gunakan periodic inform 5 menit dan aktifkan STUN (TR-111) jika modem mendukung.

## 11. Checklist Keamanan

- [ ] NBI `:7557` dan UI GenieACS tidak terbuka ke internet
- [ ] Semua kredensial di `.env`, tidak ada di repo
- [ ] Role guard di setiap endpoint aksi remote
- [ ] Audit log untuk semua aksi remote dan perubahan data
- [ ] Factory reset dan firmware upgrade hanya ADMIN
- [ ] Password default modem/ACS diganti
- [ ] HTTPS aktif
- [ ] Backup dan prosedur restore teruji

## 12. Risiko dan Catatan

| Risiko | Mitigasi |
|---|---|
| Path parameter Zimlink beragam antar firmware | Wajib dump per model, profile per firmware, `capabilities` per profile |
| Modem terkunci ACS ISP lain | Cek sebelum deploy, siapkan prosedur ubah ACS URL |
| SNMP OLT Hioso/Hisfocus tidak seragam | Driver abstrak, konfigurasi OID per model, fallback CLI, mode mock |
| Modem di belakang NAT | Periodic inform pendek, task antrean, STUN |
| Skala > 10.000 device | Pisahkan proses CWMP/NBI/UI GenieACS, tuning MongoDB, indeks PostGIS |
| Salah kirim parameter ke modem produksi | Selalu uji di modem uji, validasi terhadap profile, audit log |

## 13. Definition of Done (keseluruhan)

- Modem Huawei dan Zimlink terdaftar otomatis di ACS dan tampil di web.
- Peta menampilkan perangkat dengan status/sinyal dan layer jaringan.
- Reboot, ubah WiFi, ubah PPPoE, refresh, dan diagnostik berjalan dari web, tercatat di riwayat task.
- Data ONU dari OLT terkorelasi dengan modem, dan gangguan massal terdeteksi.
- Alarm terkirim ke Telegram.
- Deploy via Docker Compose dengan dokumentasi lengkap.

## 14. Urutan Eksekusi untuk Agent

1. Baca seluruh `plan.md`, lalu ringkas pemahaman dan daftar `TODO(verify)` yang menghalangi.
2. Kerjakan Fase 1, jalankan dan verifikasi, update README.
3. Lanjut Fase 2 sampai 7 berurutan, dengan verifikasi acceptance criteria tiap fase.
4. Di akhir tiap fase, laporkan: apa yang selesai, apa yang diuji, apa yang masih `TODO(verify)`.
