/**
 * LevelConfig.js  –  DATA ONLY, no logic.
 *
 * Each level entry declares which gameplay systems are active and any
 * system-specific parameters that override defaults.
 *
 * Feature keys (all boolean unless noted):
 *   wolves       – wolf spawner + updateWolves() per-frame update
 *   wind         – wind trigger + applyWindForce() per-frame update
 *   friendlyDog  – friendly-dog introduction spawn (Level 7 one-shot)
 *   blackSheep   – black-sheep spawn + per-frame roaming/zombie update
 *   grazing      – grass-tuft spawning + sheep grazing system
 *   goldenSheep  – golden-sheep random trigger during the round
 *   lawnMower    – lawn-mower spawn (tied to wind gusts, Level 3)
 *
 * Advanced per-system config (optional, used by LevelContentController.get()):
 *   wolves: { enabled, max, warningDuration }
 */

export const LEVEL_CONFIG = {
    1:  { sheep: 50, wolves: false, wind: false, friendlyDog: false, blackSheep: false, grazing: false, goldenSheep: false, lawnMower: false },
    2:  { sheep: 50, wolves: false, wind: true,  friendlyDog: false, blackSheep: false, grazing: false, goldenSheep: false, lawnMower: false },
    3:  { sheep: 50, wolves: false, wind: true,  friendlyDog: false, blackSheep: false, grazing: false, goldenSheep: false, lawnMower: true  },
    4:  { sheep: 50, wolves: false, wind: true,  friendlyDog: false, blackSheep: false, grazing: false, goldenSheep: false, lawnMower: false },
    5:  { sheep: 50, wolves: false, wind: false, friendlyDog: false, blackSheep: false, grazing: true,  goldenSheep: true,  lawnMower: false },
    6:  { sheep: 50, wolves: false, wind: false, friendlyDog: false, blackSheep: false, grazing: true,  goldenSheep: true,  lawnMower: false },
    7:  { sheep: 50, wolves: false, wind: false, friendlyDog: true,  blackSheep: false, grazing: true,  goldenSheep: true,  lawnMower: false },
    8:  { sheep: 50, wolves: { enabled: true, max: 1,  warningDuration: 8000 }, wind: false, friendlyDog: false, blackSheep: false, grazing: true,  goldenSheep: true,  lawnMower: false },
    9:  { sheep: 50, wolves: { enabled: true, max: 2,  warningDuration: 8000 }, wind: false, friendlyDog: false, blackSheep: false, grazing: true,  goldenSheep: true,  lawnMower: false },
    10: { sheep: 50, wolves: { enabled: true, max: 4,  warningDuration: 8000 }, wind: false, friendlyDog: false, blackSheep: true,  grazing: true,  goldenSheep: true,  lawnMower: false },
    11: { sheep: 50, wolves: { enabled: true, max: 4,  warningDuration: 8000 }, wind: true,  friendlyDog: false, blackSheep: true,  grazing: true,  goldenSheep: true,  lawnMower: false },
    12: { sheep: 50, wolves: { enabled: true, max: 7, warningDuration: 2000 }, wind: true,  friendlyDog: false, blackSheep: true,  grazing: true,  goldenSheep: false, lawnMower: false },
};
