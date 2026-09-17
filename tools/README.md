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
| `make_sounds.py [이름]` | 효과음 합성 → `assets/sounds/*.mp3` (BGM 은 건드리지 않는다) |
| `make_party_bgm.py <곡> [시작초] [마디]` | 원본 곡에서 파티 구간을 잘라 `assets/sounds/oiia_loop.mp3` 생성 |

파티 BGM(`oiia_loop.mp3`)은 `make_party_bgm.py` 가 담당한다.
템포를 추정해 다운비트에 맞추고 마디 단위로 자르며,
실수로 덮어쓰지 않도록 `make_sounds.py` 에서는 아예 만들지 않는다.
