"use client";

import { useActionState } from "react";
import { Ransom, WISHLIST_TITLE } from "@/features/board/Sign";
import { signIn } from "./actions";

/** Acceso v3: ficha de biblioteca con cinta, título de letras recortadas y entrada solo por nombre. */
export default function LoginPage() {
  const [error, action, pending] = useActionState(signIn, null);
  return (
    <main className="login">
      <form action={action} className="lcard">
        <div className="ltape" />
        <div className="lhead">
          <span className="ltop">ACCESO · Nº 0001</span>
          <Ransom text={WISHLIST_TITLE} label="Nuestra wishlist" />
        </div>
        <label className="lf">
          <span>¿Quién eres?</span>
          <input
            name="name"
            type="text"
            required
            autoFocus
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="cris o melck"
          />
        </label>
        {error && <p className="lerr">{error}</p>}
        <div className="lfoot">
          <button className="lgo" disabled={pending}>
            {pending ? "entrando…" : "entrar"}
          </button>
        </div>
      </form>
    </main>
  );
}
