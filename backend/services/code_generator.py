import logging
import re
from typing import Dict

from models import ModSpec
from prompts.system_prompt import MAIN_CLASS_SYSTEM_PROMPT, MAIN_CLASS_USER_TEMPLATE
from prompts.item_prompt import ITEM_SYSTEM_PROMPT, ITEM_USER_TEMPLATE
from prompts.block_prompt import BLOCK_SYSTEM_PROMPT, BLOCK_USER_TEMPLATE
from prompts.mob_prompt import MOB_SYSTEM_PROMPT, MOB_USER_TEMPLATE
from services.model_router import model_router, GROQ_MODEL

logger = logging.getLogger(__name__)


def mod_id_to_class_name(mod_id: str) -> str:
    return "".join(word.capitalize() for word in mod_id.split("_"))


def strip_code_fences(text: str) -> str:
    text = re.sub(r'^```(?:java)?\s*\n?', '', text.strip())
    text = re.sub(r'\n?```\s*$', '', text)
    return text.strip()


def fix_common_1_20_1_issues(code: str) -> str:
    """Auto-fix known deprecated API patterns that LLMs commonly generate."""
    # Remove Material import
    code = re.sub(r'import\s+net\.minecraft\.world\.level\.material\.Material;\n?', '', code)
    # Replace Material.XXX usages in Properties.of()
    code = re.sub(r'Properties\.of\(Material\.\w+\)', 'Properties.of()', code)
    code = re.sub(r'BlockBehaviour\.Properties\.of\(Material\.\w+\)', 'BlockBehaviour.Properties.of()', code)
    code = re.sub(r'Block\.Properties\.of\(Material\.\w+\)', 'BlockBehaviour.Properties.of()', code)
    # Replace Block.Properties with BlockBehaviour.Properties
    code = re.sub(r'Block\.Properties\.of\(\)', 'BlockBehaviour.Properties.of()', code)
    # Remove .tab() calls
    code = re.sub(r'\.tab\([^)]*\)', '', code)
    # Replace .maxDamage() with .durability()
    code = re.sub(r'\.maxDamage\(', '.durability(', code)
    # Fix entity issues: replace FollowPlayerGoal with LookAtPlayerGoal
    code = code.replace('FollowPlayerGoal', 'LookAtPlayerGoal')
    # Fix: replace "extends Animal" with "extends PathfinderMob" in entity classes
    if 'extends Animal' in code and 'getBreedOffspring' not in code:
        code = code.replace('extends Animal', 'extends PathfinderMob')
        code = code.replace('EntityType<? extends Animal>', 'EntityType<? extends PathfinderMob>')
        code = re.sub(r'import\s+net\.minecraft\.world\.entity\.animal\.Animal;\n?',
                       'import net.minecraft.world.entity.PathfinderMob;\n', code)
    # Fix: replace "extends Monster" with "extends PathfinderMob"
    if 'extends Monster' in code:
        code = code.replace('extends Monster', 'extends PathfinderMob')
        code = code.replace('EntityType<? extends Monster>', 'EntityType<? extends PathfinderMob>')
        code = re.sub(r'import\s+net\.minecraft\.world\.entity\.monster\.Monster;\n?',
                       'import net.minecraft.world.entity.PathfinderMob;\n', code)
        code = code.replace('Monster.createMonsterAttributes()', 'Mob.createMobAttributes()')
    return code


def extract_single_class(code: str) -> str:
    """Extract only the first Java class from code that may contain multiple classes.
    This handles the case where the LLM dumps extra classes after the main one."""
    # Split on FILE SEPARATOR if present
    parts = code.split("// === FILE SEPARATOR ===")
    # Find the first non-empty part that contains actual code
    code = ""
    for part in parts:
        stripped = part.strip()
        # Skip filename-only lines like "ModItems.java"
        lines = stripped.split('\n')
        for line in lines:
            if line.strip().startswith('package ') or line.strip().startswith('import '):
                code = stripped
                break
        if code:
            break
    if not code:
        code = parts[0].strip() if parts else ""

    # Remove any leading filename line (e.g. "FriendlyCompanion.java")
    lines = code.split('\n')
    while lines and not lines[0].strip().startswith(('package ', 'import ', '/*', '//', '@')):
        if lines[0].strip().endswith('.java') or not lines[0].strip():
            lines.pop(0)
        else:
            break
    code = '\n'.join(lines)

    # Find the end of the first top-level class by counting braces
    brace_count = 0
    started = False
    end_pos = len(code)

    for i, ch in enumerate(code):
        if ch == '{':
            brace_count += 1
            started = True
        elif ch == '}':
            brace_count -= 1
            if started and brace_count == 0:
                end_pos = i + 1
                break

    return code[:end_pos].strip()


