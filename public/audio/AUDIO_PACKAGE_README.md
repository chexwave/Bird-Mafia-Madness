# Canyon Fishing Chaos — Audio Package v1.1 (Neon Upgrade)

**Style Lock**: Neon Synthwave + Classic 8-bit / Chiptune  
**Generated**: 2026-08-08 (Neon layered pass)  
**Format**: 22.05 kHz mono WAV (Godot-native friendly)

All tracks are designed as **near-seamless loops** with soft edge fades.  
This version pushes significantly more layering, width, and neon energy while staying pure synthetic.

---

## Music (BGM) — Neon v2

| File | Track Name | BPM | Length | Intended Use | Feel |
|------|------------|-----|--------|--------------|------|
| `music/bgm_title_canyon_chaos.wav` | **Canyon Chaos Theme** | 128 | ~18 s | Title screen / main menu | Neon anthem — layered leads, counter melody, rich bass, driving arps |
| `music/bgm_town_goblin_city.wav` | **Goblin City Marina** | 110 | ~22 s | Walking the marina, shops, docks | Warm neon glow — soft layered lead, sparkly arps, pad bed |
| `music/bgm_travel_canyon_run.wav` | **Canyon Run** | 142 | ~18 s | Endless-runner travel | Neon highway — cascading arps, octave stabs, aggressive forward motion |
| `music/bgm_battle_hooked.wav` | **Hooked!** | 154 | ~16 s | Turn-based fish battles | Neon combat — tension arps, dark pad, staccato hits, hard drums |

### What changed in the Neon pass
- **Layered leads**: main square + detuned square + pulse for width
- **Rich bass stacks**: triangle + square + low pulse
- **Multiple arpeggio layers** (primary + counter)
- **Pad / atmosphere beds** under every track
- **Call-and-response / counter melodies**
- **Better drum programming** (kick patterns, claps, open/closed hats)
- Longer, more developed phrases that still loop cleanly

### Godot Import Notes (Music)

1. Drop the four files into `res://audio/music/`
2. Select each → Import tab:
   - **Loop**: On
   - **Loop Offset**: 0
   - **Compress**: Disabled (or IMA-ADPCM for smaller builds)
3. Recommended bus setup:
   ```
   Master
   ├── Music          (volume -6 to -3 dB)
   └── SFX            (volume 0 dB)
   ```
4. Use one `AudioStreamPlayer` for music.  
   Crossfade between tracks with a short volume tween when changing scenes/states.

---

## Sound Effects (SFX) — unchanged from v1

| File | Name | Length | Trigger |
|------|------|--------|---------|
| `sfx/sfx_cast.wav` | Cast | 0.35 s | Player initiates cast |
| `sfx/sfx_reel.wav` | Reel | 0.8 s | Holding reel / fight tension |
| `sfx/sfx_splash.wav` | Splash | 0.4 s | Lure hits water / fish jumps |
| `sfx/sfx_fish_on.wav` | Fish On | 0.22 s | Bite / fish hooked |
| `sfx/sfx_catch_success.wav` | Catch Success | 0.6 s | Successful keep / land |
| `sfx/sfx_ui_select.wav` | UI Select | 0.06 s | Menu highlight |
| `sfx/sfx_ui_confirm.wav` | UI Confirm | 0.18 s | Menu confirm |
| `sfx/sfx_engine.wav` | Engine | 0.6 s | Boat start / throttle |
| `sfx/sfx_bag_full.wav` | Bag Full | 0.4 s | Bag capacity warning |
| `sfx/sfx_fuel_low.wav` | Fuel Low | 0.4 s | Fuel warning |

Import SFX as non-looping WAVs. Prefer polyphony on the SFX bus.

---

## Style Philosophy (locked)

- Pure synthetic 8-bit / chiptune voice at the core
- Neon synthwave energy on top: width, layered arps, driving motion
- Upbeat and fun — never dark, never generic “epic”
- Mobile-first file sizes
- Designed to sit under the AAA pixel marina visual language

---

## Next Audio Pass Ideas

- Ambient marina layer (soft water + distant gulls under town BGM)
- Boat engine loop variants (idle / running)
- Victory fanfare (short after boss / tournament)
- Defeat / line-snap sting
- Night / dusk variant of town BGM
- Shop open + cash register SFX

---

**This package is production-ready for the Demo.**  
The four BGM tracks now carry real neon weight. Drop them in and the game will feel alive.
