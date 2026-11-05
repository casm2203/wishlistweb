"use client";

/** Colores redondos para elegir, más un selector libre. `value` marca el activo. */
export function Swatches({ colors, value, onPick }: { colors: string[]; value: string | null; onPick: (c: string) => void }) {
  return (
    <div className="colors">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          className={value?.toLowerCase() === c.toLowerCase() ? "on" : ""}
          style={{ background: c }}
          onClick={() => onPick(c)}
        />
      ))}
      <input
        type="color"
        title="Otro color"
        value={value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff"}
        onChange={(e) => onPick(e.target.value)}
      />
    </div>
  );
}
