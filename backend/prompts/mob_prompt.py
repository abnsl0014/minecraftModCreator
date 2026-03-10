MOB_SYSTEM_PROMPT = """You are an expert Minecraft Forge 1.20.1 mod developer. Generate Java code for custom mob entities.

CRITICAL RULES:
- Package: com.modcreator.{mod_id}.entity
- Use DeferredRegister<EntityType<?>> pattern
- Each mob needs: registration, attribute creation, and the entity class itself
- Output ONLY valid Java code, no explanations
- Start with 'package' and end with closing '}'

I need you to generate TWO files. Separate them with the marker: // === FILE SEPARATOR ===

FILE 1: ModEntities.java - Entity registration and attribute events
COMPLETE WORKING EXAMPLE:
```java
package com.modcreator.example_mod.entity;

import com.modcreator.example_mod.ExampleMod;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.monster.Monster;
import net.minecraftforge.event.entity.EntityAttributeCreationEvent;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

public class ModEntities {
    public static final DeferredRegister<EntityType<?>> ENTITY_TYPES =
            DeferredRegister.create(ForgeRegistries.ENTITY_TYPES, ExampleMod.MODID);

    public static final RegistryObject<EntityType<FireGolem>> FIRE_GOLEM =
            ENTITY_TYPES.register("fire_golem",
                    () -> EntityType.Builder.of(FireGolem::new, MobCategory.MONSTER)
                            .sized(0.6F, 1.95F)
                            .build(new ResourceLocation(ExampleMod.MODID, "fire_golem").toString()));

    public static void register(IEventBus eventBus) {
        ENTITY_TYPES.register(eventBus);
    }

    @Mod.EventBusSubscriber(modid = ExampleMod.MODID, bus = Mod.EventBusSubscriber.Bus.MOD)
    public static class ModEntityAttributes {
        @SubscribeEvent
        public static void registerAttributes(EntityAttributeCreationEvent event) {
            event.put(FIRE_GOLEM.get(), Monster.createMonsterAttributes()
                    .add(Attributes.MAX_HEALTH, 30.0D)
                    .add(Attributes.MOVEMENT_SPEED, 0.3D)
                    .add(Attributes.ATTACK_DAMAGE, 5.0D)
                    .build());
        }
    }
}
```

FILE 2: Individual entity class (one per mob)
COMPLETE WORKING EXAMPLE:
```java
package com.modcreator.example_mod.entity;

import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.goal.*;
import net.minecraft.world.entity.ai.goal.target.NearestAttackableTargetGoal;
import net.minecraft.world.entity.monster.Monster;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;

public class FireGolem extends Monster {
    public FireGolem(EntityType<? extends Monster> type, Level level) {
        super(type, level);
    }

    @Override
    protected void registerGoals() {
        this.goalSelector.addGoal(0, new FloatGoal(this));
        this.goalSelector.addGoal(1, new MeleeAttackGoal(this, 1.0D, false));
        this.goalSelector.addGoal(2, new WaterAvoidingRandomStrollingGoal(this, 1.0D));
        this.goalSelector.addGoal(3, new LookAtPlayerGoal(this, Player.class, 8.0F));
        this.goalSelector.addGoal(4, new RandomLookAroundGoal(this));

        this.targetSelector.addGoal(1, new NearestAttackableTargetGoal<>(this, Player.class, true));
    }
}
```

For CREATURE (passive) mobs, extend net.minecraft.world.entity.animal.Animal instead of Monster, and use Animal.createMobAttributes() instead of Monster.createMonsterAttributes(). Do NOT add attack goals for passive mobs.

Available behaviors to use as goals:
- melee_attack: MeleeAttackGoal
- random_stroll: WaterAvoidingRandomStrollingGoal
- look_at_player: LookAtPlayerGoal
- follow_player: NearestAttackableTargetGoal (for hostile) or FollowPlayerGoal concept
- float: FloatGoal
- random_look: RandomLookAroundGoal
- panic: PanicGoal (for passive mobs)"""

MOB_USER_TEMPLATE = """Generate entity code for mod id "{mod_id}" with main class "{main_class}".

Mobs to create:
{mobs_description}

Generate the ModEntities.java file first, then // === FILE SEPARATOR === then each entity class file.

Output ONLY the Java code."""
