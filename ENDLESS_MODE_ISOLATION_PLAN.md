# Endless Mode Isolation & Randomization Plan

## Problem Statement
Currently, endless mode data bleeds into the main game:
1. Stats/history get written to main game localStorage
2. Level selector buttons remain visible and functional
3. Uses Level 1 config statically (no variety)
4. No random encounters or difficulty progression

## Solution: Complete Isolation + Random Encounters

---

## PHASE 1: Data Isolation

### 1.1 Separate All localStorage Keys
**Current Issues:**
- `sheepMarket_history` - shared trade history
- `sheepMarket_lifetimeGains/Losses` - shared lifetime stats
- `sheepMarket_perLevelCallHistory` - shared call history
- `sheepMarket_finalCallHistory` - shared final call tracking
- `sheepMarket_callEfficiencyHistory` - shared efficiency tracking
- `sheepMarket_winStreak` - shared win streak

**Solution:**
Create parallel endless mode keys:
```javascript
// Endless Mode Keys (prefix with 'endless_')
localStorage.setItem('endless_history', '[]');
localStorage.setItem('endless_lifetimeGains', '0');
localStorage.setItem('endless_lifetimeLosses', '0');
localStorage.setItem('endless_callHistory', '{}');
localStorage.setItem('endless_finalCallHistory', '[]');
localStorage.setItem('endless_callEfficiency', '{}');
localStorage.setItem('endless_winStreak', '0');
localStorage.setItem('endless_highScore', '0'); // Highest round reached
localStorage.setItem('endless_bestBalance', '0'); // Highest wool balance
```

**Implementation:**
- Modify `HUDScene.init()` to load from endless keys when `isEndlessMode === true`
- Modify all `localStorage.setItem()` calls in round-settled handler to check mode
- Create helper methods: `getStorageKey(baseKey)` that returns `endless_${baseKey}` or `sheepMarket_${baseKey}`

### 1.2 Disable Level Selector in Endless Mode
**Files to modify:**
- `scenes/HUDScene.js` - `createLevelIndicators()` method

**Solution:**
```javascript
createLevelIndicators() {
    // ENDLESS MODE: Hide level selector completely
    if (this.isEndlessMode) {
        return; // Don't create level buttons
    }
    
    // ... existing level indicator code
}
```

### 1.3 Prevent Mode Switching During Gameplay
**Files to modify:**
- `scenes/HUDScene.js` - Level button click handlers
- `services/GameFlowManager.js` - Level transition methods

**Solution:**
- Add `isEndlessMode` check to all level button handlers
- Disable level buttons entirely when in endless mode
- Add "EXIT TO MENU" button in endless mode stats modal instead

---

## PHASE 2: Random Encounter System

### 2.1 Create Endless Mode Config Generator
**New File:** `services/EndlessModeConfig.js`

