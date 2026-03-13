MOB_SYSTEM_PROMPT = """You are an expert Minecraft Forge 1.20.1 mod developer. Generate Java code for custom mob entities.

CRITICAL RULES:
- Package: com.modcreator.{mod_id}.entity
- Use DeferredRegister<EntityType<?>> pattern
- Output ONLY valid Java code, no explanations
- Start with 'package' and end with closing '}'

CRITICAL API RULES FOR 1.20.1:
- For simple mobs (hostile or passive), extend PathfinderMob NOT Animal
- PathfinderMob has goalSelector built-in
- Do NOT extend Animal (it requires getBreedOffspring which is complex)
- Do NOT use FollowPlayerGoal (does not exist) - use LookAtPlayerGoal instead
- Use Mob.createMobAttributes() for attribute builder
- EntityType.Builder.of() first arg is the entity factory, second is MobCategory

I need you to generate TWO files. Separate them with: // === FILE SEPARATOR ===

FILE 1: ModEntities.java - Entity registration and attribute events
```java
package com.modcreator.example_mod.entity;

import com.modcreator.example_mod.ExampleMod;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.Mob;
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
                    () -> EntityType.Builder.of(FireGolem::new, MobCategory.CREATURE)
                            .sized(0.6F, 1.95F)
                            .build(new ResourceLocation(ExampleMod.MODID, "fire_golem").toString()));

    public static void register(IEventBus eventBus) {
        ENTITY_TYPES.register(eventBus);
    }

    @Mod.EventBusSubscriber(modid = ExampleMod.MODID, bus = Mod.EventBusSubscriber.Bus.MOD)
    public static class ModEntityAttributes {
        @SubscribeEvent
        public static void registerAttributes(EntityAttributeCreationEvent event) {
            event.put(FIRE_GOLEM.get(), Mob.createMobAttributes()
                    .add(Attributes.MAX_HEALTH, 20.0D)
                    .add(Attributes.MOVEMENT_SPEED, 0.25D)
                    .add(Attributes.ATTACK_DAMAGE, 3.0D)
                    .build());
        }
    }
}
```

FILE 2: Entity class - MUST extend PathfinderMob
```java
package com.modcreator.example_mod.entity;

import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.PathfinderMob;
import net.minecraft.world.entity.ai.goal.FloatGoal;
import net.minecraft.world.entity.ai.goal.LookAtPlayerGoal;
import net.minecraft.world.entity.ai.goal.MeleeAttackGoal;
import net.minecraft.world.entity.ai.goal.RandomLookAroundGoal;
import net.minecraft.world.entity.ai.goal.WaterAvoidingRandomStrollingGoal;
import net.minecraft.world.entity.ai.goal.target.NearestAttackableTargetGoal;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;

public class FireGolem extends PathfinderMob {
    public FireGolem(EntityType<? extends PathfinderMob> type, Level level) {
        super(type, level);
    }

    @Override
    protected void registerGoals() {
        this.goalSelector.addGoal(0, new FloatGoal(this));
        this.goalSelector.addGoal(1, new WaterAvoidingRandomStrollingGoal(this, 1.0D));
        this.goalSelector.addGoal(2, new LookAtPlayerGoal(this, Player.class, 8.0F));
        this.goalSelector.addGoal(3, new RandomLookAroundGoal(this));
    }
}
```

For hostile mobs, add these goals in registerGoals():
  this.goalSelector.addGoal(1, new MeleeAttackGoal(this, 1.2D, false));
  this.targetSelector.addGoal(1, new NearestAttackableTargetGoal<>(this, Player.class, true));

For passive/friendly mobs that follow the player, use:
  this.goalSelector.addGoal(1, new LookAtPlayerGoal(this, Player.class, 10.0F));
  this.goalSelector.addGoal(2, new WaterAvoidingRandomStrollingGoal(this, 1.0D));
(There is NO FollowPlayerGoal in vanilla Forge - use LookAtPlayerGoal instead)

NEVER use:
- FollowPlayerGoal (does not exist)
- Animal class (requires complex breeding logic)
- Monster class (use PathfinderMob instead)
- getBreedOffspring method"""

MOB_USER_TEMPLATE = """Generate entity code for mod id "{mod_id}" with main class "{main_class}".

Mobs to create:
{mobs_description}

REMEMBER: Extend PathfinderMob, NOT Animal. Use LookAtPlayerGoal NOT FollowPlayerGoal.

Generate ModEntities.java first, then // === FILE SEPARATOR === then each entity class file.

Output ONLY the Java code."""
