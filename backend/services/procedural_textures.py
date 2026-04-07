"""Procedural Minecraft-style texture generator.
3 styles: Classic, Enchanted, Battle-worn.
Each weapon/tool/armor type has a unique silhouette.
"""
import base64
import io
import os
import random
from typing import Tuple, Dict, List

from PIL import Image

# === MATERIAL PALETTES ===
MATERIAL_PALETTES = {
    "wood":      {"main": (143, 119, 72), "light": (188, 152, 98), "dark": (95, 75, 42),  "handle": (107, 76, 18), "handle_dark": (74, 52, 9),   "guard": (143, 119, 72)},
    "stone":     {"main": (154, 154, 154),"light": (188, 188, 188),"dark": (104, 104, 104),"handle": (107, 76, 18), "handle_dark": (74, 52, 9),   "guard": (154, 154, 154)},
    "iron":      {"main": (216, 216, 216),"light": (240, 240, 240),"dark": (114, 114, 114),"handle": (107, 76, 18), "handle_dark": (74, 52, 9),   "guard": (180, 180, 180)},
    "gold":      {"main": (252, 219, 92), "light": (255, 240, 140),"dark": (186, 148, 28), "handle": (107, 76, 18), "handle_dark": (74, 52, 9),   "guard": (220, 190, 50)},
    "diamond":   {"main": (74, 237, 217), "light": (160, 255, 245),"dark": (45, 147, 147), "handle": (107, 76, 18), "handle_dark": (74, 52, 9),   "guard": (90, 200, 190)},
    "netherite":  {"main": (68, 51, 51),  "light": (100, 80, 80),  "dark": (40, 28, 28),   "handle": (60, 40, 30),  "handle_dark": (40, 25, 18),  "guard": (80, 60, 55)},
    "emerald":   {"main": (23, 221, 98),  "light": (100, 255, 160),"dark": (10, 140, 60),  "handle": (107, 76, 18), "handle_dark": (74, 52, 9),   "guard": (40, 180, 80)},
    "ruby":      {"main": (200, 30, 30),  "light": (255, 80, 80),  "dark": (130, 10, 10),  "handle": (107, 76, 18), "handle_dark": (74, 52, 9),   "guard": (180, 50, 50)},
    "amethyst":  {"main": (160, 80, 200), "light": (200, 140, 240),"dark": (100, 40, 140), "handle": (107, 76, 18), "handle_dark": (74, 52, 9),   "guard": (140, 70, 180)},
    "obsidian":  {"main": (20, 18, 30),   "light": (50, 40, 70),   "dark": (10, 8, 15),    "handle": (40, 30, 50),  "handle_dark": (20, 15, 30),  "guard": (60, 40, 80)},
    "copper":    {"main": (196, 116, 72), "light": (230, 155, 105),"dark": (140, 78, 40),  "handle": (107, 76, 18), "handle_dark": (74, 52, 9),   "guard": (180, 100, 60)},
    "redstone":  {"main": (180, 20, 20),  "light": (255, 60, 60),  "dark": (120, 0, 0),    "handle": (107, 76, 18), "handle_dark": (74, 52, 9),   "guard": (160, 30, 30)},
    "lapis":     {"main": (30, 50, 180),  "light": (70, 100, 230), "dark": (15, 25, 120),  "handle": (107, 76, 18), "handle_dark": (74, 52, 9),   "guard": (40, 60, 160)},
}
FOOD_PALETTES = {
    "golden": {"main": (252, 219, 92), "light": (255, 240, 140), "dark": (186, 148, 28)},
    "cooked": {"main": (180, 120, 60), "light": (220, 160, 90),  "dark": (120, 70, 30)},
    "raw":    {"main": (200, 80, 80),  "light": (240, 120, 120), "dark": (140, 40, 40)},
    "berry":  {"main": (180, 30, 60),  "light": (220, 70, 100),  "dark": (120, 10, 30)},
    "bread":  {"main": (218, 165, 32), "light": (240, 200, 80),  "dark": (139, 105, 20)},
    "veggie": {"main": (60, 180, 60),  "light": (100, 220, 100), "dark": (30, 120, 30)},
    "magical":{"main": (200, 100, 255),"light": (230, 160, 255), "dark": (140, 50, 200)},
    "divine": {"main": (255, 215, 0),  "light": (255, 240, 100), "dark": (200, 160, 0)},
}
BLOCK_PALETTES = {
    "ore":     {"base": (128, 128, 128), "spot": (200, 30, 30),   "spot_light": (255, 80, 80)},
    "stone":   {"base": (128, 128, 128), "spot": (110, 110, 110), "spot_light": (145, 145, 145)},
    "crystal": {"base": (80, 60, 100),   "spot": (160, 100, 220), "spot_light": (220, 170, 255)},
    "metal":   {"base": (180, 180, 180), "spot": (200, 200, 200), "spot_light": (230, 230, 230)},
    "wood":    {"base": (143, 100, 55),  "spot": (160, 120, 70),  "spot_light": (130, 90, 45)},
    "brick":   {"base": (150, 90, 70),   "spot": (170, 105, 80),  "spot_light": (130, 75, 55)},
    "glowing": {"base": (40, 40, 50),    "spot": (100, 200, 200), "spot_light": (150, 255, 255)},
    "nether":  {"base": (80, 20, 20),    "spot": (120, 40, 40),   "spot_light": (60, 10, 10)},
}

