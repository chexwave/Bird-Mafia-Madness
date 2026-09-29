#!/usr/bin/env python3
"""Bird Mafia Madness — layered synthwave BGM (looping, stereo)."""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np

SR = 44100
OUT = Path("/workspace/artifacts/bgm_out")


def midi(n: float) -> float:
    return 440.0 * (2.0 ** ((n - 69.0) / 12.0))


def env_adsr(n: int, sr: int, a=0.01, d=0.12, s=0.7, r=0.18) -> np.ndarray:
    n = max(8, int(n))
    a_n = max(1, int(a * sr))
    d_n = max(1, int(d * sr))
    r_n = max(1, int(r * sr))
    if a_n + d_n + r_n > n:
        scale = n / float(a_n + d_n + r_n)
        a_n = max(1, int(a_n * scale))
        d_n = max(1, int(d_n * scale))
        r_n = max(1, n - a_n - d_n)
    s_n = n - a_n - d_n - r_n
    e = np.empty(n, dtype=np.float32)
    e[:a_n] = np.linspace(0, 1, a_n, dtype=np.float32)
    e[a_n : a_n + d_n] = np.linspace(1, s, d_n, dtype=np.float32)
    if s_n > 0:
        e[a_n + d_n : a_n + d_n + s_n] = s
    e[n - r_n :] = np.linspace(s if s_n > 0 else 1, 0, r_n, dtype=np.float32)
    return e


def osc(kind: str, freq: np.ndarray | float, n: int, sr: int, phase=0.0) -> np.ndarray:
    t = (np.arange(n, dtype=np.float64) / sr)
    if np.isscalar(freq):
        ph = phase + 2 * np.pi * float(freq) * t
    else:
        ph = phase + 2 * np.pi * np.cumsum(freq) / sr
    if kind == "sine":
        return np.sin(ph).astype(np.float32)
    if kind == "tri":
        return (2 / np.pi * np.arcsin(np.sin(ph))).astype(np.float32)
    if kind == "square":
        return np.sign(np.sin(ph)).astype(np.float32) * 0.7
    if kind == "pulse":
        return ((np.sin(ph) > 0.4).astype(np.float32) * 2 - 1) * 0.65
    if kind == "saw":
        return (2 * ((ph / (2 * np.pi)) % 1) - 1).astype(np.float32)
    if kind == "noise":
        rng = np.random.default_rng(7)
        return rng.standard_normal(n).astype(np.float32)
    raise ValueError(kind)


def lp(x: np.ndarray, cutoff: float, sr: int = SR) -> np.ndarray:
    # cheap FIR lowpass (vectorized). width tracks cutoff.
    k = max(3, int(sr / max(80.0, cutoff) / 2.5))
    if k % 2 == 0:
        k += 1
    kernel = np.hanning(k).astype(np.float32)
    kernel /= kernel.sum()
    return np.convolve(x.astype(np.float32), kernel, mode="same").astype(np.float32)


def hp(x: np.ndarray, cutoff: float, sr: int = SR) -> np.ndarray:
    return (x - lp(x, cutoff, sr)).astype(np.float32)


def tanh_sat(x: np.ndarray, drive=1.4) -> np.ndarray:
    return np.tanh(x * drive).astype(np.float32)


def pan_stereo(mono: np.ndarray, pan: float) -> np.ndarray:
    # pan -1 left, +1 right
    left = math.cos((pan + 1) * math.pi / 4)
    right = math.sin((pan + 1) * math.pi / 4)
    st = np.zeros((len(mono), 2), dtype=np.float32)
    st[:, 0] = mono * left
    st[:, 1] = mono * right
    return st


def mix_at(buf: np.ndarray, sig: np.ndarray, start: int, pan=0.0, gain=1.0):
    if sig.ndim == 1:
        sig = pan_stereo(sig * gain, pan)
    else:
        sig = sig * gain
    n = len(buf)
    i0 = max(0, start)
    i1 = min(n, start + len(sig))
    if i1 <= i0:
        return
    s0 = i0 - start
    buf[i0:i1] += sig[s0 : s0 + (i1 - i0)]


