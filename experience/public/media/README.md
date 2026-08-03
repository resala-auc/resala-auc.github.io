# Media slots for the /join experience

Two optional assets. The experience runs correctly without either of them.

## `chapter-intro.mp3` — the recorded handover message

Drop the recording here with exactly this filename:

```
experience/public/media/chapter-intro.mp3
```

It plays automatically during the pen handover act (`src/acts/ActPen.tsx`).
Rules the act already handles for you:

- If the file is missing, the audio control hides itself and the written lines
  carry the scene. No error is shown to the applicant.
- If the browser refuses autoplay, playback is skipped silently.
- A mute toggle sits in the bottom-right corner while audio is available.
- Aim for roughly 12 seconds — the written lines finish at about 10.4s.

## Hero film (optional)

Put a looping `.mp4` here, then set `HERO_VIDEO_URL` in
`src/components/Backdrop.tsx`, e.g.:

```ts
const HERO_VIDEO_URL = `${import.meta.env.BASE_URL}media/hero.mp4`;
```

Without it, the animated aurora backdrop is used. The page background colour
already matches the darkest gradient stop, so adding a video causes no layout
shift or flash.
