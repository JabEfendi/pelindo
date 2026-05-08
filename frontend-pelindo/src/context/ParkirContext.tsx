/**
 * Context global untuk manajemen state parkiran.
 * Saya memilih React Context + localStorage agar data persisten
 * tanpa perlu backend — sesuai requirement teknis.
 *
 * Seluruh komponen mengakses state parkir melalui hook useParkirContext.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import type {
  SlotParkir,
  Pemesanan,
  ZonaParkir,
  TipeKendaraan,
} from '../types';
import { generateId } from '../utils/formatRupiah';

// ─────────────────────────────────────────────
// Konstanta kunci localStorage
// ─────────────────────────────────────────────
const KUNCI_SLOT = 'parkirSlots';
const KUNCI_PEMESANAN = 'parkirPemesanan';

// ─────────────────────────────────────────────
// Tarif parkir per jam dalam Rupiah
// ─────────────────────────────────────────────
export const TARIF: Record<TipeKendaraan, number> = {
  Mobil: 5000,
  SUV: 7000,
  Motor: 3000,
};

// ─────────────────────────────────────────────
// Data awal 40 slot parkir
// ─────────────────────────────────────────────
const buatSlotAwal = (): SlotParkir[] => {
  const zona: ZonaParkir[] = ['A', 'B', 'C', 'D'];
  const slots: SlotParkir[] = [];

  zona.forEach((z) => {
    for (let i = 1; i <= 10; i++) {
      const nomor = i;
      const id = `${z}${String(nomor).padStart(2, '0')}`;

      // Saya sengaja isi beberapa slot supaya tampilan lebih realistis
      let status: SlotParkir['status'] = 'tersedia';
      if (['A01', 'A03', 'A04', 'A07', 'B02', 'B05', 'B08', 'C01', 'C06', 'C09', 'D03', 'D07'].includes(id)) {
        status = 'terisi';
      }
      if (['A09', 'B10', 'D10'].includes(id)) {
        status = 'overtime';
      }
      if (['D01', 'D02'].includes(id)) {
        status = 'dipesan';
      }

      slots.push({ id, zona: z, nomor, status });
    }
  });

  return slots;
};

// ─────────────────────────────────────────────
// Interface Context
// ─────────────────────────────────────────────
interface ParkirContextType {
  slots: SlotParkir[];
  pemesananList: Pemesanan[];
  buatPemesanan: (data: {
    slotId: string;
    namaPemesan: string;
    nomorPlat: string;
    tipeKendaraan: TipeKendaraan;
    durasiJam: number;
  }) => Pemesanan;
  akhiriSesi: (pemesananId: string) => void;
  batalkanPemesanan: (pemesananId: string) => void;
  getPemesananById: (id: string) => Pemesanan | undefined;
  getSlotById: (id: string) => SlotParkir | undefined;
}

// ─────────────────────────────────────────────
// Membuat Context
// ─────────────────────────────────────────────
const ParkirContext = createContext<ParkirContextType | null>(null);

// ─────────────────────────────────────────────
// Provider Component
// ─────────────────────────────────────────────
export const ParkirProvider = ({ children }: { children: ReactNode }) => {
  // Memuat data dari localStorage, atau pakai data awal jika belum ada
  const [slots, setSlots] = useState<SlotParkir[]>(() => {
    const tersimpan = localStorage.getItem(KUNCI_SLOT);
    return tersimpan ? JSON.parse(tersimpan) : buatSlotAwal();
  });

  const [pemesananList, setPemesananList] = useState<Pemesanan[]>(() => {
    const tersimpan = localStorage.getItem(KUNCI_PEMESANAN);
    return tersimpan ? JSON.parse(tersimpan) : [];
  });

  // Sinkronkan perubahan slots ke localStorage setiap kali ada update
  useEffect(() => {
    localStorage.setItem(KUNCI_SLOT, JSON.stringify(slots));
  }, [slots]);

  // Sinkronkan perubahan pemesanan ke localStorage
  useEffect(() => {
    localStorage.setItem(KUNCI_PEMESANAN, JSON.stringify(pemesananList));
  }, [pemesananList]);

  /**
   * Membuat pemesanan baru dan mengubah status slot menjadi 'terisi'.
   * Mengembalikan objek pemesanan yang baru dibuat.
   */
  const buatPemesanan = useCallback(
    (data: {
      slotId: string;
      namaPemesan: string;
      nomorPlat: string;
      tipeKendaraan: TipeKendaraan;
      durasiJam: number;
    }): Pemesanan => {
      const tarifPerJam = TARIF[data.tipeKendaraan];
      const waktuMulai = new Date().toISOString();
      const waktuSelesai = new Date(
        Date.now() + data.durasiJam * 60 * 60 * 1000
      ).toISOString();

      const pemesananBaru: Pemesanan = {
        id: generateId(),
        slotId: data.slotId,
        namaPemesan: data.namaPemesan,
        nomorPlat: data.nomorPlat.toUpperCase(),
        tipeKendaraan: data.tipeKendaraan,
        durasiJam: data.durasiJam,
        waktuMulai,
        waktuSelesai,
        tarifPerJam,
        totalBiaya: tarifPerJam * data.durasiJam,
        status: 'aktif',
      };

      // Perbarui daftar pemesanan
      setPemesananList((prev) => [pemesananBaru, ...prev]);

      // Ubah status slot menjadi 'terisi' dan catat ID pemesanan
      setSlots((prev) =>
        prev.map((slot) =>
          slot.id === data.slotId
            ? { ...slot, status: 'terisi', pemesananId: pemesananBaru.id }
            : slot
        )
      );

      return pemesananBaru;
    },
    []
  );

  /**
   * Mengakhiri sesi parkir aktif.
   * Slot dikembalikan ke status 'tersedia'.
   */
  const akhiriSesi = useCallback((pemesananId: string) => {
    setPemesananList((prev) =>
      prev.map((p) =>
        p.id === pemesananId ? { ...p, status: 'selesai' } : p
      )
    );

    setSlots((prev) =>
      prev.map((slot) =>
        slot.pemesananId === pemesananId
          ? { ...slot, status: 'tersedia', pemesananId: undefined }
          : slot
      )
    );
  }, []);

  /**
   * Membatalkan pemesanan dan mengembalikan slot ke 'tersedia'.
   */
  const batalkanPemesanan = useCallback((pemesananId: string) => {
    setPemesananList((prev) =>
      prev.map((p) =>
        p.id === pemesananId ? { ...p, status: 'dibatalkan' } : p
      )
    );

    setSlots((prev) =>
      prev.map((slot) =>
        slot.pemesananId === pemesananId
          ? { ...slot, status: 'tersedia', pemesananId: undefined }
          : slot
      )
    );
  }, []);

  const getPemesananById = useCallback(
    (id: string) => pemesananList.find((p) => p.id === id),
    [pemesananList]
  );

  const getSlotById = useCallback(
    (id: string) => slots.find((s) => s.id === id),
    [slots]
  );

  return (
    <ParkirContext.Provider
      value={{
        slots,
        pemesananList,
        buatPemesanan,
        akhiriSesi,
        batalkanPemesanan,
        getPemesananById,
        getSlotById,
      }}
    >
      {children}
    </ParkirContext.Provider>
  );
};

/**
 * Hook custom untuk mengakses context parkiran.
 * Akan melempar error jika digunakan di luar ParkirProvider.
 */
export const useParkirContext = (): ParkirContextType => {
  const ctx = useContext(ParkirContext);
  if (!ctx) {
    throw new Error('useParkirContext harus digunakan di dalam ParkirProvider');
  }
  return ctx;
};
