/**
 * DebugConfig.js
 *
 * Single-file debug overrides for quick testing.
 * Set `enabled: true` and fill in the values you want to override.
 * Set `enabled: false` (or leave values null/false) for normal gameplay.
 *
 * RULES:
 *  - Edit ONLY this file when testing.
 *  - Never commit with enabled: true.
 *  - No managers, no events, no lifecycle changes.
 */

export const DEBUG_CONFIG = {
    // Master switch – set false to disable all overrides
    enabled: false,

    // Start at a specific level (1-12). null = use normal progression.
    level: 12,

    // Start with a specific WOOL balance. null = use saved balance.
    wool: null,

    // Unlock all ability buttons immediately on round start.
    unlockAllAbilities: false,
};

// Performance optimization settings
export const PERFORMANCE_CONFIG = {
    // Disable console.log statements for better performance
    disableLogging: true,
    
    // Reduce particle counts (already applied in code)
    reducedParticles: true,
    
    // Throttle update checks (already applied in code)
    throttleUpdates: true,
};
