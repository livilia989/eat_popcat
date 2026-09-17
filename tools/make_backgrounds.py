"""
기분 단계별 배경 레이어(assets/images/background_*.png)를 생성한다.
앱은 이 4장을 opacity 로 겹쳐 mood 에 따라 부드럽게 전환한다.

    python3 tools/make_backgrounds.py
"""
import math, os, random
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "images")
W, H = 720, 1280


def vgrad(stops):
    """세로 그라디언트. stops = [(위치0~1, (r,g,b)), ...]"""
    img = Image.new("RGB", (1, H))
    px = img.load()
    for y in range(H):
        t = y / (H - 1)
        for i in range(len(stops) - 1):
            p0, c0 = stops[i]
            p1, c1 = stops[i + 1]
            if p0 <= t <= p1:
                k = 0 if p1 == p0 else (t - p0) / (p1 - p0)
                px[0, y] = tuple(round(c0[j] + (c1[j] - c0[j]) * k) for j in range(3))
                break
        else:
            px[0, y] = stops[-1][1]
    return img.resize((W, H), Image.BILINEAR).convert("RGBA")


def glow(base, cx, cy, radius, color, alpha=110):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=color + (alpha,))
    base.alpha_composite(layer.filter(ImageFilter.GaussianBlur(radius / 2.4)))


def star(d, cx, cy, r, color, points=5):
    pts = []
    for i in range(points * 2):
        ang = -math.pi / 2 + i * math.pi / points
        rr = r if i % 2 == 0 else r * 0.45
        pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
    d.polygon(pts, fill=color)


def heart(d, cx, cy, r, color):
    d.ellipse([cx - r, cy - r * 0.9, cx, cy + r * 0.1], fill=color)
    d.ellipse([cx, cy - r * 0.9, cx + r, cy + r * 0.1], fill=color)
    d.polygon([(cx - r, cy - r * 0.25), (cx + r, cy - r * 0.25), (cx, cy + r)], fill=color)


def flower(d, cx, cy, r, petal, core):
    for i in range(5):
        a = i * 2 * math.pi / 5
        px, py = cx + r * 0.75 * math.cos(a), cy + r * 0.75 * math.sin(a)
        d.ellipse([px - r * 0.6, py - r * 0.6, px + r * 0.6, py + r * 0.6], fill=petal)
    d.ellipse([cx - r * 0.42, cy - r * 0.42, cx + r * 0.42, cy + r * 0.42], fill=core)


