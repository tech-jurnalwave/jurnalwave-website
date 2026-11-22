export interface DummyReport {
  id: string
  nomor_tiket: string
  ticketNumber?: string
  ticket_number?: string
  judul: string
  title?: string
  deskripsi: string
  description?: string
  jenis: 'pengaduan' | 'aspirasi' | 'informasi' | 'inspirasi'
  kategori: string
  lokasi: string
  latitude: number
  longitude: number
  status: 'diterima' | 'diproses' | 'ditindaklanjuti' | 'selesai' | 'ditolak'
  is_public: boolean
  dukungan_count: number
  komentar_count: number
  nama_pelapor?: string
  pelaporName?: string
  telepon?: string
  pelaporPhone?: string
  email?: string
  pelaporEmail?: string
  created_at: string
  laporan_lampiran: {
    id: string
    file_url: string
    file_type?: string
  }[]
  status_log?: {
    id: string
    status: string
    catatan: string
    created_at: string
  }[]
}

/**
 * Data Laporan Warga Hallo Jurnal (Produksi).
 * Dimulai bersih (kosong) agar seluruh laporan murni berasal dari aduan warga yang masuk.
 */
export const DUMMY_REPORTS: DummyReport[] = []
