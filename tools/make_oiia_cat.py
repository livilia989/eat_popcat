"""
OIIA 고양이(검은 배경 위의 턱시도 태비) 이미지를 투명 배경 PNG 로 만든다.
MAX 이벤트에서 메인 팝캣 주위를 함께 회전하는 위성 캐릭터로 쓰인다.

    python3 tools/make_oiia_cat.py <원본이미지>

- 검정 배경 키잉 + rembg 마스크를 교차 적용해 어두운 털이 날아가지 않게 한다
- 여백을 잘라내고 정사각형 캔버스에 중앙 정렬 (회전 시 중심이 흔들리지 않도록)
"""
import os, sys
from PIL import Image, ImageChops, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "images", "oiia_cat.png")
PAD = 10


def luma_key(rgb: Image.Image) -> Image.Image:
    """검정 배경을 알파로. 어두운 털까지 지우지 않도록 완만한 램프를 쓴다."""
    gray = rgb.convert("L")
    lo, hi = 14, 46
    return gray.point(lambda v: 0 if v <= lo else (255 if v >= hi else int((v - lo) * 255 / (hi - lo))))


def main(src_path: str) -> None:
    from rembg import remove, new_session

    src = Image.open(src_path).convert("RGB")
    key = luma_key(src)

    cut = remove(src, session=new_session("u2net"))
    seg = cut.split()[3]
    # rembg 가 잡은 실루엣 안쪽은 검정 키잉을 무시하고 전부 불투명 처리한다.
    # (고양이 몸의 어두운 부분이 배경으로 오인되는 것을 막는다)
    solid = seg.point(lambda v: 255 if v > 170 else 0).filter(ImageFilter.MinFilter(5))
    alpha = ImageChops.lighter(ImageChops.multiply(key, seg.point(lambda v: 255 if v > 40 else 0)), solid)
    alpha = alpha.filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.GaussianBlur(0.8))

    img = src.convert("RGBA")
    img.putalpha(alpha)

    box = img.getbbox()
    box = (max(0, box[0] - PAD), max(0, box[1] - PAD),
           min(img.width, box[2] + PAD), min(img.height, box[3] + PAD))
    cat = img.crop(box)

    # 정사각형 캔버스 중앙 정렬 -> 회전 중심이 캐릭터 중심과 일치한다
    side = max(cat.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.alpha_composite(cat, ((side - cat.width) // 2, (side - cat.height) // 2))
    canvas = canvas.resize((360, 360), Image.LANCZOS)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    canvas.save(OUT, optimize=True)
    print(f"oiia_cat.png: {canvas.size} -> {OUT} ({os.path.getsize(OUT)//1024} KB)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(1)
    main(sys.argv[1])
