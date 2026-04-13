# LEVEL 12: GOLDEN SHEEP & GOLDEN KEY TWO-STEP SEQUENCE

## 🎯 OVERVIEW
Level 12 win now implements a **two-step interactive sequence** where the player must activate the Golden Sheep button first (to resurrect sheep and restore the pasture), then activate the Golden Key button (to unlock all levels).

## 📋 COMPLETE SEQUENCE

### STAGE 1: CELEBRATION (15 seconds)
**Unchanged from previous implementation**
- 15-second victory celebration
- Scene brightens, weather stops
- Fireworks, confetti, sheep celebrate
- No Golden Sheep or Wool Wallet yet

### STAGE 2A: GOLDEN SHEEP & KEY FLY TO BUTTONS
**Trigger:** After 15-second celebration completes

**What Happens:**
1. Golden Sheep spawns at top center
2. Walks down to center of pasture
3. "TAKE ME" bubble appears
4. Player clicks bubble
5. Golden Sheep and Golden Key **separate into two objects**
6. **Both fly SIMULTANEOUSLY** to their respective buttons:
   - Golden Sheep → Button 0 (leftmost)
   - Golden Key → Button 7 (rightmost)
7. Both land with impact particles and sounds

### STAGE 2B: GOLDEN SHEEP BUTTON ACTIVATION ⭐ **NEW**
**Trigger:** After both objects land on buttons

**Step 1: Golden Sheep Button Bounces**
```
completeGoldenSequence() called
  ↓
Golden Sheep button bounces (4 bounces over 1.6s)
  ↓
Golden sparkle particles around button
  ↓
Coin sound plays
  ↓
Waits for player to click...
```

**Step 2: Player Clicks Golden Sheep Button**
```
Player clicks button
  ↓
activateGoldenSheepButton() called in GameScene
  ↓
EFFECTS BEGIN:
```

**Effects Triggered:**
1. **Visual Drama**
   - Golden glow expands from button
   - Light rays shoot out in 12 directions
   - Camera shake
   - Coin sound

2. **Resurrect All Bone Sheep** 💀 → 🐑
   - Golden beams shoot from button to each bone
   - Beams expand over 400ms
   - Bone fades out, new sheep pops in
   - Staggered timing (150ms between each)
   - All bones converted to live sheep

3. **Stop All Weather** 🌧️ → ☀️
   - Rain sound stops immediately
   - Wind sound stops immediately
   - Rain particles destroyed
   - Wind particles destroyed
   - Lightning disabled
   - Darkness overlay fades out (1s)

4. **Brighten Pasture and Sheep** 🌟
   - Pasture fades to full brightness (1.5s)
   - All tints cleared
   - All sheep fade to full brightness (1.5s)
   - Sheep tints cleared and set to white

5. **Remove All Wolves** 🐺 → 💨 → 🦴
   - Each wolf bursts into dust particles
   - Dust explosion with 30 particles
   - Wolf fades out and shrinks
   - Bone sprite appears at wolf location
   - Staggered timing (100ms between each)
   - Bones added to bonesList for future resurrection
   - Prevents new wolf spawns

6. **Set Protection Flag**
   - `goldenSheepActivated = true`
   - Prevents weather/wolves from returning

**Step 3: Wait for Effects to Complete**
```
Calculate duration: max(bone count × 150ms + 1000ms, 2500ms)
  ↓
Wait for all animations to finish
  ↓
Golden Key button bounces
```

### STAGE 2C: GOLDEN KEY BUTTON ACTIVATION 🔑
**Trigger:** After Golden Sheep effects complete

**Step 1: Golden Key Button Bounces**
```
bounceGoldenKeyButton() called
  ↓
Golden Key button bounces (4 bounces over 1.6s)
  ↓
Golden sparkle particles around button (pure gold color)
  ↓
Coin sound plays
  ↓
Waits for player to click...
```

