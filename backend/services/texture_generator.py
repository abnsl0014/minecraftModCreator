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
    """Generate a 64x64 pack_icon.png with a simple bordered design."""
    color = hex_to_rgb(color_hex)
    img = Image.new('RGB', (64, 64), color)
    pixels = img.load()
    # Draw a darker border for visual distinction
    dark = tuple(max(0, c - 80) for c in color)
    for x in range(64):
        for y in range(64):
            if x < 2 or x >= 62 or y < 2 or y >= 62:
                pixels[x, y] = dark
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path)
