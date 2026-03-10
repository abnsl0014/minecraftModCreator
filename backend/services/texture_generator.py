import os
from typing import Tuple

from PIL import Image


def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def generate_texture(color_hex: str, output_path: str):
    color = hex_to_rgb(color_hex)
    img = Image.new('RGB', (16, 16), color)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path)
