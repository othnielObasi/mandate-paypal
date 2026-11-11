"""Narration for each scene with edge-tts, plus each word's timing for the captions.

Writes video/audio/<scene>.mp3 and video/audio/<scene>.json ({"duration": s, "words": [[start, end, word], ...]}).
"""
import asyncio
import json
import re
import subprocess
from pathlib import Path

import edge_tts
import imageio_ffmpeg

ROOT = Path(__file__).parent
OUT = ROOT / "audio"
OUT.mkdir(exist_ok=True)
FF = imageio_ffmpeg.get_ffmpeg_exe()


def duration(path: Path) -> float:
    r = subprocess.run([FF, "-hide_banner", "-i", str(path)], capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", r.stderr)
    h, mnt, s = m.groups()
    return int(h) * 3600 + int(mnt) * 60 + float(s)


async def one(scene: dict, voice: str, rate: str):
    mp3 = OUT / f"{scene['id']}.mp3"
    words = []
    com = edge_tts.Communicate(scene["say"], voice, rate=rate, boundary="WordBoundary")
    with open(mp3, "wb") as f:
        async for chunk in com.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start = chunk["offset"] / 1e7
                words.append([round(start, 3), round(start + chunk["duration"] / 1e7, 3), chunk["text"]])
    d = duration(mp3)
    (OUT / f"{scene['id']}.json").write_text(json.dumps({"duration": d, "words": words, "say": scene["say"], "rate": rate}))
    return scene["id"], d, len(words)


async def main():
    spec = json.loads((ROOT / "script.json").read_text(encoding="utf-8"))
    total = 0.0
    for s in spec["scenes"]:
        cached = OUT / f"{s['id']}.json"
        if cached.exists() and json.loads(cached.read_text()).get("say") == s["say"] and json.loads(cached.read_text()).get("rate", "-3%") == spec["rate"]:
            d = json.loads(cached.read_text())["duration"]
            total += d
            print(f"{s['id']}: {d:5.2f}s (cached)")
            continue
        for attempt in range(4):
            try:
                sid, d, n = await one(s, spec["voice"], spec["rate"])
                break
            except edge_tts.exceptions.NoAudioReceived:
                await asyncio.sleep(2 + attempt * 2)
        else:
            raise SystemExit(f"no audio for {s['id']}")
        total += d
        print(f"{sid}: {d:5.2f}s, {n} words")
    print(f"narration total: {total:.1f}s")


asyncio.run(main())
