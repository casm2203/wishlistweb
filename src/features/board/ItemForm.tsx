"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, CURRENCIES, KINDS, STYLES, styleOf } from "@/lib/spaces";
import type { Item, ItemDraft, ItemKind } from "@/lib/types";
import { CameraIcon, PaperSheet, PhotoBox } from "./Sheet";
import { resizeImage } from "./image";

/** Lo que ya se decidió en la bandeja: al crear, el formulario solo pide los datos. */
export type Seed = Pick<ItemDraft, "category" | "style" | "paper" | "ink" | "holder" | "holder_color" | "rotation">;

interface Props {
  /** Edición: se cambian los datos y la foto; el aspecto de la tarjeta se conserva. */
  item?: Item;
  /** Creación desde la bandeja: estilo ya elegido. */
  seed?: Seed;
  onSubmit: (draft: ItemDraft) => Promise<void>;
  onCancel: () => void;
}

/** Hoja cuadriculada donde se escriben los datos de una tarjeta. */
export function ItemForm({ item, seed, onSubmit, onCancel }: Props) {
  const start = item ?? seed;
  const editing = !!item;
  const category = start?.category ?? "articulo";
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item?.price?.toString() ?? "");
  const [currency, setCurrency] = useState(item?.currency ?? "COP");
  const [url, setUrl] = useState(item?.url ?? "");
  const [kind, setKind] = useState<ItemKind>(item?.kind ?? "want");
  const [code, setCode] = useState(item?.code ?? "");
  const [rotation] = useState(() => start?.rotation ?? Math.round((Math.random() - 0.5) * 9 * 10) / 10);
  const [image, setImage] = useState<Blob | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [preview, setPreview] = useState<string | null>(item?.image_url ?? null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  // Foto en proceso (reducción a JPEG): no se puede guardar hasta que termine, o la tarjeta quedaría sin foto.
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const meta = CATEGORIES[category];
  const isNote = category === "nota";
  const shownImage = removeImage ? null : preview;

  async function takeImage(file: Blob) {
    setProcessing(true);
    try {
      const blob = await resizeImage(file);
      setImage(blob);
      setRemoveImage(false);
      setPreview((old) => {
        if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
    } catch {
      setError("No se pudo leer esa imagen");
    } finally {
      setProcessing(false);
    }
  }

  /** Lee el enlace y rellena SOLO lo que esté vacío; si el sitio no deja leerlo, se llena a mano. */
  async function autofill(raw: string) {
    let target = raw.trim();
    if (!target) return;
    if (!/^https?:\/\//i.test(target)) target = `https://${target}`;
    setFetching(true);
    setHint(null);
    try {
      const res = await fetch(`/api/link-preview?url=${encodeURIComponent(target)}`);
      const data = (await res.json()) as {
        error?: string;
        title: string | null;
        description: string | null;
        image: string | null;
        price: number | null;
        currency: string | null;
      };
      if (!res.ok) throw new Error(data.error);
      const found = [data.title, data.description, data.image, data.price].filter(Boolean).length;
      if (!found) throw new Error("Sin datos");
      setName((v) => v || (data.title ?? "").slice(0, 120).trim());
      setDescription((v) => v || (data.description ?? "").slice(0, 400).trim());
      if (data.price) setPrice((v) => v || String(data.price));
      if (data.currency && (CURRENCIES as readonly string[]).includes(data.currency.toUpperCase())) {
        setCurrency(data.currency.toUpperCase());
      }
      if (data.image && !preview) {
        const img = await fetch(`/api/link-image?url=${encodeURIComponent(data.image)}`);
        if (img.ok) await takeImage(await img.blob());
      }
      setHint(data.price && data.title ? "Listo: revisa los datos antes de guardar." : "Rellené lo que encontré; completa el resto a mano.");
    } catch {
      setHint("Ese sitio no me dejó leer los datos. Pega la foto y escríbelos a mano.");
    } finally {
      setFetching(false);
    }
  }

  // Pegar (Ctrl/⌘+V) una imagen copiada desde cualquier sitio.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!CATEGORIES[category].photo) return;
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (!file) return;
      e.preventDefault();
      void takeImage(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = price.trim() === "" ? null : Number(price.replace(",", "."));
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) return setError("Precio inválido");
    let cleanUrl = url.trim();
    if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) cleanUrl = `https://${cleanUrl}`;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        category,
        name: name.trim(),
        description: description.trim(),
        price: isNote ? null : parsed,
        currency,
        url: isNote ? null : cleanUrl || null,
        needs_locker: item?.needs_locker ?? false,
        kind,
        status: item?.status ?? "pending",
        rotation: item?.rotation ?? rotation,
        style: start?.style ?? null,
        paper: start?.paper ?? null,
        ink: start?.ink ?? null,
        holder: start?.holder ?? null,
        holder_color: start?.holder_color ?? null,
        bg: item?.bg ?? null,
        emoji: item?.emoji ?? null,
        code: code.trim() ? code.trim().toUpperCase().slice(0, 4) : null,
        image: meta.photo ? image : null,
        removeImage,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      setBusy(false);
    }
  }

  const style = styleOf({ category, style: start?.style ?? null });

  const photoSlot = meta.photo && (
    <>
      <div
        className={`rawph up${shownImage ? " has" : ""}${dragOver ? " over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = [...e.dataTransfer.files].find((f) => f.type.startsWith("image/"));
          if (file) void takeImage(file);
        }}
      >
        {shownImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- preview local (blob:) o foto de la base */}
            <img src={shownImage} alt="" />
            <span className="chg">cambiar foto</span>
          </>
        ) : (
          <span className="in">
            <CameraIcon />
            <span>{processing ? "preparando foto…" : "toca para subir tu foto"}</span>
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          aria-label="Subir foto"
          onChange={(e) => e.target.files?.[0] && void takeImage(e.target.files[0])}
        />
      </div>
      {shownImage && (
        <button
          type="button"
          className="phremove"
          onClick={() => {
            setImage(null);
            setPreview(null);
            setRemoveImage(true);
          }}
        >
          quitar foto
        </button>
      )}
    </>
  );

  const aside = !isNote && (
    <>
      {photoSlot || <PhotoBox item={{ category, bg: item?.bg ?? null, emoji: item?.emoji ?? null, image_url: null }} />}
      <input
        className="phin"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text").trim();
          if (meta.photo && /^https?:\/\/\S+$/i.test(text)) void autofill(text);
        }}
        inputMode="url"
        aria-label="Link de la tienda"
        placeholder="link de la tienda"
      />
      {meta.photo && url.trim() && (
        <button type="button" className="phremove" disabled={fetching} onClick={() => void autofill(url)}>
          {fetching ? "leyendo…" : "autocompletar"}
        </button>
      )}
      {hint && <p className="phhint">{hint}</p>}
    </>
  );

  return (
    <PaperSheet
      item={{ category, style, paper: start?.paper ?? null }}
      editing
      onClose={onCancel}
      aside={aside || null}
    >
      <form className="xr" onSubmit={submit}>
        <input
          className="eh2"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nombre"
          placeholder={isNote ? "título de la nota" : "nombre"}
          title={STYLES[style].label}
        />
        {category === "viaje" && (
          <label className="nrow">
            <span>Código</span>
            <input
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={name.replace(/[^a-zA-ZÁÉÍÓÚÑáéíóúñ0-9]/g, "").slice(0, 3).toUpperCase() || "CTG"}
            />
          </label>
        )}
        {!isNote && (
          <div className="nrow">
            <span>Precio</span>
            <input inputMode="decimal" aria-label="Precio" value={price} onChange={(e) => setPrice(e.target.value)} />
            <select aria-label="Moneda" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        )}
        <label className="nrow">
          <span>{isNote ? "Nota" : "Notas"}</span>
          <textarea rows={isNote ? 6 : 3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="nrow">
          <span>Prioridad</span>
        </div>
        <div className="nchk">
          {(Object.keys(KINDS) as ItemKind[]).map((k) => (
            <button key={k} type="button" className={kind === k ? "on" : ""} aria-pressed={kind === k} onClick={() => setKind(k)}>
              <i />
              {KINDS[k].label.toLowerCase()}
            </button>
          ))}
        </div>

        {error && <p className="err">{error}</p>}

        <div className="acts">
          <button type="button" className="wbtn del" onClick={onCancel}>
            {editing ? "cancelar" : "atrás"}
          </button>
          <button className="wbtn" disabled={busy || processing || !name.trim()}>
            {busy ? "guardando…" : processing ? "preparando foto…" : editing ? "guardar" : "pegar en el tablero"}
          </button>
        </div>
      </form>
    </PaperSheet>
  );
}
