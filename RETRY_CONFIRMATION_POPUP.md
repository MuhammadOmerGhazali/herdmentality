# Retry Confirmation Popup Implementation

## Overview
Added a confirmation popup when players click "TRY AGAIN" that shows the retry cost and handles the case when players don't have enough wool (game over flow).

## Features

### 1. Retry Confirmation (Can Afford)
When player has enough wool to retry:
- Shows popup with title "RETRY LEVEL?"
- Displays retry cost and current balance
- Shows two buttons:
  - "CONTINUE" (primary/gold) - Confirms retry
  - "CANCEL" (secondary/gray) - Cancels and reopens stats modal
- Free retries (Level 1-2) show "Retry this level for FREE?"

### 2. Game Over Flow (Cannot Afford)
When player doesn't have enough wool to retry:
- Shows popup with title "NOT ENOUGH WOOL!" (red)
- Displays required wool vs current balance
- Shows "GAME OVER" message
- Shows single button:
  - "RESTART GAME" (primary/gold) - Triggers newGame() flow

### 3. Automatic Width Calculation
- Uses 85% of screen width with 15% padding (7.5% each side)
- Prevents text from clipping on smaller screens
- Applied to both:
  - Main status text: "NO MORE WOOL TO PLAY WITH!"
  - Stats modal outcome text

## Implementation Details

### New Methods in HUDScene.js

#### `showRetryConfirmationPopup(retryCost, currentBalance, onConfirm, onCancel)`
Creates and displays the retry confirmation popup with:
- Dark overlay (85% opacity)
- Modal with golden border
- Dynamic title and message based on affordability
- Animated entrance (fade in + scale)
- Button callbacks for confirm/cancel actions

**Parameters:**
- `retryCost` - Cost to retry in wool
- `currentBalance` - Player's current balance
- `onConfirm` - Callback when player confirms retry
- `onCancel` - Callback when player cancels (only if can afford)

#### `destroyRetryConfirmationPopup()`
Cleanup method that:
- Destroys the container and all child elements
- Nullifies the reference
- Logs cleanup action

### Modified Methods

#### `WoolWalletButtonManager.handleTryAgain()`
Updated to:
1. Calculate retry cost and level start balance
2. Close stats modal
3. Show retry confirmation popup
4. Pass callbacks for confirm/cancel actions
5. On confirm: Execute retry via GameFlowManager
6. On cancel: Reopen stats modal

#### `HUDScene.shutdown()`
Added cleanup call for retry confirmation popup to prevent memory leaks.

## UI Specifications

### Modal Dimensions
- Width: 600px
- Height: 350px
- Border: 4px golden (#fcd535)
- Background: Dark (#1a1c1e)
- Depth: 15000-15002

### Button Specifications
- Width: 220px
- Height: 60px
- Primary (gold): #fcd535 → #ffed4e (hover)
- Secondary (gray): #444444 → #666666 (hover)
- Hover effect: 1.05x scale
- Border: 4px black

### Text Styles
- Title: 900 48px Inter, gold/red, 8px stroke
- Message: 600 28px Inter, white, 4px stroke
- Button text: 900 24px Inter

## Flow Diagrams

### Can Afford Retry
```
Player clicks "TRY AGAIN"
    ↓
Stats modal closes
    ↓
Retry confirmation popup shows
    ↓
Player clicks "CONTINUE"
    ↓
Popup closes
    ↓
GameFlowManager.retry() executes
    ↓
Level restarts with cost deducted
```

### Cannot Afford Retry (Game Over)
```
Player clicks "TRY AGAIN"
    ↓
Stats modal closes
    ↓
Game over popup shows
    ↓
Player clicks "RESTART GAME"
    ↓
Popup closes
    ↓
GameFlowManager.newGame() executes
    ↓
Game resets to Level 1
```

### Cancel Retry
```
Player clicks "TRY AGAIN"
    ↓
Stats modal closes
    ↓
Retry confirmation popup shows
    ↓
Player clicks "CANCEL"
    ↓
Popup closes
    ↓
Stats modal reopens
```

## Files Modified

1. **scenes/HUDScene.js**
   - Added `showRetryConfirmationPopup()` method (lines ~6345-6560)
   - Added `destroyRetryConfirmationPopup()` method (lines ~6343-6350)
   - Updated `shutdown()` to cleanup retry popup (line ~13553)
   - Fixed text width calculation for "NO MORE WOOL" messages (lines ~1323, ~10990-11003)

2. **scenes/WoolWalletButtonManager.js**
   - Updated `handleTryAgain()` to show confirmation popup (lines ~268-325)
   - Added onConfirm and onCancel callbacks

## Testing Scenarios

### Scenario 1: Free Retry (Level 1-2)
1. Lose on Level 1 or 2
2. Click "TRY AGAIN"
3. Popup shows "Retry this level for FREE?"
4. Click "CONTINUE" → Level restarts with same balance

### Scenario 2: Paid Retry (Can Afford)
1. Lose on Level 3+ with sufficient wool
2. Click "TRY AGAIN"
3. Popup shows cost and balance
4. Click "CONTINUE" → Level restarts with cost deducted
5. OR click "CANCEL" → Stats modal reopens

### Scenario 3: Cannot Afford Retry (Game Over)
1. Lose on Level 3+ with insufficient wool
2. Click "TRY AGAIN"
3. Popup shows "NOT ENOUGH WOOL!" and "GAME OVER"
4. Only "RESTART GAME" button available
5. Click "RESTART GAME" → Game resets to Level 1

### Scenario 4: Text Width on Small Screens
1. Resize window to small width
2. Run out of wool
3. "NO MORE WOOL TO PLAY WITH!" text should fit with padding
4. No text clipping on edges

## Related Issues Fixed

- Text clipping on "NO MORE WOOL TO PLAY WITH!" message
- No confirmation before deducting retry cost
- Unclear game over flow when out of wool
- Direct retry without showing cost to player