def chorus(mono: np.ndarray, sr: int, depth=0.003, rate=0.8) -> np.ndarray:
    n = len(mono)
    t = np.arange(n) / sr
    delay = (depth * sr * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t))).astype(np.int32)
    idx = np.clip(np.arange(n) - delay, 0, n - 1)
    wet = mono[idx]
    L = tanh_sat(mono * 0.7 + wet * 0.45)
    R = tanh_sat(mono * 0.7 + np.roll(wet, 40) * 0.45)
    st = np.stack([L, R], axis=1)
    return st.astype(np.float32)


def kick(sr: int, dur=0.28) -> np.ndarray:
    n = int(dur * sr)
    t = np.arange(n) / sr
    freq = 140 * np.exp(-t * 18) + 38
    body = np.sin(2 * np.pi * np.cumsum(freq) / sr)
    click = np.exp(-t * 90) * osc("noise", 1, n, sr) * 0.15
    e = np.exp(-t * 9)
    return tanh_sat((body * e + click) * 1.6, 1.8)


def snare(sr: int, dur=0.22) -> np.ndarray:
    n = int(dur * sr)
    t = np.arange(n) / sr
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 16)
    nz = osc("noise", 1, n, sr)
    nz = hp(nz, 1800, sr)
    e = np.exp(-t * 14)
    return tanh_sat(tone * 0.35 + nz * e * 0.9, 1.5)


def hat(sr: int, dur=0.07, open_=False) -> np.ndarray:
    n = int(dur * sr)
    t = np.arange(n) / sr
    nz = hp(osc("noise", 1, n, sr), 6000, sr)
    e = np.exp(-t * (12 if open_ else 55))
    return (nz * e * (0.35 if open_ else 0.22)).astype(np.float32)


def clap(sr: int) -> np.ndarray:
    n = int(0.28 * sr)
    t = np.arange(n) / sr
    nz = hp(osc("noise", 1, n, sr), 1200, sr)
    bursts = np.zeros(n, dtype=np.float32)
    for off in (0, 0.012, 0.024, 0.042):
        i = int(off * sr)
        if i < n:
            bursts[i:] += np.exp(-np.arange(n - i) / sr * 28)
    return (nz * np.clip(bursts, 0, 1) * 0.55).astype(np.float32)


def crash(sr: int) -> np.ndarray:
    n = int(1.4 * sr)
    t = np.arange(n) / sr
    nz = hp(osc("noise", 1, n, sr), 2500, sr)
    return (nz * np.exp(-t * 2.2) * 0.28).astype(np.float32)


def tom(sr: int, f=120) -> np.ndarray:
    n = int(0.32 * sr)
    t = np.arange(n) / sr
    freq = f * np.exp(-t * 8) + 40
    return (np.sin(2 * np.pi * np.cumsum(freq) / sr) * np.exp(-t * 8) * 0.7).astype(np.float32)


def note(
    kind: str,
    midi_n: float,
    dur: float,
    sr: int,
    a=0.01,
    d=0.1,
    s=0.65,
    r=0.15,
    detune=0.0,
    cutoff=None,
) -> np.ndarray:
    n = max(8, int(dur * sr))
    f = midi(midi_n) * (2 ** (detune / 1200.0))
    wave = osc(kind, f, n, sr)
    if cutoff:
        wave = lp(wave, cutoff, sr)
    return (wave * env_adsr(n, sr, a, d, s, r)).astype(np.float32)


def supersaw(midi_n: float, dur: float, sr: int, voices=5, cutoff=2400) -> np.ndarray:
    n = max(8, int(dur * sr))
    acc = np.zeros(n, dtype=np.float32)
    dets = np.linspace(-12, 12, voices)
    for i, d in enumerate(dets):
        acc += osc("saw", midi(midi_n) * (2 ** (d / 1200)), n, sr, phase=i * 0.7)
    acc /= voices
    acc = lp(acc, cutoff, sr)
    return (acc * env_adsr(n, sr, 0.03, 0.18, 0.7, 0.25)).astype(np.float32)


