# Dog Behavior Fixes - FINAL

## THE ACTUAL PROBLEM
The sheepdog sprite (`sheepdog_running_fixed.webp.webp`) naturally faces **RIGHT**, not LEFT as the code incorrectly assumed. This caused the dog to appear to walk backwards.

## Fixes Applied

### 1. Friendly Dog (Dog.js) - Facing Direction
**Lines 9-13, 71-81**

CHANGED:
- Comments now correctly state "sprite faces RIGHT"
- `velocity.x > 0` (moving right) → `setFlipX(false)` (no flip, naturally right)
- `velocity.x < 0` (moving left) → `setFlipX(true)` (flip to face left)

### 2. Friendly Dog (Dog.js) - Removed Sheep Fleeing
**Lines 56-58**

REMOVED: The entire sheep fleeing logic that made sheep run away from the friendly dog.
- Dog no longer scares sheep
- Sheep don't create a "wall" blocking the dog's path
- Dog can walk freely to center

### 3. Herding Dog (GameScene.js) - Facing During Herding
**Lines 1048-1064**

CHANGED:
- `movingRight` → `setFlipX(false)` (no flip for right)
- `movingLeft` → `setFlipX(true)` (flip for left)
- Added comment: "Sprite naturally faces RIGHT"

### 4. Herding Dog (GameScene.js) - Facing During Wolf Chase
**Lines 961-967**

CHANGED:
- `dog.setFlipX(dogState.facingRight)` → `dog.setFlipX(!dogState.facingRight)`
- Logic: If wolf is to the right (facingRight=true), don't flip. If wolf is to the left (facingRight=false), flip.

## Wolf Chase Status
The wolf chase logic was ALREADY CORRECT:
- Wolf detection: Lines 888-889 ✅
- Mode switching: Lines 892-916 ✅  
- Chase movement: Lines 936-977 ✅
- Wolf fleeing: Wolf.js lines 81-152 ✅

The dog WILL chase wolves when:
1. Level 8+ (wolves spawn)
2. Herding dog is activated (click dog button)
3. Wolf is present and not exiting

## What Should Happen Now

### Level 7:
- Friendly dog spawns from top-right
- Walks smoothly LEFT towards center (sprite should be FLIPPED)
- Sits down and drops bone at center
- Does NOT scare sheep away

### Level 8+:
- Herding dog flies out when button is clicked
- Moves behind sheep to push them toward target
- If wolf appears, IMMEDIATELY switches to chase mode
- Chases wolf at 450 speed (wolf flees at 400 speed)
- Returns to herding when wolf exits or is gone

## Files Modified
- `/entities/Dog.js` - Fixed facing logic, removed sheep fleeing
- `/scenes/GameScene.js` - Fixed herding dog facing in both modes
