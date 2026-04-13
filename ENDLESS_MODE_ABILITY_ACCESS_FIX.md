# Endless Mode Ability Access Fix

## Problem

After clearing browser cache, abilities were blocked in endless mode with errors:
- "Golden Clover BLOCKED: Already used in main game"
- "Cannot herd: not Level 7+ and not in free play mode"
- "No bones available to place"

## Root Cause

Ability checks were only considering:
1. Main game level requirements
2. Free-play mode (after winning Level 12)

But NOT endless mode, which should have access to all abilities regardless of main game progress.

## Solution

Added `!this.isEndlessMode` checks to all ability restrictions so endless mode bypasses main game requirements.

### Files Modified

#### 1. scenes/HUDScene.js

**Golden Clover Button Click (Line ~8106)**
```javascript
// Before
if (!inFreePlayMode) {
    const goldenCloverUsedMainGame = localStorage.getItem('sheepMarket_goldenCloverUsed') === 'true';
    if (goldenCloverUsedMainGame) {
        // BLOCKED
    }
}

// After
if (!this.isEndlessMode && !inFreePlayMode) {
    const goldenCloverUsedMainGame = localStorage.getItem('sheepMarket_goldenCloverUsed') === 'true';
    if (goldenCloverUsedMainGame) {
        // BLOCKED
    }
}
```

#### 2. scenes/GameScene.js

**Dog Herding (Line ~5278)**
```javascript
// Before
if (this.activeLevel < 7 && !inFreePlayMode) {
    return; // BLOCKED
}

// After
if (this.activeLevel < 7 && !inFreePlayMode && !this.isEndlessMode) {
    return; // BLOCKED
}
```

**Golden Clover Handler (Line ~6151)**
```javascript
// Before
if (this.activeLevel < 10 && !inFreePlayMode) {
    return; // BLOCKED
}

// After
if (this.activeLevel < 10 && !inFreePlayMode && !this.isEndlessMode) {
    return; // BLOCKED
}
```

**Black Sheep Placement (Line ~5780)**
```javascript
// Before
if (this.activeLevel < 10 && !inFreePlayMode) {
    return; // BLOCKED
}

// After
if (this.activeLevel < 10 && !inFreePlayMode && !this.isEndlessMode) {
    return; // BLOCKED
}
```

## Ability Access Matrix

| Ability | Main Game | Free-Play | Endless Mode |
|---------|-----------|-----------|--------------|
| Whistle | Level 1+ | ✅ | ✅ |
| Golden Clover | Level 10+ (once) | ✅ (per level) | ✅ (per round) |
| Dog Herding | Level 7+ | ✅ | ✅ |
| Grass Tuft | Level 5+ | ✅ | ✅ |
| Lawn Mower | Level 3+ | ✅ | ✅ |
| Bone | Level 8+ | ✅ | ✅ |
| Black Sheep | Level 10+ | ✅ | ✅ |
| Golden Sheep | Level 12 only | ✅ | ❌ (not in endless) |
| Golden Key | Level 12 win | ✅ | ❌ (not in endless) |

## Testing

After fix, in endless mode:
- ✅ Golden Clover works (reusable per round)
- ✅ Dog Herding works
- ✅ Black Sheep placement works
- ✅ All abilities unlocked from start
- ✅ No main game localStorage interference

## Notes

- Endless mode is completely isolated from main game progress
- Abilities are reusable per round in endless mode
- Golden Clover in main game remains single-use until Level 12 win
- Free-play mode (after Level 12) allows all abilities reusable per level
