// Mode demo: pengganti Supabase di memori (data hilang saat server restart).
// Aktif jika DEMO_MODE=true. Hanya mendukung query yang dipakai aplikasi ini.
/* eslint-disable @typescript-eslint/no-explicit-any */

type Row = Record<string, any>;
type Store = Record<"branches" | "products" | "stock_levels" | "stock_movements" | "supplier_payments", Row[]>;
type Tabel = keyof Store | "utang_pembelian";

const mnt = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

function seed(): Store {
  const branches = ["Cabang Pusat", "Cabang Pasar Baru", "Cabang Terminal"].map((nama, i) => ({
    id: `b${i + 1}`, nama, alamat: ["Jl. Merdeka No. 10", "Jl. Pasar Baru No. 5", null][i], telepon: i === 0 ? "0812-3456-7890" : null,
    is_archived: false, created_at: mnt(10000 - i),
  }));
  const p = (id: string, nama: string, kategori: string, satuan: string, beli: number, jual: number, min: number, sumber: string) =>
    ({ id, nama, kategori, sumber, satuan, harga_beli: beli, harga_jual: jual, stok_minimum: min, catatan: null, is_archived: false, created_at: mnt(9000) });
  const products = [
    p("p1", "Kaos Polos Hitam - M", "Kaos", "pcs", 35000, 59000, 10, "Grosir Tanah Abang"),
    p("p2", "Kaos Polos Putih - L", "Kaos", "pcs", 35000, 59000, 10, "Grosir Tanah Abang"),
    p("p3", "Kemeja Flanel Kotak - L", "Kemeja", "pcs", 85000, 135000, 6, "Konveksi Bandung Jaya"),
    p("p4", "Celana Jeans Slim - 32", "Celana", "pcs", 120000, 189000, 6, "Konveksi Bandung Jaya"),
    p("p5", "Celana Chino Krem - 30", "Celana", "pcs", 95000, 149000, 5, "Pasar Cipadu"),
    p("p6", "Jaket Hoodie Abu - XL", "Jaket", "pcs", 110000, 175000, 5, "Konveksi Bandung Jaya"),
    p("p7", "Kerudung Segi Empat Hitam", "Hijab", "pcs", 18000, 35000, 15, "Pasar Cipadu"),
    p("p8", "Kaos Kaki Sport (3 pasang)", "Aksesoris", "set", 15000, 25000, 20, "Grosir Tanah Abang"),
  ];
  const jumlah: Record<string, number[]> = {
    p1: [24, 8, 15], p2: [18, 12, 9], p3: [10, 5, 7], p4: [14, 3, 8],
    p5: [9, 4, 6], p6: [7, 0, 5], p7: [40, 22, 11], p8: [30, 16, 25],
  };
  const stock_levels = products.flatMap((pr) =>
    branches.map((b, i) => ({ product_id: pr.id, branch_id: b.id, owner_id: "demo", jumlah: jumlah[pr.id][i] })));
  const mv = (n: number, product_id: string, branch_id: string, tipe: string, delta: number, sesudah: number, catatan: string | null, m: number) =>
    ({ id: `m${n}`, product_id, branch_id, tipe, jumlah: Math.abs(delta), stok_sebelum: sesudah - delta, stok_sesudah: sesudah, catatan, created_at: mnt(m) });
  const stock_movements = [
    mv(1, "p1", "b1", "masuk", 20, 24, "Restock dari supplier", 30),
    mv(2, "p6", "b2", "keluar", -3, 0, "Terjual habis", 95),
    mv(3, "p2", "b3", "keluar", -5, 9, "Terjual", 240),
    mv(4, "p5", "b3", "penyesuaian", -2, 6, "Stok opname", 600),
    mv(5, "p7", "b1", "masuk", 24, 40, null, 1500),
    mv(6, "p4", "b2", "keluar", -2, 3, "Cacat jahitan", 2800),
    mv(7, "p3", "b1", "masuk", 10, 10, "Restock kemeja", 3000),
  ].map((m) => ({ total_harga: null, dibayar: 0, supplier: null, ...m }));
  // Contoh pembelian: sebagian berutang, satu lunas
  Object.assign(stock_movements[0], { total_harga: 700000, dibayar: 300000, supplier: "Grosir Tanah Abang" });
  Object.assign(stock_movements[4], { total_harga: 432000, dibayar: 432000, supplier: "Pasar Cipadu" });
  Object.assign(stock_movements[6], { total_harga: 850000, dibayar: 100000, supplier: "Konveksi Bandung Jaya" });
  const supplier_payments = [
    { id: "s1", owner_id: "demo", supplier: "Konveksi Bandung Jaya", jumlah: 100000, catatan: "Cicilan pertama", created_at: mnt(1500) },
  ];
  return { branches, products, stock_levels, stock_movements, supplier_payments };
}

