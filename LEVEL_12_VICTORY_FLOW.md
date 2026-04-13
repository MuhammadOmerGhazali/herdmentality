# LEVEL 12 VICTORY FLOW - COMPLETE IMPLEMENTATION

## 🎯 OVERVIEW
Level 12 has a custom 3-stage victory sequence that completely overrides the default win flow.

## 📋 COMPLETE SEQUENCE

### STAGE 1: 15-SECOND CELEBRATION PHASE ⏱️
**Duration:** Exactly 15 seconds (hard-timed, extended for maximum impact)
**Trigger:** Player wins Level 12 (correct prediction with bet placed)

**State Changes:**
- `level12WinOverride = true`
- `level12CelebrationComplete = false`
- `level12WinState = 'CELEBRATING'` (HUD)
- `level12WoolWalletLocked = true` (HUD)

**Visual Effects:**
- ☀️ **Scene brightens** - Rain stops, sun returns, pasture and sheep fade to full brightness (2s tween)
- 🎆 **30 fireworks** - Multi-color bursts spread evenly across 15 seconds (1 every 500ms)
- 🧶 **Wool coin particles** - Burst upward for first 8 seconds, then fade
- 🐑 **All sheep celebrate continuously:**
  - Wave 1 (0-3s): Bounce + spin with 360° rotation (4 repeats)
  - Wave 2 (4-6s): Additional bounces mid-celebration (3 repeats)
  - Wave 3 (8-10s): Happy wiggles left and right
  - Wave 4 (11-13s): Final happy bounces (3 repeats)
  - Sparkles around each sheep at start
- 🎊 **Confetti** - Falls continuously for full 15 seconds
- ✨ **Screen pulses** - Golden glow flashes (dual pulse effect)
- 📹 **Camera shake** - 6 subtle pulses throughout (300ms each)

**Audio:**
- 🔊 15 celebratory chimes spread throughout 15 seconds:
  - Opening fanfare: 4 chimes (0, 0.3s, 0.6s, 0.9s)
  - Early celebration: 2 chimes (2s, 3.5s)
  - Mid-celebration: 4 chimes (5s, 6.5s, 8s, 9.5s)
  - Late celebration: 2 chimes (11s, 12.5s)
  - Final flourish: 3 chimes (13.5s, 14s, 14.5s)
- 🌧️ Rain and wind sounds stopped
- ☀️ Clear, bright atmosphere

**Restrictions:**
- ❌ NO Wool Wallet popup
- ❌ NO Golden Sheep yet
- ❌ NO Golden Key yet
- ❌ NO default win UI
- ✅ Game continues running (not frozen)
- ✅ Player cannot interact with reward elements

**After 15 seconds:**
- `level12CelebrationComplete = true`
- Proceed to STAGE 2

**CRITICAL:** Wool Wallet is HARD BLOCKED and will NOT appear until:
1. ✅ Celebration completes (15 seconds)
2. ✅ Golden Sheep walks in and offers key
3. ✅ Player clicks and accepts Golden Key
4. ✅ Golden Key flies to unlock button
5. ✅ Golden Sheep returns to its button
6. ✅ All unlock animations complete
7. ✅ `GoldenKeyUnlockSequenceComplete = true`

**Only then** will Wool Wallet be released.

---

### STAGE 2: GOLDEN SHEEP + GOLDEN KEY SEQUENCE 🐑🔑
**Trigger:** `level12CelebrationComplete === true`

**State Changes:**
- `level12WinState = 'AWAITING_GOLDEN_KEY'` (HUD)

**Sequence:**
1. **Golden Sheep walks in from top of screen**
   - Spawns at `(CONFIG.width / 2, -100)`
   - Animated entry (walks down, not teleports)
   - Glowing golden appearance with unique `golden_sheep` asset
   - Pulsing light rays rotate continuously
   - Golden sparkle particles trail behind
   - Stops at center of pasture: `(CONFIG.width / 2, CONFIG.height / 2 - 50)`

2. **Golden Sheep offers Golden Key**
   - Gentle floating animation
   - Bubble popup appears: **"TAKE ME"**
   - Player must click Golden Key to proceed
   - Game enters waiting state (indefinite - player-driven)

