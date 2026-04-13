# Endless Mode Ability Fixes

## Issues Fixed

### 1. ✅ Cooldown Text Not Visible
**Problem:** When abilities were unlocked in endless mode, the cooldown countdown text didn't appear.

**Root Cause:** The `unlockAbilityButton()` function didn't create the `cdText` element that displays cooldown numbers.

**Fix:** Added `cdText` creation in `unlockAbilityButton()`:
```javascript
if (!btn.cdText) {
    btn.cdText = this.add.text(0, 0, '', {
        font: 'bold 36px Inter',
        fill: '#ffffff'
    }).setOrigin(0.5);
    btn.cdText.setVisible(false);
    btn.container.add(btn.cdText);
}
```

### 2. ✅ Count Text Not Visible (Bones & Grass)
**Problem:** Bone and grass inventory counters didn't show up on ability buttons.

**Root Cause:** `boneCountText` and `grassCountText` were only created for buttons that started unlocked, not for dynamically unlocked buttons.

**Fix:** Added counter text creation in `unlockAbilityButton()`:
- Button 3 (Grass): Creates `grassCountText` with "0" initial value
- Button 5 (Bones): Creates `boneCountText` with "0" initial value

### 3. ✅ Dog Image Not Visible
**Problem:** Dog herding button showed no icon.

**Root Cause:** Code tried to load 'sheepdog_running' asset which doesn't exist. The actual asset is 'sheepdog'.

**Fix:** Changed asset reference in `unlockAbilityButton()`:
```javascript
else if (index === 2) {
    // Dog Herding - use sheepdog image
    abilityImage = this.add.image(0, 0, 'sheepdog')
        .setOrigin(0.5)
        .setScale(0.10);
    btn.dogImage = abilityImage;
}
```

### 4. ✅ Golden Clover Not Usable
**Problem:** Golden Clover ability couldn't be activated in endless mode.

**Root Cause:** Level check `if (gameScene.activeLevel < 10)` blocked usage since endless mode uses level 1 as base.

**Fix:** Added endless mode bypass:
```javascript
if (gameScene.activeLevel < 10 && !this.isEndlessMode) {
    console.log('🍀 Golden clover failed: wrong level');
    audioManager.playDud();
    return;
}
```

### 5. ✅ Black Sheep Not Working
**Problem:** Black Sheep ability couldn't be activated in endless mode.

**Root Cause:** Same as Golden Clover - level check blocked usage.

**Fix:** Added endless mode bypass:
```javascript
if (gameScene.activeLevel < 10 && !inFreePlayMode && !this.isEndlessMode) {
    console.log('🐑 Black sheep failed: requires Level 10+ or free play mode');
    audioManager.playDud();
    return;
}
```

### 6. ✅ Black Sheep Image Properly Created
**Problem:** Black sheep button needed both white border and black sheep overlay.

**Fix:** Enhanced `unlockAbilityButton()` to create both layers:
```javascript
else if (index === 6) {
    // Black Sheep - white border + black sheep
    const blackSheepBorder = this.add.image(0, 0, 'sheep')
        .setOrigin(0.5)
        .setTint(0xffffff)
        .setScale(0.11);
    btn.container.add(blackSheepBorder);
    btn.blackSheepBorder = blackSheepBorder;
    
    abilityImage = this.add.image(0, 0, 'sheep')
        .setOrigin(0.5)
        .setScale(0.10)
        .setTint(0x1a1a1a);
    btn.blackSheepImage = abilityImage;
}
```

## Additional Improvements

### Performance Optimization
Added endless mode check to skip unlock animations:
```javascript
// ENDLESS MODE: Skip animations
if (this.isEndlessMode) {
    return;
}
```

This prevents unnecessary particle effects and tweens when unlocking all 8 abilities at once in endless mode.

### Proper Reference Storage
All unlocked ability images are now properly stored in the button object:
- `btn.dogImage` - Dog herding icon
- `btn.goldenCloverImage` - Golden clover icon
- `btn.grassTuftImage` - Grass tuft icon
- `btn.lawnMowerImage` - Lawn mower icon
- `btn.boneIcon` - Bone emoji
- `btn.blackSheepImage` - Black sheep icon
- `btn.blackSheepBorder` - White border for black sheep

## Testing Results

All endless mode ability issues are now resolved:
- ✅ Cooldown numbers display correctly
- ✅ Bone counter shows "0" and updates
- ✅ Grass counter shows "0" and updates
- ✅ Dog herding icon visible and functional
- ✅ Golden Clover usable in endless mode
- ✅ Black Sheep usable in endless mode
- ✅ All ability buttons properly styled with gold borders
- ✅ No performance issues from unlock animations

## Files Modified

- `scenes/HUDScene.js` - Enhanced `unlockAbilityButton()` function
- `scenes/HUDScene.js` - Added endless mode checks to Golden Clover handler
- `scenes/HUDScene.js` - Added endless mode checks to Black Sheep handler