TEXTURE_STYLES = ["classic", "enchanted", "battle_worn", "celestial", "void", "neon"]

def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c)

def get_palette(m):
    return MATERIAL_PALETTES.get(m.lower(), MATERIAL_PALETTES["iron"])

def get_food_palette(f):
    return FOOD_PALETTES.get(f.lower(), FOOD_PALETTES["cooked"])

def get_block_palette(b):
    return BLOCK_PALETTES.get(b.lower(), BLOCK_PALETTES["ore"])

def _draw(px, points, color):
    for x, y in points:
        if 0 <= x < 16 and 0 <= y < 16:
            px[x, y] = (*color, 255) if len(color) == 3 else color

def _save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)


# ======= STYLE OVERLAYS =======

def _apply_enchanted(img):
    """Add enchanted shimmer/glow effect."""
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 100:
                # Purple-blue shimmer on diagonal
                if (x + y) % 4 == 0:
                    px[x, y] = (min(255, r + 40), min(255, g + 20), min(255, b + 60), a)
                elif (x + y) % 4 == 2:
                    px[x, y] = (min(255, r + 20), min(255, g + 10), min(255, b + 40), a)
    # Add sparkle dots
    sparkles = [(2, 2), (13, 4), (5, 1), (11, 10), (3, 13)]
    for sx, sy in sparkles:
        if 0 <= sx < w and 0 <= sy < h and px[sx, sy][3] < 50:
            px[sx, sy] = (220, 200, 255, 200)
    return img


def _apply_battle_worn(img):
    """Add scratches, darker tone, battle damage."""
    px = img.load()
    w, h = img.size
    random.seed(42)
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 100:
                # Darken everything slightly
                r = int(r * 0.85)
                g = int(g * 0.85)
                b = int(b * 0.85)
                # Random scratches (lighter streaks)
                if random.random() < 0.08:
                    r = min(255, r + 50)
                    g = min(255, g + 50)
                    b = min(255, b + 50)
                # Random nicks (darker spots)
                if random.random() < 0.05:
                    r = max(0, r - 40)
                    g = max(0, g - 40)
                    b = max(0, b - 40)
                px[x, y] = (r, g, b, a)
    return img


def _apply_celestial(img):
    """Golden divine glow — bright gold highlights + star sparkles."""
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 100:
                # Gold tint
                r = min(255, r + 30)
                g = min(255, g + 20)
                b = max(0, b - 20)
                if (x + y) % 3 == 0:
                    r = min(255, r + 40)
                    g = min(255, g + 30)
                px[x, y] = (r, g, b, a)
    # Gold sparkles
    for sx, sy in [(1,1),(3,4),(14,2),(12,11),(5,14),(10,6),(2,9)]:
        if 0 <= sx < w and 0 <= sy < h:
            px[sx, sy] = (255, 255, 150, 220)
    return img


def _apply_void(img):
    """Dark void energy — deep purple/black with glowing cracks."""
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 100:
                # Darken to near-black with purple tint
                r = max(0, int(r * 0.3))
                g = max(0, int(g * 0.2))
                b = min(255, int(b * 0.4) + 30)
                # Glowing cracks
                if (x * 7 + y * 13) % 11 == 0:
                    r = min(255, r + 120)
                    g = 0
                    b = min(255, b + 150)
                px[x, y] = (r, g, b, a)
    return img


def _apply_neon(img):
    """Cyberpunk neon glow — bright saturated edges."""
    px = img.load()
    w, h = img.size
    # Find edges and make them glow
    for y in range(1, h-1):
        for x in range(1, w-1):
            r, g, b, a = px[x, y]
            if a > 100:
                # Check if edge pixel (neighbor is transparent)
                neighbors = [px[x-1,y], px[x+1,y], px[x,y-1], px[x,y+1]]
                is_edge = any(n[3] < 50 for n in neighbors)
                if is_edge:
                    # Bright neon edge
                    px[x, y] = (min(255, r + 100), min(255, g + 200), min(255, b + 255), 255)
                else:
                    # Darken interior
                    px[x, y] = (int(r * 0.7), int(g * 0.7), int(b * 0.7), a)
    return img