**Step 2: Player Clicks Golden Key Button**
```
Player clicks button
  ↓
activateGoldenKey() called
  ↓
Golden Key lifts out of button
  ↓
Flies around to unlock all levels
  ↓
All levels unlocked
  ↓
Full asset access enabled
  ↓
Sequence complete
```

### STAGE 3: WOOL WALLET RELEASE
**Trigger:** After Golden Key sequence completes
- Wool Wallet popup appears
- Player can view rewards and progress

---

## 🎨 VISUAL EFFECTS DETAILS

### Golden Sheep Button Bounce
- **Bounce:** Scale 1.0 → 1.2 → 1.0 (repeat 3x)
- **Duration:** 400ms per bounce
- **Particles:** Golden/yellow/white sparkles
- **Sound:** Coin chime
- **Easing:** Sine.easeInOut

### Golden Sheep Button Click Effects
- **Glow:** Gold circle expands 3x and fades
- **Rays:** 12 golden rays shoot outward
- **Camera:** 300ms shake at 0.005 intensity
- **Sound:** Coin chime

### Resurrection Beams
- **Beam:** Thick golden line from button to bone
- **Expansion:** 400ms animation from button to target
- **Inner Core:** Bright white (6px wide)
- **Outer Glow:** Gold (12px wide)
- **Hold:** 200ms at full extension
- **Fade:** 300ms fade out

### Wolf Removal
- **Dust Burst:** 30 gray particles (50-150 speed)
- **Wolf Fade:** 400ms fade to 0 alpha, scale to 0.5
- **Bone Appearance:** 300ms fade in with Back.easeOut
- **Bone Float:** Gentle bobbing (-5px up/down)
- **Stagger:** 100ms between each wolf

### Weather Stop
- **Immediate:** Rain/wind sounds stop instantly
- **Particles:** Rain/wind particles destroyed
- **Darkness:** 1000ms fade to transparency
- **Lightning:** Disabled immediately

### Pasture/Sheep Brighten
- **Duration:** 1500ms
- **Easing:** Sine.easeOut
- **Target:** Full brightness (alpha 1.0, tint cleared)
- **All Sheep:** Parallel animation on all non-immune sheep

---

## 🔧 CODE STRUCTURE

### GameScene Methods
```javascript
completeGoldenSequence()
  - Bounces Golden Sheep button first
  - Waits for player click

activateGoldenSheepButton()
  - Handles all Golden Sheep effects
  - Resurrection, weather, brightness, wolves
  - Bounces Golden Key button when done

removeAllWolvesLevel12()
  - Removes all wolves with dust → bone effect
  - Staggered timing for visual impact

createBonesFromWolf(x, y)
  - Creates bone sprite at wolf position
  - Adds to bonesList for tracking

resurrectAllBoneSheep()
  - Modified to emit beams from button (Level 12)
  - Or from sprite (other levels)
  - Handles both cases automatically
```

### HUDScene Methods
```javascript
placeGoldenSheepOnButton(index, sprite)
  - Places Golden Sheep on button
  - Makes button clickable
  - Calls activateGoldenSheepButton() on click

bounceGoldenSheepButton()
  - Bounces Golden Sheep button with sparkles
  - Plays sound
  - Visual prompt for player

bounceGoldenKeyButton()
  - Bounces Golden Key button with sparkles
  - Plays sound (after Golden Sheep done)
  - Visual prompt for player
```

### State Flags
```javascript
// HUDScene
this.goldenSheepAcquired = false;      // Set when sheep lands
this.goldenSheepActivated = false;     // Set when player clicks
this.goldenKeyAcquired = false;        // Set when key lands
this.goldenKeyActivated = false;       // Set when player clicks

// GameScene
this.goldenSheepActivated = false;     // Set after activation
```

---

## ✅ ACCEPTANCE CRITERIA

- ✅ Golden Sheep button bounces after impact with its button
- ✅ Player clicks Golden Sheep button → bones resurrected, weather removed, wolves removed, pasture brightened
- ✅ Sequence completes fully before Golden Key button becomes interactable
- ✅ Golden Key button bounce signals player to press it
- ✅ Clicking Golden Key unlocks all levels and fully enables assets
- ✅ Wool Wallet popup appears only after the full sequence finishes
- ✅ No other assets, levels, or mechanics are broken

