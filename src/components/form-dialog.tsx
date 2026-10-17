"use client";

import { useActionState, useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { X } from "lucide-react";
import type { ActionState } from "@/lib/types";

type Props = {
  trigger: ReactNode;
  triggerClassName?: string;
  triggerLabel?: string;
  title: string;
  description?: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel?: string;
  danger?: boolean;
  children: ReactNode;
};

// Dialog hanya dirender saat dibuka: daftar panjang tetap ringan, form selalu segar
// (tanpa error/isian lama) dan tidak ada id input ganda di halaman.
export function FormDialog({ trigger, triggerClassName = "btn-soft", triggerLabel, ...rest }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={triggerClassName} aria-label={triggerLabel} onClick={() => setOpen(true)}>
        {trigger}
      </button>
      {open && <FormSheet {...rest} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Lembar form (bottom sheet di HP). Dirender oleh induknya hanya saat perlu; onClose dipanggil saat ditutup/berhasil. */
export function FormSheet({ title, description, action, submitLabel = "Simpan", danger, children, onClose }: Omit<Props, "trigger" | "triggerClassName" | "triggerLabel"> & { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [state, formAction, pending] = useActionState(action, undefined);
  const [, mulai] = useTransition();

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-0 mt-auto w-full max-w-none rounded-t-2xl bg-surface p-0 text-ink sm:m-auto sm:max-w-md sm:rounded-2xl"
    >
      {/* onSubmit (bukan action=): React tidak mengosongkan isian form saat server menolak, jadi pengguna tidak perlu mengetik ulang */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          mulai(() => formAction(data));
        }}
        className="flex max-h-[90dvh] flex-col"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line sm:hidden" />
        <div className="flex items-start justify-between gap-3 pl-5 pt-3">
          <div className="min-w-0 pt-1.5">
            <h2 id={titleId} className="text-xl font-semibold leading-snug">{title}</h2>
            {description && <p className="mt-1 text-[15px] text-muted">{description}</p>}
          </div>
          <button type="button" aria-label="Tutup" onClick={() => ref.current?.close()} className="icon-btn">
            <X size={22} />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto px-5 py-4">{children}</div>
        <div className="border-t border-line px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          {state?.error && (
            <p role="alert" className="mb-3 border-l-4 border-danger bg-danger/10 px-3 py-2 text-[15px] text-danger">{state.error}</p>
          )}
          <div className="flex gap-3">
            <button type="button" className="btn-soft flex-1" onClick={() => ref.current?.close()}>Batal</button>
            <button type="submit" disabled={pending} className={`${danger ? "btn-danger" : "btn-primary"} flex-1`}>
              {pending ? "Memproses…" : submitLabel}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}

export function Field({ label, name, hint, ...rest }: { label: string; name: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} className="input" {...rest} />
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}