def bass_note(midi_n: float, dur: float, sr: int, growl=False) -> np.ndarray:
    n = max(8, int(dur * sr))
    f = midi(midi_n)
    body = osc("sine", f, n, sr) * 0.7 + osc("saw", f, n, sr) * (0.45 if growl else 0.22)
    sub = osc("sine", f * 0.5, n, sr) * 0.5
    wave = lp(body + sub, 420 if growl else 280, sr)
    return (wave * env_adsr(n, sr, 0.006, 0.08, 0.7, 0.12)).astype(np.float32)


def arp_tone(midi_n: float, dur: float, sr: int) -> np.ndarray:
    n = max(8, int(dur * sr))
    f = midi(midi_n)
    wave = osc("pulse", f, n, sr) * 0.55 + osc("tri", f * 2, n, sr) * 0.25
    wave = lp(wave, 3200, sr)
    return (wave * env_adsr(n, sr, 0.004, 0.05, 0.35, 0.08)).astype(np.float32)


def lead_tone(midi_n: float, dur: float, sr: int) -> np.ndarray:
    n = max(8, int(dur * sr))
    f = midi(midi_n)
    a = osc("saw", f, n, sr)
    b = osc("square", f * 1.003, n, sr)
    wave = lp(a * 0.55 + b * 0.45, 2800, sr)
    return (wave * env_adsr(n, sr, 0.02, 0.12, 0.55, 0.22)).astype(np.float32)


def pad_chord(notes: list[float], dur: float, sr: int) -> np.ndarray:
    n = max(8, int(dur * sr))
    acc = np.zeros(n, dtype=np.float32)
    for i, m in enumerate(notes):
        acc += osc("saw", midi(m), n, sr, phase=i) * 0.22
        acc += osc("tri", midi(m), n, sr, phase=i + 0.4) * 0.18
    acc = lp(acc, 1100, sr)
    return (acc * env_adsr(n, sr, 0.12, 0.3, 0.55, 0.4)).astype(np.float32)


def sidechain(buf: np.ndarray, bpm: float, sr: int, amount=0.55):
    spb = 60.0 / bpm
    n = len(buf)
    t = np.arange(n) / sr
    # duck on 4/4 kicks
    phase = (t / spb) % 1.0
    duck = 1.0 - amount * np.exp(-phase * 9)
    buf *= duck[:, None].astype(np.float32)


def normalize(buf: np.ndarray, peak=0.89) -> np.ndarray:
    m = float(np.max(np.abs(buf))) + 1e-9
    return (buf * (peak / m)).astype(np.float32)


def write_wav(path: Path, buf: np.ndarray, sr: int = SR):
    import wave
    import struct

    x = np.clip(buf, -1, 1)
    pcm = (x * 32767).astype(np.int16)
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


# chord helpers (midi pc relative to root)
def triad(root: int, qual: str) -> list[int]:
    if qual == "m":
        return [root, root + 3, root + 7]
    if qual == "m7":
        return [root, root + 3, root + 7, root + 10]
    if qual == "maj7":
        return [root, root + 4, root + 7, root + 11]
    if qual == "7":
        return [root, root + 4, root + 7, root + 10]
    if qual == "dim":
        return [root, root + 3, root + 6]
    if qual == "sus":
        return [root, root + 5, root + 7]
    return [root, root + 4, root + 7]


