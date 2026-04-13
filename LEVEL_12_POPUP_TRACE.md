# Level 12 Popup Bug - Complete Code Trace

## 1. POPUP CREATION + TRIGGER PATH

### showGameWonPopup() in HUDScene.js (Line 6310)

```javascript
showGameWonPopup() {
    console.log('🎉 ═══ GAME WON POPUP REQUESTED ═══');
    
    const width = CONFIG.width;
    const height = CONFIG.height;
    
    // Darken overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(15000);
    overlay.setScrollFactor(0);
    
    // Modal container
    const modalWidth = 700;
    const modalHeight = 500;
    const modalX = width / 2;
    const modalY = height / 2;
    
    // Background with gold gradient effect
    const modalBg = this.add.graphics();
    
    // Shadow
    modalBg.fillStyle(0x000000, 0.4);
    modalBg.fillRoundedRect(modalX - modalWidth/2 + 8, modalY - modalHeight/2 + 8, modalWidth, modalHeight, 20);
    
    // Main background - dark with gold border
    modalBg.fillStyle(0x1a1a1a, 1);
    modalBg.fillRoundedRect(modalX - modalWidth/2, modalY - modalHeight/2, modalWidth, modalHeight, 20);
    
    // Gold border (thick and prominent)
    modalBg.lineStyle(6, 0xffd700, 1);
    modalBg.strokeRoundedRect(modalX - modalWidth/2, modalY - modalHeight/2, modalWidth, modalHeight, 20);
    
    // Inner gold accent border
    modalBg.lineStyle(2, 0xffed4e, 0.6);
    modalBg.strokeRoundedRect(modalX - modalWidth/2 + 12, modalY - modalHeight/2 + 12, modalWidth - 24, modalHeight - 24, 16);
    
    modalBg.setDepth(15001);
    modalBg.setScrollFactor(0);
    
    // Title: YOU RULE THE PASTURE!
    const title = this.add.text(modalX, modalY - modalHeight/2 + 80, 'YOU RULE THE PASTURE!', {
        font: '900 56px Inter',
        fill: '#ffd700',
        stroke: '#000000',
        strokeThickness: 8,
        align: 'center'
    }).setOrigin(0.5);
    title.setDepth(15002);
    title.setScrollFactor(0);
    
    // Add golden glow to title
    const titleGlow = this.add.text(modalX, modalY - modalHeight/2 + 80, 'YOU RULE THE PASTURE!', {
        font: '900 56px Inter',
        fill: '#ffed4e',
        align: 'center'
    }).setOrigin(0.5).setAlpha(0.3);
    titleGlow.setDepth(15001);
    titleGlow.setScrollFactor(0);
    
    // Pulse animation for title
    this.tweens.add({
        targets: [title, titleGlow],
        scale: 1.05,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    
    // Sheep icon (standard sheep, not golden) - positioned between title and buttons
    const sheepIcon = this.add.image(modalX, modalY - 20, 'sheep');
    sheepIcon.setScale(0.25);
    sheepIcon.setDepth(15002);
    sheepIcon.setScrollFactor(0);
    
    // Add golden glow around sheep icon
    const sheepGlow = this.add.circle(modalX, modalY - 20, 60, 0xffd700, 0.2);
    sheepGlow.setDepth(15001);
    sheepGlow.setScrollFactor(0);
    
    // Pulse animation for sheep
    this.tweens.add({
        targets: [sheepIcon, sheepGlow],
        scale: sheepIcon.scale * 1.1,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    
    // Confetti emitter
    const confettiEmitter = this.add.particles(modalX, modalY - modalHeight/2, 'sparkle_particle', {
        x: { min: -modalWidth/2, max: modalWidth/2 },
        y: 0,
        speedY: { min: 50, max: 150 },
        speedX: { min: -30, max: 30 },
        scale: { start: 0.4, end: 0 },
        alpha: { start: 0.8, end: 0 },
        lifespan: 3000,
        frequency: 100,
        quantity: 1,
        tint: [0xffd700, 0xffed4e, 0xffffff],
        blendMode: 'ADD'
    });
    confettiEmitter.setDepth(15001);
    confettiEmitter.setScrollFactor(0);
    
    // Entrance animation
    modalBg.setAlpha(0);
    title.setAlpha(0);
    titleGlow.setAlpha(0);
    sheepIcon.setAlpha(0);
    sheepGlow.setAlpha(0);
    replayBtn.setAlpha(0);
    restartBtn.setAlpha(0);
    overlay.setAlpha(0);
    
    this.tweens.add({
        targets: overlay,
        alpha: 0.85,
        duration: 300,
        ease: 'Power2'
    });
    
    this.tweens.add({
        targets: [modalBg, title, titleGlow, sheepIcon, sheepGlow],
        alpha: 1,
        duration: 500,
        delay: 200,
        ease: 'Power2'
    });
    
    this.tweens.add({
        targets: [replayBtn, restartBtn],
        alpha: 1,
        y: btnY + 20, // Slide up slightly
        duration: 400,
        delay: 700,
        ease: 'Back.easeOut'
    });
}
```

