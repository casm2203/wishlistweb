"use client";

import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ARRANGE_EVENT } from "@/components/BoardMenu";
import { createClient } from "@/lib/supabase/client";
import { STYLES } from "@/lib/spaces";
import type { CardStyle, Item, ItemCategory, ItemDraft, ItemStatus, Space } from "@/lib/types";
import { BoardStage, type StageApi } from "./BoardStage";
import { ItemForm, type Seed } from "./ItemForm";
import { ItemView } from "./ItemView";
import { Modal } from "./Modal";
import { Sign } from "./Sign";
import { Tray } from "./Tray";
import { BoardItem } from "./BoardItem";
import { createItem, deleteItem, layoutItem, reserveItem, setItemStatus, updateItem } from "./items";
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

interface Props {
  space: Space;
  initialItems: Item[];
  canEdit: boolean;
  /** Vista pública de solo lectura (portada y /ver/*). */
  readOnly: boolean;
  /** Reservar regalos: "yes" con sesión en tablero ajeno, "login" para visitantes, "no" en el resto. */
  reserve: "yes" | "login" | "no";
}

export function BoardClient({ space, initialItems, canEdit, readOnly, reserve }: Props) {
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

  // Cambios en vivo del otro usuario.
  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | undefined;
    let cancelled = false;

    const onChange = (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => {
      if (payload.eventType === "DELETE") {
        const id = (payload.old as { id: string }).id;
        setItems((prev) => prev.filter((i) => i.id !== id));
        return;
      }
      const row = clampItem(payload.new as unknown as Item);
      if (row.space !== space || row.id === draggingId.current) return;
      setItems((prev) =>
        prev.some((i) => i.id === row.id) ? prev.map((i) => (i.id === row.id ? row : i)) : [...prev, row],
      );
    };

    // El socket debe llevar el JWT del usuario antes de suscribirse; si no, RLS le oculta todo.
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      channel = supabase
        .channel(`items:${space}:${crypto.randomUUID()}`)
        .on(
          "postgres_changes",
          // Sin filtro por espacio: Realtime no entrega DELETE filtrados por columnas que no son la PK.
          { event: "*", schema: "public", table: "items" },
          onChange,
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [space]);

  const upsert = useCallback((raw: Item) => {
    const row = clampItem(raw);
    setItems((prev) => (prev.some((i) => i.id === row.id) ? prev.map((i) => (i.id === row.id ? row : i)) : [...prev, row]));
  }, []);

  // Los errores de Supabase son objetos {message, details, hint}, no instancias de Error.
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
    if (i) layoutItem(id, { x: i.x, y: i.y, scale: i.scale, rotation: i.rotation, z: i.z }).catch(fail);
  }, []);

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
    const row = await createItem(space, draft, { x: pending.x, y: pending.y, scale: pending.scale, z: top + 1 });
    upsert(row);
    setDialog(null);
    setTray(null);
    setNotice("¡Pegado en el tablero! 📌");
  }

  async function handleUpdate(draft: ItemDraft) {
    if (!current) return;
    const row = await updateItem(current, draft);
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
      await Promise.all([...pos].map(([id, p]) => layoutItem(id, p)));
      setNotice("¡Tarjetas acomodadas! ✿");
    } catch (err) {
      fail(err);
    }
  }

  // «Acomodar tarjetas» viene del menú hamburguesa; usamos siempre la última versión del manejador.
  const arrangeRef = useRef(handleArrange);
  useEffect(() => {
    arrangeRef.current = handleArrange;
  });
  useEffect(() => {
    const on = () => {
      if (!canEdit) setNotice("Aquí solo puedes mirar; acomoda desde tu tablero ✿");
      else if (itemsRef.current.length < 2) setNotice("Pega al menos dos tarjetas para acomodarlas ✿");
      else void arrangeRef.current();
    };
    window.addEventListener(ARRANGE_EVENT, on);
    return () => window.removeEventListener(ARRANGE_EVENT, on);
  }, [canEdit]);

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
          {canEdit ? "Este tablero está vacío… pega lo primero con el botón rosado ✿" : "Aquí todavía no hay nada ✿"}
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
          <Link href={space === "shared" ? "/" : `/ver/${space}`} className="eye" title="Ver como visitante" aria-label="Ver como visitante">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
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

      {canEdit && (
        <button onClick={() => setTray("pick")} className="fab">
          <b>+</b>pegar algo
        </button>
      )}
      {readOnly && <div className="banner">Así lo ve quien entra a regalarte algo ✿</div>}

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
          onBack={() => setTray("pick")}
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
