import os
from typing import Tuple

from PIL import Image


def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def generate_texture(color_hex: str, output_path: str, size: int = 16):
    color = hex_to_rgb(color_hex)
    img = Image.new('RGB', (size, size), color)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path)


def generate_pack_icon(output_path: str, color_hex: str = "#4CAF50"):
    """Generate a 128x128 pack_icon.png — Minecraft needs 128x128 minimum."""
    color = hex_to_rgb(color_hex)
    img = Image.new('RGBA', (128, 128), (*color, 255))
    pixels = img.load()
    dark = tuple(max(0, c - 80) for c in color)
    light = tuple(min(255, c + 40) for c in color)
    for x in range(128):
        for y in range(128):
            if x < 4 or x >= 124 or y < 4 or y >= 124:
                pixels[x, y] = (*dark, 255)
            elif x < 8 or x >= 120 or y < 8 or y >= 120:
                pixels[x, y] = (*light, 255)
    # Center diamond shape
    c = 64
    for y in range(30, 98):
        d = abs(y - c)
        w = max(0, 34 - d)
        for x in range(c - w, c + w):
            pixels[x, y] = (*light, 255)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path)