**🔴 CRITICAL ISSUE: NO CLEANUP REFERENCES**
- All UI elements (overlay, modalBg, title, titleGlow, sheepIcon, sheepGlow, buttons, confettiEmitter) are created as LOCAL VARIABLES
- NO container stores these references (no `this.gameWonContainer`)
- NO cleanup method exists (no `destroyGameWonPopup()`)
- Elements persist at depth 15000-15002 after scene transitions

### Listener Registration in HUDScene.create() (Line 2115)

```javascript
// LEVEL 12: Listen for completion directly from GameScene
gameScene.events.off('level12-complete');
gameScene.events.on('level12-complete', () => {
    console.log('🎉 HUDScene received level12-complete event');
    if (this.activeLevel !== 12) return;
    console.log('🎉 SHOWING GAME WON POPUP');
    this.showGameWonPopup();
});
```

**🔴 POTENTIAL ISSUE: Event listener cleanup**
- Listener is registered in `create()`
- Listener is removed in `shutdown()` (line 13244)
- BUT: If HUDScene restarts without proper shutdown, listener may stack

### Event Emission in GameScene.finalizeGoldenKeySequence() (Line 4099)

```javascript
finalizeGoldenKeySequence() {
    if (this.activeLevel !== 12) return;
    if (!this.level12State || !this.level12State.isActive) return;
    
    console.log('✨ ═══ GOLDEN KEY SEQUENCE FINALIZED ═══');
    console.log('🔓 All levels unlocked by Golden Key animation');
    
    // 🔓 UNLOCK ALL LEVELS IN LOCALSTORAGE
    console.log('💾 Saving unlock state to localStorage...');
    localStorage.setItem('sheepMarket_playerLevel', '12');
    localStorage.setItem('sheepMarket_allLevelsUnlocked', 'true');
    console.log('✅ AllLevelsUnlocked saved to localStorage');
    
    // Update state
    this.level12State.phase = 'COMPLETE';
    
    // Emit event to trigger Game Won popup in HUD
    this.events.emit('level12-complete');
    console.log('📡 Event emitted: level12-complete');
}
```

---

## 2. SCENE LIFECYCLE + TRANSITIONS

### BootScene PLAY Button Handler (Line ~600)