3. **Player clicks Golden Key**
   - State: `level12WinState = 'KEY_SEQUENCE_ACTIVE'` (HUD)
   - Bubble disappears
   - Sound: Coin chime

4. **Golden Key flies to unlock button**
   - Target: Button 7 (far right, next to Black Sheep button)
   - Flight animation with golden trail
   - Impact particles on landing
   - Unlock animation: Yellow highlight border + bounce
   - Button displays static golden key icon

5. **Golden Sheep returns to its button**
   - Flight animation to Button 0 (leftmost, left of Golden Clover)
   - Rotation + scale during flight
   - Impact particles on landing
   - Sound: Coin chime

6. **Unlock sequence completes**
   - Golden Key button bounces to prompt interaction
   - **ALL LEVELS UNLOCKED (1-12)**
     - `localStorage: sheepMarket_playerLevel = '12'`
     - `localStorage: sheepMarket_allLevelsUnlocked = 'true'`
   - **FULL ASSET ACCESS UNLOCKED**
     - `localStorage: sheepMarket_fullAssetAccess = 'true'`
   - State changes:
     - `level12WinState = 'COMPLETE'` (HUD)
     - `goldenKeyUnlockSequenceComplete = true` (HUD)
   - Event emitted: `'golden-key-sequence-complete'`

---

### STAGE 3: WOOL WALLET RELEASE 💰
**Trigger:** `'golden-key-sequence-complete'` event received

**Conditions (ALL MUST BE TRUE):**
```javascript
level12WinState === 'COMPLETE' &&
goldenKeyUnlockSequenceComplete === true &&
level12WoolWalletLocked === true &&
level12WoolWalletPending === true
```

**If all conditions met:**
- `level12WoolWalletLocked = false`
- `level12WoolWalletPending = false`
- Wool Wallet popup appears with rewards
- Player can see final balance, progress, and advance

**If conditions NOT met:**
- Error logged to console with state details
- Wool Wallet remains blocked (fail-safe)

---

## 🔒 HARD BLOCKS IN PLACE

### Default Win Flow (DISABLED for Level 12)
- ❌ Automatic Wool Wallet popup
- ❌ Standard win UI
- ❌ Auto-reward timers
- ❌ Immediate balance updates

### Timing Guarantees
- ✅ Celebration ALWAYS lasts exactly 10 seconds
- ✅ Golden Sheep NEVER appears before celebration ends
- ✅ Wool Wallet NEVER appears before Golden Key sequence completes
- ✅ No fallback timers bypass the sequence

### State Machine Protection
- ✅ State transitions logged to console
- ✅ Verification checks at each stage
- ✅ Flags prevent skipping or double-triggering
- ✅ Event-driven flow (not timer-based)

---

## 🎬 DESIGN INTENT

**"I BEAT THE GAME"** - Not "Here's your receipt"

The sequence creates a proper game finale:
1. **Victory moment** (10s celebration) - Pure joy, no distractions
2. **Climax** (Golden Sheep + Key) - Narrative payoff and unlocks
3. **Epilogue** (Wool Wallet) - Rewards and progression

Each stage has its moment without interrupting the others.

---

## 📝 KEY FILES MODIFIED

### `/scenes/GameScene.js`
- `settleRound()` - Level 12 win detection and celebration trigger
- `celebrateLevel12Victory()` - 10-second celebration with all effects
- `spawnGoldenSheep()` - Conditional flow for Level 12 vs other levels
- `offerGoldenKey()` - State transition to AWAITING_GOLDEN_KEY
- `takeGoldenKey()` - Key sequence activation
- `goldenSheepReturnsToButton()` - Final unlock and sequence completion

### `/scenes/HUDScene.js`
- `init()` - State machine flags initialization
- `round-settled` event handler - Level 12 win override and hard block
- `golden-key-sequence-complete` event handler - Condition verification and Wool Wallet release

---

## 🐛 DEBUGGING

All state transitions are logged with emoji markers:
- 🎉 Celebration start/end
- 🐑 Golden Sheep spawn
- 🔑 Golden Key offer/take/unlock
- ✅ State changes
- ❌ Blocked actions
- 🔓 Unlock events
- 💰 Wool Wallet release

Check browser console for complete flow trace.
