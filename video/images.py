"""Cinematic stills for the story beats, generated with Meta's Muse Image (muse-image-1.0).

No text, logos or brands in any image (the rules forbid third-party trademarks).
Writes video/assets/<name>.jpg at 1920x1080 (centre-cropped). Skips images that already exist.
"""
import base64
import io
import json
import sys
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).parent
OUT = ROOT / "assets"
OUT.mkdir(exist_ok=True)
STYLE = "cinematic photograph, shallow depth of field, soft blue and violet ambient light, moody, photorealistic, 35mm film look, no text, no words, no logos, no brand names"

PROMPTS = {
    "phone": "a person at a kitchen table at night looking at a smartphone showing an abstract shopping bag icon, an AI assistant is buying things for them",
    "hijack": "close-up of a laptop screen in a dark room showing an online shop page, faint glowing red threads of light reaching out of the page toward a hovering abstract shopping cart, sense of unseen manipulation",
    "worry": "a worried young woman sitting on a sofa at night holding a bank card and looking at her phone, concerned expression, city lights through the window",
    "calm": "a relaxed family in a bright modern kitchen in the morning, a parent smiling at a phone while a child eats breakfast, warm calm atmosphere with subtle violet accents",
    "shield": "abstract translucent geometric dome of glowing violet and blue light lines protecting a small glowing shopping cart on a dark reflective floor, futuristic, minimal",
}


def key() -> str:
    for line in (ROOT.parent / ".env.render").read_text(encoding="utf-8").splitlines():
        if line.startswith("MODEL_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"')
    raise SystemExit("MODEL_API_KEY missing")


def generate(name: str, prompt: str, k: str):
    body = json.dumps({"model": "muse-image-1.0", "prompt": f"{prompt}. {STYLE}", "size": "1792x1024", "n": 1}).encode()
    req = urllib.request.Request("https://api.meta.ai/v1/images/generations", data=body, headers={"Authorization": f"Bearer {k}", "content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.load(r)
    im = Image.open(io.BytesIO(base64.b64decode(data["data"][0]["b64_json"]))).convert("RGB")
    # Cover 1920x1080.
    w, h = im.size
    scale = max(1920 / w, 1080 / h)
    im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    w, h = im.size
    im = im.crop(((w - 1920) // 2, (h - 1080) // 2, (w - 1920) // 2 + 1920, (h - 1080) // 2 + 1080))
    im.save(OUT / f"{name}.jpg", quality=92)
    print("made", name)


if __name__ == "__main__":
    k = key()
    only = set(sys.argv[1:])
    for name, prompt in PROMPTS.items():
        if only and name not in only:
            continue
        if not only and (OUT / f"{name}.jpg").exists():
            continue
        generate(name, prompt, k)
