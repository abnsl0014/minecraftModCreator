"""Procedural Minecraft-style texture generator.
Each weapon/tool/armor type has a UNIQUE silhouette.
"""
import base64
import io
import os
import random
from typing import Tuple, Dict

from PIL import Image

# === MINECRAFT MATERIAL PALETTES ===
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
            px[x, y] = (*color, 255)


def _save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)


# ============ WEAPONS (each has unique shape) ============

def generate_sword_texture(material, output_path):
    """Classic Minecraft sword - thin diagonal blade + crossguard + handle."""
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    # Thin blade: 1px wide diagonal
    _draw(px, [(14,0),(13,1),(12,2),(11,3),(10,4),(9,5),(8,6),(7,7),(6,8)], p["light"])
    _draw(px, [(13,0),(12,1),(11,2),(10,3),(9,4),(8,5),(7,6),(6,7),(5,8)], p["main"])
    _draw(px, [(12,0),(11,1),(10,2),(9,3),(8,4),(7,5),(6,6),(5,7)], p["dark"])
    # Crossguard
    _draw(px, [(4,9),(5,9),(6,9),(7,9),(4,10)], p["guard"])
    # Handle
    _draw(px, [(3,10),(3,11),(2,12)], p["handle"])
    _draw(px, [(2,11),(2,13),(1,13)], p["handle_dark"])
    px[1,14] = (*p["guard"], 255)
    _save(img, output_path)


def generate_katana_texture(material, output_path):
    """Katana - longer, thinner, slightly curved blade."""
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    # Thin curved blade (1px, with curve offset)
    blade = [(14,0),(13,1),(13,2),(12,3),(11,4),(11,5),(10,6),(9,7),(8,8),(7,9)]
    _draw(px, blade, p["light"])
    _draw(px, [(x-1,y) for x,y in blade], p["main"])
    # Tsuba (round guard)
    _draw(px, [(6,10),(7,10),(6,11)], p["guard"])
    # Wrapped handle (alternating)
    for i, (x, y) in enumerate([(5,11),(5,12),(4,13),(4,14)]):
        px[x,y] = (*(p["handle"] if i % 2 == 0 else p["handle_dark"]), 255)
    _save(img, output_path)


def generate_spear_texture(material, output_path):
    """Spear - very long thin shaft with pointed tip."""
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    # Long shaft
    for i in range(11):
        px[2 + i, 14 - i] = (*p["handle"], 255)
    # Spear head (triangle at top)
    _draw(px, [(13,2),(14,1),(14,2),(13,3)], p["main"])
    _draw(px, [(15,0),(14,0),(15,1)], p["light"])
    _draw(px, [(13,4),(12,3)], p["dark"])
    _save(img, output_path)


def generate_staff_texture(material, output_path):
    """Staff/wand - thin rod with glowing gem on top."""
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    # Rod
    for i in range(9):
        px[3 + i, 14 - i] = (*p["handle"], 255)
    # Gem at top (3x3 glowing)
    _draw(px, [(12,4),(13,4),(14,4),(12,5),(13,5),(14,5),(12,3),(13,3),(14,3)], p["main"])
    _draw(px, [(13,3),(14,3),(14,4)], p["light"])
    _draw(px, [(12,5),(13,5)], p["dark"])
    # Sparkle
    px[15,2] = (*p["light"], 255)
    px[11,2] = (*p["light"], 255)
    _save(img, output_path)


def generate_hammer_texture(material, output_path):
    """Hammer - massive rectangular head on a handle."""
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    # Handle
    for i in range(6):
        px[2+i, 14-i] = (*p["handle"], 255)
        px[3+i, 14-i] = (*p["handle_dark"], 255)
    # Massive head (6x4 rectangle)
    for y in range(2, 6):
        for x in range(8, 15):
            px[x, y] = (*p["main"], 255)
    # Highlight top
    for x in range(8, 15): px[x, 2] = (*p["light"], 255)
    # Shadow bottom
    for x in range(8, 15): px[x, 5] = (*p["dark"], 255)
    # Shadow right
    for y in range(2, 6): px[14, y] = (*p["dark"], 255)
    _save(img, output_path)


def generate_bow_texture(material, output_path):
    """Bow - curved arc with string."""
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    # Bow limbs (curved)
    limb = [(5,1),(4,2),(3,3),(3,4),(2,5),(2,6),(2,7),(2,8),(2,9),(2,10),(3,11),(3,12),(4,13),(5,14)]
    _draw(px, limb, p["handle"])
    _draw(px, [(x+1,y) for x,y in limb if x+1<16], p["handle_dark"])
    # Grip (thicker middle)
    _draw(px, [(4,7),(4,8),(5,7),(5,8)], shade(p["handle"], 0.8))
    # String
    for y in range(2, 14):
        px[9, y] = (220, 220, 220, 255)
    # Arrow nocked
    _draw(px, [(10,7),(11,7),(12,7),(13,7),(14,7)], p["main"])
    px[14,6] = (*p["light"], 255)
    px[14,8] = (*p["light"], 255)
    _save(img, output_path)


