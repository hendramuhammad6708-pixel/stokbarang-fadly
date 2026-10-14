// Mode demo: pengganti Supabase di memori (data hilang saat server restart).
// Aktif jika DEMO_MODE=true. Hanya mendukung query yang dipakai aplikasi ini.
/* eslint-disable @typescript-eslint/no-explicit-any */

type Row = Record<string, any>;
type Store = Record<"branches" | "products" | "stock_levels" | "stock_movements", Row[]>;

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
  ];
  return { branches, products, stock_levels, stock_movements };
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

  constructor(private table: keyof Store) {}

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
    const rows = store()[this.table];
    if (this.op === "insert") {
      const row = {
        id: nextId(), owner_id: "demo", is_archived: false, created_at: new Date().toISOString(),
        satuan: "pcs", stok_minimum: 0, ...this.patch,
      };
      rows.push(row);
      return { data: [row], error: null };
    }
    if (this.op === "update") {
      rows.filter(this.matches).forEach((r) => Object.assign(r, this.patch));
      return { data: null, error: null };
    }
    if (this.op === "delete") {
      const s = store();
      const dihapus = rows.filter(this.matches);
      s[this.table] = rows.filter((r) => !this.matches(r));
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

function catatMutasi(a: { p_product: string; p_branch: string; p_tipe: string; p_jumlah: number; p_catatan: string | null; p_total_harga?: number | null }) {
  const s = store();
  let lv = s.stock_levels.find((l) => l.product_id === a.p_product && l.branch_id === a.p_branch);
  if (!lv) {
    lv = { product_id: a.p_product, branch_id: a.p_branch, owner_id: "demo", jumlah: 0 };
    s.stock_levels.push(lv);
  }
  const sebelum = lv.jumlah as number;
  const sesudah = a.p_tipe === "masuk" ? sebelum + a.p_jumlah : a.p_tipe === "keluar" ? sebelum - a.p_jumlah : a.p_jumlah;
  if (sesudah < 0) return { error: { message: `Stok tidak cukup (tersisa ${sebelum})` } };
  if (a.p_tipe === "masuk" && a.p_total_harga != null) {
    const pr = s.products.find((x) => x.id === a.p_product)!;
    const stokSemua = s.stock_levels.filter((l) => l.product_id === a.p_product).reduce((t, l) => t + l.jumlah, 0);
    pr.harga_beli = pr.harga_beli == null || stokSemua <= 0
      ? Math.round((a.p_total_harga / a.p_jumlah) * 100) / 100
      : Math.round(((stokSemua * pr.harga_beli + a.p_total_harga) / (stokSemua + a.p_jumlah)) * 100) / 100;
  }
  lv.jumlah = sesudah;
  s.stock_movements.push({
    id: nextId(), owner_id: "demo", product_id: a.p_product, branch_id: a.p_branch, tipe: a.p_tipe,
    jumlah: a.p_tipe === "penyesuaian" ? sesudah - sebelum : a.p_jumlah, stok_sebelum: sebelum, stok_sesudah: sesudah,
    total_harga: a.p_total_harga ?? null, catatan: a.p_catatan, created_at: new Date().toISOString(),
  });
  return { error: null };
}

function tambahBarang(a: any) {
  const s = store();
  const id = nextId();
  s.products.push({
    id, owner_id: "demo", nama: a.p_nama, kategori: a.p_kategori, sumber: a.p_sumber, satuan: a.p_satuan || "pcs",
    harga_beli: null, harga_jual: a.p_harga_jual, stok_minimum: a.p_stok_minimum ?? 0, catatan: a.p_catatan,
    is_archived: false, created_at: new Date().toISOString(),
  });
  const masuk = (a.p_stok as { branch_id: string; jumlah: number }[]).filter((x) => x.jumlah > 0);
  const jumlahSemua = masuk.reduce((t, x) => t + x.jumlah, 0);
  let sisa = a.p_total_harga as number | null;
  masuk.forEach((x, i) => {
    let bagian: number | null = null;
    if (a.p_total_harga != null) {
      bagian = i === masuk.length - 1 ? sisa : Math.round((a.p_total_harga * x.jumlah / jumlahSemua) * 100) / 100;
      sisa = (sisa as number) - (bagian as number);
    }
    catatMutasi({ p_product: id, p_branch: x.branch_id, p_tipe: "masuk", p_jumlah: x.jumlah, p_catatan: "Stok awal", p_total_harga: bagian });
  });
  return { data: id, error: null };
}

export function createDemoClient() {
  return {
    from: (table: keyof Store) => new Query(table),
    rpc: async (fn: string, args: any) => (await jeda(), fn === "tambah_barang" ? tambahBarang(args) : catatMutasi(args)),
    auth: { signOut: async () => ({ error: null }), signInWithPassword: async () => ({ error: null }) },
  } as any;
}
