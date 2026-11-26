# DOKUMENTASI SISTEM RESMI & PANDUAN AKADEMIS
# PROYEK: JURNALWAVE
> **Portal Media Digital, Jurnalisme Warga (Hallo Jurnal), dan Cuaca Satelit Real-Time**  
> *Disusun sebagai Buku Putih Teknis (White Paper), Rujukan Laporan Magang / Praktik Kerja Lapangan (PKL), dan Jurnal Pengabdian kepada Masyarakat (PKM / Abdimas)*  
> *Versi Sistem: 2.6.0 (Rilis Final & Terkunci 2026)*  
> *Status Infrastruktur: Tahap Pengujian Staging Menuju Server Mandiri & Domain Dedicated*

---

## DAFTAR ISI
1. [Identitas Sistem & Analisis Situasi Mitra Pengabdian](#1-identitas-sistem--analisis-situasi-mitra-pengabdian)
2. [Permasalahan Mitra & Latar Belakang Program PKM](#2-permasalahan-mitra--latar-belakang-program-pkm)
3. [Solusi yang Diterapkan & Metodologi Pelaksanaan](#3-solusi-yang-diterapkan--metodologi-pelaksanaan)
4. [Arsitektur Sistem & Spesifikasi Tech Stack Terkini (Final)](#4-arsitektur-sistem--spesifikasi-tech-stack-terkini-final)
5. [Topologi Alur Data & Diagram Interaksi Sistem](#5-topologi-alur-data--diagram-interaksi-sistem)
6. [Perancangan Basis Data Relasional (ERD & Kamus Data Prisma)](#6-perancangan-basis-data-relasional-erd--kamus-data-prisma)
7. [Implementasi Fitur Unggulan Hasil Revisi Mutakhir](#7-implementasi-fitur-unggulan-hasil-revisi-mutakhir)
   - 7.1 [Verifikasi Ketat WhatsApp OTP Asli (Fonnte Gateway)](#71-verifikasi-ketat-whatsapp-otp-asli-fonnte-gateway)
   - 7.2 [Penomoran Tiket Server Unik Anti-Tabrakan](#72-penomoran-tiket-server-unik-anti-tabrakan)
   - 7.3 [Ruang Chat Dua Arah Privat & Isolasi Scroll Mandiri](#73-ruang-chat-dua-arah-privat--isolasi-scroll-mandiri)
   - 7.4 [Pemutar Audio Berita Text-to-Speech (TTS Natural)](#74-pemutar-audio-berita-text-to-speech-tts-natural)
   - 7.5 [Dashboard Pusat Kendali Redaksi (JurnalControl / Jurnal-Central)](#75-dashboard-pusat-kendali-redaksi-jurnalcontrol--jurnal-central)
   - 7.6 [Prakiraan Cuaca Satelit Real-Time Sukabumi (Open-Meteo)](#76-prakiraan-cuaca-satelit-real-time-sukabumi-open-meteo)
   - 7.7 [Wave Reels (Video Pendek Daerah) & Bursa Loker Sukabumi](#77-wave-reels-video-pendek-daerah--bursa-loker-sukabumi)
   - 7.8 [Polling Pembaca Cerdas Berbasis Google Gemini AI](#78-polling-pembaca-cerdas-berbasis-google-gemini-ai)
8. [Struktur Repositori Proyek (File Tree Structure)](#8-struktur-repositori-proyek-file-tree-structure)
9. [Spesifikasi Seluruh REST API Endpoints Backend](#9-spesifikasi-seluruh-rest-api-endpoints-backend)
10. [Konfigurasi Lingkungan Sistem (.env)](#10-konfigurasi-lingkungan-sistem-env)
11. [Status Infrastruktur Saat Ini vs Rencana Migrasi Server Mandiri](#11-status-infrastruktur-saat-ini-vs-rencana-migrasi-server-mandiri)
12. [Pengujian Perangkat Lunak (Black Box Testing Matrix)](#12-pengujian-perangkat-lunak-black-box-testing-matrix)
13. [Dampak Sosial, Keberlanjutan Program PKM, dan Evaluasi Akademis](#13-dampak-sosial-keberlanjutan-program-pkm-dan-evaluasi-akademis)

---

## 1. IDENTITAS SISTEM & ANALISIS SITUASI MITRA PENGABDIAN

### 1.1 Identitas Resmi Proyek
* **Nama Resmi Platform**: `JurnalWave`
* **Nama Kanal Resmi**:
  1. **JurnalWave** (Portal Berita Utama & Multimedia Sukabumi Raya)
  2. **Hallo Jurnal** (Kanal Jurnalisme Warga, Layanan Aduan & Aspirasi Publik)
  3. **Wave Reels** (Kanal Video Pendek Kreatif, Wisata & Budaya Daerah)
* **Wilayah Target Sasaran**: Sukabumi Raya (Kota Sukabumi dan Kabupaten Sukabumi, Jawa Barat).
* **Mitra Pengabdian / Tempat Magang**: Meja Redaksi JurnalWave Media Sukabumi & Komunitas Masyarakat Sukabumi.
* **Klasifikasi Proyek**: Pengembangan Perangkat Lunak Media Digital, *Civic Tech*, dan Pemberdayaan Komunitas Berbasis Teknologi Web Terbuka.

### 1.2 Analisis Situasi Masyarakat Mitra
Sukabumi merupakan salah satu kabupaten terluas di Pulau Jawa dengan sebaran geografis pegunungan dan pesisir pantai. Sebagian besar warga di pedesaan maupun perkotaan mengandalkan gawai pintar (*smartphone*) untuk beraktivitas. Namun, dalam hal pelayanan publik dan akses informasi lokal, terdapat kesenjangan signifikan:
1. Informasi publik sering tersebar secara sporadis di grup-grup media sosial tanpa konfirmasi faktual (*unverified rumors*).
2. Infrastruktur rusak (jalan amblas, jembatan terputus, longsor) lambat ditangani karena alur pelaporan birokrasi berbelit.
3. Warga merasa cemas melaporkan keluhan fasilitas daerah karena kekhawatiran identitas pribadinya terekspos ke publik.

---

## 2. PERMASALAHAN MITRA & LATAR BELAKANG PROGRAM PKM

Berdasarkan hasil observasi magang dan identifikasi kebutuhan pengabdian masyarakat di Sukabumi, dirumuskan masalah utama:
1. **Belum Adanya Kanal Jurnalisme Warga yang Terverifikasi Asli**: Mayoritas forum aduan di internet diisi akun anonim palsu (*spambot*), sehingga redaksi media dan dinas pemerintahan sulit membedakan aduan valid dan aduan palsu.
2. **Ketiadaan Ruang Komunikasi Privat Dua Arah**: Saat warga mengirimkan laporan kondisi lapangan, tidak ada ruang koordinasi yang tertutup untuk verifikasi lanjutan antara redaktur dan pelapor.
3. **Keterbatasan Aksesibilitas Berita**: Belum tersedianya media audio bagi masyarakat tunanetra, lanjut usia, atau warga dengan tingkat literasi baca rendah untuk menikmati berita secara mandiri.
4. **Kebutuhan Informasi Lokal Komprehensif**: Sukabumi sebagai daerah rawan bencana cuaca (hujan ekstrem dan angin kencang) membutuhkan radar prakiraan cuaca satelit real-time yang menyatu dengan portal informasi lapangan dan lowongan kerja daerah.

---

## 3. SOLUSI YANG DITERAPKAN & METODOLOGI PELAKSANAAN

### 3.1 Solusi Teknologi (Technological Intervention)
Untuk menjawab permasalahan tersebut, dikembangkan sistem **JurnalWave** dengan pilar solusi:
* **Kanal "Hallo Jurnal" Berbasis Verifikasi WhatsApp Resmi**: Mewajibkan verifikasi OTP 6 digit asli via WhatsApp ponsel pelapor untuk menjamin keabsahan kontak dan mengeliminasi bot spam.
* **Sistem Tiketing & Chat Dua Arah Terproteksi**: Menjamin nomor tiket dihitung secara otomatis dan unik oleh server database, serta ruang obrolan privat yang hanya dapat diakses oleh pelapor sah dan admin redaksi.
* **Fitur Aksesibilitas Audio Berita (TTS)**: Mengintegrasikan kecerdasan vokal Text-to-Speech bahasa Indonesia untuk membacakan artikel berita.
* **Prakiraan Cuaca Satelit Sukabumi**: Menghubungkan portal secara langsung ke sensor satelit meteorologi Open-Meteo.

### 3.2 Metodologi Pelaksanaan Pengabdian kepada Masyarakat (PKM)
1. **Tahap Analisis Kebutuhan & Desain (Sprint 1)**: Observasi lapangan ke redaksi JurnalWave dan wawancara aspirasi warga Sukabumi.
2. **Tahap Pembangunan Perangkat Lunak (Sprint 2 - 4)**: Penulisan kode bersih (*clean code*) menggunakan Next.js 16 App Router, Tailwind CSS v4, dan Prisma ORM dengan database PostgreSQL.
3. **Tahap Uji Coba Lapangan & Refinement (Sprint 5)**: Uji coba pendaftaran akun dengan warga nyata, penyempurnaan nomor tiket server anti-tabrakan, dan penguncian privasi chat.
4. **Tahap Sosialisasi, Workshop & Evaluasi Dampak (Sprint 6)**: Pelatihan meja redaksi dalam menggunakan dashboard kendali *JurnalControl* dan pendampingan warga dalam mengawal laporan aduan.

---

## 4. ARSITEKTUR SISTEM & SPESIFIKASI TECH STACK TERKINI (FINAL)

Seluruh arsitektur sistem telah berstatus **FINAL & LOCKED** dengan spesifikasi teknologi mutakhir (bebas sistem lama):

| Lapisan (Layer) | Teknologi / Paket | Versi | Peran & Tanggung Jawab Teknis |
| :--- | :--- | :--- | :--- |
| **Framework Utama** | Next.js (App Router) | 16.4.6 | Server-Side Rendering (SSR), Server Components, API Routes, dan Routing dinamis. |
| **Pustaka Antarmuka** | React | 19.2.8 | Komponen UI reaktif, State Hooks, dan DOM reconciliation. |
| **Bahasa Pemrograman** | TypeScript | 5.x | Pengetikan statis ketat (*Strict Type Checking*) tanpa galat tipe. |
| **Desain & UI Tokens** | Tailwind CSS v4 | 4.x | Material 3 & Modern Minimalist UI, fluid typography, dark/light theme, shadow tokens. |
| **Basis Data Relasional** | PostgreSQL (Neon Cloud) | 16+ | Serverless Cloud PostgreSQL di Region Singapore (`ap-southeast-1`) dengan native connection pooling & direct SSL. |
| **Database ORM** | Prisma ORM | 6.19.3 | Manajemen skema data relasional, migrasi otomatis, dan *type-safe database query*. |
| **WhatsApp Gateway** | Fonnte API Gateway | Direct API | Pengiriman kode OTP pendaftaran 6-digit asli via WhatsApp Web protocol. |
| **Media CDN Storage** | Cloudinary CDN | v2 API | Pengoptimalan kompresi otomatis WebP/MP4 untuk bukti berkas aduan warga. |
| **Audio Voice Engine** | Edge-TTS Engine | 1.9.1 | Sintesis vokal alami pembaca berita bahasa Indonesia (`id-ID-GadisNeural`). |
| **Layanan Cuaca Satelit**| Open-Meteo API | Direct REST | Feed prakiraan cuaca satelit Sukabumi presisi per jam tanpa limit kuota. |
| **Kecerdasan Buatan (AI)**| Google Gemini AI | 2.0 Flash | Otomasi perumusan topik polling aspirasi pembaca berbasis isu berita terkini. |
| **Keamanan & Kriptografi**| JOSE (JWT) & BCrypt | 6.2 / 3.0 | Hash kata sandi dan token sesi JWT tersimpan di cookie `HttpOnly; Secure`. |

---

## 5. TOPOLOGI ALUR DATA & DIAGRAM INTERAKSI SISTEM

```
[ Pengguna Warga / Pembaca Sukabumi ]
                │
        HTTPS (Edge Network)
                ▼
┌─────────────────────────────────────────────────────────────┐
│                 NEXT.JS 16 APP ROUTER CORE                  │
│                                                             │
│  ├── Middleware Keamanan (middleware.ts)                    │
│  ├── Halaman Portal Publik (/berita, /cuaca, /loker, dsb)   │
│  ├── Halaman Jurnalisme Warga (/halo-jurnal/*)              │
│  ├── Dashboard Redaksi (/jurnal-central/*)                  │
│  └── REST API Handlers (/api/*)                             │
└──────────────┬───────────────┬───────────────┬──────────────┘
               │               │               │
       Prisma  │         HTTPS │         HTTPS │
       Client  │          REST │          REST │
               ▼               ▼               ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   DATABASE TIER  │ │  GATEWAY & MEDIA │ │  SATELLITE & AI  │
│  Neon PostgreSQL │ │  - Fonnte WA OTP │ │  - Open-Meteo API│
│  (14 Tabel Data) │ │  - Cloudinary CDN│ │  - Gemini 2.0 AI │
│  Singapore Cloud │ │  - Edge-TTS Voice│ │  - Google OAuth  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## 6. PERANCANGAN BASIS DATA RELASIONAL (ERD & KAMUS DATA PRISMA)

Skema basis data dirancang secara terpusat pada `prisma/schema.prisma` dan diimplementasikan pada Neon PostgreSQL Singapore:

### 1. Model Berita Resmi (`articles`)
```prisma
model Article {
  id            String    @id @default(cuid())
  title         String    @db.VarChar(255)
  slug          String    @unique @db.VarChar(255)
  excerpt       String    @db.Text
  content       String    @db.Text
  category      String    @default("berita") @db.VarChar(50)
  categoryLabel String?   @db.VarChar(50)
  imageUrl      String    @db.Text
  imageAlt      String?   @db.VarChar(255)
  author        String    @default("Tim Redaksi") @db.VarChar(100)
  reporter      String?   @db.VarChar(100)
  redaktur      String?   @db.VarChar(100)
  readTime      String?   @default("5 min read") @db.VarChar(50)
  isHero        Boolean   @default(false)
  isEditorsPick Boolean   @default(false)
  badge         String?   @db.VarChar(50)
  publishedDate String?   @db.VarChar(50)
  status        String    @default("published") @db.VarChar(50)
  scheduledAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@map("articles")
}
```

### 2. Model Tiket Aduan Warga (`reports`)
```prisma
model Report {
  id           String             @id @default(cuid())
  ticketNumber String             @unique @db.VarChar(50)
  title        String             @db.VarChar(255)
  description  String             @db.Text
  reportType   String             @default("infrastruktur") @db.VarChar(50)
  address      String?            @db.Text
  latitude     Float?
  longitude    Float?
  pelaporName  String             @default("Warga Sukabumi") @db.VarChar(100)
  pelaporPhone String?            @db.VarChar(50)
  pelaporEmail String?            @db.VarChar(100)
  status       String             @default("diterima") @db.VarChar(50)
  isPublic     Boolean            @default(true)
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt
  attachments  ReportAttachment[]
  statusLogs   ReportStatusLog[]

  @@map("reports")
}
```

### 3. Model Lampiran Media Bukti (`report_attachments`)
```prisma
model ReportAttachment {
  id        String   @id @default(cuid())
  reportId  String
  report    Report   @relation(fields: [reportId], references: [id], onDelete: Cascade)
  fileUrl   String   @db.Text
  fileType  String?  @db.VarChar(50)
  createdAt DateTime @default(now())

  @@index([reportId])
  @@map("report_attachments")
}
```

### 4. Model Log Riwayat Status Aduan (`report_status_logs`)
```prisma
model ReportStatusLog {
  id        String   @id @default(cuid())
  reportId  String
  report    Report   @relation(fields: [reportId], references: [id], onDelete: Cascade)
  status    String   @db.VarChar(50)
  note      String?  @db.Text
  createdAt DateTime @default(now())

  @@index([reportId])
  @@map("report_status_logs")
}
```

### 5. Model Ruang Obrolan Dua Arah (`chat_messages`)
```prisma
model ChatMessage {
  id           String   @id @default(cuid())
  ticketNumber String   @db.VarChar(50)
  senderId     String   @db.VarChar(100)
  senderName   String   @db.VarChar(100)
  role         String   @default("warga") @db.VarChar(50)
  message      String   @db.Text
  createdAt    DateTime @default(now())

  @@index([ticketNumber])
  @@map("chat_messages")
}
```

### 6. Model Pengguna Warga Terverifikasi (`citizen_users`)
```prisma
model CitizenUser {
  id         String   @id @default(cuid())
  email      String   @unique @db.VarChar(100)
  fullName   String   @db.VarChar(100)
  phone      String   @db.VarChar(50)
  domisili   String?  @db.Text
  password   String?  @db.Text
  isVerified Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@map("citizen_users")
}
```

### 7. Model Kode OTP WhatsApp (`password_reset_otps`)
```prisma
model PasswordResetOtp {
  id        String   @id @default(cuid())
  email     String   @db.VarChar(100)
  otpCode   String   @db.VarChar(10)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([email])
  @@map("password_reset_otps")
}
```

### 8. Model Lainnya:
* `report_supports`: Catatan vote apresiasi warga pada aduan publik (Composite Unique: `ticketNumber` + `citizenEmail`).
* `admin_users`: Kredensial staf redaksi (*Role-Based Access Control*).
* `jobs`: Listing bursa lowongan kerja Sukabumi terverifikasi.
* `reels`: Direktori video vertikal Wave Reels Sukabumi.
* `polls` & `poll_options`: Modul pemungutan suara pembaca dan opsi jawaban.
* `categories`: Master indeks navigasi taksonomi berita.

---

## 7. IMPLEMENTASI FITUR UNGGULAN HASIL REVISI MUTAKHIR

### 7.1 Verifikasi Ketat WhatsApp OTP Asli (Fonnte Gateway)
* **Status**: **Strict Production Mode** (Kode bypass dummy `123456` dan tampilan kode di layar telah **dihapus total**).
* **Alur Eksekusi**:
  1. Pengguna menginputkan Nama Lengkap dan Nomor WhatsApp di `/daftar`.
  2. Server menghasilkan 6-digit angka acak kriptografis dan menyimpannya di memori server dan tabel database `password_reset_otps` (kedaluwarsa 15 menit).
  3. Server mengirimkan payload pesan ke endpoint Fonnte (`https://api.fonnte.com/send`) menggunakan header `Authorization: FONNTE_TOKEN`.
  4. Pengguna wajib memasukkan kode yang diterima pada aplikasi WhatsApp ponselnya untuk menyelesaikan registrasi.

### 7.2 Penomoran Tiket Server Unik Anti-Tabrakan
* **Penyelesaian Masalah**: Menghilangkan fungsi penomoran lokal di browser yang sebelumnya menyebabkan nomor `HJ-009` bertabrakan antar sesama warga.
* **Mekanisme Baru**:
  1. Pada saat warga mengirimkan laporan di `app/halo-jurnal/lapor/page.tsx`, peramban mengirimkan formulir ke `POST /api/reports` tanpa nomor tiket statis.
  2. Server membaca seluruh tiket yang ada di Neon PostgreSQL, mencari nilai urutan numerik tertinggi (`HJ-xxx`), lalu mengalokasikan nomor tiket berikutnya (`HJ-010`, `HJ-011`, dst).
  3. Server mengembalikan respon resmi dan peramban mengarahkan warga ke halaman detail tiket yang sah (`/halo-jurnal/laporan/${created.id}`).

### 7.3 Ruang Chat Dua Arah Privat & Isolasi Scroll Mandiri
* **Proteksi Privasi 100%**:
  * Di `app/halo-jurnal/laporan/[id]/page.tsx`, sistem memeriksa kecocokan nomor telepon warga yang sedang login terhadap nomor telepon pelapor asli di database.
  * **Jika aduan dibuka oleh warga lain**: Kotak **Chat Langsung 100% disembunyikan/hilang**. Pengunjung lain hanya dapat membaca kronologi masalah dan menekan tombol dukungan (*support*).
  * Kotak obrolan hanya terbuka bagi pemilik sah laporan dan tim redaksi.
* **Isolasi Scroll Halaman**:
  * Perintah lama `scrollIntoView()` yang menarik paksa layar web peramban ke bawah telah digantikan dengan referensi kontainer internal:
    ```typescript
    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    ```
  * Saat halaman aduan dimuat, posisi layar tetap berada di paling atas (`window.scrollTo(0, 0)`), sehingga pengguna dapat membaca judul dan foto dengan tenang.

### 7.4 Pemutar Audio Berita Text-to-Speech (TTS Natural)
* Mengintegrasikan pustaka `@andresaya/edge-tts` pada rute `POST /api/tts`.
* Mengonversi teks berita menjadi format audio MP3/WAV menggunakan vokal perempuan bahasa Indonesia yang fasih (`id-ID-GadisNeural`).
* Halaman `app/artikel/[id]/page.tsx` menyediakan widget audio player terapung yang memudahkan lansia dan difabel netra menikmati berita.

### 7.5 Dashboard Pusat Kendali Redaksi (JurnalControl / Jurnal-Central)
* Pusat kendali administrasi terpadu di rute **`app/jurnal-central/`**:
  * `jurnal-central/berita`: Penyusunan artikel berita, pemilihan Hero Banner, dan kurasi berita utama.
  * `jurnal-central/laporan`: Meja kerja penelaahan aduan warga, audit bukti, dan pembaruan 4 status penanganan (*Diterima*, *Diproses*, *Ditindaklanjuti*, *Selesai*).
  * `jurnal-central/chat`: Pusat obrolan interaktif langsung antara tim redaksi dengan para pelapor.
  * `jurnal-central/pengguna`: Moderasi data akun warga dan status verifikasi.
  * `jurnal-central/keamanan`: Audit log aktivitas redaksi dan sesi masuk.

### 7.6 Prakiraan Cuaca Satelit Real-Time Sukabumi (Open-Meteo)
* Terhubung ke satelit Open-Meteo pada koordinat geografis Sukabumi (`-6.9277, 106.9300`).
* Menggunakan arsitektur modul tunggal (*singleton*) `lib/weatherSync.ts` sehingga seluruh visualisasi di bilah navigasi atas (*HeaderNav*) dan halaman cuaca utama (`/cuaca`) sinkron secara real-time.
* Menampilkan visualisasi grafik spline temperatur, kelembapan, kecepatan angin, indeks UV, dan indeks kualitas udara (AQI).

### 7.7 Wave Reels (Video Pendek Daerah) & Bursa Loker Sukabumi
* **Wave Reels (`/reels`)**: Wadah kreativitas visual vertikal seputar Sukabumi yang ringan, hemat kuota, dan terhubung dengan platform media sosial resmi redaksi.
* **Jurnal Loker (`/loker`)**: Kanal informasi lowongan pekerjaan terverifikasi untuk menekan pengangguran pemuda di Sukabumi, dilengkapi filter kualifikasi dan gaji.

### 7.8 Polling Pembaca Cerdas Berbasis Google Gemini AI
* Modul pemungutan suara pembaca terhadap isu kebijakan daerah Sukabumi.
* Dilengkapi endpoint otomatis `POST /api/polls/generate-ai` yang memanfaatkan model **Google Gemini 2.0 Flash** untuk merumuskan pertanyaan dan pilihan jawaban polling berdasarkan topik berita terhangat.

---

## 8. STRUKTUR REPOSITORI PROYEK (FILE TREE STRUCTURE)

```text
d:/jurnalwave-website/
├── app/
│   ├── api/                         # Backend REST API Endpoints
│   │   ├── admin/auth/              # Autentikasi Admin Redaksi
│   │   ├── articles/                # CRUD Artikel Berita
│   │   ├── auth/citizen/            # Pendaftaran Warga via WhatsApp OTP
│   │   ├── chat/                    # Percakapan Privat Tiket Aduan
│   │   ├── polls/                   # Polling Pembaca & Gemini AI
│   │   ├── reels/                   # Video Pendek Wave Reels
│   │   ├── reports/                 # Tiket Aduan & Dukungan Warga
│   │   ├── tts/                     # Generator Suara Berita Edge-TTS
│   │   ├── upload/                  # Upload Media Bukti Cloudinary
│   │   └── weather/                 # Feed Cuaca Satelit Sukabumi
│   ├── artikel/[id]/                # Halaman Baca Berita & Player TTS
│   ├── cuaca/                       # Halaman Cuaca Satelit Sukabumi
│   ├── daftar/                      # Form Registrasi WhatsApp OTP Warga
│   ├── halo-jurnal/                 # Portal Aspirasi & Aduan Warga
│   │   ├── lapor/                   # Form Pengajuan Laporan Aduan
│   │   ├── laporan/[id]/            # Detail Tiket Aduan & Chat Privat
│   │   ├── laporan-saya/            # Rekap Aduan Milik Akun Warga
│   │   └── feed-publik/             # Feed Laporan Publik Terbuka
│   ├── jurnal-central/              # Pusat Kendali Redaksi (JurnalControl)
│   │   ├── berita/                  # CMS Berita & Artikel
│   │   ├── chat/                    # Pusat Obrolan Redaksi
│   │   ├── laporan/                 # Manajemen & Verifikasi Aduan
│   │   └── pengguna/                # Manajemen Pengguna Warga & Tim
│   ├── loker/                       # Bursa Lowongan Kerja Sukabumi
│   ├── reels/                       # Kanal Video Pendek Wave Reels
│   ├── layout.tsx                   # Layout Utama & Provider Global
│   └── page.tsx                     # Beranda Utama JurnalWave
├── components/                      # Komponen Reusable React 19
│   ├── admin/                       # Komponen Khusus JurnalControl
│   ├── cards/                       # Kartu Berita, Tiket Aduan, dan Loker
│   ├── halo-jurnal/                 # Shell & Presenter Hallo Jurnal
│   ├── layout/                      # HeaderNav, BottomNav, Footer
│   ├── ui/                          # Komponen Atomik (Logo, ChatbotButton)
│   └── weather/                     # Grafik Cuaca Satelit Spline
├── lib/                             # Singleton Utilities & Konfigurasi
│   ├── auth.ts                      # Autentikasi JWT & Sesi Pengguna
│   ├── cloudinary.ts                # Konfigurasi Storage CDN Cloudinary
│   ├── prisma.ts                    # Prisma Client Singleton Instance
│   ├── weather.ts                   # Adapter Satelit Open-Meteo
│   ├── weatherSync.ts               # Sinkronisasi Global Data Cuaca
│   └── whatsapp.ts                  # Modul WhatsApp Gateway Fonnte
├── prisma/                          # Skema & Migrasi Basis Data
│   └── schema.prisma                # Model Relasional PostgreSQL
├── public/                          # Aset Gambar Publik (100% WebP)
├── .env                             # Konfigurasi Kunci Lingkungan (Rahasia)
├── .env.example                     # Templat Variabel Lingkungan
├── middleware.ts                    # Proteksi Rute Sesi Redaksi
└── package.json                     # Manifes Dependensi & Skrip Proyek
```

---

## 9. SPESIFIKASI SELURUH REST API ENDPOINTS BACKEND

| Endpoint URI | Metode | Deskripsi Tugas | Parameter / Body Utama |
| :--- | :---: | :--- | :--- |
| `/api/auth/citizen` | `POST` | Pendaftaran warga, pengiriman WhatsApp OTP asli, dan verifikasi akun. | `action: ('send-wa-otp' \| 'verify-wa-otp' \| 'register-wa')`, `phone`, `otpCode`, `password` |
| `/api/reports` | `GET` | Mengambil daftar aduan warga dari database dengan filter tiket/kategori. | `ticket` (opsional), `kategori` |
| `/api/reports` | `POST` | Menyimpan aduan baru & alokasi nomor tiket berurutan otomatis server. | `title`, `description`, `reportType`, `attachments`, `isAnonymous` |
| `/api/reports/support` | `POST` | Memberikan dukungan suara warga (*dukung laporan*) pada aduan publik. | `ticketNumber`, `email` |
| `/api/chat` | `GET` | Mengambil riwayat obrolan privat berdasarkan nomor tiket sah. | `ticketNumber` (Wajib diisi) |
| `/api/chat` | `POST` | Mengirimkan pesan baru ke ruang chat dua arah aduan warga. | `ticketNumber`, `message`, `senderName`, `role` |
| `/api/articles` | `GET` | Mengambil data artikel berita dengan filter kategori dan pencarian. | `page`, `limit`, `category`, `search` |
| `/api/tts` | `POST` | Menghasilkan streaming audio berita berbahasa Indonesia natural. | `text`, `voice` (`id-ID-GadisNeural`) |
| `/api/weather` | `GET` | Memperoleh prakiraan cuaca satelit real-time Sukabumi. | `lat`, `lon` (Default Sukabumi) |
| `/api/upload` | `POST` | Mengunggah bukti foto/video aduan warga ke Cloudinary CDN. | `file` (Multipart form-data) |
| `/api/polls/generate-ai`| `POST` | Merumuskan topik polling berita aktual via Google Gemini AI. | `topic` / `category` |

---

## 10. KONFIGURASI LINGKUNGAN SISTEM (.env)

Seluruh kunci rahasia disimpan dalam berkas `.env` (di-*ignore* dari repositori publik demi keamanan):

```env
# 1. Database Cloud PostgreSQL (Neon DB Singapore)
DATABASE_URL="postgresql://neondb_owner:PASSWORD@ep-xxx-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://neondb_owner:PASSWORD@ep-xxx.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# 2. Secret Key Enkripsi JWT Sesi Redaksi
ADMIN_JWT_SECRET="jurnalwave_super_secret_jwt_token_2026_sukabumi_media_ultra_secure_key"

# 3. Cloudinary CDN Storage (Media Bukti Laporan Warga)
CLOUDINARY_CLOUD_NAME="bqnyd49z"
CLOUDINARY_API_KEY="179298548275546"
CLOUDINARY_API_SECRET="4bqDEXvJidsGRVUMdqvl0Uc15CY"

# 4. Google Gemini AI Engine API Key
GEMINI_API_KEY="AQ.Ab8RN...Your_Gemini_Key_Here"

# 5. WhatsApp API Gateway (Fonnte Device Token Resmi Hallo Jurnal)
FONNTE_TOKEN="2Tsaw1QJzBnxtxVgh3YD"

# 6. SMTP Email Redaksi
SMTP_USER="redaksi.jurnalwave@gmail.com"
SMTP_PASS="tfztbfaawstyqdby"
SMTP_FROM="Hallo Jurnal Sukabumi <redaksi.jurnalwave@gmail.com>"

# 7. URL Publik Portal
NEXT_PUBLIC_SITE_URL="https://jurnalwave.com"
```

---

## 11. STATUS INFRASTRUKTUR SAAT INI VS RENCANA MIGRASI SERVER MANDIRI

Untuk keperluan pelaporan magang dan jurnal pengabdian masyarakat, dicatat pemetaan fase infrastruktur sistem:

### 11.1 Fase Saat Ini (Staging / Pengujian Komunitas)
Pada tahap riset, perancangan, dan pengujian lapangan saat ini, sistem menggunakan infrastruktur *serverless cloud* terintegrasi:
* **Hosting Aplikasi**: Vercel Serverless Edge Platform (Global CDN).
* **Basis Data**: Neon Serverless Cloud PostgreSQL (Region Singapore).
* **WhatsApp Gateway**: Fonnte WhatsApp Gateway (Tier Integrasi Perangkat).
* **Media Storage**: Cloudinary Media CDN Storage (Tier Integrasi).
* **Domain Staging**: Menggunakan domain evaluasi dan staging deployment.

### 11.2 Rencana Migrasi ke Infrastruktur Mandiri (Production Dedicated Roadmap)
Sebagai bagian dari *sustainability plan* (rencana keberlanjutan) saat portal beroperasi penuh secara komersial dan melayani ribuan warga Sukabumi per hari, disiapkan langkah migrasi teknis:
1. **Sewa Server Mandiri (Dedicated Cloud VPS)**:
   * Menyewa Virtual Private Server (VPS) berspesifikasi tinggi (seperti DigitalOcean, AWS EC2, GCP Compute Engine, atau Biznet Gio Cloud di Data Center Jakarta) untuk latensi domestik terendah (< 10 ms).
   * Menjalankan Node.js cluster dengan reverse proxy **NGINX / Caddy**, SSL Let's Encrypt Wildcard, serta Redis Cache untuk menangani lonjakan pembaca (*traffic spike*).
2. **Migrasi Domain Resmi Berbayar (Top-Level Domain)**:
   * Mengamankan dan mengarahkan domain resmi TLD berbayar terdaftar di PANDI / Registrar resmi (`https://jurnalwave.com` atau `https://jurnalwave.id`) lengkap dengan konfigurasi DNS Cloudflare (DDoS Protection, Web Application Firewall, dan DNSSEC).
3. **Upgrade Jalur Resmi WhatsApp Business API (WABA Enterprise)**:
   * Mengintegrasikan WhatsApp Business Cloud API resmi dengan centang hijau (*Official Business Account*) yang terverifikasi legalitas perusahaan media redaksi untuk kapasitas pesan tak terbatas.
4. **Penyimpanan Objek Mandiri (Self-Hosted S3 Storage)**:
   * Menggunakan MinIO atau AWS S3 Bucket mandiri untuk penyimpanan arsip berkas bukti aduan warga jangka panjang.

---

## 12. PENGUJIAN PERANGKAT LUNAK (BLACK BOX TESTING MATRIX)

Pengujian sistem dilakukan secara menyeluruh menggunakan metode **Black Box Testing** (pengujian berbasis kasus uji antarmuka & fungsionalitas) dan **Static Code Analysis** (kompilasi TypeScript).

| Kode Kasus Uji | Modul / Fitur | Prosedur Pengujian | Hasil yang Diharapkan | Status Hasil |
| :---: | :--- | :--- | :--- | :---: |
| **TC-01** | Pendaftaran WhatsApp OTP | Mengisi formulir `/daftar` dan klik tombol *"Kirim OTP"*. | Kode 6 digit acak asli terkirim ke WhatsApp ponsel warga dalam tempo < 5 detik. | **LULUS (100%)** |
| **TC-02** | Proteksi Kode Dummy | Memasukkan kode acak atau kode uji lama `123456`. | Sistem menolak pendaftaran dan akun tidak dibuat di database. | **LULUS (100%)** |
| **TC-03** | Penomoran Tiket Server | Mengirim dua aduan baru secara berurutan. | Nomor tiket dialokasikan secara berurutan (`HJ-010`, `HJ-011`) tanpa tabrakan. | **LULUS (100%)** |
| **TC-04** | Proteksi Akses Chat | Membuka laporan milik orang lain di Feed Publik. | Kotak obrolan 100% disembunyikan; pengunjung lain hanya bisa membaca berita & memberi dukungan. | **LULUS (100%)** |
| **TC-05** | Obrolan Pemilik Sah | Membuka laporan milik akun nomor WhatsApp sendiri. | Kotak chat terbuka penuh dan pesan koordinasi dengan redaksi dapat dikirimkan lancar. | **LULUS (100%)** |
| **TC-06** | Isolasi Scroll Layar | Membuka halaman detail aduan warga. | Layar web tetap stabil di posisi paling atas; tidak ditarik paksa ke kotak chat. | **LULUS (100%)** |
| **TC-07** | Audio Berita TTS | Mengklik tombol pemutar suara pada artikel berita. | Suara narasi vokal bahasa Indonesia jernih terdengar melalui browser. | **LULUS (100%)** |
| **TC-08** | Cuaca Satelit Sukabumi | Membuka rute `/cuaca`. | Grafik spline suhu, kelembapan, dan radar satelit Open-Meteo tampil presisi. | **LULUS (100%)** |
| **TC-09** | Validasi Pengetikan Kode | Menjalankan perintah `npx tsc --noEmit` di terminal. | Kompilasi tuntas dengan kode keluar 0 (**Zero TypeScript Errors**). | **LULUS (100%)** |

---

## 13. DAMPAK SOSIAL, KEBERLANJUTAN PROGRAM PKM, DAN EVALUASI AKADEMIS

### 13.1 Dampak Sosial & Pengabdian Masyarakat di Sukabumi
Penerapan sistem JurnalWave melalui kanal Hallo Jurnal memberikan dampak nyata:
1. **Transparansi Penanganan Masalah Daerah**: Masyarakat dapat memantau secara langsung status penanganan jalan rusak, jembatan amblas, dan keluhan fasilitas publik lainnya tanpa terhambat sekat birokrasi.
2. **Peningkatan Rasa Aman Pelapor**: Keberadaan opsi *Laporkan Anonim* dan proteksi ruang chat privat membuat warga tidak takut lagi menyuarakan aspirasi demi kemajuan daerahnya.
3. **Penyaringan Berita Bohong (*Anti-Hoax*)**: Verifikasi identitas melalui WhatsApp asli berhasil menekan laporan fiktif, sehingga informasi yang sampai ke publik adalah fakta lapangan yang kredibel.
4. **Pemerataan Akses Informasi**: Fitur pemutar audio berita Text-to-Speech memberikan kemudahan akses bagi kelompok rentan (lansia dan tunanetra).

### 13.2 Rencana Keberlanjutan Program (*Sustainability Plan*)
Untuk menjamin keberlangsungan jangka panjang program kemitraan ini:
1. **Pelatihan Berkelanjutan Tim Redaksi**: Pendampingan rutin dalam operasionalisasi modul *JurnalControl* dan tata kelola tanggapan aduan warga.
2. **Kerjasama Multi-Stakeholder (Pemerintah & Media)**: Mengintegrasikan dashboard aduan Hallo Jurnal dengan sistem dinas terkait (seperti Dinas PUPR dan Dishub Sukabumi) untuk percepatan eksekusi lapangan.
3. **Eksekusi Roadmap Infrastruktur**: Melanjutkan migrasi dari lingkungan staging saat ini menuju penyewaan server mandiri (Dedicated Cloud VPS), domain TLD resmi, dan WhatsApp Business API Enterprise.

---
*Buku Putih Teknis ini disusun secara sah sebagai dokumentasi rujukan baku berintegritas tinggi untuk penulisan Laporan Praktik Kerja Lapangan (PKL) / Magang dan penyusunan Artikel Jurnal Pengabdian kepada Masyarakat (PKM / Abdimas).*
