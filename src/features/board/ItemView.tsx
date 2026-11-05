"use client";

import { useState } from "react";
import { CATEGORIES, KINDS, STATUSES, formatPrice } from "@/lib/spaces";
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

/** Detalle de una tarjeta: su vista previa y, en hoja de cuaderno, todos los datos. */
export function ItemView({ item, canEdit, onEdit, onDelete, onStatus, reserve, onReserve, onClose }: Props) {
  const safeUrl = item.url && /^https?:\/\//i.test(item.url) ? item.url : null;
  const cat = CATEGORIES[item.category];
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <Sheet preview={<Card item={{ ...item, rotation: 0 }} visitor={!canEdit} />} onClose={onClose}>
      <div className="kind">
        {cat.icon} {cat.label.toUpperCase()}
      </div>
      {item.category !== "nota" && (
        <div className="dtop">
          <span className="ptape" style={{ "--pc": KINDS[item.kind].color } as React.CSSProperties}>
            {KINDS[item.kind].label}
          </span>
        </div>
      )}
      <h2>{item.name}</h2>
      {item.price !== null && item.price > 0 && <div className="big-price">{formatPrice(item.price, item.currency)}</div>}
      <div className="tags">
        <span className="tg">{cat.label}</span>
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

      {canEdit && confirmDel ? (
        <div className="confirm">
          <span>¿Seguro que quieres quitar «{item.name}» del tablero?</span>
          <button type="button" className="btn soft" onClick={() => setConfirmDel(false)}>
            no
          </button>
          <button type="button" className="btn danger" onClick={onDelete}>
            sí, quitar
          </button>
        </div>
      ) : canEdit ? (
        <div className="acts">
          <button type="button" className="btn del" onClick={() => setConfirmDel(true)}>
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
          {reserve === "yes" && item.status === "pending" && (
            <>
              <p className="desc">¿Se lo quieres regalar? Resérvalo para que nadie más lo compre.</p>
              <button type="button" className="btn pinkb" onClick={() => onReserve(true)}>
                yo se lo regalo 🎁
              </button>
            </>
          )}
          {item.status !== "pending" && (
            <p className="desc">Este ya está {item.status === "reserved" ? "reservado por alguien" : "comprado"}.</p>
          )}
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
