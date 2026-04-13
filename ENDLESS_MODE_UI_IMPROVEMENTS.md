# Endless Mode UI Improvements

## Changes Made

### 1. Removed Red Round Progress Text
**Location:** `scenes/HUDScene.js`

- Removed the red "ROUND X" text that displayed during gameplay
- Changed `livePnlText` to show empty string for endless mode instead of round number
- This prevents players from knowing how far they've progressed, maintaining suspense

**Lines Modified:**
- Line ~4631: Changed from `ROUND ${this.endlessRound}` to empty string
- Line ~9804: Changed from `ROUND ${this.endlessRound}` to empty string

### 2. Created Dedicated Endless Mode Game Over Popup
**Location:** `scenes/HUDScene.js`

Added new methods:
- `createEndlessModeGameOverPopup()` - Creates the popup UI (similar style to Level 12 victory)
- `showEndlessModeGameOver(stats)` - Displays the popup with stats
- `handleEndlessModeMainMenu()` - Returns to main menu and resets endless mode

**Popup Features:**
- Leather wallet style matching the game's aesthetic
- **Properly sized** (1000x900px) to fit on screen without clipping
- Displays key stats:
  - **Rounds Survived** - How many rounds the player completed
  - **Final Balance** - Wool balance when game ended
  - **Bids Won / Lost** - Win/loss record for the run
  - **Highest Wool** - Peak wool balance achieved during the run
- "MAIN MENU" button that:
  - Resets endless mode flags in localStorage
  - Stops music and sounds
  - Returns player to BootScene (main menu)
  - Prepares game for a fresh endless mode run
- Particle celebration effect on display

### 3. Added Endless Mode Stats Tracking
**Location:** `scenes/HUDScene.js`

Added `endlessStats` object in `init()` method:
```javascript
this.endlessStats = {
    bidsWon: 0,
    bidsLost: 0,
    highestWool: startingBalance,
    startingRound: this.endlessRound
};
```

Stats are tracked throughout the run:
- Bids won/lost tracked on each round settlement
- Highest wool updated whenever balance increases
- All stats displayed in game over popup

### 4. Updated Game Over Flow
**Location:** `scenes/HUDScene.js` - `round-settled` event handler

When endless mode game over occurs:
1. Brief "GAME OVER" message displays (1.5s)
2. Bankruptcy sound plays
3. Endless mode game over popup appears with full stats
4. Player can click "MAIN MENU" to return and start fresh

**Removed:**
- Old wallet popup on defeat
- Clearing of localStorage flags (now handled by Main Menu button)
- Generic stats modal display

## Bug Fixes

### Fixed: Popup Too Large
- Reduced modal dimensions from 1400x1400 to 1000x900
- Reduced all font sizes proportionally
- Reduced spacing between elements
- Popup now fits comfortably on 1920x1080 screen

### Fixed: Black Screen on Main Menu Button
- Changed scene transition from non-existent `LandingScene` to `BootScene`
- Added proper music/sound cleanup before transition
- Main menu button now correctly returns to the game's main menu

## User Experience Improvements

1. **Suspense Maintained** - Players don't know their progress during gameplay
2. **Clear Stats** - Comprehensive run statistics shown at game over
3. **Clean Exit** - Single button to return to menu and reset
4. **Consistent Style** - Popup matches Level 12 victory aesthetic
5. **Celebration** - Particle effects acknowledge the player's effort
6. **Proper Sizing** - Popup fits on screen without clipping
7. **Smooth Navigation** - Returns to actual main menu without black screen

## Technical Notes

- Endless mode popup only created when in endless mode (performance optimization)
- Stats tracking persists across rounds within a single run
- Main menu button properly resets all endless mode localStorage keys
- Popup uses depth 15000 to appear above all game elements
- Scene transition properly stops GameScene and HUDScene before starting BootScene
- Music and sounds are stopped before scene transition to prevent audio issues