def render_track(spec: dict) -> np.ndarray:
    bpm = spec["bpm"]
    bars = spec["bars"]
    sr = SR
    beat = 60.0 / bpm
    bar = beat * 4
    total = bars * bar
    n = int(total * sr)
    buf = np.zeros((n, 2), dtype=np.float32)

    prog = spec["prog"]  # list of (root, qual) per bar (cycles)
    drums = spec["drums"]
    arp_pat = spec["arp"]
    bass_pat = spec["bass"]
    lead_pat = spec["lead"]  # list of (bar, beat, midi, dur_beats)
    counter = spec.get("counter", [])
    hook = spec.get("hook", [])

    k = kick(sr)
    s = snare(sr)
    h_c = hat(sr, 0.06, False)
    h_o = hat(sr, 0.16, True)
    cl = clap(sr)
    cr = crash(sr)
    toms = [tom(sr, f) for f in (180, 140, 100)]

    # --- drums ---
    for bar_i in range(bars):
        t0 = bar_i * bar
        style = drums
        # kick on 1 and 3, extra for battle
        kicks = [0, 2]
        if style == "drive":
            kicks = [0, 0.75, 2, 2.5]
        elif style == "battle":
            kicks = [0, 0.5, 1.5, 2, 3.25]
        elif style == "title":
            kicks = [0, 2, 3.5] if bar_i % 4 != 3 else [0, 1.5, 2.75, 3.5]
        elif style == "win":
            kicks = [0, 2]
        for b in kicks:
            mix_at(buf, k, int((t0 + b * beat) * sr), 0.0, 1.0)
        # snare / clap 2 and 4
        mix_at(buf, s, int((t0 + 1 * beat) * sr), 0.05, 0.85)
        mix_at(buf, s, int((t0 + 3 * beat) * sr), -0.05, 0.9)
        if style in ("drive", "battle") and bar_i % 2 == 1:
            mix_at(buf, cl, int((t0 + 3 * beat) * sr), 0.2, 0.55)
        # hats 8ths / 16ths
        steps = 8 if style != "battle" else 16
        for i in range(steps):
            bt = i * (4 / steps)
            open_ = style == "drive" and i % 4 == 3
            mix_at(
                buf,
                h_o if open_ else h_c,
                int((t0 + bt * beat) * sr),
                pan=-0.25 + 0.5 * (i % 2),
                gain=0.55 if i % 2 == 0 else 0.32,
            )
        # fills
        if (bar_i + 1) % 8 == 0:
            mix_at(buf, cr, int(t0 * sr), 0.0, 0.7)
            for j, tf in enumerate((3.0, 3.25, 3.5, 3.75)):
                mix_at(buf, toms[j % 3], int((t0 + tf * beat) * sr), -0.3 + j * 0.2, 0.8)
        elif bar_i == 0:
            mix_at(buf, cr, int(t0 * sr), 0.0, 0.85)

    # --- harmony / bass / arp / pads ---
    for bar_i in range(bars):
        t0 = bar_i * bar
        root, qual = prog[bar_i % len(prog)]
        chord = triad(root, qual)
        # pad whole bar
        pad = pad_chord([x + 12 for x in chord], bar * 1.02, sr)
        mix_at(buf, chorus(pad, sr, 0.004, 0.35 + 0.05 * (bar_i % 3)), int(t0 * sr), 0.0, spec["pad_gain"])

        # bass pattern in 8ths
        for step, hit in enumerate(bass_pat):
            if not hit:
                continue
            bt = step * 0.5
            note_m = root if hit == 1 else (root + (12 if hit == 2 else (chord[1] - 12)))
            if hit == 3:
                note_m = root - 12 + 7
            dur = 0.42 if hit != 2 else 0.22
            bn = bass_note(note_m, dur * beat, sr, growl=spec.get("growl", False))
            mix_at(buf, bn, int((t0 + bt * beat) * sr), 0.0, spec["bass_gain"])

        # arp 16ths over chord
        seq = []
        octs = spec.get("arp_oct", 0)
        order = arp_pat
        pcs = [c + 12 * octs for c in chord] + [chord[0] + 12 + 12 * octs]
        for idx in order:
            seq.append(pcs[idx % len(pcs)])
        step_len = 4 / len(order)  # beats
        for i, m in enumerate(seq):
            at = arp_tone(m, step_len * beat * 0.92, sr)
            mix_at(
                buf,
                at,
                int((t0 + i * step_len * beat) * sr),
                pan=-0.45 + 0.9 * ((i % 4) / 3),
                gain=spec["arp_gain"],
            )

        # rhythmic stab on offbeats
        if spec.get("stabs") and bar_i % 2 == 1:
            st = supersaw(root + 12, 0.18 * beat, sr, voices=4, cutoff=1800)
            mix_at(buf, st, int((t0 + 1.5 * beat) * sr), 0.35, 0.22)
            mix_at(buf, st, int((t0 + 3.5 * beat) * sr), -0.35, 0.18)

    # --- lead + counter (absolute events) ---
    def place_mel(events, tone_fn, gain, pan):
        for bar_i, beat_i, m, dur_b in events:
            # repeat motif every `loop` bars
            loop = spec.get("mel_loop", 8)
            for rep in range(bars // loop):
                t = (bar_i + rep * loop) * bar + beat_i * beat
                sig = tone_fn(m, dur_b * beat, sr)
                mix_at(buf, chorus(sig, sr, 0.0025, 1.1), int(t * sr), pan, gain)

    place_mel(lead_pat, lead_tone, spec["lead_gain"], 0.12)
    if counter:
        place_mel(counter, lambda m, d, sr: note("tri", m, d, sr, 0.01, 0.08, 0.4, 0.12, cutoff=2400), spec.get("cnt_gain", 0.22), -0.4)
    if hook:
        place_mel(hook, lambda m, d, sr: supersaw(m, d, sr, 6, 2200), spec.get("hook_gain", 0.28), 0.0)

    # atmosphere noise bed
    bed = hp(osc("noise", 1, n, sr), 400, sr) * 0.03
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 0.07 * np.arange(n) / sr)
    mix_at(buf, (bed * lfo.astype(np.float32)), 0, 0.0, 1.0)

    sidechain(buf, bpm, sr, spec.get("duck", 0.42))
    # gentle stereo widening
    mid = (buf[:, 0] + buf[:, 1]) * 0.5
    side = (buf[:, 0] - buf[:, 1]) * 0.5 * 1.15
    buf[:, 0] = mid + side
    buf[:, 1] = mid - side
    buf = tanh_sat(buf, 1.15)
    buf = normalize(buf, 0.9)
    # loop crossfade 12ms
    fade = int(0.012 * sr)
    ramp = np.linspace(0, 1, fade, dtype=np.float32)
    buf[:fade] *= ramp[:, None]
    buf[-fade:] *= ramp[::-1, None]
    buf[:fade] += buf[-fade:] * ramp[:, None]
    buf[-fade:] *= 0
    buf[-fade:] += buf[:fade] * ramp[::-1, None]
    return normalize(buf, 0.88)