```javascript
class EndlessModeConfig {
    constructor(round) {
        this.round = round;
        this.config = this.generateConfig();
    }
    
    generateConfig() {
        // Base difficulty scaling
        const difficulty = Math.min(1 + (this.round * 0.1), 3); // Caps at 3x difficulty
        
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
        const increase = Math.floor(this.round * Phaser.Math.Between(2, 5));
        return Math.min(base + increase, 80);
    }
    
    shouldSpawnWolves() {
        // Wolves start appearing from round 3
        if (this.round < 3) return false;
        
        // Probability increases with rounds: 20% at round 3, up to 80% at round 10+
        const probability = Math.min(0.2 + (this.round - 3) * 0.1, 0.8);
        return Math.random() < probability;
    }
    
    getWolfCount() {
        // 1-2 wolves early, up to 3-4 wolves later
        if (this.round < 5) return Phaser.Math.Between(1, 2);
        if (this.round < 10) return Phaser.Math.Between(2, 3);
        return Phaser.Math.Between(3, 4);
    }
    
    shouldSpawnWind() {
        // Wind from round 2, 30-60% chance
        if (this.round < 2) return false;
        return Math.random() < Phaser.Math.Between(30, 60) / 100;
    }
    
    getWindIntensity() {
        // Intensity increases with rounds
        return Phaser.Math.Between(1, Math.min(3, Math.floor(this.round / 3) + 1));
    }
    
    shouldEnableGrazing() {
        // Grazing from round 4, 40-70% chance
        if (this.round < 4) return false;
        return Math.random() < Phaser.Math.Between(40, 70) / 100;
    }
    
    getGrazingDensity() {
        // More grass tufts in later rounds
        return Phaser.Math.Between(3, Math.min(8, 3 + Math.floor(this.round / 2)));
    }
    
    shouldSpawnFriendlyDog() {
        // Friendly dog from round 5, 20-40% chance
        if (this.round < 5) return false;
        return Math.random() < Phaser.Math.Between(20, 40) / 100;
    }
    
    shouldSpawnBlackSheep() {
        // Black sheep from round 7, 15-30% chance
        if (this.round < 7) return false;
        return Math.random() < Phaser.Math.Between(15, 30) / 100;
    }
    
    shouldSpawnGoldenSheep() {
        // Golden sheep rare, from round 8, 5-15% chance
        if (this.round < 8) return false;
        return Math.random() < Phaser.Math.Between(5, 15) / 100;
    }
    
    shouldSpawnLawnMower() {
        // Lawn mower from round 6, 25-45% chance
        if (this.round < 6) return false;
        return Math.random() < Phaser.Math.Between(25, 45) / 100;
    }
    
    shouldApplyGloomyWeather() {
        // Gloomy weather from round 5, 20-35% chance
        if (this.round < 5) return false;
        return Math.random() < Phaser.Math.Between(20, 35) / 100;
    }
    
    shouldApplyRain() {
        // Rain from round 8, 15-25% chance
        if (this.round < 8) return false;
        return Math.random() < Phaser.Math.Between(15, 25) / 100;
    }
    
    shouldApplyLightning() {
        // Lightning from round 10, 10-20% chance
        if (this.round < 10) return false;
        return Math.random() < Phaser.Math.Between(10, 20) / 100;
    }
}

export default EndlessModeConfig;
```

### 2.2 Integrate Random Config into GameScene
**File:** `scenes/GameScene.js`

**Modify `init()` method:**
```javascript
init(data) {
    // ... existing code ...
    
    // ENDLESS MODE: Generate random config
    if (this.isEndlessMode) {
        const EndlessModeConfig = require('../services/EndlessModeConfig').default;
        this.endlessConfig = new EndlessModeConfig(this.endlessRound);
        
        console.log(`🎲 ENDLESS MODE Round ${this.endlessRound} Config:`, this.endlessConfig.config);
        
        // Override level controller with endless config
        this.levelController = {
            getSheepCount: () => this.endlessConfig.config.sheep,
            hasWolves: () => this.endlessConfig.config.wolves,
            hasWind: () => this.endlessConfig.config.wind,
            hasGrazing: () => this.endlessConfig.config.grazing,
            hasFriendlyDog: () => this.endlessConfig.config.friendlyDog,
            hasBlackSheep: () => this.endlessConfig.config.blackSheep,
            hasGoldenSheep: () => this.endlessConfig.config.goldenSheep,
            hasLawnMower: () => this.endlessConfig.config.lawnMower,
            // ... other methods
        };
    } else {
        // Normal mode: use LevelContentController
        this.levelController = new LevelContentController(this.activeLevel);
    }
}
```

**Modify `create()` method:**
```javascript
create() {
    // ... existing code ...
    
    // ENDLESS MODE: Apply random modifiers
    if (this.isEndlessMode) {
        // Apply sheep speed modifier
        this.sheepSpeedMultiplier = this.endlessConfig.config.sheepSpeed;
        
        // Apply market volatility
        this.marketVolatilityMultiplier = this.endlessConfig.config.marketVolatility;
        
        // Apply weather effects
        if (this.endlessConfig.config.gloomyWeather) {
            this.startGloomyWeatherTransition();
        }
        if (this.endlessConfig.config.rain) {
            this.startRain();
        }
        if (this.endlessConfig.config.lightning) {
            this.enableLightning();
        }
    }
}
```

