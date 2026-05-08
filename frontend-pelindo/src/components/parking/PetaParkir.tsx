/**
 * Komponen peta parkir menggunakan Konva.js.
 * Saya memilih Konva karena ia berbasis canvas sehingga
 * mampu render ratusan slot dengan performa tinggi,
 * plus mendukung interaksi klik yang smooth.
 *
 * Layout visual:
 *   - Zona A (baris atas kiri): Premium Dalam Ruangan
 *   - Zona B (baris atas kanan): Standar Terbuka
 *   - Zona C (baris bawah kiri): Reguler
 *   - Zona D (baris bawah kanan): Ukuran Besar
 */

import { useRef, useState, useEffect } from 'react';
import {
  Stage,
  Layer,
  Rect,
  Text,
  Group,
  Line,
  Circle,
} from 'react-konva';
import type { SlotParkir, StatusSlot } from '../../types';

// ─────────────────────────────────────────────
// Konfigurasi visual slot
// ─────────────────────────────────────────────
const LEBAR_SLOT = 60;
const TINGGI_SLOT = 90;
const JARAK_SLOT = 8;
const KOLOM_PER_ZONA = 5; // 10 slot per zona, 2 baris × 5 kolom

/** Mengembalikan warna sesuai status slot */
const warnaDariStatus = (
  status: StatusSlot
): { isi: string; border: string; teks: string; ikonWarna: string } => {
  switch (status) {
    case 'tersedia':
      return { isi: '#E8F5E9', border: '#2E7D32', teks: '#2E7D32', ikonWarna: '#2E7D32' };
    case 'terisi':
      return { isi: '#FFEBEE', border: '#C62828', teks: '#C62828', ikonWarna: '#C62828' };
    case 'overtime':
      return { isi: '#FFF8E1', border: '#F9A825', teks: '#F9A825', ikonWarna: '#F9A825' };
    case 'dipesan':
      return { isi: '#E3F2FD', border: '#1565C0', teks: '#1565C0', ikonWarna: '#1565C0' };
    default:
      return { isi: '#EBEEED', border: '#74777D', teks: '#74777D', ikonWarna: '#74777D' };
  }
};

/** Label singkat di dalam slot berdasarkan status */
const labelStatus = (status: StatusSlot): string => {
  switch (status) {
    case 'tersedia': return 'Bebas';
    case 'terisi': return 'Terisi';
    case 'overtime': return 'OT';
    case 'dipesan': return 'Dipesan';
    default: return '';
  }
};

// ─────────────────────────────────────────────
// Hitung posisi X/Y slot di canvas
// ─────────────────────────────────────────────
interface PosisiZona {
  offsetX: number;
  offsetY: number;
}

const OFFSET_ZONA: Record<string, PosisiZona> = {
  A: { offsetX: 20, offsetY: 20 },
  B: { offsetX: 420, offsetY: 20 },
  C: { offsetX: 20, offsetY: 260 },
  D: { offsetX: 420, offsetY: 260 },
};

const hitungPosisiSlot = (slot: SlotParkir): { x: number; y: number } => {
  const { offsetX, offsetY } = OFFSET_ZONA[slot.zona];
  const indeks = slot.nomor - 1; // 0-indexed
  const kolom = indeks % KOLOM_PER_ZONA;
  const baris = Math.floor(indeks / KOLOM_PER_ZONA);

  return {
    x: offsetX + kolom * (LEBAR_SLOT + JARAK_SLOT),
    y: offsetY + baris * (TINGGI_SLOT + JARAK_SLOT),
  };
};

// ─────────────────────────────────────────────
// Interface Props
// ─────────────────────────────────────────────
interface PetaParkirProps {
  /** Daftar semua slot dari context */
  slots: SlotParkir[];
  /** Callback saat user klik slot (untuk membuka form/popover) */
  onKlikSlot: (slot: SlotParkir) => void;
  /** ID slot yang sedang dipilih/hover (opsional untuk highlight) */
  slotTerpilih?: string | null;
}

