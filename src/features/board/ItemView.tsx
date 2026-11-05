"use client";

import { CATEGORIES, KINDS, STATUSES } from "@/lib/spaces";
import type { Item, ItemStatus } from "@/lib/types";
import { Card } from "./cards";
import { Sheet } from "./Sheet";

interface Props {
  item: Item;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (status: ItemStatus) => void;
  reserve: "yes" | "login" | "no";
  onReserve: (value: boolean) => void;
  onClose: () => void;
}

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat("es", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

/** Detalle de una tarjeta: su vista previa y, en hoja de cuaderno, todos los datos. */
export function ItemView({ item, canEdit, onEdit, onDelete, onStatus, reserve, onReserve, onClose }: Props) {
  const safeUrl = item.url && /^https?:\/\//i.test(item.url) ? item.url : null;
  const cat = CATEGORIES[item.category];

  return (
    <Sheet preview={<Card item={{ ...item, rotation: 0 }} visitor={!canEdit} />} onClose={onClose}>
      <div className="kind">
        {cat.icon} {cat.label.toUpperCase()}
      </div>
      <h2>{item.name}</h2>
      {item.price !== null && item.price > 0 && <div className="big-price">{formatPrice(item.price, item.currency)}</div>}
      <div className="tags">
        <span className="tg">{cat.label}</span>
        {item.category !== "nota" && <span className="tg">{KINDS[item.kind].label}</span>}
        {item.needs_locker && <span className="tg">📦 Requiere casillero</span>}
      </div>
      {item.description && <p className="desc">{item.description}</p>}
      {safeUrl && (
        <a className="link" href={safeUrl} target="_blank" rel="noopener noreferrer">
          🔗 {safeUrl}
        </a>
      )}

      <div className="stamps">
        {(Object.keys(STATUSES) as ItemStatus[]).map((s) => {
          // Dueño: los tres estados. Otra persona con sesión: solo pendiente <-> reservado. Visitante: solo lectura.
          const allowed = canEdit || (reserve === "yes" && s !== "bought" && item.status !== "bought");
          return (
            <button
              key={s}
              type="button"
              data-s={s}
              className={item.status === s ? "on" : ""}
              disabled={!allowed}
              style={allowed ? undefined : { cursor: "default" }}
              onClick={() => {
                if (item.status === s) return;
                if (canEdit) onStatus(s);
                else onReserve(s === "reserved");
              }}
            >
              {STATUSES[s].toUpperCase()}
            </button>
          );
        })}
      </div>

      {canEdit ? (
        <div className="acts">
          <button
            type="button"
            className="btn del"
            onClick={() => confirm(`¿Quitar "${item.name}" del tablero?`) && onDelete()}
          >
            despegar del tablero
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn soft" onClick={onEdit}>
              editar
            </button>
            <button type="button" className="btn" onClick={onClose}>
              listo
            </button>
          </div>
        </div>
      ) : (
        <>
          {reserve === "login" && item.status === "pending" && (
            <p className="desc">
              ¿Quieres regalarlo? <a href="/login" style={{ textDecoration: "underline" }}>Inicia sesión</a> para reservarlo.
            </p>
          )}
          <div className="acts" style={{ justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn" onClick={onClose}>
              listo
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