# ---------------------------------------------------------------- 1. base
def make_base():
    img = vgrad([(0.0, (58, 50, 46)), (0.34, (86, 74, 66)), (0.55, (120, 105, 92)),
                 (0.75, (139, 122, 106)), (1.0, (108, 94, 82))])
    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle([0, int(H * 0.56), W, int(H * 0.60)], fill=(70, 58, 50, 180))  # 걸레받이
    glow(img, W // 2, int(H * 0.30), 300, (210, 190, 160), 26)
    for _ in range(14):  # 아주 옅은 먼지
        x, y = random.randrange(W), random.randrange(H)
        d.ellipse([x, y, x + 3, y + 3], fill=(255, 245, 225, 26))
    return img


# ---------------------------------------------------------------- 2. cozy
def make_cozy():
    img = vgrad([(0.0, (255, 226, 214)), (0.35, (255, 214, 196)), (0.6, (252, 226, 196)),
                 (0.82, (246, 214, 190)), (1.0, (236, 196, 176))])
    glow(img, int(W * 0.24), int(H * 0.20), 260, (255, 238, 196), 120)
    glow(img, int(W * 0.80), int(H * 0.30), 200, (255, 214, 208), 90)
    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle([0, int(H * 0.62), W, H], fill=(243, 205, 182, 110))          # 바닥
    d.rounded_rectangle([40, int(H * 0.70), 250, int(H * 0.86)], 34,
                        fill=(238, 176, 158, 80))                             # 쿠션
    # 화분
    d.polygon([(W - 190, int(H * 0.84)), (W - 90, int(H * 0.84)),
               (W - 104, H - 60), (W - 176, H - 60)], fill=(196, 130, 104, 95))
    for i, (dx, dy, rr) in enumerate([(-46, -110, 46), (0, -150, 52), (44, -104, 44)]):
        d.ellipse([W - 140 + dx - rr, int(H * 0.84) + dy - rr,
                   W - 140 + dx + rr, int(H * 0.84) + dy + rr], fill=(150, 190, 146, 85))
    for _ in range(22):
        x, y, r = random.randrange(W), random.randrange(H), random.randint(2, 5)
        d.ellipse([x, y, x + r, y + r], fill=(255, 250, 230, 90))
    return img


# ---------------------------------------------------------------- 3. happy
def make_happy():
    img = vgrad([(0.0, (255, 214, 232)), (0.3, (255, 226, 214)), (0.55, (255, 240, 204)),
                 (0.78, (214, 240, 236)), (1.0, (196, 226, 245))])
    glow(img, int(W * 0.5), int(H * 0.22), 320, (255, 246, 200), 130)
    glow(img, int(W * 0.14), int(H * 0.60), 190, (255, 200, 224), 96)
    glow(img, int(W * 0.88), int(H * 0.48), 190, (198, 228, 255), 96)
    d = ImageDraw.Draw(img, "RGBA")
    random.seed(7)
    for _ in range(16):
        heart(d, random.randrange(30, W - 30), random.randrange(60, H - 60),
              random.randint(10, 22), (255, 138, 170, random.randint(90, 160)))
    for _ in range(20):
        star(d, random.randrange(20, W - 20), random.randrange(40, H - 40),
             random.randint(7, 16), (255, 226, 130, random.randint(110, 190)))
    for _ in range(9):
        flower(d, random.randrange(50, W - 50), random.randrange(int(H * 0.5), H - 40),
               random.randint(18, 30), (255, 196, 214, 165), (255, 236, 150, 210))
    return img


# ---------------------------------------------------------------- 4. party
def make_party():
    img = vgrad([(0.0, (26, 10, 54)), (0.28, (62, 18, 104)), (0.5, (124, 26, 136)),
                 (0.72, (52, 22, 122)), (1.0, (16, 8, 46))])
    # 레이저 빔
    beams = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(beams)
    cx, cy = W // 2, int(H * 0.16)
    colors = [(255, 86, 170), (86, 200, 255), (255, 214, 86), (150, 110, 255), (86, 255, 190)]
    for i in range(14):
        a = -math.pi / 2 + (i - 6.5) * 0.30
        spread = 0.055
        p1 = (cx + 2000 * math.cos(a - spread), cy + 2000 * math.sin(a - spread))
        p2 = (cx + 2000 * math.cos(a + spread), cy + 2000 * math.sin(a + spread))
        bd.polygon([(cx, cy), p1, p2], fill=colors[i % len(colors)] + (60,))
    img.alpha_composite(beams.filter(ImageFilter.GaussianBlur(12)))

    glow(img, cx, cy, 240, (255, 150, 240), 150)
    glow(img, int(W * 0.12), int(H * 0.72), 220, (80, 190, 255), 120)
    glow(img, int(W * 0.90), int(H * 0.66), 220, (255, 220, 90), 110)

    d = ImageDraw.Draw(img, "RGBA")
    # 디스코볼
    br = 86
    d.line([cx, 0, cx, cy - br], fill=(220, 220, 255, 190), width=5)
    d.ellipse([cx - br, cy - br, cx + br, cy + br], fill=(190, 198, 236, 245))
    random.seed(3)
    for gx in range(-br, br, 17):
        for gy in range(-br, br, 17):
            if gx * gx + gy * gy < (br - 9) ** 2:
                c = random.choice([(255, 255, 255), (255, 170, 230), (150, 220, 255), (200, 190, 255)])
                d.rectangle([cx + gx, cy + gy, cx + gx + 13, cy + gy + 13],
                            fill=c + (random.randint(120, 245),))
    d.ellipse([cx - br, cy - br, cx + br, cy + br], outline=(255, 255, 255, 150), width=4)

    for _ in range(46):  # 반짝이
        x, y, r = random.randrange(W), random.randrange(H), random.randint(2, 6)
        d.ellipse([x, y, x + r, y + r], fill=(255, 255, 255, random.randint(120, 235)))
    for _ in range(14):
        star(d, random.randrange(20, W - 20), random.randrange(40, H - 40),
             random.randint(8, 20), random.choice([(255, 240, 140), (255, 140, 220),
                                                   (140, 230, 255)]) + (random.randint(140, 225),))
    # 무대 바닥
    floor = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    fd = ImageDraw.Draw(floor)
    for i in range(10):
        y0 = int(H * 0.80) + i * 26
        fd.rectangle([0, y0, W, y0 + 13],
                     fill=(255, 120, 220, max(0, 120 - i * 12)))
    img.alpha_composite(floor.filter(ImageFilter.GaussianBlur(4)))
    return img


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    random.seed(11)
    for name, fn in (("background_base", make_base), ("background_cozy", make_cozy),
                     ("background_happy", make_happy), ("background_party", make_party)):
        p = os.path.join(OUT, name + ".png")
        fn().convert("RGB").save(p, optimize=True)
        print(f"{name}.png -> {os.path.getsize(p) // 1024} KB")