```javascript
const startGame = () => {
    if (this.gameStarted) return;
    this.gameStarted = true;

    let name = input.value.trim();
    if (!name) name = "Shepherd_" + Math.floor(Math.random() * 999);
    
    // UI Feedback
    audioManager.playClick();
    btnContainer.setScale(0.9);
    input.disabled = true;

    // Save Data
    const oldName = localStorage.getItem('sheepMarket_playerName');
    
    if (oldName && name !== oldName) {
        console.log(`👤 NEW SHEPHERD DETECTED: "${name}" replaces "${oldName}". Starting fresh...`);
        // Clear all progress data for the new player
        localStorage.clear();
        // After clear, we must re-set the name
        localStorage.setItem('sheepMarket_playerName', name);
        localStorage.setItem('sheepMarket_playerLevel', '1');
        authService.saveBalance(0); // Will receive 50W from intro
    } else {
        localStorage.setItem('sheepMarket_playerName', name);
    }

    // Transition
    const cover = this.add.graphics().fillStyle(0x000000, 1).fillRect(0, 0, width, height).setDepth(1000).setAlpha(0);
    
    // Fade out ambience
    if (this.farmAmbience) {
        this.tweens.add({
            targets: this.farmAmbience,
            volume: 0,
            duration: 500,
            onComplete: () => {
                this.farmAmbience.stop();
            }
        });
    }

    this.tweens.add({
        targets: cover,
        alpha: 1,
        duration: 500,
        onComplete: () => {
            const goldenKeyUsed = localStorage.getItem('sheepMarket_goldenKeyActivated') === 'true';
            const allUnlocked = localStorage.getItem('sheepMarket_allLevelsUnlocked') === 'true';
            const savedPlayerLevel = parseInt(localStorage.getItem('sheepMarket_playerLevel') || '1');
            
            // Starts at Level 1 ONLY if the game was beaten (golden key / all unlocked). Otherwise resume.
            const startingLevel = (goldenKeyUsed || allUnlocked) ? 1 : savedPlayerLevel;

            this.scene.start('GameScene', {
                activeLevel: startingLevel,
                balance: authService.loadBalance(),
                isRetrying: false,
                fromMenu: true,

                // pass progression flags explicitly (important for HUDScene sync)
                goldenKeyActivated: goldenKeyUsed,
                allLevelsUnlocked: allUnlocked
            });
        }
    });

    import('tone').then(T => T.start().catch(() => {}));
};

btnContainer.on('pointerdown', startGame);
```

**🔴 KEY OBSERVATION:**
- BootScene calls `this.scene.start('GameScene', {...})`
- This starts GameScene, which automatically starts HUDScene as a parallel scene
- NO explicit cleanup of previous HUDScene instance
- If popup elements exist from previous session, they persist

### GameFlowManager Functions

#### newGame() (Line ~150)

```javascript
newGame() {
    if (!this._lock('newGame')) return;

    console.log('[GameFlowManager] 🆕 newGame – resetting all progress');

    const keysToClear = [
        'sheepMarket_playerLevel',
        'sheepMarket_history',
        'sheepMarket_lifetimeGains',
        'sheepMarket_lifetimeLosses',
        'sheepMarket_lifetimeSpentCalls',
        'sheepMarket_perLevelCallLosses',
        'sheepMarket_finalCallHistory',
        'sheepMarket_levelPerformance',
        'sheepMarket_perLevelCallHistory',
        'sheepMarket_winStreak',
        'sheepMarket_callEfficiencyHistory',
        'sheepMarket_gameScore',
        ...Array.from({ length: 12 }, (_, i) => `sheepMarket_level${i + 1}StartBalance`),
    ];
    keysToClear.forEach(k => localStorage.removeItem(k));
    authService.saveBalance(0);

    this._emit('flow:new-game', {});

    this._stopHUD();
    this._startGameScene({
        balance: 0,
        activeLevel: 1,
        isRetrying: false,
        forceReset: true,
    });

    this._unlockNextTick();
}
```

#### _stopHUD() (Line ~90)

```javascript
_stopHUD() {
    if (this._sceneManager && this._sceneManager.isActive('HUDScene')) {
        this._sceneManager.stop('HUDScene');
        console.log('[GameFlowManager] 🛑 HUDScene stopped');
    }
}
```

