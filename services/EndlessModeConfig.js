/**
 * Endless Mode Configuration Generator
 * Generates random encounter configurations for each round
 * Difficulty scales with round number
 */
class EndlessModeConfig {
    constructor(round) {
        this.round = round;
        this.config = this.generateConfig();
    }
    
    generateConfig() {
        // Base difficulty scaling (caps at 3x)
        const difficulty = Math.min(1 + (this.round * 0.1), 3);
        
        return {
            // Sheep count increases with rounds
            sheep: this.getSheepCount(),
            
            // Random encounters (probability increases with rounds)
            wolves: this.shouldSpawnWolves(),
            wolfCount: this.getWolfCount(),
            
            wind: this.shouldSpawnWind(),
            windIntensity: this.getWindIntensity(),
            
            grazing: this.shouldEnableGrazing(),
            grazingDensity: this.getGrazingDensity(),
            
            // Special events
            friendlyDog: this.shouldSpawnFriendlyDog(),
            blackSheep: this.shouldSpawnBlackSheep(),
            goldenSheep: this.shouldSpawnGoldenSheep(),
            lawnMower: this.shouldSpawnLawnMower(),
            
            // Weather effects
            gloomyWeather: this.shouldApplyGloomyWeather(),
            rain: this.shouldApplyRain(),
            lightning: this.shouldApplyLightning(),
            
            // Difficulty modifiers
            sheepSpeed: 1 + (difficulty * 0.2), // Sheep move faster
            marketVolatility: 1 + (difficulty * 0.15), // Prices change faster
            
            // Round info
            roundNumber: this.round,
            difficulty: difficulty
        };
    }
    
    getSheepCount() {
        // Start at 30, increase by 2-5 per round, cap at 80
        const base = 30;
        const increase = Math.floor(this.round * this.randomBetween(2, 5));
        return Math.min(base + increase, 80);
    }
    
    shouldSpawnWolves() {
        // Wolves guaranteed from round 2 onwards
        if (this.round < 2) return false;
        return true; // Always spawn wolves from round 2+
    }
    
    getWolfCount() {
        // 1-2 wolves early, up to 3-4 wolves later
        if (this.round < 5) return this.randomBetween(1, 2);
        if (this.round < 10) return this.randomBetween(2, 3);
        return this.randomBetween(3, 4);
    }
    
    shouldSpawnWind() {
        // Wind from round 2, 60-80% chance
        if (this.round < 2) return false;
        return Math.random() < this.randomBetween(60, 80) / 100;
    }
    
    getWindIntensity() {
        // Intensity increases with rounds
        return this.randomBetween(1, Math.min(3, Math.floor(this.round / 3) + 1));
    }
    
    shouldEnableGrazing() {
        // Grazing from round 2, 60-80% chance
        if (this.round < 2) return false;
        return Math.random() < this.randomBetween(60, 80) / 100;
    }
    
    getGrazingDensity() {
        // More grass tufts in later rounds
        return this.randomBetween(3, Math.min(8, 3 + Math.floor(this.round / 2)));
    }
    
    shouldSpawnFriendlyDog() {
        // Friendly dog from round 5, 20-40% chance
        if (this.round < 5) return false;
        return Math.random() < this.randomBetween(20, 40) / 100;
    }
    
    shouldSpawnBlackSheep() {
        // Black sheep from round 7, 15-30% chance
        if (this.round < 7) return false;
        return Math.random() < this.randomBetween(15, 30) / 100;
    }
    
    shouldSpawnGoldenSheep() {
        // Golden sheep rare, from round 8, 5-15% chance
        if (this.round < 8) return false;
        return Math.random() < this.randomBetween(5, 15) / 100;
    }
    
    shouldSpawnLawnMower() {
        // Lawn mower from round 6, 25-45% chance
        if (this.round < 6) return false;
        return Math.random() < this.randomBetween(25, 45) / 100;
    }
    
    shouldApplyGloomyWeather() {
        // Gloomy weather from round 5, 20-35% chance
        if (this.round < 5) return false;
        return Math.random() < this.randomBetween(20, 35) / 100;
    }
    
    shouldApplyRain() {
        // Rain from round 8, 15-25% chance
        if (this.round < 8) return false;
        return Math.random() < this.randomBetween(15, 25) / 100;
    }
    
    shouldApplyLightning() {
        // Lightning from round 10, 10-20% chance
        if (this.round < 10) return false;
        return Math.random() < this.randomBetween(10, 20) / 100;
    }
    
    // Helper method for random integer between min and max (inclusive)
    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

export default EndlessModeConfig;