# ============ TOOLS (each unique) ============

def generate_pickaxe_texture(material, output_path):
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for i in range(7):
        px[2+i, 14-i] = (*p["handle"], 255)
        px[3+i, 14-i] = (*p["handle_dark"], 255)
    # Pick head - two prongs
    _draw(px, [(13,1),(12,2),(11,3),(10,4)], p["light"])  # right prong
    _draw(px, [(10,7),(11,6),(12,5)], p["main"])           # left prong
    _draw(px, [(9,6),(9,7),(10,5),(10,6),(11,4),(11,5)], p["main"])  # center
    _draw(px, [(9,8),(10,8)], p["dark"])
    _save(img, output_path)


def generate_axe_texture(material, output_path):
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for i in range(7):
        px[2+i, 14-i] = (*p["handle"], 255)
        px[3+i, 14-i] = (*p["handle_dark"], 255)
    # Axe head - broad curved wedge
    _draw(px, [(10,4),(10,5),(10,6),(11,3),(11,4),(11,5),(11,6),(12,2),(12,3),(12,4),(12,5),(13,2),(13,3),(13,4)], p["main"])
    _draw(px, [(13,1),(14,2),(14,3)], p["light"])
    _draw(px, [(10,7),(11,7)], p["dark"])
    _save(img, output_path)


def generate_shovel_texture(material, output_path):
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for i in range(7):
        px[2+i, 14-i] = (*p["handle"], 255)
        px[3+i, 14-i] = (*p["handle_dark"], 255)
    # Shovel blade - rounded
    _draw(px, [(10,5),(10,6),(11,4),(11,5),(11,6),(12,3),(12,4),(12,5),(13,3),(13,4)], p["main"])
    _draw(px, [(13,2),(12,2)], p["light"])
    _draw(px, [(10,7),(11,7)], p["dark"])
    _save(img, output_path)


def generate_hoe_texture(material, output_path):
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for i in range(7):
        px[2+i, 14-i] = (*p["handle"], 255)
        px[3+i, 14-i] = (*p["handle_dark"], 255)
    # Hoe blade - flat, perpendicular
    _draw(px, [(10,5),(11,4),(11,5),(12,3),(12,4),(13,3),(14,3)], p["main"])
    _draw(px, [(14,2),(13,2)], p["light"])
    _save(img, output_path)


# ============ ARMOR (each slot unique) ============

def generate_helmet_texture(material, output_path):
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
    for x in range(3, 13):
        if px[x,11] != (0,0,0,0): px[x,12] = (*p["dark"], 255)
    _save(img, output_path)


def generate_chestplate_texture(material, output_path):
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
    _save(img, output_path)


def generate_leggings_texture(material, output_path):
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for x in range(4, 12): px[x,2] = (*p["main"], 255); px[x,3] = (*p["light"], 255)
    for y in range(4, 14):
        for x in range(4, 7): px[x,y] = (*p["main"], 255)
        px[4,y] = (*p["light"], 255); px[6,y] = (*p["dark"], 255)
        for x in range(9, 12): px[x,y] = (*p["main"], 255)
        px[9,y] = (*p["light"], 255); px[11,y] = (*p["dark"], 255)
    _save(img, output_path)


def generate_boots_texture(material, output_path):
    p = get_palette(material)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for y in range(5, 11):
        for x in range(3, 6): px[x,y] = (*p["main"], 255)
    for x in range(2, 6): px[x,11] = (*p["main"], 255); px[x,12] = (*p["dark"], 255)
    px[3,5] = (*p["light"], 255); px[4,5] = (*p["light"], 255)
    for y in range(5, 11):
        for x in range(10, 13): px[x,y] = (*p["main"], 255)
    for x in range(10, 14): px[x,11] = (*p["main"], 255); px[x,12] = (*p["dark"], 255)
    px[10,5] = (*p["light"], 255); px[11,5] = (*p["light"], 255)
    _save(img, output_path)


# ============ FOOD (different shapes) ============

FOOD_SHAPES = {
    "golden":  [(6,10),(5,11),(4,12),(4,12),(4,12),(4,12),(5,11),(6,10),(7,9)],  # apple
    "cooked":  [(5,11),(4,12),(4,12),(4,13),(4,13),(5,12),(6,11),(7,10)],        # steak
    "raw":     [(5,11),(4,12),(4,12),(4,13),(4,13),(5,12),(6,11),(7,10)],        # meat
    "berry":   [(6,9),(6,10),(6,10),(6,10),(6,9)],                               # small berries
    "bread":   [(4,12),(3,13),(3,13),(3,13),(3,13),(3,13),(4,12)],               # loaf
    "veggie":  [(6,10),(5,11),(5,12),(5,12),(5,11),(6,10)],                      # carrot-like
    "magical": [(6,10),(5,11),(4,12),(4,12),(4,12),(4,12),(5,11),(6,10),(7,9)],  # glowing apple
    "divine":  [(6,10),(5,11),(4,12),(4,12),(4,12),(4,12),(5,11),(6,10),(7,9)],  # golden apple
}