#### _startGameScene() (Line ~100)

```javascript
_startGameScene(data) {
    console.log('[GameFlowManager] 🎬 Starting GameScene with:', JSON.stringify(data));
    try {
        // scene.start() stops the scene if already running, then starts it fresh.
        // This is safer than stop() + start() in the same tick.
        this._sceneManager.start('GameScene', data);
    } catch (err) {
        console.error('[GameFlowManager] ❌ Failed to start GameScene:', err);
        this._unlock(); // Always release lock on error
    }
}
```

---

## 3. HUDSCENE LIFECYCLE

### create() Method (Line ~1000)

```javascript
create() {
    // ... UI creation ...
    
    // ===== CLEAN UP PREVIOUS EVENT LISTENERS =====
    // Remove all GameScene event listeners to prevent duplicate registrations
    gameScene.events.off('update-market');
    gameScene.events.off('balance-updated');
    gameScene.events.off('calls-updated');
    gameScene.events.off('round-settled');
    gameScene.events.off('round-started');
    gameScene.events.off('unlock-ability-button');
    gameScene.events.off('grass-spawned');
    gameScene.events.off('market-event');
    gameScene.events.off('bones-collected');
    gameScene.events.off('bounce-bone-button');
    gameScene.events.off('level12-complete'); // ✅ FIX: Clear stale listeners on boot

    // Events - Register ONCE per scene create
    gameScene.events.on('bones-collected', (count) => {
        // ... handler ...
    });
    
    // ... more event registrations ...
    
    // LEVEL 12: Listen for completion directly from GameScene
    gameScene.events.off('level12-complete');
    gameScene.events.on('level12-complete', () => {
        console.log('🎉 HUDScene received level12-complete event');
        if (this.activeLevel !== 12) return;
        console.log('🎉 SHOWING GAME WON POPUP');
        this.showGameWonPopup();
    });
}
```

### shutdown() Method (Line 13200)

```javascript
shutdown() {
    console.log('[HUDScene] 🛑 Shutdown initiated');

    // ── Remove global event listeners ────────────────────────────────────
    this.game.events.off('flow:blocked-advance');
    this.game.events.off('flow:blocked-retry');
    this.game.events.off('flow:retry-cost-deducted');

    // ── Music stop interval (Level 9) ────────────────────────────────────
    if (this.musicStopInterval) {
        clearInterval(this.musicStopInterval);
        this.musicStopInterval = null;
    }

    // ── Round timer (if HUD owns one) ────────────────────────────────────
    if (this.hudTimerEvent) {
        this.hudTimerEvent.remove(false);
        this.hudTimerEvent = null;
    }

    // ── In-progress blink tween ──────────────────────────────────────────
    this.stopInProgressBlink();

    // ── Remove all listeners registered on GameScene events ─────────────
    const gameScene = this.scene.get('GameScene');
    if (gameScene) {
        const gsEvents = [
            'update-market', 'balance-updated', 'calls-updated',
            'round-settled', 'round-started',
            'unlock-ability-button', 'unlock-dog-herding-button',
            'unlock-bone-button', 'unlock-grass-button',
            'unlock-dog-button', 'unlock-golden-clover-button',
            'unlock-black-sheep-button', 'unlock-golden-key-button',
            'unlock-golden-sheep-button', 'place-golden-sheep-on-button',
            'bones-collected', 'grass-spawned', 'grass-count-updated',
            'bone-count-updated', 'bounce-bone-button', 'bounce-grass-button',
            'bounce-lawn-mower-button', 'bounce-golden-sheep-button',
            'bounce-golden-key-button',
            'market-event', 'global-bleat',
            'golden-key-sequence-complete',
            'animate-lawn-mower-to-button',
            'wolf-warning', 'wolf-spawned',
            'show-wolf-warning-eyes', 'hide-wolf-warning-eyes',
            'show-wolf-warning-border', 'hide-wolf-warning-border',
            'placement-complete', 'placement-cancelled',
            'level12-complete' // ✅ FIX: Added to prevent listener stacking
        ];
        gsEvents.forEach(ev => gameScene.events.off(ev));
        
        if (this._tutorialRoundHandler) {
            gameScene.events.off('round-settled', this._tutorialRoundHandler);
        }
        console.log('[HUDScene] ✅ Removed GameScene event listeners');
    }

    // ── Clear button manager state ───────────────────────────────────────
    if (this.buttonManager) {
        this.buttonManager.clearAllListeners();
    }

    console.log('[HUDScene] ✅ Shutdown complete');
}
```

