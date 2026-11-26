"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { STYLES } from "@/lib/spaces";
import type { CardStyle, Item, ItemCategory, ItemDraft, ItemStatus, Space } from "@/lib/types";
import { BoardStage, type StageApi } from "./BoardStage";
import { ItemForm, type Seed } from "./ItemForm";
import { ItemView } from "./ItemView";
import { Modal } from "./Modal";
import { Sign } from "./Sign";
import { Tray } from "./Tray";
import { BoardItem } from "./BoardItem";
import { createItem, deleteItem, layoutItem, layoutMany, reserveItem, setItemStatus, updateItem } from "./items";
import { clampItem, clampToBoard, packRows, worldHeight } from "./placement";

type Dialog = { type: "view" | "edit"; id: string } | { type: "info" } | null;

/** Tarjeta provisional que se está pegando desde la bandeja (todavía sin guardar). */
type Pending = Pick<Item, "category" | "style" | "x" | "y" | "scale" | "rotation" | "holder" | "holder_color" | "paper" | "ink">;

/** La tarjeta provisional como un Item, para dibujarla igual que las guardadas. */
function pendingItem(p: Pending, space: Space): Item {
  return {
    id: "pending-card",
    space,
    name: "",
    description: "",
    price: null,
    currency: "COP",
    url: null,
    image_url: null,
    needs_locker: false,
    kind: "want",
    status: "pending",
    bg: null,
    emoji: "",
    code: null,
    z: 9999,
    created_by: null,
    created_at: "",
    updated_at: "",
    ...p,
    holder: p.holder ?? "none",
  };
}

function Grid() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
      <path d="M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z" />
    </svg>
  );
}

function Eye() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

interface Props {
  space: Space;
  /** Tablero editable al que se vuelve desde la vista de visitante (null sin sesión). */
  editHref: string | null;
  initialItems: Item[];
  canEdit: boolean;
  /** Vista pública de solo lectura (portada y /ver/*). */
  readOnly: boolean;
  /** Reservar regalos: "yes" con sesión en tablero ajeno, "login" para visitantes, "no" en el resto. */
  reserve: "yes" | "login" | "no";
}

