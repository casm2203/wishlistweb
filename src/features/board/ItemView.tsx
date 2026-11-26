"use client";

import { useState } from "react";
import { KINDS, STATUSES, formatPrice } from "@/lib/spaces";
import type { Item, ItemStatus } from "@/lib/types";
import { PaperSheet, PhotoBox } from "./Sheet";

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

/** Detalle de una tarjeta en hoja cuadriculada; las notas se ven como su propio papel. */
export function ItemView({ item, canEdit, onEdit, onDelete, onStatus, reserve, onReserve, onClose }: Props) {
  const safeUrl = item.url && /^https?:\/\//i.test(item.url) ? item.url : null;
  const [confirmDel, setConfirmDel] = useState(false);
  const price = item.price !== null && item.price > 0 ? formatPrice(item.price, item.currency) : null;

  return (
    <PaperSheet
      item={item}
      onClose={onClose}
      aside={
        <>
          <PhotoBox item={item} />
          {safeUrl && (
            <a className="phlink" href={safeUrl} target="_blank" rel="noopener noreferrer">
              ver en la tienda
            </a>
          )}
        </>
      }
    >
      <div className="xr">
        <h2>{item.name}</h2>
        {price && (
          <div className="nrow">
            <span>Precio</span>
            <b>{price}</b>
          </div>
        )}
        <div className="nrow">
          <span>Prioridad</span>
          <b>{KINDS[item.kind].label}</b>
        </div>
        {item.needs_locker && (
          <div className="nrow">
            <span>Envío</span>
            <b>Requiere casillero</b>
          </div>
        )}
        {item.description && (
          <div className="nrow">
            <span>Notas</span>
            <b className="sm">{item.description}</b>
          </div>
        )}

        {canEdit ? (
          <>
            <div className="nchk">
              {(Object.keys(STATUSES) as ItemStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={item.status === s ? "on" : ""}
                  aria-pressed={item.status === s}
                  onClick={() => item.status !== s && onStatus(s)}
                >
                  <i />
                  {STATUSES[s].toLowerCase()}
                </button>
              ))}
            </div>
            {confirmDel ? (
              <div className="confirm">
                <span>¿Seguro que lo quieres eliminar?</span>
                <button type="button" className="wbtn plain" onClick={() => setConfirmDel(false)}>
                  no
                </button>
                <button type="button" className="wbtn plain danger" onClick={onDelete}>
                  sí, eliminar
                </button>
              </div>
            ) : (
              <div className="acts">
                <button type="button" className="wbtn del" onClick={() => setConfirmDel(true)}>
                  eliminar
                </button>
                <button type="button" className="wbtn" onClick={onEdit}>
                  editar
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="guestbox">
            {item.status === "pending" ? (
              reserve !== "no" && (
                <>
                  <p>¿Se lo quieres regalar? Resérvalo para que nadie más lo compre.</p>
                  {reserve === "yes" ? (
                    <button type="button" className="gbtn" onClick={() => onReserve(true)}>
                      yo se lo regalo
                    </button>
                  ) : (
                    <a className="gbtn" href="/login">
                      inicia sesión para reservarlo
                    </a>
                  )}
                </>
              )
            ) : (
              <>
                <p>Este ya está {item.status === "reserved" ? "reservado por alguien" : "comprado"}.</p>
                {reserve === "yes" && item.status === "reserved" && (
                  <button type="button" className="gbtn" onClick={() => onReserve(false)}>
                    liberar la reserva
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </PaperSheet>
  );
}
