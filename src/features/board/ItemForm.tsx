"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, CATEGORY_ORDER, CURRENCIES, KINDS, STATUSES } from "@/lib/spaces";
import type { Item, ItemCategory, ItemDraft, ItemKind, ItemStatus } from "@/lib/types";
import { resizeImage } from "./image";

interface Props {
  item?: Item;
  onSubmit: (draft: ItemDraft) => Promise<void>;
  onCancel: () => void;
}

const input =
  "w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 outline-none focus:border-stone-500";

export function ItemForm({ item, onSubmit, onCancel }: Props) {
  const [category, setCategory] = useState<ItemCategory>(item?.category ?? "articulo");
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item?.price?.toString() ?? "");
  const [currency, setCurrency] = useState(item?.currency ?? "USD");
  const [url, setUrl] = useState(item?.url ?? "");
  const [kind, setKind] = useState<ItemKind>(item?.kind ?? "want");
  const [status, setStatus] = useState<ItemStatus>(item?.status ?? "pending");
  const [needsLocker, setNeedsLocker] = useState(item?.needs_locker ?? false);
  const [image, setImage] = useState<Blob | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [preview, setPreview] = useState<string | null>(item?.image_url ?? null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  async function takeImage(file: Blob) {
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
        price: parsed,
        currency,
        url: cleanUrl || null,
        needs_locker: category === "articulo" && needsLocker,
        kind,
        status,
        image,
        removeImage,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-1.5">
        {CATEGORY_ORDER.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`flex-1 rounded border px-1 py-1.5 text-sm ${
              category === c ? "border-stone-800 bg-stone-800 text-white" : "border-stone-300 text-stone-700"
            }`}
          >
            {CATEGORIES[c].label}
          </button>
        ))}
      </div>
      <div>
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text").trim();
              if (/^https?:\/\/\S+$/i.test(text)) void autofill(text);
            }}
            inputMode="url"
            placeholder="Pega el enlace y lo relleno por ti"
            className={input}
          />
          <button
            type="button"
            disabled={fetching || !url.trim()}
            onClick={() => void autofill(url)}
            className="shrink-0 rounded border border-stone-400 px-3 text-sm text-stone-800 disabled:opacity-50"
          >
            {fetching ? "Leyendo…" : "Autocompletar"}
          </button>
        </div>
        {hint && <p className="mt-1 text-xs text-stone-600">{hint}</p>}
      </div>
      <div
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
        className={`relative flex aspect-[4/3] w-full sm:aspect-square items-center justify-center overflow-hidden bg-stone-200 ${
          dragOver ? "outline-2 outline-dashed outline-amber-600" : ""
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- preview local (blob:)
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <p className="px-6 text-center text-sm text-stone-500">
            <span className="sm:hidden">Toca «Elegir» para subir la foto</span>
            <span className="hidden sm:inline">Pega aquí la foto (Ctrl/⌘ + V), arrástrala o elige un archivo</span>
          </p>
        )}
        <div className="absolute bottom-2 right-2 flex gap-2">
          <label className="cursor-pointer rounded bg-white/90 px-3 py-2 text-sm text-stone-800 shadow sm:px-2 sm:py-1 sm:text-xs">
            Elegir
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && void takeImage(e.target.files[0])}
            />
          </label>
          {preview && (
            <button
              type="button"
              onClick={() => {
                setImage(null);
                setPreview(null);
                setRemoveImage(true);
              }}
              className="rounded bg-white/90 px-3 py-2 text-sm text-stone-800 shadow sm:px-2 sm:py-1 sm:text-xs"
            >
              Quitar
            </button>
          )}
        </div>
      </div>

      <input
        required
        maxLength={120}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={CATEGORIES[category].namePlaceholder}
        className="font-hand w-full border-b border-stone-300 bg-transparent px-1 text-3xl text-stone-900 outline-none focus:border-stone-500"
      />
      <textarea
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descripción (talla, color, modelo…)"
        className={input}
      />
      <div className="flex gap-2">
        <input
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Precio"
          className={input}
        />
        <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${input} w-24`}>
          {CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-1.5">
        {(Object.keys(KINDS) as ItemKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`flex-1 rounded border px-1 py-1.5 text-xs ${
              kind === k ? "border-stone-800 bg-stone-800 text-white" : "border-stone-300 text-stone-700"
            }`}
          >
            {KINDS[k].label}
          </button>
        ))}
      </div>

      {category === "articulo" && (
        <label className="flex items-center gap-2 text-sm text-stone-800">
          <input type="checkbox" checked={needsLocker} onChange={(e) => setNeedsLocker(e.target.checked)} />
          📦 Requiere casillero (envío especial)
        </label>
      )}

      {item && (
        <select value={status} onChange={(e) => setStatus(e.target.value as ItemStatus)} className={input}>
          {(Object.keys(STATUSES) as ItemStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUSES[s]}
            </option>
          ))}
        </select>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-stone-600">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded bg-stone-800 px-4 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Guardando…" : item ? "Guardar" : "Pegar en el tablero"}
        </button>
      </div>
    </form>
  );
}