def _apply_style(img, style):
    if style == "enchanted":
        return _apply_enchanted(img)
    elif style == "battle_worn":
        return _apply_battle_worn(img)
    elif style == "celestial":
        return _apply_celestial(img)
    elif style == "void":
        return _apply_void(img)
    elif style == "neon":
        return _apply_neon(img)
    return img  # classic — no modification


# ======= WEAPONS =======

def generate_sword_texture(material, output_path, style="classic"):
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    # Blade tip (pointed)
    px[15, 0] = (*shade(p["light"], 1.3), 255)
    # Blade edge (bright highlight)
    _draw(px, [(14,0),(13,1),(12,2),(11,3),(10,4),(9,5),(8,6),(7,7),(6,8)], p["light"])
    # Blade body
    _draw(px, [(14,1),(13,0),(12,1),(11,2),(10,3),(9,4),(8,5),(7,6),(6,7),(5,8)], p["main"])
    # Blade back edge (shadow)
    _draw(px, [(12,0),(11,1),(10,2),(9,3),(8,4),(7,5),(6,6),(5,7)], p["dark"])
    # Fuller (center groove on blade — darker line)
    _draw(px, [(13,1),(12,2),(11,3),(10,4),(9,5),(8,6)], shade(p["main"], 0.85))
    # Tip extra highlight
    px[14, 0] = (*shade(p["light"], 1.2), 255)
    # Crossguard (wider, with center gem)
    _draw(px, [(3,9),(4,9),(5,9),(6,9),(7,9),(8,9)], p["guard"])
    px[6, 9] = (*shade(p["guard"], 1.3), 255)  # gem on guard
    _draw(px, [(4,10),(5,10)], shade(p["guard"], 0.7))
    # Handle with leather wrapping pattern
    px[3,10] = (*p["handle"], 255); px[3,11] = (*p["handle_dark"], 255)
    px[2,11] = (*p["handle"], 255); px[2,12] = (*p["handle_dark"], 255)
    px[3,12] = (*p["handle"], 255)
    px[1,13] = (*p["handle_dark"], 255)
    # Pommel
    px[1,14] = (*p["guard"], 255); px[0,14] = (*shade(p["guard"], 0.8), 255)
    _save(_apply_style(img, style), output_path)


def generate_katana_texture(material, output_path, style="classic"):
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    # Thin curved blade
    blade = [(14,0),(13,1),(13,2),(12,3),(11,4),(11,5),(10,6),(9,7),(8,8),(7,9)]
    _draw(px, blade, p["light"])
    _draw(px, [(x-1,y) for x,y in blade if x-1>=0], p["main"])
    # Back edge
    _draw(px, [(x-2,y) for x,y in blade[2:] if x-2>=0], p["dark"])
    # Tsuba
    _draw(px, [(6,10),(7,10),(6,11),(7,11)], p["guard"])
    # Wrapped handle
    for i, (x, y) in enumerate([(5,11),(5,12),(4,12),(4,13),(3,14)]):
        px[x,y] = (*(p["handle"] if i%2==0 else p["handle_dark"]), 255)
    _save(_apply_style(img, style), output_path)


def generate_spear_texture(material, output_path, style="classic"):
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for i in range(11):
        px[2+i, 14-i] = (*p["handle"], 255)
    # Spearhead
    _draw(px, [(13,2),(14,1),(14,2),(13,3)], p["main"])
    _draw(px, [(15,0),(14,0),(15,1)], p["light"])
    _draw(px, [(13,4),(12,3)], p["dark"])
    # Binding wraps
    _draw(px, [(11,5),(12,4)], shade(p["guard"], 0.8))
    _save(_apply_style(img, style), output_path)


def generate_staff_texture(material, output_path, style="classic"):
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for i in range(9):
        px[3+i, 14-i] = (*p["handle"], 255)
    # Gem (3x3)
    _draw(px, [(12,4),(13,4),(14,4),(12,5),(13,5),(14,5),(12,3),(13,3),(14,3)], p["main"])
    _draw(px, [(13,3),(14,3),(14,4)], p["light"])
    _draw(px, [(12,5),(13,5)], p["dark"])
    # Inner gem glow
    px[13,4] = (*shade(p["light"], 1.3), 255)
    # Sparkles
    for sx,sy in [(15,2),(11,2),(15,5),(11,6)]:
        px[sx,sy] = (*shade(p["light"], 1.5), 180)
    _save(_apply_style(img, style), output_path)


