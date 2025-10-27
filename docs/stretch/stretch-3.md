# Stretch 3 — Audio Controls (Gain, Mute, Fade, Detach Audio)

> **Goal:** Add per-item audio controls (gain dB/%, mute), fade-in/out, and “Detach Audio” to an audio-only track.
>
> **Tasks:**
>
> 1. UI: item inspector with Audio panel: Gain slider (-30dB..+12dB), Mute toggle, Fade In/Out (ms). Add context menu “Detach Audio” to create a new audio item aligned under the video on an audio track.
> 2. Data: store `{ gainDb, mute, fadeInMs, fadeOutMs, detached: boolean }` on items.
> 3. Preview: use WebAudio API in renderer to control volume envelope on playback; fades via GainNode ramps; keep it lightweight.
> 4. Export: ffmpeg filter:
>
>    - Gain: `volume=dB` or linear factor.
>    - Fades: `afade=t=in:st=...:d=...` and `afade=t=out:st=...:d=...`.
>    - Detach: map audio stream from source; if multiple, mix with `amix=inputs=n:normalize=0`.
>
> 5. Waveform (optional): generate a low-res PCM thumbnail for the item (ffmpeg to wav → downsample → draw simple canvas waveform for the track).
>
> **Acceptance Criteria:**
>
> - Adjusting gain/mute/fades affects preview and final export.
> - Detach audio creates a separate item; export mixes correctly.
>
> **Run & Test:**
>
> - Create a sequence with different volumes and short fades; export and listen for expected changes.
