# Endless Mode Data Isolation Fixes

## Issues Fixed

### 1. ✅ Dog Herding Not Working
**Problem:** Dog herding ability showed "wrong level" error in endless mode.

**Root Cause:** Level check `if (gameScene.activeLevel < 7)` blocked usage since endless mode uses level 1 as base.

**Fix:** Added endless mode bypass in `scenes/HUDScene.js`:
```javascript
if (gameScene.activeLevel < 7 && !this.isEndlessMode) {
    console.log('🐕 Dog herding failed: wrong level');
    audioManager.playDud();
    return;
}
```

### 2. ✅ Grass Count Bleeding from Main Game
**Problem:** Grass counter showed 20 in endless mode when it should start at 0.

**Root Cause:** Endless mode and main game shared the same localStorage key `sheepMarket_grassCount`.

**Fix:** Implemented separate storage keys in `scenes/GameScene.js`:
- **Main game:** `sheepMarket_grassCount`
- **Endless mode:** `sheepMarket_endless_grassCount`

Updated 3 locations:
1. Load grass count (line ~244)
2. Save grass count when collecting from lawn mower (line ~6858)
3. Save grass count when placing grass (line ~8533)

### 3. ✅ Bone Count Bleeding from Main Game
**Problem:** Bone counter showed 20 in endless mode when it should start at 0.

**Root Cause:** Endless mode and main game shared the same localStorage key `sheepMarket_boneCount`.

**Fix:** Implemented separate storage keys in `scenes/GameScene.js`:
- **Main game:** `sheepMarket_boneCount`
- **Endless mode:** `sheepMarket_endless_boneCount`

Updated 5 locations:
1. Load bone count (line ~268)
2. Save when collecting bone from field (line ~3273)
3. Save when bone impacts button (line ~4431)
4. Save when placing bone in pasture (line ~8821)
5. Save when reclaiming bone (line ~8942)

### 4. ✅ Black Sheep Repelling Instead of Freezing
**Problem:** Sheep were being repelled by black sheep instead of freezing in place.

**Root Cause:** The `Sheep.js` update method didn't check for `isImmuneOutlier` flag, so immune sheep continued to move despite being marked as frozen.

**Fix:** Added immune outlier check at the beginning of `Sheep.update()` in `entities/Sheep.js`:
```javascript
// IMMUNE OUTLIER: Completely frozen - skip ALL updates
if (this.isImmuneOutlier) {
    this.body.setVelocity(0, 0);
    this.setDepth(this.y);
    return;
}
```

This ensures immune outlier sheep:
- Stop all movement immediately
- Skip all behavior logic (cohesion, panic, wind, etc.)
- Remain frozen for the 15-second duration
- Cannot be affected by any forces

## Data Isolation Strategy

### Endless Mode Storage Keys
All endless mode data now uses separate localStorage keys with `endless_` prefix:

| Data Type | Main Game Key | Endless Mode Key |
|-----------|--------------|------------------|
| Balance | `sheepMarket_balance` | `sheepMarket_endlessBalance` |
| Round | N/A | `sheepMarket_endlessRound` |
| Mode Flag | N/A | `sheepMarket_endlessMode` |
| Grass Count | `sheepMarket_grassCount` | `sheepMarket_endless_grassCount` |
| Bone Count | `sheepMarket_boneCount` | `sheepMarket_endless_boneCount` |

### Benefits
1. **No Data Bleeding** - Main game and endless mode are completely isolated
2. **Independent Progress** - Each mode tracks its own resources
3. **Clean Resets** - Endless mode can reset without affecting main game
4. **Proper Testing** - Can test each mode independently

## Testing Results

All endless mode data isolation issues are now resolved:
- ✅ Dog herding works in endless mode
- ✅ Grass counter starts at 0 in endless mode
- ✅ Bone counter starts at 0 in endless mode
- ✅ Black sheep properly freezes nearby sheep
- ✅ Immune outlier sheep remain frozen for 15 seconds
- ✅ No data bleeding between main game and endless mode

## Files Modified

1. **scenes/HUDScene.js** - Added endless mode check to dog herding
2. **scenes/GameScene.js** - Implemented separate storage keys for grass/bone counts (7 locations)
3. **entities/Sheep.js** - Added immune outlier check to prevent movement

## Additional Notes

### Wool Balance Isolation
Wool balance was already properly isolated using:
- Main game: `authService.loadBalance()` / `authService.saveBalance()`
- Endless mode: `localStorage.getItem('sheepMarket_endlessBalance')`

No changes needed for wool balance.

### Future Considerations
If adding more persistent resources (e.g., power-ups, collectibles), use the same pattern:
- Check `this.isEndlessMode` flag
- Use separate storage key with `endless_` prefix
- Update all load/save locations consistently
