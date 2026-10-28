"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(signIn, null);
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#2a1c10] bg-cover bg-center p-6"
      style={{ backgroundImage: "url(/tablero-hd.jpg)" }}>
      <form action={action} className="w-full max-w-xs -rotate-1 space-y-3 bg-[#fdfcf8] p-6 shadow-2xl">
        <h1 className="font-hand text-4xl text-stone-900">Nuestra wishlist</h1>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Correo"
          className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
        />
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Contraseña"
          className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={pending}
          className="w-full rounded bg-stone-900 py-2 text-sm text-white disabled:opacity-60"
        >
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
