"""Recorta los letreros (fondo magenta) y los guarda como WebP con transparencia.

Ejecutar desde la raíz del proyecto: python3 scripts/cut-banners.py (requiere Pillow).
"""
from collections import deque
from PIL import Image, ImageFilter

JOBS = {"design-src/aviso cris.png": "public/avisos/aviso-cris.webp", "design-src/aviso melck.png": "public/avisos/aviso-melck.webp"}


def is_magenta(p):
    r, g, b = p[:3]
    return b - g > 60 and r - g > 60 and g < 140  # incluye la sombra magenta oscura bajo el letrero


def background(img):
    w, h = img.size
    px = img.load()
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_magenta(px[x, y]) and not seen[y * w + x]:
                seen[y * w + x] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_magenta(px[x, y]) and not seen[y * w + x]:
                seen[y * w + x] = 1
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and is_magenta(px[nx, ny]):
                seen[ny * w + nx] = 1
                q.append((nx, ny))
    mask = Image.new("L", (w, h), 255)
    mp = mask.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y][:3]
            # Además del fondo exterior, los agujeros del cordel (magenta encerrado) también se vacían.
            if seen[y * w + x] or (b - g > 45 and r - g > 45):
                mp[x, y] = 0
    return mask


for src, dst in JOBS.items():
    img = Image.open(src).convert("RGB")
    mask = background(img).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(0.9))
    rgba = img.convert("RGBA")
    rgba.putalpha(mask)
    box = mask.point(lambda v: 255 if v > 8 else 0).getbbox()
    rgba = rgba.crop((max(0, box[0] - 4), max(0, box[1] - 4), min(img.width, box[2] + 4), min(img.height, box[3] + 4)))
    rgba.save(dst, "WEBP", quality=93, method=6)
    print(dst, rgba.size)