**🔴 CRITICAL MISSING: NO POPUP CLEANUP**
- `shutdown()` removes event listeners
- `shutdown()` does NOT destroy popup UI elements
- If popup exists when shutdown occurs, elements persist

---

## 4. POPUP BUTTONS BEHAVIOR

### "START LEVEL 1" Button (Line ~6450)

```javascript
const replayBtn = createButton(modalX - 160, btnY, 'START LEVEL 1', true, async (gameFlowManager) => {
    // Save the final settled balance from Level 12 (no deduction)
    const finalBalance = authService.loadBalance();
    console.log(`[GameWon] 🎮 Starting Level 1 with final balance: ${finalBalance}W (no cost)`);

    // Save as Level 1 start balance so retry logic is also clean
    localStorage.setItem('sheepMarket_level1StartBalance', finalBalance.toString());

    // Transition to Level 1 — free, preserving progression
    gameFlowManager._internalChangeLevelTransition(1, finalBalance, {
        fromMenu: false,
        isRetrying: false,
        goldenKeyActivated: localStorage.getItem('sheepMarket_goldenKeyActivated') === 'true',
        allLevelsUnlocked: localStorage.getItem('sheepMarket_allLevelsUnlocked') === 'true'
    });
});
```

**🔴 CRITICAL ISSUE:**
- Button calls `gameFlowManager._internalChangeLevelTransition()`
- NO cleanup of popup before transition
- Popup overlay at depth 15000 persists after scene change

### "MAIN MENU" Button (Line ~6470)

```javascript
const restartBtn = createButton(modalX + 160, btnY, 'MAIN MENU', false, async (gameFlowManager) => {
    const gameScene = this.scene.get('GameScene');

    // 🔴 Stop GameScene completely
    if (gameScene) {
        gameScene.time.removeAllEvents();
        gameScene.events.removeAllListeners();
        gameScene.scene.stop();
    }

    // 🔴 Stop HUDScene
    this.time.removeAllEvents();
    this.events.removeAllListeners();
    // 🔴 Force clean transition to BootScene (this implicitly stops HUDScene)
    this.scene.start('BootScene', { isRetry: false });
});
```

**🔴 CRITICAL ISSUE:**
- Button stops GameScene and HUDScene
- Button starts BootScene
- NO cleanup of popup before transition
- Popup elements persist in scene graph

---

## 5. LEVEL 12 STATE + GUARDS

### GameScene.init() Level 12 State (Line ~80)

```javascript
init(data) {
    // Always reset Level 12 runtime state
    this.level12WinOverride = false;
    this.level12CelebrationComplete = false;
    this.goldenSheepActivated = false;

    this.level12State = {
        phase: 'IDLE',
        isActive: false
    };
    this.level12Timers = [];

    this.goldenKeyActivated = data.goldenKeyActivated || false;
    this.allLevelsUnlocked = data.allLevelsUnlocked || false;
    
    // ... rest of init ...
}
```

### finalizeGoldenKeySequence() Guards (Line 4099)