# Melodies are (bar, beat, midi, dur_beats) inside an 8-bar cell
# A minor scale around 57=A2 bass, 69=A3, 81=A4

TITLE = {
    "bpm": 118,
    "bars": 32,
    "drums": "title",
    "prog": [
        (57, "m"), (57, "m"), (53, "maj7"), (53, "maj7"),
        (48, "maj7"), (48, "maj7"), (55, "7"), (55, "7"),
        (57, "m7"), (53, "maj7"), (50, "m7"), (55, "7"),
        (57, "m"), (45, "maj7"), (53, "maj7"), (55, "sus"),
    ],
    "bass": [1, 0, 1, 2, 1, 0, 3, 1],
    "arp": [0, 2, 3, 2, 1, 2, 3, 0],
    "arp_oct": 1,
    "pad_gain": 0.38,
    "bass_gain": 0.72,
    "arp_gain": 0.2,
    "lead_gain": 0.42,
    "cnt_gain": 0.24,
    "hook_gain": 0.3,
    "duck": 0.38,
    "stabs": True,
    "growl": False,
    "mel_loop": 16,
    "lead": [
        (0, 0, 81, 1.5), (0, 1.5, 84, 0.5), (0, 2, 86, 1), (0, 3, 84, 1),
        (1, 0, 81, 2), (1, 2, 79, 1), (1, 3, 77, 1),
        (2, 0, 76, 1.5), (2, 1.5, 77, 0.5), (2, 2, 79, 2),
        (3, 0, 81, 1), (3, 1, 84, 1), (3, 2, 86, 2),
        (8, 0, 88, 1.5), (8, 1.5, 86, 0.5), (8, 2, 84, 1), (8, 3, 81, 1),
        (9, 0, 79, 2), (9, 2, 81, 2),
        (10, 0, 84, 3), (10, 3, 86, 1),
        (11, 0, 88, 2), (11, 2, 86, 0.5), (11, 2.5, 84, 0.5), (11, 3, 81, 1),
    ],
    "counter": [
        (0, 0.5, 69, 1), (0, 2.5, 72, 1.5),
        (1, 0.5, 69, 1), (1, 2, 67, 1),
        (2, 1, 64, 2), (3, 0.5, 67, 1.5),
        (8, 0, 72, 2), (8, 2.5, 74, 1.5),
        (10, 0.5, 76, 2),
    ],
    "hook": [
        (4, 0, 69, 4),
        (12, 0, 81, 2), (12, 2, 79, 2),
        (13, 0, 76, 4),
    ],
}

