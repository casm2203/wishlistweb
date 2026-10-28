"use client";

import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Item, ItemDraft, ItemStatus, Space } from "@/lib/types";
import { BoardCanvas, type BoardApi } from "./BoardCanvas";
import { ItemForm } from "./ItemForm";
import { ItemView } from "./ItemView";
import { Modal } from "./Modal";
import { Banner } from "./Banner";
import { BoardItem } from "./BoardItem";
import { createItem, deleteItem, moveItem, setItemStatus, updateItem } from "./items";
import { clampItem, findFreeSpot } from "./placement";

const zoomBtn = "rounded-full bg-white/90 px-3.5 py-2 text-sm text-stone-800 shadow hover:bg-white";

type Dialog = { type: "new" } | { type: "view" | "edit"; id: string } | null;

interface Props {
  space: Space;
  initialItems: Item[];
  canEdit: boolean;
}

export function BoardClient({ space, initialItems, canEdit }: Props) {
  const [items, setItems] = useState(() => initialItems.map(clampItem));
  const [dialog, setDialog] = useState<Dialog>(null);
  const [showText, setShowText] = useState(true);
  const [liftedId, setLiftedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const api = useRef<BoardApi>(null);
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

  const fail = (err: unknown) => setError(err instanceof Error ? err.message : "Algo salió mal");

  const open = useCallback((id: string) => setDialog({ type: "view", id }), []);
  const onDragStart = useCallback((id: string) => {
    draggingId.current = id;
    setLiftedId(id);
  }, []);
  const onMove = useCallback((id: string, x: number, y: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, x, y } : i)));
  }, []);
  const onCommit = useCallback((id: string, x: number, y: number) => {
    draggingId.current = null;
    setLiftedId(null);
    moveItem(id, Math.round(x), Math.round(y)).catch(fail);
  }, []);

  const current = dialog && dialog.type !== "new" ? items.find((i) => i.id === dialog.id) : undefined;

  async function handleCreate(draft: ItemDraft) {
    const c = api.current!.center();
    const row = await createItem(space, draft, findFreeSpot(items, draft.category, c.x, c.y));
    upsert(row);
    setDialog(null);
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
      <BoardCanvas controlRef={api} onTextVisibleChange={setShowText}>
        <Banner space={space} />
        {items.map((item) => (
          <BoardItem
            key={item.id}
            item={item}
            showText={showText}
            canEdit={canEdit}
            lifted={liftedId === item.id}
            onOpen={open}
            onDragStart={onDragStart}
            onMove={onMove}
            onCommit={onCommit}
          />
        ))}
      </BoardCanvas>

      {items.length === 0 && (
        <p className="font-hand pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center text-2xl text-amber-950/60 sm:text-4xl">
          {canEdit ? "Tablero vacío: agrega tu primer artículo" : "Aquí todavía no hay nada"}
        </p>
      )}

      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
        {canEdit && (
          <button
            onClick={() => setDialog({ type: "new" })}
            className="rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white shadow-lg hover:bg-stone-700"
          >
            + Agregar artículo
          </button>
        )}
        <div className="flex justify-end gap-1.5">
          <button onClick={() => api.current?.zoomBy(1 / 1.25)} className={zoomBtn} aria-label="Alejar">
            −
          </button>
          <button onClick={() => api.current?.zoomBy(1.25)} className={zoomBtn} aria-label="Acercar">
            +
          </button>
          <button onClick={() => api.current?.fit()} className={zoomBtn}>
            Ver todo
          </button>
        </div>
      </div>

      {error && (
        <div
          onClick={() => setError(null)}
          className="absolute bottom-4 left-4 z-10 max-w-xs cursor-pointer rounded bg-red-600 px-3 py-2 text-sm text-white shadow"
        >
          {error}
        </div>
      )}

      {dialog?.type === "new" && (
        <Modal onClose={close}>
          <ItemForm onSubmit={handleCreate} onCancel={close} />
        </Modal>
      )}
      {current && dialog?.type === "view" && (
        <Modal onClose={close}>
          <ItemView
            item={current}
            canEdit={canEdit}
            onEdit={() => setDialog({ type: "edit", id: current.id })}
            onDelete={handleDelete}
            onStatus={handleStatus}
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