const g = globalThis as unknown as { __demoStore?: Store; __demoId?: number };
const store = (): Store => (g.__demoStore ??= seed());
const nextId = () => `d${(g.__demoId = (g.__demoId ?? 0) + 1)}`;

// Simulasi jeda jaringan ke database (ms), hanya untuk mengukur kecepatan saat pengujian
const jeda = () => new Promise((r) => setTimeout(r, Number(process.env.DEMO_LATENCY ?? 0)));

class Query implements PromiseLike<any> {
  private op: "select" | "insert" | "update" | "delete" = "select";
  private filters: ["eq" | "lt" | "gte", string, any][] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private limit_?: number;
  private range_?: [number, number];
  private count = false;
  private patch: Row = {};

  constructor(private table: Tabel) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (opts?.count) this.count = true;
    return this;
  }
  insert(data: Row) { this.op = "insert"; this.patch = data; return this; }
  update(data: Row) { this.op = "update"; this.patch = data; return this; }
  delete() { this.op = "delete"; return this; }
  eq(col: string, val: any) { this.filters.push(["eq", col, val]); return this; }
  lt(col: string, val: any) { this.filters.push(["lt", col, val]); return this; }
  gte(col: string, val: any) { this.filters.push(["gte", col, val]); return this; }
  order(col: string, o?: { ascending?: boolean }) { this.orders.push({ col, asc: o?.ascending !== false }); return this; }
  limit(n: number) { this.limit_ = n; return this; }
  range(a: number, b: number) { this.range_ = [a, b]; return this; }

  private matches = (r: Row) =>
    this.filters.every(([op, c, v]) => (op === "eq" ? r[c] === v : op === "lt" ? r[c] < v : r[c] >= v));

  private run() {
    const s0 = store();
    // View utang_pembelian: pembelian yang masih ada sisa utangnya
    const rows: Row[] = this.table === "utang_pembelian"
      ? s0.stock_movements
          .filter((m) => m.tipe === "masuk" && m.total_harga != null && m.total_harga - m.dibayar > 0)
          .map((m) => ({
            id: m.id, created_at: m.created_at, supplier: m.supplier, jumlah: m.jumlah, total_harga: m.total_harga, dibayar: m.dibayar,
            sisa: m.total_harga - m.dibayar,
            produk: s0.products.find((x) => x.id === m.product_id)?.nama, satuan: s0.products.find((x) => x.id === m.product_id)?.satuan,
            cabang: s0.branches.find((x) => x.id === m.branch_id)?.nama,
          }))
      : s0[this.table];
    if (this.op === "insert") {
      if (this.table === "utang_pembelian") return { data: null, error: { message: "view hanya baca" } };
      const row = {
        id: nextId(), owner_id: "demo", is_archived: false, created_at: new Date().toISOString(),
        satuan: "pcs", stok_minimum: 0, ...this.patch,
      };
      s0[this.table as keyof Store].push(row);
      return { data: [row], error: null };
    }
    if (this.op === "update") {
      rows.filter(this.matches).forEach((r) => Object.assign(r, this.patch));
      return { data: null, error: null };
    }
    if (this.op === "delete") {
      const s = store();
      // Pembelian yang masih berutang tidak boleh dihapus (sama seperti aturan di database)
      const boleh = (r: Row) => this.table !== "stock_movements" || r.dibayar >= (r.total_harga ?? 0);
      const dihapus = rows.filter((r) => this.matches(r) && boleh(r));
      s[this.table as keyof Store] = rows.filter((r) => !dihapus.includes(r));
      return { data: dihapus, error: null };
    }
    let out = rows.filter(this.matches);
    if (this.count) return { data: null, count: out.length, error: null };
    if (this.orders.length) {
      out = [...out].sort((a, b) => {
        for (const { col, asc } of this.orders) {
          const d = a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0;
          if (d) return d * (asc ? 1 : -1);
        }
        return 0;
      });
    }
    if (this.range_) out = out.slice(this.range_[0], this.range_[1] + 1);
    if (this.limit_ != null) out = out.slice(0, this.limit_);
    if (this.table === "stock_movements") {
      const s = store();
      out = out.map((m) => ({
        ...m,
        products: s.products.find((p) => p.id === m.product_id) ?? null,
        branches: s.branches.find((b) => b.id === m.branch_id) ?? null,
      }));
    }
    return { data: out, error: null };
  }

  then<R1 = any, R2 = never>(ok?: ((v: any) => R1 | PromiseLike<R1>) | null, err?: ((e: any) => R2 | PromiseLike<R2>) | null) {
    return jeda().then(() => this.run()).then(ok, err);
  }
}