def generate_hammer_texture(material, output_path, style="classic"):
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for i in range(6):
        px[2+i, 14-i] = (*p["handle"], 255)
        px[3+i, 14-i] = (*p["handle_dark"], 255)
    # Head (large rectangle)
    for y in range(2, 7):
        for x in range(8, 15):
            px[x,y] = (*p["main"], 255)
    for x in range(8, 15): px[x,2] = (*p["light"], 255)
    for x in range(8, 15): px[x,6] = (*p["dark"], 255)
    for y in range(2, 7): px[14,y] = (*p["dark"], 255)
    for y in range(2, 7): px[8,y] = (*p["light"], 255)
    # Face detail
    px[11,4] = (*shade(p["main"], 1.1), 255)
    px[10,3] = (*shade(p["light"], 0.9), 255)
    _save(_apply_style(img, style), output_path)


def generate_bow_texture(material, output_path, style="classic"):
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    # Bow limbs (curved)
    limb = [(5,1),(4,2),(3,3),(3,4),(2,5),(2,6),(2,7),(2,8),(2,9),(2,10),(3,11),(3,12),(4,13),(5,14)]
    _draw(px, limb, p["handle"])
    _draw(px, [(x+1,y) for x,y in limb if x+1<16], p["handle_dark"])
    # Grip
    _draw(px, [(4,7),(4,8),(5,7),(5,8)], shade(p["handle"], 0.7))
    # String
    for y in range(2, 14): px[9,y] = (220, 220, 220, 255)
    # Arrow
    _draw(px, [(10,7),(11,7),(12,7),(13,7),(14,7)], p["main"])
    px[14,6] = (*p["light"], 255)
    px[14,8] = (*p["light"], 255)
    px[15,7] = (*p["dark"], 255)
    _save(_apply_style(img, style), output_path)


# ======= TOOLS =======

def generate_pickaxe_texture(material, output_path, style="classic"):
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for i in range(7):
        px[2+i, 14-i] = (*p["handle"], 255)
        px[3+i, 14-i] = (*p["handle_dark"], 255)
    _draw(px, [(13,1),(12,2),(11,3),(10,4)], p["light"])
    _draw(px, [(10,7),(11,6),(12,5)], p["main"])
    _draw(px, [(9,6),(9,7),(10,5),(10,6),(11,4),(11,5)], p["main"])
    _draw(px, [(9,8),(10,8)], p["dark"])
    px[14,0] = (*shade(p["light"], 1.1), 255)
    _save(_apply_style(img, style), output_path)


def generate_axe_texture(material, output_path, style="classic"):
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for i in range(7):
        px[2+i, 14-i] = (*p["handle"], 255)
        px[3+i, 14-i] = (*p["handle_dark"], 255)
    _draw(px, [(10,4),(10,5),(10,6),(11,3),(11,4),(11,5),(11,6),(12,2),(12,3),(12,4),(12,5),(13,2),(13,3),(13,4)], p["main"])
    _draw(px, [(13,1),(14,2),(14,3)], p["light"])
    _draw(px, [(10,7),(11,7)], p["dark"])
    # Edge detail
    px[14,4] = (*shade(p["light"], 0.9), 255)
    _save(_apply_style(img, style), output_path)


def generate_shovel_texture(material, output_path, style="classic"):
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for i in range(7):
        px[2+i, 14-i] = (*p["handle"], 255)
        px[3+i, 14-i] = (*p["handle_dark"], 255)
    _draw(px, [(10,5),(10,6),(11,4),(11,5),(11,6),(12,3),(12,4),(12,5),(13,3),(13,4)], p["main"])
    _draw(px, [(13,2),(12,2)], p["light"])
    _draw(px, [(10,7),(11,7)], p["dark"])
    _save(_apply_style(img, style), output_path)


def generate_hoe_texture(material, output_path, style="classic"):
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for i in range(7):
        px[2+i, 14-i] = (*p["handle"], 255)
        px[3+i, 14-i] = (*p["handle_dark"], 255)
    _draw(px, [(10,5),(11,4),(11,5),(12,3),(12,4),(13,3),(14,3)], p["main"])
    _draw(px, [(14,2),(13,2)], p["light"])
    _save(_apply_style(img, style), output_path)


# ======= ARMOR =======