---

## PHASE 3: UI Updates

### 3.1 Add "EXIT TO MENU" Button
**File:** `scenes/WoolWalletButtonManager.js`

**Modify `configureLossState()` and endless game over:**
```javascript
configureLossState() {
    // ... existing code ...
    
    // ENDLESS MODE: Show "EXIT TO MENU" instead of retry
    if (this.hudScene.isEndlessMode) {
        this.actionBtnText.setText('EXIT TO MENU');
        this.actionBtn.on('pointerdown', () => {
            this.handleExitToMenu();
        });
    }
}

handleExitToMenu() {
    console.log('[WoolWalletButtonManager] 🚪 EXIT TO MENU');
    
    // Clear endless mode flags
    localStorage.removeItem('sheepMarket_endlessMode');
    localStorage.removeItem('sheepMarket_endlessRound');
    localStorage.removeItem('sheepMarket_endlessBalance');
    
    // Return to boot scene
    this.hudScene.scene.stop('HUDScene');
    this.hudScene.scene.stop('GameScene');
    this.hudScene.scene.start('BootScene');
}
```

### 3.2 Show Round Info in Stats Modal
**File:** `scenes/HUDScene.js`

**Modify `populateStatsModalForLevelEnd()`:**
```javascript
populateStatsModalForLevelEnd() {
    // ... existing code ...
    
    // ENDLESS MODE: Show round-specific stats
    if (this.isEndlessMode) {
        // Replace level title with round info
        if (this.statsLevelTitle) {
            this.statsLevelTitle.setText(`ROUND ${this.endlessRound} COMPLETE`);
        }
        
        // Show endless mode high scores
        const highestRound = parseInt(localStorage.getItem('endless_highScore') || '0');
        const bestBalance = parseFloat(localStorage.getItem('endless_bestBalance') || '0');
        
        // Add endless stats display
        // "HIGHEST ROUND: X"
        // "BEST BALANCE: XW"
    }
}
```

---

## PHASE 4: Testing Checklist

### Data Isolation Tests
- [ ] Start endless mode, play rounds, verify main game stats unchanged
- [ ] Check localStorage - endless keys separate from main game keys
- [ ] Switch to main game (via menu), verify endless data not visible
- [ ] Complete main game level, verify endless mode unaffected

### Level Selector Tests
- [ ] Verify level selector hidden in endless mode
- [ ] Verify level selector visible in main game
- [ ] Verify can't switch levels during endless mode

### Random Encounter Tests
- [ ] Play 20+ rounds, verify variety in encounters
- [ ] Verify difficulty increases with rounds
- [ ] Verify sheep count increases
- [ ] Verify wolves appear more frequently in later rounds
- [ ] Verify special events (golden sheep, etc.) appear randomly

### UI Tests
- [ ] Verify "EXIT TO MENU" button works
- [ ] Verify round stats display correctly
- [ ] Verify endless high scores tracked separately
- [ ] Verify can restart endless mode from menu

---

## Implementation Order

1. **Phase 1.1** - Data isolation (localStorage keys)
2. **Phase 1.2** - Hide level selector
3. **Phase 3.1** - Add exit button
4. **Phase 2.1** - Create EndlessModeConfig class
5. **Phase 2.2** - Integrate random config
6. **Phase 3.2** - Update stats display
7. **Phase 1.3** - Prevent mode switching
8. **Phase 4** - Testing

---

## Files to Modify

1. `scenes/HUDScene.js` - Data isolation, UI updates, level selector hiding
2. `scenes/GameScene.js` - Random config integration
3. `scenes/WoolWalletButtonManager.js` - Exit button
4. `services/EndlessModeConfig.js` - NEW FILE - Random encounter generator

---

## Estimated Complexity

- **Phase 1 (Data Isolation)**: Medium - Requires careful localStorage key management
- **Phase 2 (Random Encounters)**: High - New config system, difficulty scaling
- **Phase 3 (UI Updates)**: Low - Simple button and text changes
- **Phase 4 (Testing)**: Medium - Comprehensive testing needed

**Total Estimated Time**: 2-3 hours of focused work