type ArgMutasi = {
  p_product: string; p_branch: string; p_tipe: string; p_jumlah: number; p_catatan: string | null;
  p_total_harga?: number | null; p_dibayar?: number | null; p_supplier?: string | null;
};

function catatMutasi(a: ArgMutasi) {
  const s = store();
  const total = a.p_total_harga ?? null;
  if (a.p_dibayar != null && (total == null || a.p_dibayar < 0 || a.p_dibayar > total)) {
    return { error: { message: "Jumlah dibayar harus antara 0 dan total harga beli" } };
  }
  const pr = s.products.find((x) => x.id === a.p_product);
  let supplier: string | null = null;
  let dibayar = 0;
  if (a.p_tipe === "masuk") {
    supplier = a.p_supplier?.trim() || pr?.sumber?.trim() || null;
    if (total != null) {
      dibayar = a.p_dibayar ?? total;
      if (dibayar < total && !supplier) return { error: { message: "Isi nama supplier untuk pembelian yang masih berutang" } };
    }
  }
  let lv = s.stock_levels.find((l) => l.product_id === a.p_product && l.branch_id === a.p_branch);
  if (!lv) {
    lv = { product_id: a.p_product, branch_id: a.p_branch, owner_id: "demo", jumlah: 0 };
    s.stock_levels.push(lv);
  }
  const sebelum = lv.jumlah as number;
  const sesudah = a.p_tipe === "masuk" ? sebelum + a.p_jumlah : a.p_tipe === "keluar" ? sebelum - a.p_jumlah : a.p_jumlah;
  if (sesudah < 0) return { error: { message: `Stok tidak cukup (tersisa ${sebelum})` } };
  if (a.p_tipe === "masuk" && total != null && pr) {
    const stokSemua = s.stock_levels.filter((l) => l.product_id === a.p_product).reduce((t, l) => t + l.jumlah, 0);
    pr.harga_beli = pr.harga_beli == null || stokSemua <= 0
      ? Math.round((total / a.p_jumlah) * 100) / 100
      : Math.round(((stokSemua * pr.harga_beli + total) / (stokSemua + a.p_jumlah)) * 100) / 100;
  }
  lv.jumlah = sesudah;
  s.stock_movements.push({
    id: nextId(), owner_id: "demo", product_id: a.p_product, branch_id: a.p_branch, tipe: a.p_tipe,
    jumlah: a.p_tipe === "penyesuaian" ? sesudah - sebelum : a.p_jumlah, stok_sebelum: sebelum, stok_sesudah: sesudah,
    total_harga: total, dibayar, supplier, catatan: a.p_catatan, created_at: new Date().toISOString(),
  });
  return { error: null };
}