def generate_helmet_texture(material, output_path, style="classic"):
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for y in range(3, 13):
        for x in range(3, 13):
            if y <= 5: px[x,y] = (*p["main"], 255)
            elif y <= 8: px[x,y] = (*p["main"], 255)
            elif y <= 11 and (x <= 4 or x >= 11): px[x,y] = (*p["main"], 255)
            elif y <= 11 and 5 <= x <= 10: px[x,y] = (*p["dark"], 255)
    for x in range(5, 11): px[x,3] = (*p["light"], 255)
    for x in range(3, 13): px[x,4] = (*shade(p["main"], 1.05), 255)
    for x in range(3, 13):
        if px[x,11] != (0,0,0,0): px[x,12] = (*p["dark"], 255)
    # Visor detail
    px[6,9] = (*shade(p["dark"], 0.7), 255)
    px[9,9] = (*shade(p["dark"], 0.7), 255)
    _save(_apply_style(img, style), output_path)


def generate_chestplate_texture(material, output_path, style="classic"):
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for y in range(2, 14):
        if y <= 3:
            for x in range(2, 6): px[x,y] = (*p["main"], 255)
            for x in range(10, 14): px[x,y] = (*p["main"], 255)
        elif y <= 5:
            for x in range(1, 15): px[x,y] = (*p["main"], 255)
        elif y <= 10:
            for x in range(3, 13): px[x,y] = (*p["main"], 255)
        else:
            for x in range(4, 12): px[x,y] = (*p["main"], 255)
    for x in range(6, 10): px[x,2] = (0,0,0,0); px[x,3] = (0,0,0,0)
    for y in range(4, 12):
        if px[3,y][3] > 0: px[3,y] = (*p["light"], 255)
        if px[12,y][3] > 0: px[12,y] = (*p["dark"], 255)
    for x in range(3, 13):
        if px[x,4][3] > 0: px[x,4] = (*p["light"], 255)
    # Center line detail
    for y in range(5, 11): px[7,y] = (*shade(p["main"], 1.08), 255); px[8,y] = (*shade(p["main"], 0.92), 255)
    _save(_apply_style(img, style), output_path)


def generate_leggings_texture(material, output_path, style="classic"):
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for x in range(4, 12): px[x,2] = (*p["main"], 255); px[x,3] = (*p["light"], 255)
    # Belt buckle
    px[7,2] = (*p["guard"], 255); px[8,2] = (*p["guard"], 255)
    for y in range(4, 14):
        for x in range(4, 7): px[x,y] = (*p["main"], 255)
        px[4,y] = (*p["light"], 255); px[6,y] = (*p["dark"], 255)
        for x in range(9, 12): px[x,y] = (*p["main"], 255)
        px[9,y] = (*p["light"], 255); px[11,y] = (*p["dark"], 255)
    # Knee detail
    px[5,9] = (*shade(p["main"], 1.1), 255); px[10,9] = (*shade(p["main"], 1.1), 255)
    _save(_apply_style(img, style), output_path)


def generate_boots_texture(material, output_path, style="classic"):
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    # Left boot
    for y in range(5, 11):
        for x in range(3, 6): px[x,y] = (*p["main"], 255)
    for x in range(2, 7): px[x,11] = (*p["main"], 255)
    for x in range(2, 7): px[x,12] = (*p["dark"], 255)
    px[3,5] = (*p["light"], 255); px[4,5] = (*p["light"], 255)
    # Ankle strap
    for x in range(3, 6): px[x,8] = (*shade(p["main"], 1.1), 255)
    # Right boot
    for y in range(5, 11):
        for x in range(10, 13): px[x,y] = (*p["main"], 255)
    for x in range(9, 14): px[x,11] = (*p["main"], 255)
    for x in range(9, 14): px[x,12] = (*p["dark"], 255)
    px[10,5] = (*p["light"], 255); px[11,5] = (*p["light"], 255)
    for x in range(10, 13): px[x,8] = (*shade(p["main"], 1.1), 255)
    _save(_apply_style(img, style), output_path)


# ======= FOOD =======

FOOD_SHAPES = {
    "golden":  [(6,10),(5,11),(4,12),(4,12),(4,12),(4,12),(5,11),(6,10),(7,9)],
    "cooked":  [(5,11),(4,12),(4,12),(4,13),(4,13),(5,12),(6,11),(7,10)],
    "raw":     [(5,11),(4,12),(4,12),(4,13),(4,13),(5,12),(6,11),(7,10)],
    "berry":   [(6,9),(6,10),(6,10),(6,10),(6,9)],
    "bread":   [(4,12),(3,13),(3,13),(3,13),(3,13),(3,13),(4,12)],
    "veggie":  [(7,9),(6,10),(6,11),(6,11),(6,10),(7,9)],
    "magical": [(6,10),(5,11),(4,12),(4,12),(4,12),(4,12),(5,11),(6,10),(7,9)],
    "divine":  [(6,10),(5,11),(4,12),(4,12),(4,12),(4,12),(5,11),(6,10),(7,9)],
}

