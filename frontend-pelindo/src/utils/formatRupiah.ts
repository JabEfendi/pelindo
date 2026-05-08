/**
 * Utility functions untuk formatting data di seluruh aplikasi.
 * Saya pisahkan logika formatting agar mudah diubah dan
 * tidak tersebar di setiap komponen.
 */

/**
 * Mengubah angka menjadi format mata uang Rupiah.
 * Contoh: 25000 → "Rp 25.000"
 */
export const formatRupiah = (angka: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(angka);
};

/**
 * Mengubah jumlah detik menjadi string jam:menit:detik.
 * Digunakan untuk menampilkan timer countdown/countup.
 * Contoh: 3665 → "01:01:05"
 */
export const formatWaktu = (totalDetik: number): string => {
  const absDetik = Math.abs(totalDetik);
  const jam = Math.floor(absDetik / 3600);
  const menit = Math.floor((absDetik % 3600) / 60);
  const detik = absDetik % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(jam)}:${pad(menit)}:${pad(detik)}`;
};

/**
 * Mengubah tanggal ISO string ke format tanggal Indonesia.
 * Contoh: "2024-10-24T09:00:00.000Z" → "24 Okt 2024, 09:00"
 */
export const formatTanggalIndo = (isoString: string): string => {
  const tanggal = new Date(isoString);
  return tanggal.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Menghasilkan ID unik untuk pemesanan baru.
 * Kombinasi timestamp + random string untuk menghindari tabrakan.
 */
export const generateId = (): string => {
  return `PKR-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
};