// ─────────────────────────────────────────────
// Komponen utama
// ─────────────────────────────────────────────
const PetaParkir = ({ slots, onKlikSlot, slotTerpilih }: PetaParkirProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ukuranStage, setUkuranStage] = useState({ lebar: 800, tinggi: 480 });

  // Sesuaikan ukuran canvas dengan lebar container secara responsif
  useEffect(() => {
    const perbarui = () => {
      if (containerRef.current) {
        const lebarContainer = containerRef.current.offsetWidth;
        // Skala proporsional, minimum 400px
        setUkuranStage({
          lebar: Math.max(lebarContainer, 400),
          tinggi: Math.max(lebarContainer * 0.55, 340),
        });
      }
    };

    perbarui();
    window.addEventListener('resize', perbarui);
    return () => window.removeEventListener('resize', perbarui);
  }, []);

  // Faktor skala untuk menyesuaikan posisi dengan ukuran canvas saat ini
  const skalaX = ukuranStage.lebar / 820;
  const skalaY = ukuranStage.tinggi / 480;

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <Stage
        width={ukuranStage.lebar}
        height={ukuranStage.tinggi}
        aria-label="Peta parkir interaktif"
      >
        <Layer>
          {/* Latar belakang canvas */}
          <Rect
            x={0}
            y={0}
            width={ukuranStage.lebar}
            height={ukuranStage.tinggi}
            fill="#E8ECEB"
            cornerRadius={8}
          />

          {/* ── Jalur kendaraan horizontal ── */}
          <Rect
            x={0}
            y={215 * skalaY}
            width={ukuranStage.lebar}
            height={30 * skalaY}
            fill="#CFD8DC"
            opacity={0.6}
          />
          {/* Garis putus-putus tengah jalur */}
          <Line
            points={[0, 230 * skalaY, ukuranStage.lebar, 230 * skalaY]}
            stroke="#90A4AE"
            strokeWidth={1.5}
            dash={[10, 8]}
            opacity={0.8}
          />

          {/* ── Jalur kendaraan vertikal ── */}
          <Rect
            x={380 * skalaX}
            y={0}
            width={40 * skalaX}
            height={ukuranStage.tinggi}
            fill="#CFD8DC"
            opacity={0.6}
          />
          <Line
            points={[400 * skalaX, 0, 400 * skalaX, ukuranStage.tinggi]}
            stroke="#90A4AE"
            strokeWidth={1.5}
            dash={[10, 8]}
            opacity={0.8}
          />

          {/* ── Label nama zona ── */}
          {(['A', 'B', 'C', 'D'] as const).map((zona) => {
            const labels: Record<string, { x: number; y: number; label: string }> = {
              A: { x: OFFSET_ZONA.A.offsetX, y: OFFSET_ZONA.A.offsetY - 16, label: 'Zona A — Premium Dalam Ruangan' },
              B: { x: OFFSET_ZONA.B.offsetX, y: OFFSET_ZONA.B.offsetY - 16, label: 'Zona B — Standar Terbuka' },
              C: { x: OFFSET_ZONA.C.offsetX, y: OFFSET_ZONA.C.offsetY + 200, label: 'Zona C — Reguler' },
              D: { x: OFFSET_ZONA.D.offsetX, y: OFFSET_ZONA.D.offsetY + 200, label: 'Zona D — Ukuran Besar' },
            };
            const l = labels[zona];
            return (
              <Text
                key={`label-zona-${zona}`}
                x={l.x * skalaX}
                y={l.y * skalaY}
                text={l.label}
                fontSize={10 * Math.min(skalaX, skalaY)}
                fontFamily="Inter, sans-serif"
                fontStyle="600"
                fill="#44474C"
                opacity={0.8}
              />
            );
          })}

          {/* ── Render setiap slot ── */}
          {slots.map((slot) => {
            const pos = hitungPosisiSlot(slot);
            const x = pos.x * skalaX;
            const y = pos.y * skalaY;
            const lebar = LEBAR_SLOT * skalaX;
            const tinggi = TINGGI_SLOT * skalaY;
            const warna = warnaDariStatus(slot.status);
            const dipilih = slotTerpilih === slot.id;

            return (
              <Group
                key={slot.id}
                x={x}
                y={y}
                onClick={() => onKlikSlot(slot)}
                onTap={() => onKlikSlot(slot)}
                style={{ cursor: slot.status === 'tersedia' ? 'pointer' : 'default' }}
              >
                {/* Bayangan (highlight saat dipilih) */}
                {dipilih && (
                  <Rect
                    x={-3}
                    y={-3}
                    width={lebar + 6}
                    height={tinggi + 6}
                    fill="transparent"
                    stroke="#006397"
                    strokeWidth={2.5}
                    cornerRadius={8}
                    shadowBlur={10}
                    shadowColor="#006397"
                    shadowOpacity={0.4}
                  />
                )}

                {/* Kotak slot */}
                <Rect
                  width={lebar}
                  height={tinggi}
                  fill={warna.isi}
                  stroke={warna.border}
                  strokeWidth={dipilih ? 2 : 1.2}
                  cornerRadius={6}
                  shadowBlur={dipilih ? 8 : 2}
                  shadowColor="rgba(26,43,60,0.15)"
                  shadowOffsetY={1}
                />

                {/* Indikator status — lingkaran kecil di pojok kiri atas */}
                <Circle
                  x={8 * skalaX}
                  y={8 * skalaY}
                  radius={4 * Math.min(skalaX, skalaY)}
                  fill={warna.border}
                />

                {/* Ikon kendaraan (simulasi dengan tanda) */}
                {slot.status !== 'tersedia' && (
                  <Text
                    x={lebar * 0.15}
                    y={tinggi * 0.2}
                    text={slot.status === 'dipesan' ? '⏳' : '🚗'}
                    fontSize={18 * Math.min(skalaX, skalaY)}
                    align="center"
                    width={lebar * 0.7}
                  />
                )}

                {/* Label status */}
                <Text
                  x={0}
                  y={slot.status !== 'tersedia' ? tinggi * 0.56 : tinggi * 0.35}
                  text={labelStatus(slot.status)}
                  fontSize={9 * Math.min(skalaX, skalaY)}
                  fontFamily="Inter, sans-serif"
                  fontStyle="600"
                  fill={warna.teks}
                  width={lebar}
                  align="center"
                />

                {/* ID slot di sudut kanan bawah */}
                <Text
                  x={2}
                  y={tinggi - 14 * skalaY}
                  text={slot.id}
                  fontSize={8 * Math.min(skalaX, skalaY)}
                  fontFamily="Inter, monospace"
                  fill="#44474C"
                  width={lebar - 4}
                  align="right"
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
};

export default PetaParkir;
