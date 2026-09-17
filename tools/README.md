# 에셋 생성 스크립트

모두 Python. 저장소에는 생성 결과물이 이미 포함되어 있으므로
에셋을 바꾸고 싶을 때만 실행하면 된다.

```bash
pip install Pillow "rembg[cpu]" lameenc
```

| 스크립트 | 하는 일 |
|---|---|
| `make_popcat_frames.py <원본.jpg>` | 가로 2프레임 팝캣 밈 이미지를 분리 + 배경 제거 → `assets/images/popcat_{closed,open}.png` |
| `make_backgrounds.py` | 기분 단계별 배경 4장 → `assets/images/background_*.png` |
| `make_oiia_cat.py <원본>` | 검은 배경 OIIA 고양이 → 투명 배경 `assets/images/oiia_cat.png` |
| `make_sounds.py` | 효과음 / BGM 7개 합성 → `assets/sounds/*.mp3` |

`make_sounds.py` 가 만드는 `oiia_loop.mp3` 는 임시 루프다.
실제 OIIA OIIA 밈 사운드를 같은 이름으로 덮어쓰면 된다.