def generate_food_texture(food_type, output_path, style="classic"):
    p = get_food_palette(food_type)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    rows = FOOD_SHAPES.get(food_type, FOOD_SHAPES["cooked"])
    for i, (xs, xe) in enumerate(rows):
        y = 4 + i
        for x in range(xs, xe+1): px[x,y] = (*p["main"], 255)
        if xs <= xe: px[xs,y] = (*p["dark"], 255); px[xe,y] = (*p["dark"], 255)
    if len(rows) > 1:
        xs, xe = rows[0]
        for x in range(xs, xe+1): px[x,4] = (*p["light"], 255)
        px[xs+1,5] = (*p["light"], 255); px[xs+2,5] = (*p["light"], 255)
    if food_type in ("golden", "magical", "divine"):
        px[8,3] = (74, 52, 9, 255); px[8,2] = (107, 76, 18, 255)
        px[9,2] = (50, 160, 50, 255); px[10,3] = (50, 160, 50, 255)
    if food_type in ("magical", "divine"):
        for sx,sy in [(3,6),(11,8),(6,3),(10,5)]: px[sx,sy] = (*shade(p["light"],1.4), 180)
    _save(_apply_style(img, style), output_path)


# ======= BLOCKS =======

def generate_block_texture(block_type, output_path, style="classic"):
    p = get_block_palette(block_type)
    random.seed(hash(block_type + output_path))
    img = Image.new('RGB', (16, 16), p["base"])
    px = img.load()
    for y in range(16):
        for x in range(16):
            n = random.randint(-15, 15)
            px[x,y] = tuple(max(0, min(255, c+n)) for c in p["base"])
    for _ in range(random.randint(5, 10)):
        sx, sy = random.randint(1, 14), random.randint(1, 14)
        px[sx,sy] = p["spot"]
        if random.random() > 0.3: px[min(15,sx+1),sy] = p["spot"]
        if random.random() > 0.3: px[sx,min(15,sy+1)] = p["spot_light"]
        if random.random() > 0.5: px[min(15,sx+1),min(15,sy+1)] = p["spot"]
    _save(img, output_path)


# ======= PACK ICON =======

def generate_pack_icon_procedural(material, output_path, item_type="weapon", sub_type="sword"):
    """Generate a 128x128 pack icon using the actual item shape."""
    import tempfile

    p = get_palette(material) if material in MATERIAL_PALETTES else get_palette("diamond")

    # Generate the actual item texture at 16x16
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tf:
        tmp = tf.name
    try:
        generate_procedural_texture(item_type, sub_type, material, tmp)
        item_img = Image.open(tmp).convert("RGBA")
    except Exception:
        # Fallback to sword
        item_img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)

    # Create 128x128 icon with colored background
    bg = shade(p["main"], 0.25)
    border = shade(p["dark"], 0.4)
    img = Image.new('RGBA', (128, 128), (*bg, 255))
    px = img.load()

    # Border
    for x in range(128):
        for y in range(128):
            if x < 4 or x >= 124 or y < 4 or y >= 124:
                px[x, y] = (*border, 255)
            elif x < 8 or x >= 120 or y < 8 or y >= 120:
                px[x, y] = (*shade(bg, 1.3), 255)

    # Paste scaled item in center
    item_big = item_img.resize((80, 80), Image.NEAREST)
    img.paste(item_big, (24, 24), item_big)

    _save(img, output_path)


# ======= EXTRA MELEE WEAPONS =======

def generate_gauntlet_texture(material, output_path, style="classic"):
    """Gauntlet — fist weapon, worn on hand."""
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    # Fist shape
    for y in range(4, 10):
        for x in range(5, 12): px[x,y] = (*p["main"], 255)
    # Knuckle spikes
    for x in range(5, 12, 2): px[x,3] = (*p["light"], 255)
    # Shading
    for x in range(5, 12): px[x,4] = (*p["light"], 255)
    for x in range(5, 12): px[x,9] = (*p["dark"], 255)
    # Wrist
    for y in range(10, 13):
        for x in range(6, 11): px[x,y] = (*p["handle"], 255)
    _save(_apply_style(img, style), output_path)


def generate_whip_texture(material, output_path, style="classic"):
    """Whip — curved flexible weapon."""
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    # Handle
    _draw(px, [(3,12),(3,11),(4,10),(4,9)], p["handle"])
    _draw(px, [(2,13),(2,12)], p["handle_dark"])
    # Whip cord (curved path)
    cord = [(5,8),(6,7),(7,6),(8,5),(9,5),(10,4),(11,3),(12,3),(13,2),(14,2),(15,1)]
    _draw(px, cord, p["main"])
    _draw(px, [(x,y+1) for x,y in cord if y+1<16], p["dark"])
    # Tip
    px[15,0] = (*p["light"], 255)
    _save(_apply_style(img, style), output_path)


