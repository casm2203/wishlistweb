"use client";

import { useEffect, useState } from "react";
import {
  BG_COLORS,
  CATEGORIES,
  CATEGORY_ORDER,
  CURRENCIES,
  EMOJIS,
  HOLDERS,
  INKS,
  KINDS,
  STATUSES,
  STYLES,
  holderOf,
  styleOf,
} from "@/lib/spaces";
import type { CardStyle, HolderKind, Item, ItemCategory, ItemDraft, ItemKind, ItemStatus, Space } from "@/lib/types";
import { Card } from "./cards";
import { MAX_TILT } from "./BoardItem";
import { Sheet } from "./Sheet";
import { Swatches } from "./Swatches";
import { resizeImage } from "./image";

/** Lo que ya se decidió en la bandeja: al crear, el formulario solo pide los datos. */
export type Seed = Pick<ItemDraft, "category" | "style" | "paper" | "ink" | "holder" | "holder_color" | "rotation">;

interface Props {
  /** Edición: muestra también los controles de estilo. */
  item?: Item;
  /** Creación desde la bandeja: estilo ya elegido. */
  seed?: Seed;
  /** Espacio donde se pega (para la vista previa). */
  space?: Space;
  onSubmit: (draft: ItemDraft) => Promise<void>;
  onCancel: () => void;
}

