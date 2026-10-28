"use client";

import { CATEGORIES, KINDS, STATUSES } from "@/lib/spaces";
import type { Item, ItemStatus } from "@/lib/types";

interface Props {
  item: Item;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (status: ItemStatus) => void;
  onClose: () => void;
}

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat("es", { style: "currency", currency }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

export function ItemView({ item, canEdit, onEdit, onDelete, onStatus, onClose }: Props) {
  const safeUrl = item.url && /^https?:\/\//i.test(item.url) ? item.url : null;

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden bg-stone-200">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- fotos de Supabase Storage
          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl text-stone-400">🎁</div>
        )}
      </div>

      <h2 className="font-hand text-4xl leading-tight text-stone-900">{item.name}</h2>

      <div className="flex flex-wrap gap-1.5 text-xs">
        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-amber-900">{CATEGORIES[item.category].label}</span>
        <span className="rounded-full bg-stone-800 px-2 py-0.5 text-white">{KINDS[item.kind].label}</span>
        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-stone-800">{STATUSES[item.status]}</span>
        {item.needs_locker && (
          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-amber-900">📦 Requiere casillero</span>
        )}
      </div>

      {item.price !== null && (
        <p className="text-2xl font-semibold text-stone-900">{formatPrice(item.price, item.currency)}</p>
      )}
      {item.description && <p className="whitespace-pre-wrap text-sm text-stone-700">{item.description}</p>}

      {safeUrl && (
        <a
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate rounded border border-stone-300 px-3 py-2 text-sm text-sky-800 underline"
        >
          {safeUrl}
        </a>
      )}

      {canEdit && (
        <div className="flex gap-1.5">
          {(Object.keys(STATUSES) as ItemStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => onStatus(s)}
              className={`flex-1 rounded border px-1 py-1.5 text-xs ${
                item.status === s ? "border-stone-800 bg-stone-800 text-white" : "border-stone-300 text-stone-700"
              }`}
            >
              {STATUSES[s]}
            </button>
          ))}
        </div>
      )}

      <div className="flex justify-between pt-1">
        {canEdit ? (
          <button
            onClick={() => confirm(`¿Quitar "${item.name}" del tablero?`) && onDelete()}
            className="px-2 py-1.5 text-sm text-red-700"
          >
            Eliminar
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          {canEdit && (
            <button onClick={onEdit} className="rounded border border-stone-400 px-3 py-1.5 text-sm text-stone-800">
              Editar
            </button>
          )}
          <button onClick={onClose} className="rounded bg-stone-800 px-4 py-1.5 text-sm text-white">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
