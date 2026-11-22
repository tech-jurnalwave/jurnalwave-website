# JurnalWave 🌊

**JurnalWave** adalah portal media digital modern, interaktif, dan informatif yang berfokus pada berita terkini, gaya hidup (*lifestyle*), lowongan kerja (*loker*), prakiraan cuaca satelit real-time, jurnalisme warga (**Hallo Jurnal**), serta video pendek (**Wave Reels**) untuk wilayah Sukabumi dan sekitarnya.

---

## 🚀 Tech Stack

* **Framework**: [Next.js 16 (App Router)](https://nextjs.org) dengan React 19 & TypeScript 5
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com) (Material 3 & Modern Minimalist design system)
* **Database & ORM**: SQLite / Turso LibSQL dengan [Prisma ORM 6](https://www.prisma.io)
* **Icons**: [Lucide React](https://lucide.dev)
* **Weather Service**: Real-time satellite forecast via [Open-Meteo API](https://open-meteo.com) (Zero API key dependency)
* **Audio / TTS**: Edge TTS engine untuk fitur audio pendengar berita (*listen to article*)
* **Email & Keamanan**: Nodemailer (Gmail SMTP OTP), Jose JWT, BCrypt, HTTP-only secure cookies

---

## 📁 Peta Struktur Folder Utama

```text
jurnalwave-website/
├── app/                          # Next.js App Router (Routes & API Endpoints)
│   ├── api/                      # REST API Endpoints (Admin, TTS, Weather, Jobs, AI Chat)
│   ├── artikel/[id]/             # Halaman baca berita lengkap, audio TTS, & share
│   ├── berita/                   # Kanal berita umum & agregator
│   ├── cuaca/                    # Halaman cuaca satelit Sukabumi & radar interaktif
│   ├── halo-jurnal/              # Portal aspirasi & pengaduan jurnalisme warga
│   │   ├── admin/                # Pusat kendali redaksi (JurnalControl Dashboard)
│   │   ├── lapor/                # Form pengaduan/aspirasi warga resmi
│   │   ├── laporan/[id]/         # Detail laporan publik & ruang koordinasi warga-redaksi
│   │   └── profil/               # Dashboard status & riwayat laporan warga
│   ├── loker/                    # Portal bursa lowongan kerja Sukabumi
│   ├── reels/                    # Kanal video pendek kreatif (Wave Reels)
│   ├── layout.tsx                # Root layout, meta tags, & global provider
│   └── page.tsx                  # Beranda utama JurnalWave
├── components/                   # Komponen React Modular
│   ├── admin/                    # Komponen UI dashboard admin & koordinasi tiket
│   ├── cards/                    # Card artikel, loker, reels, dan banner
│   ├── layout/                   # HeaderNav, BottomNav (mobile), dan Footer
│   ├── ui/                       # Komponen UI umum (Logo, ChatbotButton, Modal)
│   ├── weather/                  # Visualizer grafik spline & cuaca (CuacaView)
│   └── widgets/                  # WeatherWidget header, PollingWidget
├── lib/                          # Modul utilitas & konfigurasi backend
│   ├── auth.ts                   # Helper autentikasi warga & redaksi
│   ├── mail.ts                   # Modul pengiriman OTP reset sandi & pendaftaran
│   ├── weather.ts                # Open-Meteo adapter untuk Sukabumi
│   ├── weatherSync.ts            # Single source of truth cuaca real-time global
│   └── prisma.ts                 # Prisma Client singleton instance
├── prisma/                       # Skema database & migrasi
│   ├── schema.prisma             # Model DB (Article, Report, Reel, Job, Poll)
│   └── dev.db                    # Database SQLite lokal
├── public/                       # Aset publik statis (100% WebP & teroptimasi)
│   ├── chatbot-full-logo.webp    # Avatar asisten AI JurnalWave
│   ├── hallo-jurnal-presenter.webp # Maskot resmi presenter Hallo Jurnal
│   ├── halo-jurnal-icon.webp     # Ikon kanal Hallo Jurnal
│   ├── hero-banner.webp          # Banner utama beranda
│   ├── logo-jurnal-wave.webp     # Logo resmi JurnalWave
│   ├── weather-bg.webp           # Latar panorama kartu cuaca
│   └── uploads/                  # Direktori penyimpanan bukti foto/laporan warga
└── types/                        # Definisi tipe TypeScript global
```

---

## 🛠️ Cara Menjalankan Project (Lokal)

### 1. Prasyarat
* [Node.js](https://nodejs.org) versi 20 ke atas.
* `npm` (atau `pnpm` / `bun`).

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Generate Database Client
```bash
npx prisma generate
```

### 4. Menjalankan Server Development
```bash
npm run dev
```
Buka peramban Anda di [http://localhost:3000](http://localhost:3000).

### 5. Build untuk Produksi
```bash
npm run build
npm run start
```

---

## 🔒 Status & Kebijakan Codebase

> **Status Saat Ini: FINAL & PRODUCTION READY**  
> Seluruh tata letak visual, desain antarmuka (UI/UX), animasi, logika fitur, dan identitas brand **JurnalWave** telah terkunci. Modifikasi hanya dilakukan untuk pemeliharaan rutin, perbaikan bug minor, atau optimasi performa tanpa mengubah visual yang sudah disepakati.