def generate_food_texture(food_type, output_path):
    p = get_food_palette(food_type)
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    rows = FOOD_SHAPES.get(food_type, FOOD_SHAPES["cooked"])
    for i, (xs, xe) in enumerate(rows):
        y = 4 + i
        for x in range(xs, xe + 1): px[x, y] = (*p["main"], 255)
        if xs <= xe: px[xs, y] = (*p["dark"], 255); px[xe, y] = (*p["dark"], 255)
    # Highlight
    if len(rows) > 1:
        xs, xe = rows[0]
        for x in range(xs, xe + 1): px[x, 4] = (*p["light"], 255)
    # Stem/leaf for apple types
    if food_type in ("golden", "magical", "divine"):
        px[8, 3] = (74, 52, 9, 255); px[8, 2] = (107, 76, 18, 255)
        px[9, 2] = (50, 160, 50, 255); px[10, 3] = (50, 160, 50, 255)
    # Sparkles for magical
    if food_type in ("magical", "divine"):
        px[3, 6] = (*p["light"], 255); px[11, 8] = (*p["light"], 255)
        px[6, 3] = (*p["light"], 255)
    _save(img, output_path)


# ============ BLOCKS ============

def generate_block_texture(block_type, output_path):
    p = get_block_palette(block_type)
    random.seed(hash(block_type + output_path))
    img = Image.new('RGB', (16, 16), p["base"])
    px = img.load()
    for y in range(16):
        for x in range(16):
            n = random.randint(-15, 15)
            px[x, y] = tuple(max(0, min(255, c + n)) for c in p["base"])
    for _ in range(random.randint(4, 8)):
        sx, sy = random.randint(1, 14), random.randint(1, 14)
        px[sx, sy] = p["spot"]
        if random.random() > 0.4: px[min(15, sx + 1), sy] = p["spot"]
        if random.random() > 0.4: px[sx, min(15, sy + 1)] = p["spot_light"]
    _save(img, output_path)


# ============ PACK ICON ============

def generate_pack_icon_procedural(material, output_path):
    p = get_palette(material) if material in MATERIAL_PALETTES else get_palette("diamond")
    bg = shade(p["main"], 0.3)
    img = Image.new('RGB', (64, 64), bg)
    px = img.load()
    for x in range(64):
        for y in range(64):
            if x < 3 or x >= 61 or y < 3 or y >= 61: px[x, y] = shade(p["dark"], 0.5)
            elif x < 5 or x >= 59 or y < 5 or y >= 59: px[x, y] = p["dark"]
    c = 32
    for y in range(16, 48):
        d = abs(y - c)
        w = max(0, 16 - d)
        for x in range(c - w, c + w):
            px[x, y] = shade(p["main"], 1.0 + 0.3 * (1 - d / 16))
    for y in range(20, 30):
        for x in range(c - 4, c + 4): px[x, y] = p["light"]
    _save(img, output_path)


# ============ PREVIEW ============

def generate_preview_base64(item_type, sub_type, material):
    buf = io.BytesIO()
    img = _generate_preview_image(item_type, sub_type, material)
    img = img.resize((128, 128), Image.NEAREST)
    img.save(buf, format='PNG')
    return "data:image/png;base64,%s" % base64.b64encode(buf.getvalue()).decode()


def _generate_preview_image(item_type, sub_type, material):
    import tempfile
    tmp = tempfile.mktemp(suffix=".png")
    try:
        generate_procedural_texture(item_type, sub_type, material, tmp)
        return Image.open(tmp).copy()
    finally:
        if os.path.exists(tmp): os.unlink(tmp)


# ============ DISPATCH ============

TEXTURE_GENERATORS = {
    "sword": generate_sword_texture,
    "katana": generate_katana_texture,
    "spear": generate_spear_texture,
    "staff": generate_staff_texture,
    "hammer": generate_hammer_texture,
    "bow": generate_bow_texture,
    "pickaxe": generate_pickaxe_texture,
    "axe": generate_axe_texture,
    "shovel": generate_shovel_texture,
    "hoe": generate_hoe_texture,
    "helmet": generate_helmet_texture,
    "chestplate": generate_chestplate_texture,
    "leggings": generate_leggings_texture,
    "boots": generate_boots_texture,
}


def generate_procedural_texture(item_type, sub_type, material, output_path):
    key = sub_type.lower() if sub_type else item_type.lower()
    if key in TEXTURE_GENERATORS:
        TEXTURE_GENERATORS[key](material or "iron", output_path)
    elif item_type == "weapon":
        generate_sword_texture(material or "iron", output_path)
    elif item_type == "tool":
        generate_pickaxe_texture(material or "iron", output_path)
    elif item_type == "armor":
        generate_chestplate_texture(material or "iron", output_path)
    elif item_type == "food":
        generate_food_texture(material or "cooked", output_path)
    elif item_type == "block":
        generate_block_texture(material or "ore", output_path)
    else:
        generate_sword_texture(material or "iron", output_path)
