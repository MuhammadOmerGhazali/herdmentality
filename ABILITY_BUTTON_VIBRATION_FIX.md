# Ability Button Vibration Fix

## Issue
Bottom locked ability buttons had inconsistent vibration feedback - some vibrated when clicked and some didn't, making them feel unfinished.

## Solution
Added consistent 30ms haptic vibration feedback to ALL ability button interactions:

### Locked State Vibration
1. **standardLockedShake()** - Added vibration for buttons 1, 2, 6, 7 when locked
2. **shakeButton()** - Added vibration for buttons 3, 4, 5 when locked or unavailable (no grass/bones)

### Unlocked State Vibration
Added vibration after successful activation for all buttons:

1. **Button 0 (Rally/Whistle)** - Generic ability activation
2. **Button 1 (Golden Clover)** - After emit('ability-goldenclover')
3. **Button 2 (Dog Herding)** - After emit('ability-herd-dog')
4. **Button 3 (Grass Tuft)**:
   - Placement mode activation
   - Instant removal (Level 5)
5. **Button 4 (Lawn Mower)** - After emit('enable-grass-selection')
6. **Button 5 (Bone Placement)** - After emit('enable-bone-placement')
7. **Button 6 (Black Sheep)** - After enterBlackSheepPlacementMode()
8. **Button 7 (Golden Key)** - After unlocking all levels

### Implementation
```javascript
// Haptic feedback for successful activation
if (navigator.vibrate) {
    navigator.vibrate(30);
}
```

## Result
All ability buttons now provide consistent tactile feedback whether locked or unlocked, creating a polished and complete user experience.
