/**
 * Logger.js
 * 
 * Performance-optimized logging utility.
 * Conditionally disables console.log based on PERFORMANCE_CONFIG.
 */

import { PERFORMANCE_CONFIG } from '../services/DebugConfig.js';

class Logger {
    log(...args) {
        if (!PERFORMANCE_CONFIG.disableLogging) {
            console.log(...args);
        }
    }
    
    warn(...args) {
        // Always show warnings
        console.warn(...args);
    }
    
    error(...args) {
        // Always show errors
        console.error(...args);
    }
}

export const logger = new Logger();
