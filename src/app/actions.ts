"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const opt = (f: FormData, k: string) => str(f, k) || null;
const num = (f: FormData, k: string) => {
  const v = str(f, k);
  return v === "" ? null : Number(v);
};

const MAKS = 1_000_000_000;
const valid = (n: number | null) => n === null || (Number.isFinite(n) && n >= 0 && n <= MAKS);

function pesan(error: { code?: string; message: string }, duplikat: string) {
  return error.code === "23505" ? duplikat : error.message;
}

export async function login(_: ActionState, f: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: str(f, "email"), password: str(f, "password") });
  if (error) return { error: "Email atau kata sandi salah" };
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function simpanCabang(_: ActionState, f: FormData): Promise<ActionState> {
  const nama = str(f, "nama");
  if (!nama) return { error: "Nama cabang wajib diisi" };
  const supabase = await createClient();
  const data = { nama, alamat: opt(f, "alamat"), telepon: opt(f, "telepon") };
  const id = str(f, "id");
  const { error } = id ? await supabase.from("branches").update(data).eq("id", id) : await supabase.from("branches").insert(data);
  if (error) return { error: pesan(error, "Nama cabang sudah dipakai") };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function hapusCabang(_: ActionState, f: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const id = str(f, "id");
  const { count } = await supabase.from("stock_movements").select("id", { count: "exact", head: true }).eq("branch_id", id);
  const { error } = count
    ? await supabase.from("branches").update({ is_archived: true }).eq("id", id)
    : await supabase.from("branches").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function simpanBarang(_: ActionState, f: FormData): Promise<ActionState> {
  const nama = str(f, "nama");
  if (!nama) return { error: "Nama barang wajib diisi" };
  const hargaJual = num(f, "harga_jual");
  const stokMin = num(f, "stok_minimum");
  if (!valid(hargaJual)) return { error: "Harga jual harus berupa angka 0 atau lebih" };
  if (!valid(stokMin)) return { error: "Stok minimum harus berupa angka 0 atau lebih" };
  const supabase = await createClient();
  const data = {
    nama,
    kategori: opt(f, "kategori"),
    sumber: opt(f, "sumber"),
    satuan: str(f, "satuan") || "pcs",
    harga_jual: hargaJual,
    stok_minimum: Math.floor(stokMin ?? 0),
    catatan: opt(f, "catatan"),
  };
  const id = str(f, "id");

  if (id) {
    const { error } = await supabase.from("products").update(data).eq("id", id);
    if (error) return { error: error.message };
  } else {
    // Barang baru + stok awal (opsional) dalam satu transaksi di database
    const stok = [...f.entries()]
      .filter(([k]) => k.startsWith("awal_"))
      .map(([k, v]) => ({ branch_id: k.slice(5), jumlah: Number(v || 0) }));
    if (stok.some((s) => !Number.isInteger(s.jumlah) || s.jumlah < 0 || s.jumlah > MAKS)) return { error: "Stok awal harus bilangan bulat 0 atau lebih" };
    const totalHarga = num(f, "total_harga");
    if (!valid(totalHarga)) return { error: "Total harga beli harus berupa angka 0 atau lebih" };
    const { error } = await supabase.rpc("tambah_barang", {
      p_nama: data.nama, p_kategori: data.kategori, p_sumber: data.sumber, p_satuan: data.satuan,
      p_harga_jual: data.harga_jual, p_stok_minimum: data.stok_minimum, p_catatan: data.catatan,
      p_stok: stok, p_total_harga: totalHarga,
    });
    if (error) return { error: error.message };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function hapusBarang(_: ActionState, f: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const id = str(f, "id");
  const { count } = await supabase.from("stock_movements").select("id", { count: "exact", head: true }).eq("product_id", id);
  const { error } = count
    ? await supabase.from("products").update({ is_archived: true }).eq("id", id)
    : await supabase.from("products").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function catatMutasi(_: ActionState, f: FormData): Promise<ActionState> {
  const tipe = str(f, "tipe");
  const jumlah = num(f, "jumlah");
  const catatan = opt(f, "catatan");
  const totalHarga = tipe === "masuk" ? num(f, "total_harga") : null;
  if (!valid(totalHarga)) return { error: "Total harga beli harus berupa angka 0 atau lebih" };
  if (jumlah === null || !Number.isInteger(jumlah) || jumlah < 0 || jumlah > MAKS) return { error: "Jumlah harus bilangan bulat yang wajar" };
  if (!["masuk", "keluar", "penyesuaian"].includes(tipe)) return { error: "Jenis mutasi tidak valid" };
  if (tipe !== "masuk" && jumlah === 0) return { error: "Jumlah harus lebih dari 0" };
  if (tipe !== "masuk" && !catatan) return { error: "Catatan/alasan wajib diisi" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("catat_mutasi", {
    p_product: str(f, "product_id"),
    p_branch: str(f, "branch_id"),
    p_tipe: tipe,
    p_jumlah: jumlah,
    p_catatan: catatan,
    p_total_harga: totalHarga,
  });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

// Tombol cepat −/+ dan angka yang diketik langsung di halaman Stok (tanpa form)
export async function catatCepat(productId: string, branchId: string, tipe: "masuk" | "keluar", jumlah = 1): Promise<{ error?: string }> {
  if (tipe !== "masuk" && tipe !== "keluar") return { error: "Jenis mutasi tidak valid" };
  if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > MAKS) return { error: "Jumlah harus bilangan bulat yang wajar" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("catat_mutasi", {
    p_product: productId,
    p_branch: branchId,
    p_tipe: tipe,
    p_jumlah: jumlah,
    p_catatan: tipe === "keluar" ? "Terjual" : null,
    p_total_harga: null,
  });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return {};
}
