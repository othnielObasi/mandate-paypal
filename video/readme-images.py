"""Builds docs/screenshots/*.jpg for the README from recorded footage frames and page captures."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FOOT = ROOT / "video" / "footage"
CAP = ROOT / "video" / "out" / "readme"
OUT = ROOT / "docs" / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

SHOTS = {
    # name: (source, crop box (x, y, w, h) or None)
    "landing": (CAP / "landing.png", None),
    "mandate-map": (CAP / "mandate-map.png", None),
    "planted-page": (FOOT / "page/00018.jpg", (360, 120, 1200, 700)),
    "hijack-blocked": (FOOT / "drill/00072.jpg", (180, 130, 1020, 600)),
    "how-it-decided": (FOOT / "why/00053.jpg", (185, 290, 1010, 650)),
    "sign-rules": (FOOT / "setup/00203.jpg", (100, 130, 1720, 950)),
    "paid-instantly": (FOOT / "buy/00150.jpg", (180, 560, 1030, 340)),
    "asks-you": (FOOT / "ask/00056.jpg", (95, 300, 1150, 340)),
    "notifications": (FOOT / "notify/00036.jpg", None),
    "telegram": (ROOT / "video/brief/telegram.png", None),
    "schedule": (FOOT / "schedule/00119.jpg", (90, 120, 1740, 960)),
    "insights": (FOOT / "insights/00030.jpg", None),
    "decision-explorer": (FOOT / "insights/00076.jpg", (108, 144, 1704, 875)),
    "seller-check": (FOOT / "proof/00004.jpg", (990, 0, 830, 870)),
    "tamper-evident": (FOOT / "proof/00118.jpg", (100, 300, 1140, 590)),
    "api-portal": (FOOT / "devs/00071.jpg", None),
}

for name, (src, box) in SHOTS.items():
    im = Image.open(src).convert("RGB")
    if box:
        x, y, w, h = box
        im = im.crop((x, y, x + w, y + h))
    if im.width > 1600:
        im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    path = OUT / f"{name}.jpg"
    im.save(path, "JPEG", quality=82, optimize=True, progressive=True)
    print(f"{name}.jpg  {im.width}x{im.height}  {path.stat().st_size // 1024} KB")
