/**
 * Definisi tipe data yang saya gunakan di seluruh aplikasi.
 * Memusatkan semua interface di sini agar mudah di-maintain
 * dan konsisten antar komponen.
 */

/** Status setiap slot parkir */
export type StatusSlot = 'tersedia' | 'terisi' | 'overtime' | 'dipesan';

/** Tipe kendaraan yang didukung sistem */
export type TipeKendaraan = 'Mobil' | 'SUV' | 'Motor';

/** Zona parkir yang tersedia di gedung */
export type ZonaParkir = 'A' | 'B' | 'C' | 'D';

/** Representasi satu slot parkir di peta */
export interface SlotParkir {
  id: string;            // Contoh: "A01", "B05"
  zona: ZonaParkir;
  nomor: number;
  status: StatusSlot;
  pemesananId?: string;  // Referensi ke pemesanan aktif (jika terisi)
}

/** Data pemesanan yang disimpan di localStorage */
export interface Pemesanan {
  id: string;
  slotId: string;
  namaPemesan: string;
  nomorPlat: string;
  tipeKendaraan: TipeKendaraan;
  durasiJam: number;
  waktuMulai: string;   // ISO string
  waktuSelesai: string; // ISO string (waktuMulai + durasi)
  tarifPerJam: number;  // dalam Rupiah
  totalBiaya: number;   // dalam Rupiah
  status: 'aktif' | 'selesai' | 'dibatalkan';
}

/** Statistik ringkasan untuk widget di dashboard */
export interface StatistikParkir {
  totalSlot: number;
  slotTersedia: number;
  slotTerisi: number;
  slotOvertime: number;
}

/** Filter yang digunakan di halaman riwayat */
export interface FilterRiwayat {
  kata: string;          // Kata kunci pencarian (nama, plat, slot)
  zona: string;          // Filter berdasarkan zona ('' = semua)
  tipeKendaraan: string; // Filter berdasarkan tipe kendaraan ('' = semua)
  rentangWaktu: string;  // '7hari' | '30hari' | 'bulanIni'
}
