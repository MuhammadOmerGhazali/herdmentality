# Black Sheep Endless Mode Fix

## Issue
Black sheep was repelling regular sheep instead of freezing them in place in endless mode. After fixing the repelling, the black sheep still wasn't freezing sheep.

## Root Causes
There were THREE issues causing the problems:

### Issue 1: Black Sheep Avoidance Logic (PRIMARY CAUSE OF REPELLING)
Lines 1171-1206 in GameScene.js contained a "BLACK SHEEP AVOIDANCE" section that was actively pushing sheep away from the black sheep with a force of 800-1600 units. This code was:
- Calculating distance to black sheep
- Applying a strong push force away from the black sheep
- Skipping the normal sheep update when within 250px radius

This was completely wrong - the black sheep should freeze sheep, not repel them.

### Issue 2: Physics Collision
The sheep-to-sheep collider was allowing regular sheep to bounce off the black sheep's physics body, even though the black sheep had `immovable = true` and `pushable = false` set.

### Issue 3: Level Controller Check Preventing Updates (CAUSE OF NO FREEZING)
The black sheep update was gated by `this.levelController.isEnabled('blackSheep')` at line 1199. In endless mode, this check returns false unless black sheep was randomly enabled for that specific round by the EndlessModeConfig. When a player manually places black sheep via the ability button, the level controller doesn't know about it, so the black sheep's update method (which handles conversion) was never being called.

## Why It Appeared to Work in Main Game
- The avoidance logic existed in both modes
- In main game, levels 10+ have black sheep enabled in the level config, so the level controller check passes
- In endless mode, black sheep is only randomly enabled (15-30% chance from round 7+), so manually placed black sheep weren't being updated

## Solution

### Fix 1: Removed Black Sheep Avoidance Logic
Completely removed the avoidance code (lines 1171-1206) that was pushing sheep away. The black sheep should only convert nearby sheep to immune outliers, not repel them.

### Fix 2: Added Process Callback to Collider
Added a process callback to the sheep-to-sheep collider that prevents collisions when one of the bodies is the black sheep:

```javascript
this.physics.add.collider(this.sheep, this.sheep, null, (body1, body2) => {
    // Prevent collision if either body belongs to the black sheep
    if (this.activeBlackSheep) {
        if (body1.gameObject === this.activeBlackSheep || body2.gameObject === this.activeBlackSheep) {
            return false; // Skip collision
        }
    }
    return true; // Allow collision
});
```

### Fix 3: Removed Level Controller Gate
Changed the black sheep update condition to check only if the black sheep exists, not if it's enabled in the level config:

```javascript
// Before (broken in endless mode):
if (this.levelController.isEnabled('blackSheep') && this.activeBlackSheep && this.activeBlackSheep.active) {

// After (works in all modes):
if (this.activeBlackSheep && this.activeBlackSheep.active) {
```

This allows manually placed black sheep (via ability button) to work correctly in endless mode.

## How It Works Now
1. Black sheep roams the pasture with its physics body
2. Black sheep update is called every frame (no level controller gate)
3. When it gets within 150px of a regular sheep, it converts them to immune outlier
4. The black sheep passes through sheep without any collision response or avoidance
5. Converted sheep are marked with `isImmuneOutlier = true` and freeze in place
6. Frozen sheep remain in place for 15 seconds
7. No avoidance or repelling behavior occurs

## Files Modified
- `scenes/GameScene.js` - Removed black sheep avoidance logic (lines 1171-1206)
- `scenes/GameScene.js` - Added process callback to sheep-to-sheep collider (line 717)
- `scenes/GameScene.js` - Removed level controller gate from black sheep update (line 1199)

## Testing
Test in both main game and endless mode:
- Place black sheep in pasture
- Verify black sheep roams smoothly
- Verify black sheep update is called every frame
- Verify nearby sheep turn black and freeze
- Verify sheep are NOT pushed away by black sheep
- Verify black sheep passes through sheep without collision
- Verify no avoidance behavior occurs
- Verify freezing works even when black sheep isn't randomly enabled in endless config


## Additional Fix: Sheep Remaining Frozen After Round Reset

### Issue
After the black sheep duration completed, some sheep remained frozen when the round reset or transitioned to the next round in endless mode.

### Root Cause
The `Sheep.reset()` method didn't clear the `isImmuneOutlier` flag or restore physics properties. When `resetRound()` was called, it repositioned sheep and called `reset()`, but the immune outlier state persisted, leaving sheep frozen.

### Solution
1. Updated `Sheep.reset()` to clear immune outlier state:
   - Clear `isImmuneOutlier` flag
   - Clear `immuneOutlierTintLocked` flag
   - Restore physics: `body.setImmovable(false)` and `body.moves = true`

2. Updated `GameScene.resetRound()` to clear the immune outlier tracking array:
   - Reset `this.immuneOutlierSheep = []`

### Files Modified
- `entities/Sheep.js` - Added immune outlier cleanup to `reset()` method
- `scenes/GameScene.js` - Added immune outlier array cleanup to `resetRound()` method