PLAY = {
    "bpm": 136,
    "bars": 32,
    "drums": "drive",
    "prog": [
        (54, "m"), (54, "m"), (50, "maj7"), (50, "maj7"),
        (45, "maj7"), (45, "maj7"), (52, "7"), (52, "7"),
        (54, "m7"), (49, "m7"), (50, "maj7"), (52, "7"),
        (54, "m"), (50, "maj7"), (45, "maj7"), (52, "sus"),
    ],
    "bass": [1, 2, 1, 0, 1, 2, 3, 1],
    "arp": [0, 1, 2, 3, 2, 1, 0, 2],
    "arp_oct": 1,
    "pad_gain": 0.3,
    "bass_gain": 0.78,
    "arp_gain": 0.26,
    "lead_gain": 0.38,
    "cnt_gain": 0.2,
    "hook_gain": 0.26,
    "duck": 0.48,
    "stabs": True,
    "growl": True,
    "mel_loop": 16,
    "lead": [
        (0, 0, 78, 0.5), (0, 0.5, 81, 0.5), (0, 1, 85, 1), (0, 2, 83, 0.5), (0, 2.5, 81, 1.5),
        (1, 1, 78, 0.5), (1, 1.5, 76, 0.5), (1, 2, 78, 2),
        (2, 0, 81, 1), (2, 1, 83, 0.5), (2, 1.5, 85, 1.5), (2, 3, 86, 1),
        (3, 0, 85, 1), (3, 1, 83, 1), (3, 2, 81, 2),
        (8, 0, 90, 0.5), (8, 0.5, 88, 0.5), (8, 1, 85, 1), (8, 2, 83, 2),
        (9, 0, 81, 2), (9, 2, 78, 1), (9, 3, 81, 1),
        (10, 0, 83, 3), (11, 0, 85, 1), (11, 1, 83, 1), (11, 2, 81, 2),
    ],
    "counter": [
        (0, 0, 66, 1), (0, 2, 69, 1),
        (1, 0.5, 64, 1.5),
        (2, 0, 66, 2), (3, 1, 69, 1),
        (8, 0.5, 73, 1.5), (10, 0, 76, 2),
    ],
    "hook": [
        (4, 0, 73, 2), (4, 2, 76, 2),
        (12, 0, 78, 4),
    ],
}

