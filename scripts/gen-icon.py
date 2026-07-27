#!/usr/bin/env python3
"""
Generate the NEO app icon.

Produces a 1024x1024 master at src-tauri/icons/icon-source.png:
an Apple-style squircle tile holding a faint Matrix rain backdrop with the
kanji 角 as the hero glyph, in the app's own phosphor green.

Committed so the icon is reproducible rather than an opaque binary drop.

Usage:
    python3 scripts/gen-icon.py
    npx tauri icon src-tauri/icons/icon-source.png
"""

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# --- Canvas -----------------------------------------------------------------
SIZE = 1024
# macOS icon grid: the tile occupies 824 of 1024px, the rest is clear margin.
TILE = 824
MARGIN = (SIZE - TILE) // 2
# Superellipse exponent. n=4 is a rounded rect, n=5 is the Apple squircle.
SQUIRCLE_N = 5.0
SUPERSAMPLE = 4  # mask is built at 4x then downsampled for clean edges

# --- Palette (mirrors src/styles.css and MatrixRain.tsx) --------------------
GREEN = (57, 255, 20)
BACKDROP = (0, 8, 6)
HEAD = (220, 255, 220)

HERO_GLYPH = "角"  # 角 (kaku)

# The exact glyph set the rain animation draws from.
GLYPHS = (
    "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ"
    "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src-tauri" / "icons" / "icon-source.png"

FONT_CANDIDATES = [
    "/System/Library/Fonts/ヒラギノ角ゴシック W8.ttc",
    "/System/Library/Fonts/ヒラギノ角ゴシック W9.ttc",
    "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",
]


def load_font(size: int) -> ImageFont.FreeTypeFont:
    """First installed CJK face that can actually render the hero glyph."""
    for path in FONT_CANDIDATES:
        if not Path(path).exists():
            continue
        try:
            font = ImageFont.truetype(path, size)
        except OSError:
            continue
        if font.getmask(HERO_GLYPH).getbbox():
            return font
    raise SystemExit("No installed font renders 角 — cannot build the icon.")


def squircle_mask(size: int, tile: int, margin: int, n: float) -> Image.Image:
    """Superellipse |x|^n + |y|^n = 1, drawn as a polygon and antialiased."""
    ss = SUPERSAMPLE
    mask = Image.new("L", (size * ss, size * ss), 0)
    draw = ImageDraw.Draw(mask)

    radius = (tile / 2) * ss
    cx = cy = (margin + tile / 2) * ss

    points = []
    for i in range(720):
        theta = (i / 720) * 2 * math.pi
        ct, st = math.cos(theta), math.sin(theta)
        # Signed |cos|^(2/n) form traces the superellipse in polar terms.
        x = math.copysign(abs(ct) ** (2.0 / n), ct) * radius
        y = math.copysign(abs(st) ** (2.0 / n), st) * radius
        points.append((cx + x, cy + y))

    draw.polygon(points, fill=255)
    return mask.resize((size, size), Image.LANCZOS)


def build_rain(seed: int = 7) -> Image.Image:
    """
    Dim glyph columns, brighter at the head of each stream.

    Returned as its own transparent layer so the caller can alpha_composite it.
    ImageDraw writes pixels rather than blending them, so drawing translucent
    text straight onto the tile would come out fully opaque.
    """
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    rng = random.Random(seed)
    draw = ImageDraw.Draw(layer)
    cell = 46
    font = load_font(cell - 6)

    for col_x in range(MARGIN, MARGIN + TILE, cell):
        # Each column is one falling stream of random length and position.
        head = rng.randint(MARGIN - cell * 4, MARGIN + TILE)
        length = rng.randint(4, 11)
        for i in range(length):
            y = head + i * cell
            if y < MARGIN - cell or y > MARGIN + TILE:
                continue
            ch = GLYPHS[rng.randrange(len(GLYPHS))]
            if i == 0:
                colour = HEAD + (86,)  # stream head, near-white
            else:
                # Tail fades out as it trails behind the head.
                fade = max(0.0, 1.0 - i / length)
                colour = GREEN + (int(52 * fade),)
            draw.text((col_x, y), ch, font=font, fill=colour)

    return layer


def draw_hero(layer: Image.Image) -> None:
    """The 角 glyph, centred in the tile, with a phosphor bloom behind it."""
    font = load_font(int(TILE * 0.46))
    draw = ImageDraw.Draw(layer)

    left, top, right, bottom = draw.textbbox((0, 0), HERO_GLYPH, font=font)
    x = MARGIN + (TILE - (right - left)) / 2 - left
    y = MARGIN + (TILE - (bottom - top)) / 2 - top

    # Two blur passes: a wide soft halo plus a tight bright one.
    for blur, alpha in ((44, 150), (16, 190)):
        glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        ImageDraw.Draw(glow).text((x, y), HERO_GLYPH, font=font, fill=GREEN + (alpha,))
        layer.alpha_composite(glow.filter(ImageFilter.GaussianBlur(blur)))

    draw.text((x, y), HERO_GLYPH, font=font, fill=GREEN + (255,))


def main() -> None:
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

    tile = Image.new("RGBA", (SIZE, SIZE), BACKDROP + (255,))
    tile.alpha_composite(build_rain())
    draw_hero(tile)

    mask = squircle_mask(SIZE, TILE, MARGIN, SQUIRCLE_N)
    tile.putalpha(mask)
    canvas.alpha_composite(tile)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUT)
    print(f"wrote {OUT} ({SIZE}x{SIZE})")


if __name__ == "__main__":
    main()
