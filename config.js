export const CONFIG = {
    width: 1920,
    height: 1080,
    roundTime: 60, // seconds
    startingWool: 0,
    sheepCount: 50,
    // Performance optimizations
    physics: {
        default: 'arcade',
        arcade: {
            fps: 60, // Lock physics to 60 FPS
            fixedStep: true // Use fixed timestep for consistent performance
        }
    },
    render: {
        pixelArt: false,
        antialias: true,
        roundPixels: true, // Improves text rendering performance
        batchSize: 4096 // Increase batch size for better sprite rendering
    },
    assets: {
        background: 'assets/pasture-background.webp',
        sheep: 'assets/sheep_idle.webp',
        sheep_walk: 'assets/sheep_walk.webp',
        wool: 'assets/wool_coin_gold.webp',
        heart: 'assets/happy_emotion.webp',
        poop: 'assets/poop_pile.webp',
        sign_left: 'https://rosebud.ai/assets/farm_sign_left_small_v2.webp?mwXy',
        sign_right: 'https://rosebud.ai/assets/farm_sign_right_small.webp?xV9b'
    },
    colors: {
        background: '#1a1c1e',
        panel: '#2c2f33',
        left: '#4e7cf6',
        right: '#f64e60',
        text: '#ffffff',
        wool: '#fcd535'
    }
};

/**
 * WOOL progression rules.
 *
 * minWoolToAdvance[N]  – minimum balance required to leave level N.
 * retryCost[N]         – wool deducted each time the player retries level N.
 *                        Set to 0 for a free retry on that level.
 *
 * Design intent:
 *  - Early levels are forgiving (low / zero costs) so new players aren't
 *    immediately punished.
 *  - Mid levels introduce a small retry tax to make each round feel
 *    meaningful.
 *  - Late levels require a healthy balance to advance, rewarding players
 *    who played efficiently.
 */
export const WOOL_CONFIG = {
    // Minimum WOOL balance needed to advance FROM this level to the next.
    minWoolToAdvance: {
        1: 0,    // Tutorial – no gate
        2: 20,
        3: 50,
        4: 30,
        5: 40,
        6: 55,
        7: 70,
        8: 90,
        9: 110,
        10: 135,
        11: 160,
        12: 0,    // Final level – no gate (winning is enough)
    },

    // WOOL deducted from the level-start balance on each retry.
    // The player retries with (levelStartBalance - retryCost), floored at 0.
    retryCost: {
        1: 0,    // Free retries on tutorial
        2: 0,
        3: 5,
        4: 5,
        5: 10,
        6: 10,
        7: 15,
        8: 15,
        9: 20,
        10: 20,
        11: 25,
        12: 25,
    },
};

/**
 * ABILITY costs and cooldowns.
 * 
 * Costs are in WOOL (W).
 * Cooldowns are in milliseconds (ms).
 */
export const ABILITY_CONFIG = {
    whistle: {
        cost: 0,
        cooldown: 15000  // 15 seconds
    },
    dog: {
        cost: 0,
        cooldown: 25000  // 25 seconds
    },
    herdDog: {
        cost: 30,
        cooldown: 20000  // 20 seconds
    },
    grass: {
        cost: 10,
        cooldown: 0  // 5 seconds
    },
    lawnMower: {
        cost: 0,
        cooldown: 0  // 30 seconds
    },
    bone: {
        cost: 10,
        cooldown: 0   // 5 seconds
    },
    blackSheep: {
        cost: 0,
        cooldown: 0      // Once per level
    },
    goldenClover: {
        cost: 20,
        cooldown: 0      // Once per level (or once forever in main game)
    }
};