async def generate_main_class(spec: ModSpec, model_preference: str = GROQ_MODEL) -> Dict[str, str]:
    main_class = mod_id_to_class_name(spec.mod_id)
    first_item = spec.items[0].registry_name if spec.items else "unknown"

    prompt = MAIN_CLASS_USER_TEMPLATE.format(
        mod_id=spec.mod_id,
        main_class=main_class,
        has_items=bool(spec.items),
        has_blocks=bool(spec.blocks),
        has_entities=False,
        first_item=first_item,
    )

    response = await model_router.chat(
        messages=[
            {"role": "system", "content": MAIN_CLASS_SYSTEM_PROMPT.replace("{mod_id}", spec.mod_id)},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=2048,
        model_preference=model_preference,
    )

    code = strip_code_fences(response)
    code = extract_single_class(code)
    return {"%s.java" % main_class: code}


async def generate_items(spec: ModSpec, model_preference: str = GROQ_MODEL) -> Dict[str, str]:
    if not spec.items:
        return {}

    main_class = mod_id_to_class_name(spec.mod_id)
    items_desc = "\n".join(
        "- %s (%s): type=%s, properties=%s" % (item.registry_name, item.display_name, item.item_type, item.properties)
        for item in spec.items
    )

    prompt = ITEM_USER_TEMPLATE.format(
        mod_id=spec.mod_id,
        main_class=main_class,
        items_description=items_desc,
    )

    response = await model_router.chat(
        messages=[
            {"role": "system", "content": ITEM_SYSTEM_PROMPT.replace("{mod_id}", spec.mod_id)},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=4096,
        model_preference=model_preference,
    )

    code = strip_code_fences(response)
    code = extract_single_class(code)
    return {"item/ModItems.java": code}


async def generate_blocks(spec: ModSpec, model_preference: str = GROQ_MODEL) -> Dict[str, str]:
    if not spec.blocks:
        return {}

    main_class = mod_id_to_class_name(spec.mod_id)
    blocks_desc = "\n".join(
        "- %s (%s): hardness=%s, resistance=%s" % (block.registry_name, block.display_name, block.hardness, block.resistance)
        for block in spec.blocks
    )

    prompt = BLOCK_USER_TEMPLATE.format(
        mod_id=spec.mod_id,
        main_class=main_class,
        blocks_description=blocks_desc,
    )

    response = await model_router.chat(
        messages=[
            {"role": "system", "content": BLOCK_SYSTEM_PROMPT.replace("{mod_id}", spec.mod_id)},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=4096,
        model_preference=model_preference,
    )

    code = strip_code_fences(response)
    code = extract_single_class(code)
    return {"block/ModBlocks.java": code}


async def generate_mobs(spec: ModSpec, model_preference: str = GROQ_MODEL) -> Dict[str, str]:
    if not spec.mobs:
        return {}

    main_class = mod_id_to_class_name(spec.mod_id)
    mobs_desc = "\n".join(
        "- %s (%s): category=%s, health=%s, speed=%s, damage=%s, behaviors=%s" % (
            mob.registry_name, mob.display_name, mob.mob_category,
            mob.health, mob.speed, mob.damage, mob.behaviors
        )
        for mob in spec.mobs
    )

    prompt = MOB_USER_TEMPLATE.format(
        mod_id=spec.mod_id,
        main_class=main_class,
        mobs_description=mobs_desc,
    )

    response = await model_router.chat(
        messages=[
            {"role": "system", "content": MOB_SYSTEM_PROMPT.replace("{mod_id}", spec.mod_id)},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=8192,
        model_preference=model_preference,
    )

    code = strip_code_fences(response)
    files = {}

    parts = code.split("// === FILE SEPARATOR ===")
    if len(parts) >= 1:
        files["entity/ModEntities.java"] = extract_single_class(strip_code_fences(parts[0]))

    for i, part in enumerate(parts[1:], 1):
        part = strip_code_fences(part.strip())
        # Remove optional filename header line
        lines = part.split('\n')
        if lines and not lines[0].strip().startswith('package'):
            part = '\n'.join(lines[1:]).strip()
        class_match = re.search(r'public class (\w+)', part)
        if class_match:
            class_name = class_match.group(1)
            files["entity/%s.java" % class_name] = extract_single_class(part)
        else:
            files["entity/CustomEntity%d.java" % i] = extract_single_class(part)

    return files


async def generate_all_code(spec: ModSpec, model_preference: str = GROQ_MODEL) -> Dict[str, str]:
    all_files = {}

    main_files = await generate_main_class(spec, model_preference=model_preference)
    all_files.update(main_files)

    if spec.items:
        item_files = await generate_items(spec, model_preference=model_preference)
        all_files.update(item_files)

    if spec.blocks:
        block_files = await generate_blocks(spec, model_preference=model_preference)
        all_files.update(block_files)

    # Auto-fix common 1.20.1 API issues
    for path in all_files:
        all_files[path] = fix_common_1_20_1_issues(all_files[path])

    return all_files
