"""
원본 팝캣 밈 이미지(가로로 닫힌 입 / 벌린 입 두 프레임)를 잘라
assets/images/popcat_closed.png, popcat_open.png 를 생성한다.

사용법:
    python3 tools/make_popcat_frames.py <원본이미지경로>

- 두 프레임을 정확히 절반으로 분리
- rembg(u2net)로 배경 제거
- 벌린 입 프레임은 닫힌 입 마스크와 union 하여 몸통 누락 방지
- 두 프레임을 "동일한" 크롭 박스로 잘라 크기/위치를 일치시킴 (교차해도 흔들림 없음)
"""
import sys, os
from PIL import Image, ImageChops, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "images")
PAD = 8


def defringe(rgba: Image.Image) -> Image.Image:
    """반투명 가장자리의 배경색 번짐을 줄인다."""
    r, g, b, a = rgba.split()
    # 알파가 있는 영역의 색을 조금 확장해서 가장자리 헤일로를 덮는다
    grown = Image.merge("RGB", (r, g, b)).filter(ImageFilter.MaxFilter(3))
    gr, gg, gb = grown.split()
    mask = a.point(lambda v: 255 if v < 200 else 0)
    r.paste(gr, (0, 0), mask)
    g.paste(gg, (0, 0), mask)
    b.paste(gb, (0, 0), mask)
    return Image.merge("RGBA", (r, g, b, a))


def main(src_path: str) -> None:
    from rembg import remove, new_session

    os.makedirs(OUT, exist_ok=True)
    src = Image.open(src_path).convert("RGB")
    w, h = src.size
    closed_src = src.crop((0, 0, w // 2, h))
    open_src = src.crop((w // 2, 0, w, h))

    session = new_session("u2net")
    kw = dict(
        alpha_matting=True,
        alpha_matting_foreground_threshold=250,
        alpha_matting_background_threshold=15,
        alpha_matting_erode_size=6,
    )
    closed_cut = remove(closed_src, session=session, **kw)
    open_cut = remove(open_src, session=session, **kw)

    closed_a = closed_cut.split()[3]
    open_a = open_cut.split()[3]

    # 벌린 입 프레임은 rembg가 몸통을 놓치므로 닫힌 입 마스크와 합친다
    open_a = ImageChops.lighter(closed_a, open_a)
    open_a = open_a.filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.GaussianBlur(1.0))
    closed_a = closed_a.filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.GaussianBlur(0.8))

    closed = closed_src.convert("RGBA"); closed.putalpha(closed_a)
    opened = open_src.convert("RGBA"); opened.putalpha(open_a)

    # 두 프레임 공통 크롭 박스 -> 크기/위치 동일 보장
    b1, b2 = closed.getbbox(), opened.getbbox()
    box = (
        max(0, min(b1[0], b2[0]) - PAD),
        max(0, min(b1[1], b2[1]) - PAD),
        min(closed.width, max(b1[2], b2[2]) + PAD),
        min(closed.height, max(b1[3], b2[3]) + PAD),
    )

    for img, name in ((closed, "popcat_closed.png"), (opened, "popcat_open.png")):
        out = defringe(img.crop(box))
        path = os.path.join(OUT, name)
        out.save(path, optimize=True)
        print(f"{name}: {out.size} -> {path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(1)
    main(sys.argv[1])
