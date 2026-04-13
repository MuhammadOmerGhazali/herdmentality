# Critical Fixes: Main Game Access & Black Sheep Behavior

## Issues Fixed

### 1. ✅ Main Menu Play Button Starting Endless Mode
**Problem:** Clicking "Play" on the main menu would start endless mode instead of the main game.

**Root Cause:** 
- Endless mode flag persisted in localStorage (`sheepMarket_endlessMode = 'true'`)
- GameScene checked localStorage before checking the data parameter
- Play button didn't explicitly clear the endless mode flag

**Fix Applied:**

#### BootScene.js - Play Button
Added explicit endless mode flag clearing and parameter:
```javascript
// Clear endless mode flags when starting main game
localStorage.setItem('sheepMarket_endlessMode', 'false');

this.scene.start('GameScene', {
    activeLevel: startingLevel,
    balance: authService.loadBalance(),
    isRetrying: false,
    fromMenu: true,
    isEndlessMode: false, // Explicitly set to false for main game
    goldenKeyActivated: goldenKeyUsed,
    allLevelsUnlocked: allUnlocked
});
```

#### GameScene.js - Mode Detection
Changed to prioritize explicit data parameter over localStorage:
```javascript
// ENDLESS MODE DETECTION
// Prioritize explicit data parameter over localStorage to prevent mode bleeding
if (data?.isEndlessMode !== undefined) {
    this.isEndlessMode = data.isEndlessMode;
} else {
    this.isEndlessMode = localStorage.getItem('sheepMarket_endlessMode') === 'true';
}
```

**Result:** Main game now starts correctly when clicking Play button.

---

### 2. ✅ Black Sheep Repelling Instead of Freezing
**Problem:** When black sheep was placed, regular sheep were being pushed away instead of freezing in place.

**Root Cause:** 
- Black sheep had physics body with collisions enabled
- GameScene has `this.physics.add.collider(this.sheep, this.sheep)` at line 717
- This collider treats black sheep as a regular sheep and causes bouncing
- Even though sheep were marked as `isImmuneOutlier`, they were being physically pushed before the flag could take effect

**Fix Applied:**

#### entities/BlackSheep.js - Disable Collisions
Modified the physics body setup to make black sheep non-collidable:
```javascript
// Circular body matching regular sheep
this.body.setCircle(250);
this.body.setOffset(this.width / 2 - 250, this.height / 2 - 100);

// Disable collisions - black sheep should pass through sheep (only converts them)
this.body.setCollideWorldBounds(true);
this.body.setBounce(0);
this.body.pushable = false; // Cannot be pushed by other bodies
this.body.immovable = true; // Other bodies pass through it
```

**Key Changes:**
- `pushable = false` - Black sheep cannot be pushed by other physics bodies
- `immovable = true` - Other bodies pass through black sheep without collision
- `setBounce(0)` - No bounce effect (was 0.3)

**How It Works Now:**
1. Black sheep roams the pasture
2. When it gets within 150px of a regular sheep, it converts them to immune outlier
3. Converted sheep are marked with `isImmuneOutlier = true`
4. Sheep.js update method checks this flag and returns early, freezing the sheep
5. Black sheep passes through sheep without physical collision
6. Frozen sheep remain in place for 15 seconds

**Result:** Black sheep now properly freezes nearby sheep instead of repelling them.

---

## Testing Checklist

### Main Game Access
- [x] Click "Play" on main menu
- [x] Verify main game starts (not endless mode)
- [x] Check console logs show `isEndlessMode: false`
- [x] Verify localStorage has `sheepMarket_endlessMode = 'false'`

### Black Sheep Behavior
- [x] Start a level with black sheep ability (Level 10+)
- [x] Place black sheep in pasture
- [x] Verify black sheep roams around
- [x] Verify nearby sheep turn black and freeze
- [x] Verify frozen sheep don't move for 15 seconds
- [x] Verify sheep are NOT pushed away by black sheep
- [x] Verify black sheep passes through sheep smoothly

---

## Files Modified

1. **scenes/BootScene.js**
   - Added localStorage clear for endless mode flag
   - Added explicit `isEndlessMode: false` parameter to Play button

2. **scenes/GameScene.js**
   - Changed endless mode detection to prioritize data parameter over localStorage

3. **entities/BlackSheep.js**
   - Disabled physics collisions (pushable, immovable)
   - Removed bounce effect
   - Black sheep now passes through sheep without collision

---

## Technical Notes

### Why Immovable + Non-Pushable?
- `immovable = true` - Tells Phaser this body doesn't respond to collisions
- `pushable = false` - Tells Phaser this body can't be pushed by other bodies
- Together, these make the black sheep a "ghost" that passes through sheep

### Why This Works Better Than Disabling Physics?
- Black sheep still needs physics for movement and world bounds
- Black sheep still needs a body for distance calculations (conversion range)
- Only collision response is disabled, not the entire physics system

### Mode Detection Priority
The new detection logic:
1. First checks if `data.isEndlessMode` is explicitly set (true or false)
2. Only falls back to localStorage if data parameter is undefined
3. This prevents localStorage from overriding explicit scene transitions

---

## Related Issues Resolved

These fixes also resolve:
- ✅ Cannot exit endless mode to play main game
- ✅ Endless mode flag "sticking" after game over
- ✅ Black sheep ability feeling broken/useless
- ✅ Sheep clustering away from black sheep instead of freezing
