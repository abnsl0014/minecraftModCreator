BLOCK_SYSTEM_PROMPT = """You are an expert Minecraft Forge 1.20.1 mod developer. Generate ONLY the ModBlocks class.

CRITICAL RULES:
- Package: com.modcreator.{mod_id}.block
- Use DeferredRegister<Block> pattern
- MUST also register BlockItem for each block in the ITEMS DeferredRegister from ModItems
- Do NOT use Material class - it was REMOVED in 1.20.1. Use BlockBehaviour.Properties.of() instead
- Do NOT use .tab() on Item.Properties - removed in 1.20.1
- Import from net.minecraft and net.minecraftforge
- Output ONLY valid Java code for ONE class, no explanations
- Start with 'package' and end with closing '}'
- Generate ONLY ModBlocks.java, nothing else

COMPLETE WORKING EXAMPLE for a mod with id "example_mod" and main class "ExampleMod":
```java
package com.modcreator.example_mod.block;

import com.modcreator.example_mod.ExampleMod;
import com.modcreator.example_mod.item.ModItems;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.SoundType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

public class ModBlocks {
    public static final DeferredRegister<Block> BLOCKS =
            DeferredRegister.create(ForgeRegistries.BLOCKS, ExampleMod.MODID);

    public static final RegistryObject<Block> RUBY_BLOCK =
            BLOCKS.register("ruby_block", () -> new Block(BlockBehaviour.Properties.of()
                    .strength(3.0F, 6.0F)
                    .sound(SoundType.METAL)
                    .requiresCorrectToolForDrops()));

    public static final RegistryObject<Block> RUBY_ORE =
            BLOCKS.register("ruby_ore", () -> new Block(BlockBehaviour.Properties.of()
                    .strength(3.0F, 3.0F)
                    .sound(SoundType.STONE)
                    .requiresCorrectToolForDrops()));

    // BlockItems - REQUIRED for blocks to appear in inventory
    public static final RegistryObject<Item> RUBY_BLOCK_ITEM =
            ModItems.ITEMS.register("ruby_block",
                    () -> new BlockItem(RUBY_BLOCK.get(), new Item.Properties()));

    public static final RegistryObject<Item> RUBY_ORE_ITEM =
            ModItems.ITEMS.register("ruby_ore",
                    () -> new BlockItem(RUBY_ORE.get(), new Item.Properties()));

    public static void register(IEventBus eventBus) {
        BLOCKS.register(eventBus);
    }
}
```

IMPORTANT:
- Use BlockBehaviour.Properties.of() NOT BlockBehaviour.Properties.of(Material.STONE)
- Material class does NOT exist in 1.20.1
- Always register a BlockItem for every block using ModItems.ITEMS.register()"""

BLOCK_USER_TEMPLATE = """Generate ONLY the ModBlocks.java class for mod id "{mod_id}" with main class "{main_class}".

Blocks to create:
{blocks_description}

Output ONLY the single ModBlocks.java class. No other classes."""
