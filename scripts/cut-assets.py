import sys
from collections import deque
from PIL import Image, ImageFilter

SRC = "design-src/"  # imágenes originales (ejecutar desde la raíz del proyecto)
OUT = "design-src/_cut/"  # revisar y mover a public/pins y public/tickets

def flood_mask(img, is_bg):
    """Fondo = píxeles que cumplen is_bg conectados con el borde."""
    w, h = img.size
    px = img.load()
    bg = bytearray(w * h)
    q = deque()
    def push(x, y):
        i = y * w + x
        if not bg[i] and is_bg(px[x, y]):
            bg[i] = 1
            q.append((x, y))
    for x in range(w):
        push(x, 0); push(x, h - 1)
    for y in range(h):
        push(0, y); push(w - 1, y)
    while q:
        x, y = q.popleft()
        if x > 0: push(x - 1, y)
        if x < w - 1: push(x + 1, y)
        if y > 0: push(x, y - 1)
        if y < h - 1: push(x, y + 1)
    mask = Image.new("L", (w, h), 255)
    mp = mask.load()
    for y in range(h):
        for x in range(w):
            if bg[y * w + x]:
                mp[x, y] = 0
    return mask

def finish(img, mask, name, pad=2):
    # Borde limpio: erosiona 1px (quita halo del fondo) y suaviza el canal alfa.
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    rgba = img.convert("RGBA")
    rgba.putalpha(mask)
    box = mask.point(lambda v: 255 if v > 8 else 0).getbbox()
    box = (max(0, box[0] - pad), max(0, box[1] - pad), min(img.width, box[2] + pad), min(img.height, box[3] + pad))
    rgba = rgba.crop(box)
    rgba.save(OUT + name, optimize=True)
    print(name, rgba.size)

def neutral_light(p):
    r, g, b = p[:3]
    return min(r, g, b) >= 205 and max(r, g, b) - min(r, g, b) <= 14

# Pines: hoja 3x3 sobre blanco
sheet = Image.open(SRC + "pines .jpg").convert("RGB")
names = ["red", "green", "pink", "blue", "black", "cyan", "yellow", "mint", "purple"]
cw = sheet.width / 3
for i, n in enumerate(names):
    cx, cy = i % 3, i // 3
    cell = sheet.crop((round(cx * cw), round(cy * cw), round((cx + 1) * cw), round((cy + 1) * cw)))
    finish(cell, flood_mask(cell, neutral_light), f"pin-{n}.png")

# Ganchito
clip = Image.open(SRC + "ganchito.jpeg").convert("RGB")
finish(clip, flood_mask(clip, neutral_light), "clip.png")

def near(ref, tol):
    def f(p):
        return sum((a - b) ** 2 for a, b in zip(p[:3], ref)) <= tol * tol
    return f

cine = Image.open(SRC + "ticket cine.jpeg").convert("RGB")
finish(cine, flood_mask(cine, near(cine.getpixel((2, 2)), 38)), "ticket-cine.png")
viaje = Image.open(SRC + "ticketviaje.jpg").convert("RGB")
finish(viaje, flood_mask(viaje, near(viaje.getpixel((2, 2)), 62)), "ticket-viaje.png")
