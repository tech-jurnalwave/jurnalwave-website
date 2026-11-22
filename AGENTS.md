<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# JurnalWave — User Working Guidelines & Permanent Rules

Project ini telah berstatus **FINAL & LOCKED**. Setiap agen AI yang berinteraksi dengan workspace ini **WAJIB MEMATUHI** seluruh aturan permanen di bawah ini tanpa kecuali:

---

### 1. Identitas & Branding Resmi
* Website dan portal media ini bernama resmi **JurnalWave** (nama kanal: *JurnalWave*, *Hallo Jurnal*, dan *Wave Reels*).
* **DILARANG KERAS** menggunakan, memunculkan kembali, atau menyisipkan nama brand lama (*"Jurnal Vibes"* / *"jurnal-vibes"* / *"vibes"*) dalam teks, meta tag, atribut gambar, maupun komentar kode.

---

### 2. UI & Feature Lock (Terkunci Permanen)
* Seluruh tampilan visual, tata letak antarmuka (UI/UX), palet warna, tipografi, animasi interaksi, dan fungsionalitas inti saat ini sudah **FINAL**.
* **DILARANG MENGUBAH** desain visual, tata letak komponen, styling Tailwind, atau memodifikasi alur logika fitur yang sudah ada sedikit pun kecuali jika user memberikan instruksi spesifik dan eksplisit.

---

### 3. Protokol Eksekusi & Konsultasi
1. **Konfirmasi Sebelum Eksekusi**: Jangan melakukan modifikasi kode atau tindakan berdampak sebelum ada persetujuan atau instruksi eksplisit dari user.
2. **Konsultatif & Proaktif**: Jika ada hal yang rancu atau terdapat alternatif solusi teknis/arsitektur yang lebih baik, jelaskan dan diskusikan terlebih dahulu sebelum mengeksekusi.
3. **Tanpa Automasi Liar**: Dilarang membuka browser secara otomatis atau menjalankan browser subagent kecuali diminta secara spesifik oleh user.
4. **Laporan Ringkas**: Setelah eksekusi selesai, sampaikan laporan perubahan secara ringkas, to-the-point, dan padat.

---

### 4. Standar Kode & Performa Tinggi
* **Bebas Bloatware & Dead Code**: Pertahankan codebase tetap bersih dan ramping. Jangan menambahkan dependensi package baru tanpa izin eksplisit. Hapus import atau variabel yang tidak digunakan.
* **DRY (Don't Repeat Yourself)**: Manfaatkan fungsi utilitas terpusat di folder `lib/` (seperti `getStoredCitizenUser` di `lib/auth.ts` dan `syncWeatherToGlobal` di `lib/weatherSync.ts`).
* **Optimasi Aset**: Aset gambar statis wajib menggunakan format terkompresi modern (**WebP**) dengan penamaan bersih dan ukuran efisien.

---

### 5. Konvensi Penamaan (Naming Conventions)
* Penamaan file dan aset wajib menggunakan gaya **kebab-case** dengan tanda hubung `-` (contoh: `logo-jurnal-wave.webp`, `weather-bg.webp`). Dilarang menggunakan *snake_case* (`_`) untuk file aset publik.
* Jika menyertakan nama brand pada file, folder, atau variabel, selalu gunakan **`jurnalwave`** atau **`jurnal-wave`**.

---

### 6. Peta Arsitektur & File Penting

| Direktori / File | Fungsi & Tanggung Jawab |
| :--- | :--- |
| `app/` | Rute halaman App Router, layout global, dan API endpoints (`api/`). |
| `app/cuaca/` & `components/weather/` | Layanan prakiraan cuaca satelit real-time Sukabumi (Open-Meteo). |
| `app/halo-jurnal/` | Portal aspirasi warga Sukabumi, formulir pengaduan, dan live chat laporan. |
| `app/halo-jurnal/admin/` | Pusat kendali redaksi (*JurnalControl*), manajemen berita, loker, dan keamanan. |
| `app/artikel/[id]/` | Tampilan baca artikel berita lengkap terintegrasi pemutar audio TTS. |
| `components/layout/` | Header navigasi (`HeaderNav`), Bottom Nav mobile, dan Footer portal. |
| `components/ui/` | Komponen UI atomik (`Logo.tsx`, `ChatbotButton.tsx`). |
| `lib/` | Modul backend singleton: `auth.ts`, `weatherSync.ts`, `weather.ts`, `mail.ts`, `prisma.ts`. |
| `prisma/schema.prisma` | Skema database relasional (Articles, Reports, Reels, Jobs, Categories, Citizen Users). |
| `public/` | Aset statis teroptimasi WebP (`logo-jurnal-wave.webp`, `hero-banner.webp`, dll). |