/** Hoja con vista previa viva y los datos de una tarjeta. */
export function ItemForm({ item, seed, space, onSubmit, onCancel }: Props) {
  const start = item ?? seed;
  const editing = !!item;
  const [category, setCategory] = useState<ItemCategory>(start?.category ?? "articulo");
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item?.price?.toString() ?? "");
  const [currency, setCurrency] = useState(item?.currency ?? "COP");
  const [url, setUrl] = useState(item?.url ?? "");
  const [kind, setKind] = useState<ItemKind>(item?.kind ?? "want");
  const [status, setStatus] = useState<ItemStatus>(item?.status ?? "pending");
  const [needsLocker, setNeedsLocker] = useState(item?.needs_locker ?? false);
  const [style, setStyle] = useState<CardStyle | null>(start?.style ?? null);
  const [paper, setPaper] = useState<string | null>(start?.paper ?? null);
  const [ink, setInk] = useState<string | null>(start?.ink ?? null);
  const [holder, setHolder] = useState<HolderKind | null>(start?.holder ?? null);
  const [holderColor, setHolderColor] = useState<string | null>(start?.holder_color ?? null);
  const [emoji, setEmoji] = useState<string | null>(item?.emoji ?? null);
  const [bg, setBg] = useState<string | null>(item?.bg ?? null);
  const [code, setCode] = useState(item?.code ?? "");
  const [rotation, setRotation] = useState(() => start?.rotation ?? Math.round((Math.random() - 0.5) * 9 * 10) / 10);
  const [image, setImage] = useState<Blob | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [preview, setPreview] = useState<string | null>(item?.image_url ?? null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const meta = CATEGORIES[category];
  const lockerOk = category === "articulo";

  /** Cada categoría trae sus estilos y papeles: al cambiarla se vuelve a los valores por defecto. */
  function pickCategory(c: ItemCategory) {
    setCategory(c);
    setStyle(null);
    setPaper(null);
    setInk(null);
    setHolder(null);
    setHolderColor(null);
  }

  // Tarjeta de prueba con lo que se lleva escrito.
  const sample: Item = {
    id: item?.id ?? "00000000-0000-0000-0000-000000000000",
    space: item?.space ?? space ?? "shared",
    category,
    name: name || meta.namePlaceholder,
    description,
    price: category !== "nota" && Number(price.replace(",", ".")) > 0 ? Number(price.replace(",", ".")) : null,
    currency,
    url: null,
    image_url: removeImage ? null : preview,
    needs_locker: lockerOk && needsLocker,
    kind,
    status,
    x: 0,
    y: 0,
    rotation,
    style,
    paper,
    ink,
    holder,
    holder_color: holderColor,
    bg,
    emoji,
    code: code || null,
    scale: 1,
    z: 1,
    created_by: null,
    created_at: "",
    updated_at: "",
  };
  const effStyle = styleOf(sample);
  const effHolder = holderOf(sample);

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
        price: category === "nota" ? null : parsed,
        currency,
        url: category === "nota" ? null : cleanUrl || null,
        needs_locker: lockerOk && needsLocker,
        kind,
        status,
        rotation,
        style,
        paper,
        ink,
        holder,
        holder_color: holderColor,
        bg,
        emoji,
        code: code.trim() ? code.trim().toUpperCase().slice(0, 4) : null,
        image: meta.photo ? image : null,
        removeImage,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      setBusy(false);
    }
  }

  return (
    <Sheet preview={<Card item={sample} />} onClose={onCancel}>
      <form className="f" onSubmit={submit}>
        {editing && (
          <>
            <h2 className="q">Cómo se ve</h2>
            <div className="mini">
              {CATEGORY_ORDER.map((c) => (
                <button key={c} type="button" className={category === c ? "on" : ""} onClick={() => pickCategory(c)}>
                  {CATEGORIES[c].icon} {CATEGORIES[c].label}
                </button>
              ))}
            </div>
            {meta.styles.length > 1 && (
              <div className="mini">
                {meta.styles.map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={effStyle === st ? "on" : ""}
                    onClick={() => {
                      setStyle(st);
                      setPaper(null);
                      setInk(null);
                      setHolder(null);
                      setHolderColor(null);
                    }}
                  >
                    {STYLES[st].label}
                  </button>
                ))}
              </div>
            )}
            <div className="crow">
              <span>{effHolder.kind === "none" ? "pegado" : holderLabel(effHolder.kind)}</span>
              <div className="mini">
                {(Object.keys(HOLDERS) as Exclude<HolderKind, "none">[]).map((h) => (
                  <button
                    key={h}
                    type="button"
                    className={effHolder.kind === h ? "on" : ""}
                    onClick={() => {
                      setHolder(h);
                      setHolderColor(null);
                    }}
                  >
                    {HOLDERS[h].label}
                  </button>
                ))}
                <button type="button" className={effHolder.kind === "none" ? "on" : ""} onClick={() => setHolder("none")}>
                  Nada
                </button>
              </div>
            </div>
            {effHolder.kind !== "none" && (
              <div className="crow">
                <span>color</span>
                <Swatches colors={HOLDERS[effHolder.kind].colors} value={effHolder.color} onPick={setHolderColor} />
              </div>
            )}
            <div className="crow">
              <span>fondo</span>
              <Swatches colors={STYLES[effStyle].papers} value={paper ?? STYLES[effStyle].papers[0]} onPick={setPaper} />
            </div>
            {effStyle !== "estampilla" && effStyle !== "pelicula" && (
              <div className="crow">
                <span>letra</span>
                <Swatches colors={INKS} value={ink} onPick={setInk} />
              </div>
            )}
            <label className="tilt">
              Inclinación
              <input
                type="range"
                min={-MAX_TILT}
                max={MAX_TILT}
                step={0.5}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
              />
              <span>{rotation}°</span>
            </label>
          </>
        )}

        <h2 className="q">Cuéntame qué es</h2>

        {meta.photo && (
          <div>
            <div className="row">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text").trim();
                  if (/^https?:\/\/\S+$/i.test(text)) void autofill(text);
                }}
                inputMode="url"
                placeholder="Pega el enlace y lo relleno por ti"
              />
              <button
                type="button"
                className="btn soft"
                style={{ flex: "none", fontSize: 18 }}
                disabled={fetching || !url.trim()}
                onClick={() => void autofill(url)}
              >
                {fetching ? "Leyendo…" : "Autocompletar"}
              </button>
            </div>
            {hint && <p className="hint">{hint}</p>}
          </div>
        )}

        {meta.photo && (
          <div
            className={`drop${dragOver ? " over" : ""}`}
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
            {preview && !removeImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- preview local (blob:) o foto de Storage
              <img src={preview} alt="" />
            ) : (
              <span>
                <span className="sm-only">Toca «Elegir» para subir la foto</span>
                <span className="lg-only">Pega aquí la foto (Ctrl/⌘ + V), arrástrala o elige un archivo</span>
              </span>
            )}
            <div className="pair">
              <label className="upl">
                📷 Elegir
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void takeImage(e.target.files[0])} />
              </label>
              {preview && !removeImage && (
                <button
                  type="button"
                  className="upl"
                  onClick={() => {
                    setImage(null);
                    setPreview(null);
                    setRemoveImage(true);
                  }}
                >
                  Quitar
                </button>
              )}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="fname">Nombre</label>
          <input
            id="fname"
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={meta.namePlaceholder}
          />
        </div>

        {category === "viaje" && (
          <div>
            <label htmlFor="fcode">Código del destino (3 letras)</label>
            <input
              id="fcode"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={name.replace(/[^a-zA-ZÁÉÍÓÚÑáéíóúñ0-9]/g, "").slice(0, 3).toUpperCase() || "CTG"}
            />
          </div>
        )}

        <div>
          <label htmlFor="fdesc">{category === "nota" ? "Escribe la notita" : "Descripción"}</label>
          <textarea
            id="fdesc"
            rows={category === "nota" ? 5 : 3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={category === "nota" ? "Escribe la nota…" : "Talla, color, modelo…"}
          />
        </div>

        {category !== "nota" && (
          <>
            <div className="row">
              <div>
                <label htmlFor="fprice">Precio</label>
                <input id="fprice" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div>
                <label htmlFor="fcur">Moneda</label>
                <select id="fcur" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            {!meta.photo && (
              <div>
                <label htmlFor="furl">Link</label>
                <input id="furl" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
              </div>
            )}
            <div>
              <span className="lbl">Prioridad</span>
              <div className="mini">
                {(Object.keys(KINDS) as ItemKind[]).map((k) => (
                  <button key={k} type="button" className={kind === k ? "on" : ""} onClick={() => setKind(k)}>
                    {KINDS[k].label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {category !== "nota" && (
          <div>
            <span className="lbl">{meta.photo ? "Si no hay foto, se ve este dibujo" : "Dibujo"}</span>
            <div className="emojis">
              {EMOJIS.map((e) => (
                <button key={e} type="button" className={(emoji ?? meta.emoji) === e ? "on" : ""} onClick={() => setEmoji(e)}>
                  {e}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 6 }}>
              <Swatches colors={BG_COLORS} value={bg ?? meta.bg} onPick={setBg} />
            </div>
          </div>
        )}

        {lockerOk && (
          <label className="check">
            <input type="checkbox" checked={needsLocker} onChange={(e) => setNeedsLocker(e.target.checked)} />
            📦 Requiere casillero (envío especial)
          </label>
        )}

        {editing && (
          <select value={status} onChange={(e) => setStatus(e.target.value as ItemStatus)}>
            {(Object.keys(STATUSES) as ItemStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUSES[s]}
              </option>
            ))}
          </select>
        )}

        {error && <p className="err">{error}</p>}

        <div className="acts" style={{ marginTop: 8 }}>
          <button type="button" className="btn soft" onClick={onCancel}>
            {editing ? "cancelar" : "← volver"}
          </button>
          <button className="btn pinkb" disabled={busy || !name.trim()}>
            {busy ? "Guardando…" : editing ? "guardar" : "pegar en el tablero"}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

function holderLabel(kind: Exclude<HolderKind, "none">) {
  return kind === "pin" ? "pin" : kind === "tape" ? "cinta" : "clip";
}