def generate_shield_texture(material, output_path, style="classic"):
    """Shield — front-facing defensive item."""
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    # Shield shape (rounded rectangle)
    rows = [(5,10),(4,11),(3,12),(3,12),(3,12),(3,12),(3,12),(3,12),(4,11),(5,10),(6,9)]
    for i, (xs, xe) in enumerate(rows):
        y = 2 + i
        for x in range(xs, xe+1): px[x,y] = (*p["main"], 255)
        px[xs,y] = (*p["dark"], 255); px[xe,y] = (*p["dark"], 255)
    for x in range(5, 11): px[x,2] = (*p["light"], 255)
    # Center emblem
    px[7,6] = (*p["guard"], 255); px[8,6] = (*p["guard"], 255)
    px[7,7] = (*p["guard"], 255); px[8,7] = (*p["guard"], 255)
    _save(_apply_style(img, style), output_path)


def generate_throwable_texture(material, output_path, style="classic"):
    """Throwable — small round projectile (shuriken/grenade)."""
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    # Small star/circle shape
    _draw(px, [(7,4),(8,4)], p["light"])
    _draw(px, [(6,5),(7,5),(8,5),(9,5)], p["main"])
    _draw(px, [(5,6),(6,6),(7,6),(8,6),(9,6),(10,6)], p["main"])
    _draw(px, [(5,7),(6,7),(7,7),(8,7),(9,7),(10,7)], p["main"])
    _draw(px, [(6,8),(7,8),(8,8),(9,8)], p["dark"])
    _draw(px, [(7,9),(8,9)], p["dark"])
    # Spikes for shuriken
    px[7,3] = (*p["light"], 255); px[11,6] = (*p["light"], 255)
    px[4,7] = (*p["light"], 255); px[8,10] = (*p["light"], 255)
    _save(_apply_style(img, style), output_path)


def generate_nuke_texture(material, output_path, style="classic"):
    """Nuke — explosive bomb shape."""
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    # Bomb body (oval)
    rows = [(6,9),(5,10),(4,11),(4,11),(4,11),(4,11),(5,10),(6,9)]
    for i, (xs, xe) in enumerate(rows):
        y = 4 + i
        for x in range(xs, xe+1): px[x,y] = (*p["main"], 255)
    for x in range(6, 10): px[x,4] = (*p["light"], 255)
    for x in range(4, 12): px[x,9] = (*p["dark"], 255)
    # Fuse
    _draw(px, [(8,3),(9,2),(10,1)], p["handle"])
    # Spark
    px[11,0] = (255, 200, 50, 255); px[10,0] = (255, 150, 0, 255)
    # Warning stripes
    px[6,6] = (*p["guard"], 255); px[7,6] = (*p["guard"], 255)
    px[8,6] = (*p["guard"], 255); px[9,6] = (*p["guard"], 255)
    _save(_apply_style(img, style), output_path)


# ======= RANGED WEAPONS =======

def generate_gun_texture(material, output_path, style="classic"):
    """Gun — horizontal weapon shape with barrel, grip, trigger."""
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    # Barrel (horizontal)
    _draw(px, [(6,5),(7,5),(8,5),(9,5),(10,5),(11,5),(12,5),(13,5),(14,5),(15,5)], p["main"])
    _draw(px, [(6,6),(7,6),(8,6),(9,6),(10,6),(11,6),(12,6),(13,6),(14,6),(15,6)], p["dark"])
    # Muzzle
    px[15,4] = (*p["light"], 255); px[15,7] = (*p["light"], 255)
    # Body/receiver
    _draw(px, [(4,5),(5,5),(4,6),(5,6),(4,7),(5,7),(6,7),(7,7),(8,7)], p["main"])
    _draw(px, [(4,4),(5,4),(6,4)], p["light"])
    # Grip
    _draw(px, [(5,8),(5,9),(5,10),(4,9),(4,10),(4,11)], p["handle"])
    _draw(px, [(3,10),(3,11)], p["handle_dark"])
    # Trigger
    px[6,8] = (*p["guard"], 255); px[7,8] = (*p["guard"], 255)
    # Sight
    px[10,4] = (*p["light"], 255)
    _save(_apply_style(img, style), output_path)


