// Formatter dibuat sekali (membuat Intl.* berulang kali itu mahal)
const fRupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const fAngka = new Intl.NumberFormat("id-ID");
const TZ = "Asia/Jakarta";
const fJam = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const fHari = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
const fKunci = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }); // YYYY-MM-DD

export const rupiah = (n: number | null | undefined) => (n == null ? "-" : fRupiah.format(n));
export const angka = (n: number) => fAngka.format(n);
export const jam = (iso: string) => fJam.format(new Date(iso)).replace(".", ":");

/** Kunci tanggal (zona WIB) untuk mengelompokkan per hari */
export const kunciHari = (iso: string) => fKunci.format(new Date(iso));

export function labelHari(iso: string) {
  const kunci = kunciHari(iso);
  const sekarang = Date.now();
  if (kunci === fKunci.format(sekarang)) return "Hari ini";
  if (kunci === fKunci.format(sekarang - 86_400_000)) return "Kemarin";
  return fHari.format(new Date(iso));
}
