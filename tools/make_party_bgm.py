"""
OIIA 파티(MAX 이벤트) BGM 을 원본 곡에서 잘라 만든다.

    python3 tools/make_party_bgm.py <원본오디오> [시작초] [마디수]

- 시작초를 생략하면 8초 창을 훑어 "에너지가 높고 기복이 적은" 구간을 고른다
- 스펙트럴 플럭스로 템포를 추정하고, 가장 강한 온셋(다운비트)에 시작을 맞춘다
- 마디 단위로 잘라 음악적으로 끊기지 않게 한다
- 파티보다 살짝 길게 잘라 이벤트 도중에 곡이 떨어지지 않도록 한다
  (앱이 파티 종료 시 페이드아웃하므로 루프 이음새는 신경 쓰지 않아도 된다)
"""
import os
import sys

import numpy as np
import soundfile as sf
import lameenc

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "sounds", "oiia_loop.mp3")
BITRATE = 128
FADE_IN = 0.015
FADE_OUT = 0.10


def onset_envelope(mono: np.ndarray, sr: int, hop: int = 512, n: int = 2048):
    win = np.hanning(n)
    mag = np.array([np.abs(np.fft.rfft(mono[i:i + n] * win)) for i in range(0, len(mono) - n, hop)])
    flux = np.maximum(0, np.diff(mag, axis=0)).sum(axis=1)
    return (flux - flux.mean()) / (flux.std() + 1e-9), sr / hop


def estimate_bpm(flux: np.ndarray, fps: float) -> float:
    ac = np.correlate(flux, flux, "full")[len(flux) - 1:]
    lo, hi = int(fps * 60 / 180), int(fps * 60 / 60)
    return 60 * fps / (lo + int(np.argmax(ac[lo:hi])))


def pick_window(mono: np.ndarray, sr: int, seconds: float = 8.0) -> float:
    """에너지가 높고 고르게 유지되는 구간의 시작 시각(초)."""
    hop = sr // 4
    rms = np.array([np.sqrt((mono[i:i + hop] ** 2).mean()) for i in range(0, len(mono) - hop, hop)])
    db = 20 * np.log10(np.maximum(rms, 1e-6))
    w = int(seconds * 4)
    best, best_score = 0, -1e9
    for i in range(len(db) - w):
        seg = db[i:i + w]
        score = seg.mean() - 0.35 * seg.std()
        if score > best_score:
            best, best_score = i, score
    return best * 0.25


def snap_to_downbeat(flux: np.ndarray, fps: float, target: float, beat: float) -> float:
    lo = max(0, int((target - beat * 2) * fps))
    hi = min(len(flux), int((target + beat * 2) * fps))
    if hi <= lo:
        return target
    return (lo + int(np.argmax(flux[lo:hi]))) / fps


def main(src: str, start: float | None, bars: int | None) -> None:
    audio, sr = sf.read(src, dtype="float32", always_2d=True)
    mono = audio.mean(axis=1)

    flux, fps = onset_envelope(mono, sr)
    bpm = estimate_bpm(flux, fps)
    beat = 60.0 / bpm

    if start is None:
        start = snap_to_downbeat(flux, fps, pick_window(mono, sr), beat)
    if bars is None:
        # 파티 길이(8초)를 넘는 가장 짧은 마디 수
        bars = 1
        while bars * 4 * beat < 8.0:
            bars += 1
    length = bars * 4 * beat

    print(f"원본 {sf.info(src).duration:.1f}초 / BPM {bpm:.1f} / 비트 {beat:.3f}초")
    print(f"잘라낼 구간: {start:.3f}초부터 {bars}마디 = {length:.2f}초")

    i0 = int(start * sr)
    i1 = min(len(audio), i0 + int(length * sr))
    clip = audio[i0:i1].copy()

    # 클릭 방지용 짧은 페이드
    fi, fo = int(FADE_IN * sr), int(FADE_OUT * sr)
    clip[:fi] *= np.linspace(0, 1, fi)[:, None]
    clip[-fo:] *= np.linspace(1, 0, fo)[:, None]

    peak = float(np.abs(clip).max())
    clip *= min(4.0, 0.95 / max(peak, 1e-6))

    pcm = (np.clip(clip, -1, 1) * 32767).astype("<i2").tobytes()
    enc = lameenc.Encoder()
    enc.set_bit_rate(BITRATE)
    enc.set_in_sample_rate(sr)
    enc.set_channels(clip.shape[1])
    enc.set_quality(2)
    data = bytes(enc.encode(pcm) + enc.flush())
    with open(OUT, "wb") as f:
        f.write(data)
    print(f"-> {OUT}  ({len(data) // 1024} KB, {clip.shape[1]}ch {sr}Hz {BITRATE}kbps)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(1)
    main(
        sys.argv[1],
        float(sys.argv[2]) if len(sys.argv) > 2 else None,
        int(sys.argv[3]) if len(sys.argv) > 3 else None,
    )
