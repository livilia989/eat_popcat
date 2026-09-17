"""
assets/sounds/*.mp3 placeholder 사운드를 합성한다.
oiia_loop.mp3 는 사용자가 실제 OIIA OIIA 밈 사운드로 교체하는 것을 전제로 한 임시 루프다.

    python3 tools/make_sounds.py
"""
import math, os, random, struct
import lameenc

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "sounds")
SR = 44100


def env(n, attack=0.005, release=0.08, hold=0.0):
    a, hnum, r = int(SR * attack), int(SR * hold), int(SR * release)
    out = []
    for i in range(n):
        if i < a:
            out.append(i / max(1, a))
        elif i < a + hnum:
            out.append(1.0)
        else:
            k = (i - a - hnum) / max(1, r)
            out.append(math.exp(-3.2 * k) if k < 1.6 else 0.0)
    return out


def sine(f0, f1, dur, amp=0.7, atk=0.004, rel=0.09, hold=0.0):
    n = int(SR * dur)
    e = env(n, atk, rel, hold)
    buf, ph = [], 0.0
    for i in range(n):
        f = f0 + (f1 - f0) * (i / max(1, n - 1))
        ph += 2 * math.pi * f / SR
        buf.append(amp * e[i] * math.sin(ph))
    return buf


def noise(dur, amp=0.5, atk=0.002, rel=0.05, lp=0.35, hold=0.0):
    n = int(SR * dur)
    e = env(n, atk, rel, hold)
    buf, prev = [], 0.0
    for i in range(n):
        prev += lp * (random.uniform(-1, 1) - prev)
        buf.append(amp * e[i] * prev)
    return buf


def mix(*layers):
    n = max(len(l) for l in layers)
    out = [0.0] * n
    for l in layers:
        for i, v in enumerate(l):
            out[i] += v
    return out


def seq(parts, gap=0.0):
    out = []
    for p in parts:
        out.extend(p)
        out.extend([0.0] * int(SR * gap))
    return out


def write(name, samples, bitrate=96):
    peak = max(1e-9, max(abs(s) for s in samples))
    g = min(1.0, 0.92 / peak)
    pcm = b"".join(struct.pack("<h", int(max(-1, min(1, s * g)) * 32000)) for s in samples)
    enc = lameenc.Encoder()
    enc.set_bit_rate(bitrate)
    enc.set_in_sample_rate(SR)
    enc.set_channels(1)
    enc.set_quality(3)
    data = enc.encode(pcm) + enc.flush()
    path = os.path.join(OUT, name)
    with open(path, "wb") as f:
        f.write(bytes(data))
    print(f"{name:18s} {len(samples)/SR:4.2f}s  {len(data)//1024} KB")


def popcat_pop():
    # 클래식 "뽁" — 빠른 상승 피치 + 짧은 바디
    return mix(sine(260, 1250, 0.075, amp=0.85, atk=0.001, rel=0.045),
               sine(520, 2100, 0.055, amp=0.28, atk=0.001, rel=0.03),
               noise(0.02, amp=0.18, lp=0.6))


def snack_throw():
    return mix(noise(0.30, amp=0.36, atk=0.08, rel=0.16, lp=0.10),
               sine(420, 900, 0.30, amp=0.16, atk=0.10, rel=0.15))


def snack_eat():
    random.seed(4)
    return seq([mix(noise(0.055, amp=0.55, lp=0.75, rel=0.035),
                    sine(180, 110, 0.06, amp=0.22, rel=0.04)) for _ in range(3)], gap=0.012)


def mood_up():
    return seq([sine(f, f, 0.10, amp=0.5, atk=0.004, rel=0.09)
                for f in (784, 988, 1175)], gap=0.0)


def mood_max():
    notes = (523, 659, 784, 1047, 1319)
    parts = [mix(sine(f, f, 0.13, amp=0.42, atk=0.004, rel=0.10),
                 sine(f * 2, f * 2, 0.13, amp=0.14, atk=0.004, rel=0.10)) for f in notes]
    parts.append(mix(sine(1568, 1568, 0.55, amp=0.45, atk=0.005, rel=0.45, hold=0.10),
                     sine(1047, 1047, 0.55, amp=0.28, atk=0.005, rel=0.45, hold=0.10)))
    return seq(parts)


def button_click():
    return mix(sine(900, 600, 0.035, amp=0.45, atk=0.001, rel=0.02),
               noise(0.015, amp=0.16, lp=0.8))


def oiia_loop():
    """8비트 느낌의 4마디 루프 (실제 OIIA 사운드로 교체용 placeholder)."""
    bpm, out = 138, []
    beat = 60.0 / bpm
    bass = [98, 98, 131, 98, 110, 110, 147, 110]
    lead = [523, 659, 784, 659, 587, 784, 988, 784,
            523, 659, 784, 1047, 988, 784, 659, 587]
    n_steps = 16
    for rep in range(2):
        for s in range(n_steps):
            dur = beat / 2
            layers = [sine(lead[s], lead[s], dur, amp=0.30, atk=0.003, rel=dur * 0.7)]
            if s % 2 == 0:
                b = bass[(s // 2) % len(bass)]
                layers.append(sine(b, b * 0.98, dur, amp=0.34, atk=0.004, rel=dur * 0.8))
                layers.append(noise(0.035, amp=0.22, lp=0.85))   # 하이햇/킥 느낌
            out.extend(mix(*layers))
    return out


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    random.seed(1)
    write("popcat_pop.mp3", popcat_pop())
    write("snack_throw.mp3", snack_throw())
    write("snack_eat.mp3", snack_eat())
    write("mood_up.mp3", mood_up())
    write("mood_max.mp3", mood_max())
    write("button_click.mp3", button_click())
    write("oiia_loop.mp3", oiia_loop(), bitrate=112)