def generate_rpg_texture(material, output_path, style="classic"):
    """RPG — tube launcher on shoulder."""
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    # Tube (thick horizontal)
    for y in range(4, 8):
        for x in range(3, 15):
            px[x, y] = (*p["main"], 255)
    # Tube shading
    for x in range(3, 15): px[x, 4] = (*p["light"], 255)
    for x in range(3, 15): px[x, 7] = (*p["dark"], 255)
    # Muzzle opening
    px[15, 5] = (*p["dark"], 255); px[15, 6] = (*p["dark"], 255)
    # Back opening
    px[2, 5] = (*p["dark"], 255); px[2, 6] = (*p["dark"], 255)
    # Grip
    _draw(px, [(7,8),(7,9),(7,10),(6,9),(6,10)], p["handle"])
    _draw(px, [(8,8),(8,9)], p["handle_dark"])
    # Trigger guard
    px[9, 8] = (*p["guard"], 255)
    # Sight
    px[11, 3] = (*p["light"], 255); px[11, 2] = (*p["light"], 255)
    # Warhead tip
    px[15, 4] = (*shade(p["main"], 1.3), 255)
    px[15, 7] = (*shade(p["main"], 1.3), 255)
    _save(_apply_style(img, style), output_path)


def generate_crossbow_texture(material, output_path, style="classic"):
    """Crossbow — horizontal bow with stock."""
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    # Stock (horizontal)
    _draw(px, [(2,7),(3,7),(4,7),(5,7),(6,7),(7,7),(8,7),(9,7),(10,7)], p["handle"])
    _draw(px, [(2,8),(3,8),(4,8),(5,8)], p["handle_dark"])
    # Bow limbs (vertical at front)
    _draw(px, [(11,3),(11,4),(11,5),(11,6),(11,7),(11,8),(11,9),(11,10),(11,11)], p["main"])
    _draw(px, [(12,4),(12,5),(12,10),(12,9)], p["main"])
    # String
    _draw(px, [(10,4),(10,5),(10,6),(10,8),(10,9),(10,10)], (220,220,220))
    # Arrow loaded
    _draw(px, [(12,7),(13,7),(14,7),(15,7)], p["light"])
    px[15,6] = (*p["light"], 255); px[15,8] = (*p["light"], 255)
    # Trigger
    px[6,9] = (*p["guard"], 255)
    _save(_apply_style(img, style), output_path)


# ======= PREVIEW =======

def generate_preview_base64(item_type, sub_type, material, style="classic"):
    buf = io.BytesIO()
    img = _generate_preview_image(item_type, sub_type, material, style)
    img = img.resize((128, 128), Image.NEAREST)
    img.save(buf, format='PNG')
    return "data:image/png;base64,%s" % base64.b64encode(buf.getvalue()).decode()

def _generate_preview_image(item_type, sub_type, material, style="classic"):
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tf:
        tmp = tf.name
    try:
        generate_procedural_texture(item_type, sub_type, material, tmp, style)
        return Image.open(tmp).copy()
    finally:
        if os.path.exists(tmp): os.unlink(tmp)


# ======= DISPATCH =======

TEXTURE_GENERATORS = {
    # Melee
    "sword": generate_sword_texture, "katana": generate_katana_texture,
    "spear": generate_spear_texture, "staff": generate_staff_texture,
    "hammer": generate_hammer_texture,
    "gauntlet": generate_gauntlet_texture, "whip": generate_whip_texture,
    "shield": generate_shield_texture,
    # Ranged
    "bow": generate_bow_texture, "gun": generate_gun_texture,
    "rpg": generate_rpg_texture, "crossbow": generate_crossbow_texture,
    # Throwable / Explosive
    "throwable": generate_throwable_texture, "nuke": generate_nuke_texture,
    # Tools
    "pickaxe": generate_pickaxe_texture, "axe": generate_axe_texture,
    "shovel": generate_shovel_texture, "hoe": generate_hoe_texture,
    "wrench": generate_pickaxe_texture, "scanner": generate_staff_texture,
    # Armor
    "helmet": generate_helmet_texture, "chestplate": generate_chestplate_texture,
    "leggings": generate_leggings_texture, "boots": generate_boots_texture,
}

def generate_procedural_texture(item_type, sub_type, material, output_path, style="classic"):
    key = sub_type.lower() if sub_type else item_type.lower()
    gen = TEXTURE_GENERATORS.get(key)
    if not gen:
        if item_type == "food": gen = generate_food_texture
        elif item_type == "block": gen = generate_block_texture
        elif item_type == "weapon": gen = generate_sword_texture
        elif item_type == "tool": gen = generate_pickaxe_texture
        elif item_type == "armor": gen = generate_chestplate_texture
        else: gen = generate_sword_texture

    if gen in (generate_food_texture, generate_block_texture):
        gen(material or "cooked", output_path, style)
    else:
        gen(material or "iron", output_path, style)
