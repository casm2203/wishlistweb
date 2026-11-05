import { CATEGORIES, SPACES, formatPrice, holderOf, paperOf, styleOf } from "@/lib/spaces";
import type { Item } from "@/lib/types";

/** Texto legible sobre un papel: oscuro si el papel es claro y viceversa. */
export function textOn(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? "#2d211a" : "#ffffff";
}

/** Foto del artículo o, sin foto, su emoji. */
function Art({ item }: { item: Item }) {
  return item.image_url ? (
    // eslint-disable-next-line @next/next/no-img-element -- fotos de Supabase Storage, ya redimensionadas
    <img src={item.image_url} alt="" draggable={false} />
  ) : (
    (item.emoji ?? CATEGORIES[item.category].emoji)
  );
}

export function Clip({ color }: { color: string }) {
  const d = "M9 22 V58 a6.5 6.5 0 0 0 13 0 V13 a8.5 8.5 0 0 0 -17 0 V52";
  return (
    <svg className="clipsv" viewBox="0 0 26 74" width="24" height="68">
      <path d={d} fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" />
      <path d={d} fill="none" stroke="#ffffff80" strokeWidth="1" strokeLinecap="round" transform="translate(-.6 -.6)" />
    </svg>
  );
}

function Holder({ item }: { item: Item }) {
  const { kind, color } = holderOf(item);
  if (kind === "pin") return <div className="pp" style={{ "--c": color } as React.CSSProperties} />;
  if (kind === "tape") return <div className="tape" style={{ "--tp": color } as React.CSSProperties} />;
  if (kind === "clip") return <Clip color={color} />;
  return null;
}

function cityFont(name: string) {
  const n = name.length;
  return n <= 6 ? 40 : n <= 9 ? 33 : n <= 12 ? 26 : 20;
}

/** Título y texto de una nota. */
function NoteText({ item }: { item: Item }) {
  return (
    <>
      <h3>{item.name}</h3>
      {item.description && <p className="body">{item.description}</p>}
    </>
  );
}

function Body({ item }: { item: Item }) {
  const style = styleOf(item);
  const paper = paperOf(item);
  const vars = {
    "--p": paper,
    "--t": item.ink ?? textOn(paper),
    "--bg": item.bg ?? CATEGORIES[item.category].bg,
  } as React.CSSProperties;

  switch (style) {
    case "estampilla":
      return (
        <div className="sh">
          <div className="aB" style={vars}>
            <div className="in">
              <div className="art">
                <Art item={item} />
              </div>
            </div>
          </div>
        </div>
      );
    case "recibo": {
      const price = item.price ? formatPrice(item.price, item.currency) : "";
      return (
        <div className="sh">
          <div className="rc" style={vars}>
            <div className="rh">WISHLIST · {SPACES[item.space].sign}</div>
            <div className="rs">Nº {item.id.slice(0, 5).toUpperCase()}</div>
            <div className="rp">
              <Art item={item} />
            </div>
            <div className="rl">
              <span>{item.name || "\u00a0"}</span>
              <b>{price}</b>
            </div>
            <div className="rd" />
            <div className="rl t">
              <span>TOTAL</span>
              <b>{price}</b>
            </div>
            <div className="rb bc" />
            <div className="rt">gracias · vuelve pronto</div>
          </div>
        </div>
      );
    }
    case "boleta":
      return (
        <div className="sh">
          <div className="cB" style={vars}>
            <div className="art">
              <Art item={item} />
            </div>
            <h3>{item.name}</h3>
            <small>ADMIT ONE</small>
            <div className="bx">
              <div className="bc" />
              <div className="num">Nº {item.id.slice(0, 5).toUpperCase()}</div>
            </div>
          </div>
        </div>
      );
    case "pelicula":
      return (
        <div className="sh">
          <div className="cF" style={vars}>
            {[0, 1, 2].map((n) => (
              <div key={n} className="fr art">
                <Art item={item} />
              </div>
            ))}
          </div>
        </div>
      );
    case "correo": {
      const city = item.name.toUpperCase();
      const stripe = paper === "#1d5aa6" ? "#e3342f" : paper;
      const code = (item.code || city.replace(/[^A-ZÁÉÍÓÚÑ0-9]/g, "").slice(0, 3)).toUpperCase();
      return (
        <div className="sh">
          <div className="vA" style={{ ...vars, "--s": stripe } as React.CSSProperties}>
            <div className="tp">
              <div className="qr" />
              <div className="bc" />
            </div>
            <div className="mid">
              <div className="city" style={{ fontSize: cityFont(city) }}>
                {city}
              </div>
              <div className="info">
                <div className="code">{code}</div>
                <div className="small">PARA {SPACES[item.space].sign}</div>
                <div className="plane">
                  <Art item={item} />
                </div>
              </div>
            </div>
            <div className="bt bc" />
          </div>
        </div>
      );
    }
    case "postit":
      return (
        <div className="nA" style={vars}>
          <div className="b" />
          <div className="f nx">
            <NoteText item={item} />
          </div>
          <div className="curl" />
        </div>
      );
    case "cuaderno":
      return (
        <div className="sh">
          <div className="nC nx" style={vars}>
            <NoteText item={item} />
          </div>
        </div>
      );
    case "clasica":
      return (
        <div className="nK nx" style={{ ...vars, boxShadow: "3px 8px 12px rgba(0,0,0,.3)" } as React.CSSProperties}>
          <NoteText item={item} />
        </div>
      );
    case "ficha":
      // El papel de la ficha es crema; el color elegido es solo la franja de arriba.
      return (
        <div className="nI nx" style={{ ...vars, "--t": item.ink ?? "#2d211a", boxShadow: "0 8px 12px rgba(0,0,0,.3)" } as React.CSSProperties}>
          <NoteText item={item} />
        </div>
      );
    default:
      return (
        <div className="polaroid" style={vars}>
          <div className="art">
            <Art item={item} />
          </div>
          <div className="cap">{item.name}</div>
        </div>
      );
  }
}

/** Tarjeta con su sujetador, sellos de estado e insignia de casillero. `visitor`: texto del sello visto desde fuera. */
export function Card({ item, visitor = false }: { item: Item; visitor?: boolean }) {
  return (
    <div className={`it${item.status === "bought" ? " done" : ""}`} style={{ "--r": `${item.rotation}deg` } as React.CSSProperties}>
      <Holder item={item} />
      <Body item={item} />
      {item.status === "reserved" && <div className="stamp res">{visitor ? "YA RESERVADO" : "RESERVADO"}</div>}
      {item.status === "bought" && <div className="stamp com">¡YA LO TENGO!</div>}
    </div>
  );
}
