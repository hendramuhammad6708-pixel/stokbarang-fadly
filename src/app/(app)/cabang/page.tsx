import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FormDialog, Field } from "@/components/form-dialog";
import { Empty, PageHeader } from "@/components/page-header";
import type { Branch } from "@/lib/types";
import { hapusCabang, simpanCabang } from "../../actions";

function CabangFields({ b }: { b?: Branch }) {
  return (
    <>
      {b && <input type="hidden" name="id" value={b.id} />}
      <Field label="Nama cabang" name="nama" required defaultValue={b?.nama} placeholder="mis. Cabang Pasar Baru" />
      <Field label="Alamat" name="alamat" defaultValue={b?.alamat ?? ""} />
      <Field label="Telepon" name="telepon" type="tel" inputMode="tel" defaultValue={b?.telepon ?? ""} />
    </>
  );
}

export default async function CabangPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("branches").select("*").eq("is_archived", false).order("created_at");
  const branches = (data ?? []) as Branch[];

  return (
    <>
      <PageHeader
        back={{ href: "/kelola", label: "Kelola" }}
        title="Cabang"
        subtitle={`${branches.length} cabang aktif`}
        action={
          <FormDialog trigger={<><Plus size={20} /> Tambah</>} triggerClassName="btn-primary" title="Tambah cabang" action={simpanCabang}>
            <CabangFields />
          </FormDialog>
        }
      />

      {branches.length === 0 ? (
        <Empty>Belum ada cabang. Tekan “Tambah” untuk membuat cabang pertama.</Empty>
      ) : (
        <ul className="panel divide-y divide-line">
          {branches.map((b) => (
            <li key={b.id} className="flex items-stretch">
              <FormDialog
                trigger={
                  <>
                    <span className="block truncate font-medium">{b.nama}</span>
                    <span className="block truncate text-sm text-muted">{[b.alamat, b.telepon].filter(Boolean).join(" · ") || "Alamat belum diisi"}</span>
                  </>
                }
                triggerClassName="min-w-0 flex-1 px-4 py-3.5 text-left active:bg-line/40"
                triggerLabel={`Ubah ${b.nama}`}
                title="Ubah cabang"
                action={simpanCabang}
              >
                <CabangFields b={b} />
              </FormDialog>
              <FormDialog
                trigger={<Trash2 size={19} />}
                triggerClassName="icon-btn !size-auto min-w-12"
                triggerLabel={`Hapus ${b.nama}`}
                title={`Hapus ${b.nama}?`}
                description="Cabang yang sudah punya riwayat stok akan diarsipkan, riwayatnya tetap tersimpan. Cabang tanpa riwayat dihapus permanen."
                action={hapusCabang}
                submitLabel="Hapus"
                danger
              >
                <input type="hidden" name="id" value={b.id} />
              </FormDialog>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
