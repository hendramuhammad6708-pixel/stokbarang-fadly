"use client";

import { useActionState } from "react";
import { Logo } from "@/components/logo";
import { login } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <Logo size={56} className="mb-5" />
      <h1 className="text-3xl font-bold">Stok Toko</h1>
      <p className="mb-8 mt-1 text-muted">Masuk untuk mengelola stok semua cabang.</p>

      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" inputMode="email" autoCapitalize="none" className="input" />
        </div>
        <div>
          <label htmlFor="password" className="label">Kata sandi</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
        </div>
        {state?.error && <p role="alert" className="border-l-4 border-danger bg-danger/10 px-3 py-2 text-[15px] text-danger">{state.error}</p>}
        <button disabled={pending} className="btn-primary w-full">{pending ? "Masuk…" : "Masuk"}</button>
      </form>
    </main>
  );
}