---

## 🎯 DESIGN INTENT

### Two-Step Interaction
The sequence requires **two deliberate player actions**:
1. **Restoration** (Golden Sheep) - Fix the damage
2. **Reward** (Golden Key) - Unlock everything

This creates a satisfying progression:
- Player sees the problem (bones, wolves, dark weather)
- Player activates the solution (Golden Sheep restores everything)
- Player receives the reward (Golden Key unlocks all)

### Visual Feedback
Every action has clear visual and audio feedback:
- Buttons bounce to invite clicks
- Sparkles emphasize importance
- Effects are dramatic and visible
- Sounds reinforce actions
- Camera shake adds impact

### Pacing
- Celebration: 15 seconds (joy)
- Golden Sheep effects: 2-3 seconds (restoration)
- Golden Key effects: 3-4 seconds (unlocking)
- Total: ~20-25 seconds of climactic gameplay

---

## 🐛 DEBUGGING

Console logs show the sequence:
```
🎉 LEVEL 12 WON - ACTIVATING 10-SECOND CELEBRATION
✅ Level12CelebrationComplete = true
🐑 NOW spawning Golden Sheep...
🔑 Player clicked "TAKE ME" - Separating Golden Sheep and Golden Key!
🔑 Golden Key landed on Button 7
🐑 Golden Sheep landed on Button 0
✨ Both Golden Sheep and Golden Key have landed!
🐑 Step 1: Waiting for player to click Golden Sheep button...
🐑 Bouncing Golden Sheep button to prompt interaction...
🐑 GOLDEN SHEEP BUTTON CLICKED - ACTIVATING RESTORATION!
🐑 ═══ GOLDEN SHEEP BUTTON ACTIVATED (LEVEL 12) ═══
💀 → 🐑 Resurrecting all bone sheep...
🌧️ → ☀️ Stopping all weather effects...
🌟 Brightening pasture and sheep...
🐺 Removing all wolves...
✅ Golden Sheep effects complete!
🔑 Step 2: Bouncing Golden Key button...
🔑 GOLDEN KEY CLICKED - ACTIVATING MASTER UNLOCK!
🔓 All levels unlocked by Golden Key animation
✅ GoldenKeyUnlockSequenceComplete = true
💰 Wool Wallet released
```

---

## 📝 FILES MODIFIED

### `/scenes/GameScene.js`
- Modified `completeGoldenSequence()` - Bounces Golden Sheep first
- Added `activateGoldenSheepButton()` - Handles all Golden Sheep effects
- Added `removeAllWolvesLevel12()` - Wolf removal with dust → bone
- Added `createBonesFromWolf()` - Creates bone sprites from wolves
- Modified `resurrectAllBoneSheep()` - Works from button or sprite

### `/scenes/HUDScene.js`
- Modified `init()` - Added goldenSheepActivated flag
- Modified `placeGoldenSheepOnButton()` - Made button clickable
- Added `bounceGoldenSheepButton()` - Button bounce with sparkles
- Modified `bounceGoldenKeyButton()` - Added sparkles

---

## 🎮 PLAYER EXPERIENCE

The two-step sequence creates a satisfying climax:
1. **"I won!"** - 15 seconds of pure celebration
2. **"I see the reward!"** - Golden Sheep and Key appear
3. **"Let me take it!"** - Player clicks bubble
4. **"Restore my world!"** - Player clicks Golden Sheep button
5. **"Watch everything heal!"** - Resurrection, brightening, wolves gone
6. **"Now for my prize!"** - Golden Key button bounces
7. **"Unlock everything!"** - Player clicks Golden Key button
8. **"I beat the game!"** - All levels unlocked, Wool Wallet appears

Each step feels earned and intentional, not automatic or rushed.
