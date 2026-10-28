"""Genera el favicon (✨ dorado con brillo): src/app/icon.svg, favicon.ico y apple-icon.png.

Ejecutar desde la raíz del proyecto: python3 scripts/make-favicon.py (requiere Pillow).
"""
from PIL import Image, ImageDraw, ImageFilter

# Estrellas de 4 puntas (cx, cy, radio) en un lienzo de 64×64: grande, pequeña arriba a la derecha y diminuta abajo a la izquierda.
STARS = [(28, 36, 22), (50, 14, 10), (13, 14, 6)]
FAT = 0.2  # qué tan "gorda" es la estrella (0 = muy afilada)


def star_path(cx, cy, r):
    c = FAT * r
    return (
        f"M{cx} {cy - r}Q{cx + c:.2f} {cy - c:.2f} {cx + r} {cy}"
        f"Q{cx + c:.2f} {cy + c:.2f} {cx} {cy + r}"
        f"Q{cx - c:.2f} {cy + c:.2f} {cx - r} {cy}"
        f"Q{cx - c:.2f} {cy - c:.2f} {cx} {cy - r}Z"
    )


svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="gold" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="#FFF6B8"/>
      <stop offset="0.45" stop-color="#FFD43B"/>
      <stop offset="1" stop-color="#F59E0B"/>
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.2" result="blur"/>
      <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 0.8 0 0 0  0 0 0.1 0 0  0 0 0 1.4 0" result="warm"/>
      <feMerge><feMergeNode in="warm"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g filter="url(#glow)" fill="url(#gold)">
    {''.join(f'<path d="{star_path(*s)}"/>' for s in STARS)}
  </g>
</svg>
"""
open("src/app/icon.svg", "w").write(svg)


def bezier(p0, p1, p2, n=24):
    return [
        ((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1])
        for t in (i / n for i in range(n + 1))
    ]


def star_points(cx, cy, r):
    c = FAT * r
    top, right, bottom, left = (cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)
    pts = []
    for a, ctrl, b in ((top, (cx + c, cy - c), right), (right, (cx + c, cy + c), bottom), (bottom, (cx - c, cy + c), left), (left, (cx - c, cy - c), top)):
        pts += bezier(a, ctrl, b)
    return pts


def render(size, background=None):
    ss = 4  # supersampling para bordes suaves
    big = size * ss
    k = big / 64
    mask = Image.new("L", (big, big), 0)
    d = ImageDraw.Draw(mask)
    for cx, cy, r in STARS:
        d.polygon([(x * k, y * k) for x, y in star_points(cx, cy, r)], fill=255)
    # Degradado dorado diagonal recortado con la máscara de las estrellas.
    grad = Image.new("RGB", (big, big))
    gp = grad.load()
    stops = [(0.0, (255, 246, 184)), (0.45, (255, 212, 59)), (1.0, (245, 158, 11))]
    for y in range(big):
        for x in range(big):
            t = (x * 0.35 + y * 0.65) / big
            for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
                if t <= t1:
                    u = max(0.0, (t - t0) / (t1 - t0))
                    gp[x, y] = tuple(round(a + (b - a) * u) for a, b in zip(c0, c1))
                    break
            else:
                gp[x, y] = stops[-1][1]
    stars = grad.convert("RGBA")
    stars.putalpha(mask)
    # Brillo: copia desenfocada y cálida debajo.
    glow = Image.new("RGBA", (big, big), (255, 196, 40, 0))
    glow.putalpha(mask.filter(ImageFilter.GaussianBlur(big * 0.035)).point(lambda v: min(255, int(v * 1.5))))
    out = Image.new("RGBA", (big, big), background or (0, 0, 0, 0))
    out.alpha_composite(glow)
    out.alpha_composite(stars)
    return out.resize((size, size), Image.LANCZOS)


render(256).save("src/app/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
render(180, background=(42, 28, 16, 255)).convert("RGB").save("src/app/apple-icon.png")
print("ok")