function tambahBarang(a: any) {
  const s = store();
  const total = (a.p_total_harga ?? null) as number | null;
  const bayarSemua = (a.p_dibayar ?? null) as number | null;
  if (bayarSemua != null && (total == null || bayarSemua < 0 || bayarSemua > total)) {
    return { error: { message: "Jumlah dibayar harus antara 0 dan total harga beli" } };
  }
  const masuk = (a.p_stok as { branch_id: string; jumlah: number }[]).filter((x) => x.jumlah > 0);
  // Validasi lebih dulu supaya tidak ada barang setengah jadi (di database ini dijamin oleh transaksi)
  if (total != null && bayarSemua != null && bayarSemua < total && masuk.length && !String(a.p_sumber ?? "").trim()) {
    return { error: { message: "Isi nama supplier untuk pembelian yang masih berutang" } };
  }
  const id = nextId();
  s.products.push({
    id, owner_id: "demo", nama: a.p_nama, kategori: a.p_kategori, sumber: a.p_sumber, satuan: a.p_satuan || "pcs",
    harga_beli: null, harga_jual: a.p_harga_jual, stok_minimum: a.p_stok_minimum ?? 0, catatan: a.p_catatan,
    is_archived: false, created_at: new Date().toISOString(),
  });
  const jumlahSemua = masuk.reduce((t, x) => t + x.jumlah, 0);
  let sisa = total;
  let sisaBayar = bayarSemua;
  masuk.forEach((x, i) => {
    let bagian: number | null = null;
    let bayar: number | null = null;
    if (total != null) {
      const akhir = i === masuk.length - 1;
      bagian = akhir ? sisa : Math.round((total * x.jumlah / jumlahSemua) * 100) / 100;
      if (!akhir) sisa = (sisa as number) - (bagian as number);
      if (bayarSemua != null) {
        bayar = akhir
          ? Math.max(0, Math.min(sisaBayar as number, bagian as number))
          : Math.min(Math.round((bayarSemua * x.jumlah / jumlahSemua) * 100) / 100, bagian as number);
        if (!akhir) sisaBayar = (sisaBayar as number) - bayar;
      }
    }
    catatMutasi({ p_product: id, p_branch: x.branch_id, p_tipe: "masuk", p_jumlah: x.jumlah, p_catatan: "Stok awal", p_total_harga: bagian, p_dibayar: bayar, p_supplier: a.p_sumber });
  });
  return { data: id, error: null };
}

function bayarUtang(a: { p_supplier: string; p_jumlah: number; p_catatan?: string | null }) {
  const s = store();
  const nama = (a.p_supplier ?? "").trim();
  if (!nama) return { error: { message: "Supplier tidak dipilih" } };
  if (!(a.p_jumlah > 0)) return { error: { message: "Jumlah pembayaran harus lebih dari 0" } };
  const buka = s.stock_movements
    .filter((m) => m.tipe === "masuk" && m.total_harga != null && m.total_harga - m.dibayar > 0 && (m.supplier ?? "").trim().toLowerCase() === nama.toLowerCase())
    .sort((x, y) => (x.created_at > y.created_at ? 1 : -1));
  const total = buka.reduce((t, m) => t + (m.total_harga - m.dibayar), 0);
  if (total <= 0) return { error: { message: "Tidak ada utang ke supplier ini" } };
  if (a.p_jumlah > total) return { error: { message: `Pembayaran melebihi total utang (sisa ${total})` } };
  let sisaBayar = a.p_jumlah;
  for (const m of buka) {
    if (sisaBayar <= 0) break;
    const ambil = Math.min(m.total_harga - m.dibayar, sisaBayar);
    m.dibayar = Math.round((m.dibayar + ambil) * 100) / 100;
    sisaBayar -= ambil;
  }
  s.supplier_payments.push({ id: nextId(), owner_id: "demo", supplier: nama, jumlah: a.p_jumlah, catatan: a.p_catatan?.trim() || null, created_at: new Date().toISOString() });
  return { error: null };
}

function hapusUtang(a: { p_ids: string[] }) {
  const s = store();
  const hapus = s.stock_movements.filter((m) => a.p_ids.includes(m.id) && m.total_harga != null && m.dibayar < m.total_harga);
  s.stock_movements = s.stock_movements.filter((m) => !hapus.includes(m));
  return { data: hapus.length, error: null };
}

export function createDemoClient() {
  return {
    from: (table: Tabel) => new Query(table),
    rpc: async (fn: string, args: any) => (await jeda(), fn === "tambah_barang" ? tambahBarang(args) : fn === "bayar_utang" ? bayarUtang(args) : fn === "hapus_utang" ? hapusUtang(args) : catatMutasi(args)),
    auth: { signOut: async () => ({ error: null }), signInWithPassword: async () => ({ error: null }) },
  } as any;
}
