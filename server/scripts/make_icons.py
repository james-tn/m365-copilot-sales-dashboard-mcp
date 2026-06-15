"""Generate the Teams app icons (color.png 192x192, outline.png 32x32) with a
simple bar-chart motif, using only the Python standard library (no Pillow).

    python3 server/scripts/make_icons.py
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
APP_PKG = REPO_ROOT / "appPackage"


def write_png(path: Path, width: int, height: int, pixel) -> None:
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter type 0 (None) per scanline
        for x in range(width):
            raw.extend(pixel(x, y))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)  # 8-bit RGBA
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    path.write_bytes(png)
    print(f"Wrote {path}")


# color.png — white ascending bars on the brand blue (#2B6CB0).
def color_pixel(x: int, y: int):
    bars = [(48, 74, 118), (84, 110, 86), (120, 146, 54)]  # (x0, x1, top), baseline 152
    for x0, x1, top in bars:
        if x0 <= x < x1 and top <= y <= 152:
            return (255, 255, 255, 255)
    return (43, 108, 176, 255)


# outline.png — white bars on transparent.
def outline_pixel(x: int, y: int):
    bars = [(6, 11, 20), (13, 18, 14), (20, 25, 8)]  # baseline 26
    for x0, x1, top in bars:
        if x0 <= x < x1 and top <= y <= 26:
            return (255, 255, 255, 255)
    return (0, 0, 0, 0)


if __name__ == "__main__":
    APP_PKG.mkdir(parents=True, exist_ok=True)
    write_png(APP_PKG / "color.png", 192, 192, color_pixel)
    write_png(APP_PKG / "outline.png", 32, 32, outline_pixel)