```javascript
finalizeGoldenKeySequence() {
    if (this.activeLevel !== 12) return;
    if (!this.level12State || !this.level12State.isActive) return;
    
    console.log('✨ ═══ GOLDEN KEY SEQUENCE FINALIZED ═══');
    console.log('🔓 All levels unlocked by Golden Key animation');
    
    // 🔓 UNLOCK ALL LEVELS IN LOCALSTORAGE
    console.log('💾 Saving unlock state to localStorage...');
    localStorage.setItem('sheepMarket_playerLevel', '12');
    localStorage.setItem('sheepMarket_allLevelsUnlocked', 'true');
    console.log('✅ AllLevelsUnlocked saved to localStorage');
    
    // Update state
    this.level12State.phase = 'COMPLETE';
    
    // Emit event to trigger Game Won popup in HUD
    this.events.emit('level12-complete');
    console.log('📡 Event emitted: level12-complete');
}
```

---

## 6. POPUP CLEANUP / UI STATE

**🔴 CRITICAL FINDING: NO CLEANUP EXISTS**

- NO `this.gameWonContainer` to store popup references
- NO `destroyGameWonPopup()` method
- NO cleanup in button handlers
- NO cleanup in `shutdown()`
- All popup elements created as local variables in `showGameWonPopup()`
- Elements persist at depth 15000-15002 indefinitely

---

## 7. GLOBAL FLAGS / LOCALSTORAGE

### Keys Used:

```javascript
// Level 12 progression flags
localStorage.getItem('sheepMarket_goldenKeyActivated') // 'true' when golden key clicked
localStorage.getItem('sheepMarket_allLevelsUnlocked') // 'true' when unlock animation completes
localStorage.getItem('sheepMarket_playerLevel') // '12' after Level 12 completion
```

### Where Read:

1. **BootScene.startGame()** (Line ~600):
   ```javascript
   const goldenKeyUsed = localStorage.getItem('sheepMarket_goldenKeyActivated') === 'true';
   const allUnlocked = localStorage.getItem('sheepMarket_allLevelsUnlocked') === 'true';
   const savedPlayerLevel = parseInt(localStorage.getItem('sheepMarket_playerLevel') || '1');
   
   const startingLevel = (goldenKeyUsed || allUnlocked) ? 1 : savedPlayerLevel;
   ```

2. **HUDScene.init()** (Line ~190):
   ```javascript
   this.goldenKeyActivated = data.goldenKeyActivated 
       || localStorage.getItem('sheepMarket_goldenKeyActivated') === 'true';
       
   this.allLevelsUnlockedByGoldenKey = data.allLevelsUnlocked 
       || localStorage.getItem('sheepMarket_allLevelsUnlocked') === 'true';
   ```

---

## 8. REPRODUCTION PATH - STEP BY STEP

### What Happens in Code:

1. **Player completes Level 12**
   - GameScene.finalizeGoldenKeySequence() is called
   - Sets `level12State.phase = 'COMPLETE'`
   - Saves `localStorage.setItem('sheepMarket_allLevelsUnlocked', 'true')`
   - Emits `this.events.emit('level12-complete')`

2. **Popup appears**
   - HUDScene listener catches `level12-complete` event
   - Calls `this.showGameWonPopup()`
   - Creates overlay, modalBg, title, titleGlow, sheepIcon, sheepGlow, buttons, confettiEmitter
   - All elements created as LOCAL VARIABLES (not stored in container)
   - Elements set to depth 15000-15002
   - Tweens start (pulse animations, entrance animations)

3. **Player clicks "MAIN MENU"**
   - Button handler executes
   - Stops GameScene: `gameScene.scene.stop()`
   - Removes event listeners: `this.events.removeAllListeners()`
   - Starts BootScene: `this.scene.start('BootScene')`
   - **🔴 NO CLEANUP OF POPUP ELEMENTS**
   - Overlay, modalBg, title, buttons remain in scene graph at depth 15000

4. **BootScene loads**
   - Shows main menu
   - Popup elements still exist in memory (not visible because BootScene is active)