BATTLE = {
    "bpm": 158,
    "bars": 32,
    "drums": "battle",
    "prog": [
        (50, "m"), (51, "maj"), (53, "maj"), (55, "m"),
        (50, "m"), (48, "maj"), (46, "maj"), (49, "7"),
        (50, "m7"), (53, "7"), (55, "m"), (49, "7"),
        (50, "m"), (51, "maj"), (46, "maj"), (49, "dim"),
    ],
    "bass": [1, 1, 2, 1, 1, 3, 1, 2],
    "arp": [0, 3, 1, 3, 2, 3, 0, 1],
    "arp_oct": 1,
    "pad_gain": 0.22,
    "bass_gain": 0.84,
    "arp_gain": 0.3,
    "lead_gain": 0.4,
    "cnt_gain": 0.18,
    "hook_gain": 0.24,
    "duck": 0.52,
    "stabs": True,
    "growl": True,
    "mel_loop": 16,
    "lead": [
        (0, 0, 74, 0.25), (0, 0.25, 77, 0.25), (0, 0.5, 81, 0.5), (0, 1, 79, 0.5),
        (0, 1.5, 77, 0.5), (0, 2, 74, 1), (0, 3, 72, 1),
        (1, 0, 74, 0.5), (1, 0.5, 77, 0.5), (1, 1, 81, 1), (1, 2.5, 84, 1.5),
        (2, 0, 82, 1), (2, 1, 81, 0.5), (2, 1.5, 79, 0.5), (2, 2, 77, 2),
        (3, 0, 74, 1), (3, 1, 72, 0.5), (3, 1.5, 70, 0.5), (3, 2, 69, 1), (3, 3, 70, 1),
        (8, 0, 86, 0.5), (8, 0.5, 84, 0.5), (8, 1, 81, 1), (8, 2, 79, 0.5), (8, 2.5, 81, 1.5),
        (9, 0, 77, 1), (9, 1, 74, 1), (9, 2, 77, 2),
        (10, 0, 81, 0.5), (10, 0.5, 84, 0.5), (10, 1, 86, 1), (10, 2, 84, 2),
        (11, 0, 81, 2), (11, 2, 79, 1), (11, 3, 77, 1),
    ],
    "counter": [
        (0, 0, 62, 0.5), (0, 0.5, 65, 0.5), (0, 1, 62, 0.5),
        (1, 0, 58, 1), (2, 2, 65, 1),
        (8, 0, 70, 1), (8, 2, 67, 1),
    ],
    "hook": [
        (4, 0, 74, 1), (4, 1, 77, 1), (4, 2, 81, 2),
        (12, 0, 86, 2), (12, 2, 84, 2),
    ],
}

WIN = {
    "bpm": 112,
    "bars": 24,
    "drums": "win",
    "prog": [
        (60, "maj7"), (55, "7"), (57, "m7"), (53, "maj7"),
        (60, "maj7"), (64, "m7"), (53, "maj7"), (55, "7"),
        (60, "maj7"), (57, "m7"), (53, "maj7"), (55, "sus"),
        (60, "maj7"), (55, "7"), (53, "maj7"), (60, "maj"),
    ],
    "bass": [1, 0, 1, 0, 1, 2, 0, 1],
    "arp": [0, 1, 2, 1, 3, 2, 1, 0],
    "arp_oct": 1,
    "pad_gain": 0.42,
    "bass_gain": 0.62,
    "arp_gain": 0.18,
    "lead_gain": 0.4,
    "cnt_gain": 0.22,
    "hook_gain": 0.32,
    "duck": 0.28,
    "stabs": False,
    "growl": False,
    "mel_loop": 8,
    "lead": [
        (0, 0, 84, 1.5), (0, 1.5, 83, 0.5), (0, 2, 84, 1), (0, 3, 86, 1),
        (1, 0, 88, 2), (1, 2, 86, 1), (1, 3, 84, 1),
        (2, 0, 81, 1.5), (2, 1.5, 83, 0.5), (2, 2, 84, 2),
        (3, 0, 86, 1), (3, 1, 88, 1), (3, 2, 91, 2),
        (4, 0, 88, 3), (4, 3, 86, 1),
        (5, 0, 84, 4),
    ],
    "counter": [
        (0, 0.5, 72, 1.5), (1, 0, 71, 2),
        (2, 1, 69, 2), (4, 0, 76, 2),
    ],
    "hook": [
        (6, 0, 84, 4),
        (7, 0, 79, 2), (7, 2, 84, 2),
    ],
}


def main():
    tracks = [
        ("bgm_title_canyon_chaos", TITLE),
        ("bgm_travel_canyon_run", PLAY),
        ("bgm_battle_hooked", BATTLE),
        ("bgm_town_goblin_city", WIN),
    ]
    wavs = []
    for name, spec in tracks:
        print("rendering", name, spec["bpm"], "bpm", spec["bars"], "bars")
        buf = render_track(spec)
        wav = OUT / f"{name}.wav"
        write_wav(wav, buf)
        wavs.append(wav)
        print("  wrote", wav, f"{len(buf)/SR:.2f}s")
    return wavs


if __name__ == "__main__":
    main()
