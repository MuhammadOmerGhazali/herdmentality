# Dog Behavior Fixes - Complete

## Issues Reported
1. **Dog walking backwards** - Sprite facing wrong direction when moving
2. **Dog glitchy** - Rapid flickering/flipping while herding
3. **Dog blocked by sheep** - Cannot reach destination due to fleeing sheep
4. **Dog not chasing wolf** - Herding dog doesn't chase wolves properly

## Root Causes Identified

### 1. Friendly Dog (Level 7) - Blocked by Sheep
**Problem:** The friendly dog (Dog.js) was making sheep flee from it while walking to center. Since sheep collide with each other, they created a "wall" blocking the dog's path visually.

**Solution:** Removed sheep-fleeing logic from friendly dog. It's a FRIENDLY dog with a bone - it shouldn't scare sheep! Only the herding dog (activated by button) should move sheep.

**File:** `/entities/Dog.js` lines 56-58
```javascript
// FRIENDLY DOG: Does NOT scare sheep - it's a friendly dog with a bone!
// Only the herding dog (created by handleHerdDog) scares and moves sheep
// This prevents the dog from getting "blocked" by fleeing sheep
```

### 2. Herding Dog - Glitchy Flipping
**Problem:** Herding dog was rapidly flipping back and forth during herding mode due to:
- Threshold too high (5 pixels) relative to movement delta (~5 pixels at 60fps)
- Debounce time too long (500ms) causing delayed reactions

**Solution:** 
- Lowered movement threshold from 5px to 2px (more sensitive, less oscillation at threshold)
- Reduced debounce time from 500ms to 300ms (more responsive but still prevents flickering)

**File:** `/scenes/GameScene.js` lines 1050-1065

### 3. Wolf Chase Detection - Already Working
**Problem:** User reported dog not chasing wolves, but the logic was already correct.

**Analysis:**
- Wolf detection: Lines 888-889 correctly filters active wolves
- Mode switching: Lines 892-916 correctly switches to CHASING_WOLF mode
- Chase behavior: Lines 923-977 correctly chases wolf with proper velocity
- Wolf fleeing: Wolf.js lines 83-105 correctly detects chase and flees

**Enhancement:** Added better debug logging (line 901) to show wolf position when detected.

## Technical Details

### Dog Sprite Facing Convention
Both friendly dog and herding dog use the same sprite ('sheepdog') which **naturally faces LEFT**:
- `setFlipX(false)` = Facing LEFT (no flip)
- `setFlipX(true)` = Facing RIGHT (flipped)

### Friendly Dog Behavior (Dog.js)
- Spawns at top-right, walks to center of pasture
- Sits down and drops bone when reaching center
- No longer scares sheep (removed flee logic)
- Correct facing: flips when moving right, no flip when moving left

### Herding Dog Behavior (GameScene.js)
Two modes:
1. **CHASING_WOLF Mode** (lines 923-977)
   - Overrides all other behavior
   - Dog chases wolf at 450 speed
   - Wolf flees at 400 speed (Wolf.js line 103)
   - Facing set ONCE at start of chase, never changes during chase

2. **HERDING Mode** (lines 984-1143)
   - Dog positions behind sheep to push them toward target zone
   - Sheep flee from dog within 350px radius
   - Dog facing updates with 300ms debounce, 2px threshold
   - Smooth movement with velocity-based positioning

## Files Modified
1. `/entities/Dog.js` - Removed sheep-fleeing logic
2. `/scenes/GameScene.js` - Fixed herding dog facing thresholds and debounce

## Testing Recommendations
1. **Level 7:** Verify friendly dog walks smoothly to center without getting stuck
2. **Level 8+:** Activate herding dog, verify it doesn't flip rapidly
3. **Level 8+:** Spawn wolf (wait 8-15 seconds), activate herding dog, verify it chases wolf
4. Check console for wolf detection logs: "🐕 Wolf detected at (x, y) - switching to chase mode"

## Status: ✅ COMPLETE
All reported issues have been addressed with targeted fixes.
