/**
 * Kartu statistik untuk menampilkan metrik ringkasan di dashboard.
 * Desain mengikuti referensi stitch: kartu putih dengan aksen warna di sisi kiri.
 */

interface KartuStatistikProps {
  /** Judul statistik */
  judul: string;
  /** Nilai statistik */
  nilai: number | string;
  /** Nama ikon Material Symbols */
  ikon: string;
  /** Warna aksen (untuk border kiri dan teks nilai) */
  warna?: 'biru' | 'hijau' | 'merah' | 'oranye' | 'default';
}

const WARNA_MAP = {
  biru: { border: '#006397', nilai: '#006397', bg: '#E3F2FD' },
  hijau: { border: '#2E7D32', nilai: '#2E7D32', bg: '#E8F5E9' },
  merah: { border: '#C62828', nilai: '#C62828', bg: '#FFEBEE' },
  oranye: { border: '#F9A825', nilai: '#F9A825', bg: '#FFF8E1' },
  default: { border: '#74777D', nilai: '#041627', bg: '#EBEEED' },
};

const KartuStatistik = ({
  judul,
  nilai,
  ikon,
  warna = 'default',
}: KartuStatistikProps) => {
  const w = WARNA_MAP[warna];

  return (
    <div
      className="kartu-statistik"
      style={{ borderLeftColor: w.border }}
      role="region"
      aria-label={`${judul}: ${nilai}`}
    >
      {/* Baris judul dan ikon */}
      <div className="kartu-statistik__header">
        <span className="kartu-statistik__judul">{judul}</span>
        <div
          className="kartu-statistik__ikon-wrapper"
          style={{ backgroundColor: w.bg, color: w.border }}
          aria-hidden="true"
        >
          <span className="material-symbols-outlined">{ikon}</span>
        </div>
      </div>

      {/* Nilai besar */}
      <div
        className="kartu-statistik__nilai"
        style={{ color: w.nilai }}
        aria-hidden="true"
      >
        {nilai}
      </div>
    </div>
  );
};

export default KartuStatistik;
