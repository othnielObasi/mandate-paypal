# Demo video pipeline

Records the live app and renders Mandate's demo video, so the video can be rebuilt whenever the app changes. Generated media (footage, frames, audio, output) stays local and is git-ignored.

| Step | Command | What it does |
| --- | --- | --- |
| 1. Narration | `python video/tts.py` | Speaks each scene in `script.json` with Microsoft Edge neural voices (`edge-tts`), saving audio and word timings for the captions. |
| 2. Footage | `node video/capture.mjs [clips…]` | Drives the live site in Chromium (Playwright) and records each clip through Chrome's screencast at 1920×1080, with a visible cursor. Recording pauses while the model or PayPal is working, so waits don't become dead air. Marks elements for zooms. |
| 3. Render | `node video/render.mjs [--sample] [--out=name.mp4]` | Builds the timeline from the narration, draws every frame with `stage.html` (captions, zooms, badges, the phone and stakes scenes), mixes narration and music at YouTube loudness, and encodes 1080p H.264 in segments. `--sample` writes a few stills per scene for review. |

Supporting scripts:

- `brief/make.py` + `brief/print.mjs`: build the judges' brief PDF from the same footage.
- `readme-shots.mjs` + `readme-images.py`: capture public pages and build `docs/screenshots/` for the README.
- `images.py`: optional AI-generated stills (Meta Muse Image), not used in the current cut.

Requirements: Node 20+, Python 3 with `edge-tts`, `imageio-ffmpeg` and Pillow, and Playwright's Chromium. Capturing needs a PayPal sandbox buyer in `.env.render` (`PAYPAL_SANBOX_EMAIL`, `PAYPAL_SANBOX_PASSWORD`). Background music is not included in the repo.