export function BoardClient({ space, editHref, initialItems, canEdit, readOnly, reserve }: Props) {
  const [items, setItems] = useState(() => initialItems.map(clampItem));
  const [dialog, setDialog] = useState<Dialog>(null);
  const [liftedId, setLiftedId] = useState<string | null>(null);
  // Bandeja: null = cerrada; "pick" = elegir tarjeta; Pending = ya soltada en el corcho.
  const [tray, setTray] = useState<null | "pick" | Pending>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const stage = useRef<StageApi>(null);
  const [zoom, setZoom] = useState(1);
  const zoomBy = (d: number) => setZoom((z) => Math.min(1.6, Math.max(0.5, Math.round((z + d) * 100) / 100)));
  const [error, setError] = useState<string | null>(null);
  const draggingId = useRef<string | null>(null);

  // Cambios del otro usuario: se consulta la lista cada pocos segundos mientras la pestaña está visible
  // (Vercel no mantiene conexiones largas, así que no hay realtime). No se pisa lo que se arrastra o guarda.
  const inflight = useRef(0);
  const knownIds = useRef(new Set(initialItems.map((i) => i.id)));
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      if (stopped) return;
      if (document.visibilityState === "visible" && draggingId.current === null && inflight.current === 0) {
        try {
          const res = await fetch(`/api/items/${space}`, { cache: "no-store" });
          if (res.ok && !stopped && draggingId.current === null && inflight.current === 0) {
            const rows = ((await res.json()) as Item[]).map(clampItem);
            const serverIds = new Set(rows.map((r) => r.id));
            setItems((prev) => {
              // Solo se borran las que el servidor ya conocía y ahora faltan (no las recién creadas aquí).
              const kept = prev.filter((i) => serverIds.has(i.id) || !knownIds.current.has(i.id));
              const byId = new Map(rows.map((r) => [r.id, r]));
              const merged = kept.map((i) => byId.get(i.id) ?? i);
              const added = rows.filter((r) => !prev.some((i) => i.id === r.id));
              const next = [...merged, ...added];
              return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
            });
            knownIds.current = serverIds;
          }
        } catch {
          // Sin red o base caída: se reintenta en el siguiente ciclo.
        }
      }
      timer = setTimeout(tick, 5000);
    };
    timer = setTimeout(tick, 5000);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [space]);

  /** Marca una escritura en curso para que el sondeo no pise el estado local mientras se guarda. */
  const track = useCallback(async <T,>(p: Promise<T>): Promise<T> => {
    inflight.current++;
    try {
      return await p;
    } finally {
      inflight.current--;
    }
  }, []);

  const upsert = useCallback((raw: Item) => {
    const row = clampItem(raw);
    setItems((prev) => (prev.some((i) => i.id === row.id) ? prev.map((i) => (i.id === row.id ? row : i)) : [...prev, row]));
  }, []);

  // Los errores pueden ser objetos con `message` y no instancias de Error.
  const fail = (err: unknown) => {
    console.error(err);
    const m = (err as { message?: unknown } | null)?.message;
    setError(typeof m === "string" && m ? m : "Algo salió mal");
  };

  const open = useCallback((id: string) => setDialog({ type: "view", id }), []);
  // Siempre lo último, para guardar sin depender del render en que se creó el callback.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  });

  const onDragStart = useCallback((id: string) => {
    draggingId.current = id;
    setLiftedId(id);
    // La tarjeta que se mueve queda encima de las demás.
    setItems((prev) => {
      const top = prev.reduce((m, i) => Math.max(m, i.z), 0);
      return prev.map((i) => (i.id === id ? { ...i, z: top + 1 } : i));
    });
  }, []);
  const onChange = useCallback((id: string, patch: Partial<Pick<Item, "x" | "y" | "scale" | "rotation">>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);
  const onCommit = useCallback((id: string) => {
    draggingId.current = null;
    setLiftedId(null);
    const i = itemsRef.current.find((x) => x.id === id);
    if (i) track(layoutItem(id, { x: i.x, y: i.y, scale: i.scale, rotation: i.rotation, z: i.z })).catch(fail);
  }, [track]);

  const current = dialog && dialog.type !== "info" ? items.find((i) => i.id === dialog.id) : undefined;
  const pending = tray && tray !== "pick" ? tray : null;
  const pendingCard = pending ? pendingItem(pending, space) : null;

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2200);
    return () => clearTimeout(t);
  }, [notice]);

  /** Suelta una tarjeta del catálogo en (cx, cy) de pantalla; sin coordenadas, en el centro de lo que se ve sobre la bandeja. */
  function handlePlace(category: ItemCategory, style: CardStyle, cx?: number, cy?: number) {
    const point = stage.current!.toWorld(cx ?? window.innerWidth / 2, cy ?? window.innerHeight * 0.32);
    const size = STYLES[style];
    const shape = { category, style, scale: 1 };
    const pos = clampToBoard(shape, point.x - size.w / 2, point.y - size.h / 2);
    setTray({
      category,
      style,
      ...pos,
      scale: 1,
      rotation: Math.round((Math.random() - 0.5) * 9 * 10) / 10,
      holder: null,
      holder_color: null,
      paper: null,
      ink: null,
    });
  }

  const onPendingChange = useCallback((_id: string, patch: Partial<Pick<Item, "x" | "y" | "scale" | "rotation">>) => {
    setTray((t) => (t && t !== "pick" ? { ...t, ...patch } : t));
  }, []);
  const noop = useCallback(() => {}, []);

  async function handleCreate(draft: ItemDraft) {
    if (!pending) return;
    const top = items.reduce((m, i) => Math.max(m, i.z), 0);
    const row = await track(createItem(space, draft, { x: pending.x, y: pending.y, scale: pending.scale, z: top + 1 }));
    knownIds.current.add(row.id);
    upsert(row);
    setDialog(null);
    setTray(null);
    setNotice("¡Pegado en el tablero! 📌");
  }

  async function handleUpdate(draft: ItemDraft) {
    if (!current) return;
    const row = await track(updateItem(current, draft));
    upsert(row);
    setDialog({ type: "view", id: row.id });
  }

  async function handleStatus(status: ItemStatus) {
    if (!current) return;
    try {
      upsert(await setItemStatus(current.id, status));
    } catch (err) {
      fail(err);
    }
  }

  async function handleReserve(value: boolean) {
    if (!current) return;
    try {
      upsert(await reserveItem(current.id, value));
      setNotice(value ? "¡Reservado! No verá quién fue 🎁" : "Reserva liberada");
    } catch (err) {
      fail(err);
    }
  }

  /** Reacomoda todas las tarjetas del tablero en filas y guarda las nuevas posiciones. */
  async function handleArrange() {
    if (!confirm("¿Acomodar todas las tarjetas en filas? Cambiará su posición en el tablero.")) return;
    const pos = packRows(items);
    setItems((prev) => prev.map((i) => (pos.has(i.id) ? { ...i, ...pos.get(i.id)! } : i)));
    try {
      await track(layoutMany([...pos].map(([id, p]) => ({ id, x: p.x, y: p.y }))));
      setNotice("¡Tarjetas acomodadas! ✿");
    } catch (err) {
      fail(err);
    }
  }

  async function handleDelete() {
    if (!current) return;
    try {
      await deleteItem(current.id);
      setItems((prev) => prev.filter((i) => i.id !== current.id));
      setDialog(null);
    } catch (err) {
      fail(err);
    }
  }

  const close = () => setDialog(null);

  return (
    <>
      <Sign space={space} />

      <BoardStage controlRef={stage} zoom={zoom} height={worldHeight(pendingCard ? [...items, pendingCard] : items)}>
        {items.map((item) => (
          <BoardItem
            key={item.id}
            item={item}
            canEdit={canEdit}
            visitor={readOnly}
            lifted={liftedId === item.id}
            onOpen={open}
            onDragStart={onDragStart}
            onChange={onChange}
            onCommit={onCommit}
          />
        ))}
        {pendingCard && (
          <BoardItem
            key="pending"
            item={pendingCard}
            canEdit
            tmp
            visitor={false}
            lifted={false}
            onOpen={noop}
            onDragStart={noop}
            onChange={onPendingChange}
            onCommit={noop}
          />
        )}
      </BoardStage>

      {items.length === 0 && (
        <p className="empty">
          {canEdit ? "Este tablero está vacío… agrega lo primero ✿" : "Aquí todavía no hay nada ✿"}
        </p>
      )}

      {/* stickers decorativos */}
      <div
        className="deco badge hide-sm"
        style={{ left: "3%", top: 150, width: 74, height: 74, background: "#f4b9c1", color: "#7a2b3c", fontFamily: "var(--hand)", fontSize: 19, transform: "rotate(-12deg)" }}
      >
        <span>
          wish
          <br />
          list
          <br />♡
        </span>
      </div>
      <div
        className="deco badge hide-sm"
        style={{ right: "2.5%", top: 250, width: 70, height: 70, background: "#26306b", color: "#fff", fontFamily: "var(--type)", fontSize: 11, letterSpacing: 1, transform: "rotate(10deg)" }}
      >
        <span>
          CRIS
          <br />&amp;
          <br />
          MELCK
        </span>
      </div>

      <div className="dock">
        {canEdit && (
          <button type="button" className="addbtn" onClick={() => setTray("pick")}>
            + Agregar artículo
          </button>
        )}
        <div className="drow">
          {canEdit && items.length > 1 && (
            <button type="button" className="zb arrange" title="Acomodar tarjetas" aria-label="Acomodar tarjetas" onClick={handleArrange}>
              <Grid />
            </button>
          )}
          {canEdit && (
            <Link href={space === "shared" ? "/" : `/ver/${space}`} className="eye" title="Ver como visitante" aria-label="Ver como visitante">
              <Eye />
            </Link>
          )}
          {readOnly && editHref && (
            <Link href={editHref} className="eye on" title="Volver a editar" aria-label="Volver a editar">
              <Eye />
            </Link>
          )}
          <button type="button" className="zb" aria-label="Alejar" onClick={() => zoomBy(-0.15)}>
            −
          </button>
          <button type="button" className="zb" aria-label="Acercar" onClick={() => zoomBy(0.15)}>
            +
          </button>
          {zoom !== 1 && (
            <button type="button" className="zb all" onClick={() => setZoom(1)}>
              ver todo
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          onClick={() => setError(null)}
          className="fixed bottom-24 left-4 z-30 max-w-xs cursor-pointer rounded bg-red-600 px-3 py-2 text-sm text-white shadow"
        >
          {error}
        </div>
      )}

      {tray && (
        <Tray
          tmp={pendingCard}
          onPlace={handlePlace}
          onHolder={(holder) => setTray((t) => (t && t !== "pick" ? { ...t, holder, holder_color: null } : t))}
          onPatch={(patch) => setTray((t) => (t && t !== "pick" ? { ...t, ...patch } : t))}
          onBack={() => setTray((t) => (t && t !== "pick" && t.holder ? { ...t, holder: null, holder_color: null } : "pick"))}
          onNext={() => setDialog({ type: "info" })}
          onClose={() => setTray(null)}
        />
      )}
      {dialog?.type === "info" && pending && (
        <Modal onClose={close}>
          <ItemForm
            seed={{
              category: pending.category,
              style: pending.style,
              paper: pending.paper,
              ink: pending.ink,
              holder: pending.holder,
              holder_color: pending.holder_color,
              rotation: pending.rotation,
            } satisfies Seed}
            onSubmit={handleCreate}
            onCancel={close}
          />
        </Modal>
      )}
      {notice && <div className="banner" style={{ bottom: 130 }}>{notice}</div>}
      {current && dialog?.type === "view" && (
        <Modal onClose={close}>
          <ItemView
            item={current}
            canEdit={canEdit}
            onEdit={() => setDialog({ type: "edit", id: current.id })}
            onDelete={handleDelete}
            onStatus={handleStatus}
            reserve={reserve}
            onReserve={handleReserve}
            onClose={close}
          />
        </Modal>
      )}
      {current && dialog?.type === "edit" && (
        <Modal onClose={close}>
          <ItemForm item={current} onSubmit={handleUpdate} onCancel={() => setDialog({ type: "view", id: current.id })} />
        </Modal>
      )}
    </>
  );
}