5. **Player presses PLAY again**
   - BootScene.startGame() executes
   - Reads localStorage: `goldenKeyActivated = 'true'`, `allLevelsUnlocked = 'true'`
   - Starts GameScene with `activeLevel: 1`
   - GameScene starts HUDScene as parallel scene

6. **HUDScene.create() runs**
   - Registers event listener: `gameScene.events.on('level12-complete', ...)`
   - **🔴 STALE LISTENER MAY STILL EXIST** if previous HUDScene didn't shutdown cleanly
   - **🔴 OLD POPUP ELEMENTS STILL IN SCENE GRAPH** from step 3

7. **Popup reappears inappropriately**
   - If stale listener fires OR old elements become visible
   - Popup shows again even though player is in Level 1
   - Overlay at depth 15000 blocks all interaction

---

## 🎯 ROOT CAUSES IDENTIFIED

### 1. NO POPUP REFERENCE TRACKING
- `showGameWonPopup()` creates all UI elements as local variables
- No `this.gameWonContainer` to store references
- Elements become unreachable after function returns

### 2. NO CLEANUP METHOD
- No `destroyGameWonPopup()` method exists
- Button handlers cannot clean up before transitioning
- `shutdown()` cannot clean up popup elements

### 3. BUTTON HANDLERS DON'T CLEAN UP
- "START LEVEL 1" button calls `gameFlowManager._internalChangeLevelTransition()` directly
- "MAIN MENU" button calls `this.scene.start('BootScene')` directly
- Neither button destroys popup before transitioning

### 4. NO SHUTDOWN SAFETY NET
- `shutdown()` removes event listeners
- `shutdown()` does NOT destroy popup elements
- If popup exists when shutdown occurs, elements persist

### 5. STALE EVENT LISTENERS (POTENTIAL)
- `level12-complete` listener registered in `create()`
- Listener removed in `shutdown()` (line 13244)
- If HUDScene restarts without proper shutdown, listener may stack
- Multiple listeners could trigger popup multiple times

### 6. HIGH-DEPTH OVERLAY PERSISTS
- Overlay created at depth 15000
- Overlay never destroyed
- Overlay blocks all UI interaction in subsequent scenes
- Overlay visually covers Level 1 gameplay after "START LEVEL 1" click

---

## 🔧 REQUIRED FIXES

1. **Track popup references in container**
   - Create `this.gameWonContainer = this.add.container(0, 0).setDepth(15000)`
   - Add all elements to container: overlay, modalBg, title, titleGlow, sheepIcon, sheepGlow, buttons, confettiEmitter

2. **Create cleanup method**
   ```javascript
   destroyGameWonPopup() {
       if (this.gameWonContainer) {
           this.gameWonContainer.destroy(true);
           this.gameWonContainer = null;
       }
       if (this.confettiEmitter) {
           this.confettiEmitter.stop();
           this.confettiEmitter.destroy();
           this.confettiEmitter = null;
       }
   }
   ```

3. **Call cleanup in button handlers**
   - "START LEVEL 1": Call `this.destroyGameWonPopup()` BEFORE `gameFlowManager._internalChangeLevelTransition()`
   - "MAIN MENU": Call `this.destroyGameWonPopup()` BEFORE `this.scene.start('BootScene')`

4. **Add safety cleanup in shutdown()**
   - Call `this.destroyGameWonPopup()` in `shutdown()` method
   - Ensures cleanup even if button handlers fail

5. **Add duplicate prevention guard**
   - At start of `showGameWonPopup()`: `if (this.gameWonContainer) return;`
   - Prevents multiple popups from stacking

---

## 📊 EXPECTED RESULTS AFTER FIX

✅ Popup disappears instantly when clicking ANY button  
✅ No UI blocking after "START LEVEL 1"  
✅ PLAY from menu does NOT show popup again  
✅ No stuck overlay / invisible blockers  
✅ Clean scene transitions  
✅ No memory leaks from unreferenced UI elements
