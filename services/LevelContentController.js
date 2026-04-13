/**
 * LevelContentController.js
 *
 * Gatekeeper for per-level gameplay systems.
 * Reads from LevelConfig (data-only) and exposes a clean query API.
 *
 * Usage in GameScene:
 *   this.levelController = new LevelContentController(this.activeLevel);
 *   console.log('Level config:', this.levelController.getConfig());
 *
 *   // Boolean check
 *   if (this.levelController.isEnabled('wolves')) { ... }
 *
 *   // Advanced config (returns the raw value – object or boolean)
 *   const wolfCfg = this.levelController.get('wolves');
 *   const max     = typeof wolfCfg === 'object' ? wolfCfg.max : 1;
 */

import { LEVEL_CONFIG } from './LevelConfig.js';
import { CONFIG } from '../config.js';

export class LevelContentController {
    /**
     * @param {number} level  – the active level (1-12)
     */
    constructor(level) {
        this._level = level;

        // Fall back to level 1 config if the level isn't defined
        this._config = LEVEL_CONFIG[level] ?? LEVEL_CONFIG[1];

        console.log(`[LevelContentController] Level ${level} config:`, this._config);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns true if the named feature is enabled for this level.
     * Works for both boolean values and advanced config objects.
     *
     * @param {string} feature  e.g. 'wolves', 'wind', 'friendlyDog'
     * @returns {boolean}
     */
    isEnabled(feature) {
        const value = this._config[feature];
        if (value === undefined) return false;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'object' && value !== null) return value.enabled === true;
        return Boolean(value);
    }

    /**
     * Returns the raw config value for a feature.
     * Useful when you need system-specific parameters (e.g. wolf max count).
     *
     * @param {string} feature
     * @returns {boolean|object|undefined}
     */
    get(feature) {
        return this._config[feature];
    }

    /**
     * Returns the full config object for this level.
     * Useful for debug logging.
     *
     * @returns {object}
     */
    getConfig() {
        return { ...this._config };
    }

    /**
     * Returns the sheep count for this level.
     * Supports both plain number and advanced object format:
     *   sheep: 30
     *   sheep: { count: 30, speed: 1.2 }
     * Falls back to CONFIG.sheepCount if not defined.
     *
     * @returns {number}
     */
    getSheepCount() {
        const val = this._config.sheep;
        if (val === undefined || val === null) return CONFIG.sheepCount;
        if (typeof val === 'number') return val;
        if (typeof val === 'object') return val.count ?? CONFIG.sheepCount;
        return CONFIG.sheepCount;
    }

    /**
     * Returns advanced sheep config object, or a default if only a count was given.
     * Useful for future per-level speed/behaviour tuning.
     *
     * @returns {{ count: number, speed?: number }}
     */
    getSheepConfig() {
        const val = this._config.sheep;
        if (typeof val === 'object' && val !== null) return val;
        return { count: typeof val === 'number' ? val : 50 };
    }
}
