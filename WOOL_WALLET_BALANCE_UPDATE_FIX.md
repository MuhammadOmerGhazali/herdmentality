# Wool Wallet Balance Update Fix

## Issue
The wool wallet UI was not updating its displayed value after the golden clover wool bonus was added. The balance would only update after placing a call or using another ability.

## Root Cause
The `balance-updated` event handler in HUDScene.js was only updating the old balance text (`this.balanceText`), but not the new wool wallet UI component (`this.woolWalletPlaceholders.totalBalance`).

The wool wallet redesign (Phase 1) created a new UI with placeholder text elements stored in `this.woolWalletPlaceholders`, but these placeholders were never connected to the balance update system.

## Solution

### 1. Direct Update in Golden Clover Handler
Added a direct update of the wool wallet UI in the golden clover completion callback (GameScene.js):
```javascript
// DIRECT UPDATE: Also update wool wallet UI directly
if (hudScene.woolWalletPlaceholders && hudScene.woolWalletPlaceholders.totalBalance) {
    hudScene.woolWalletPlaceholders.totalBalance.setText(`${hudScene.formatWool(this.woolBalance)}W`);
    console.log('🍀 Directly updated wool wallet UI to:', this.woolBalance);
}
```

This ensures the wool wallet UI is updated immediately when the golden clover bonus is applied, bypassing any potential event system issues.

### 2. Updated Balance-Updated Event Handler
Enhanced the `balance-updated` event handler in HUDScene.js to update the wool wallet UI:

#### After Animation Completes
```javascript
onComplete: () => {
    if (!this.balanceText) return;
    this.displayBalance = this.balance;
    this.balanceText.setText(`${this.formatWool(this.balance)}W`);
    this.balanceText.setAlpha(1);
    this.balanceText.setScale(1);
    
    // Update wool wallet UI if it exists
    if (this.woolWalletPlaceholders && this.woolWalletPlaceholders.totalBalance) {
        this.woolWalletPlaceholders.totalBalance.setText(`${this.formatWool(this.balance)}W`);
        console.log('✅ Updated wool wallet UI in animation complete:', this.balance);
    }
}
```

#### For Immediate Updates (No Animation)
```javascript
} else {
    // No animation, just update immediately
    if (this.woolWalletPlaceholders && this.woolWalletPlaceholders.totalBalance) {
        this.woolWalletPlaceholders.totalBalance.setText(`${this.formatWool(this.balance)}W`);
        console.log('✅ Updated wool wallet UI immediately:', this.balance);
    }
}
```

### 3. Added Debug Logging
Added comprehensive debug logging to track:
- When balance-updated event is emitted
- When balance-updated event is received
- Whether wool wallet placeholders exist
- When wool wallet UI is updated

## How It Works Now
1. Golden clover bonus is applied to `this.woolBalance` in GameScene
2. GameScene emits `'balance-updated'` event with new balance
3. GameScene ALSO directly updates the wool wallet UI (primary fix)
4. HUDScene receives the event and updates:
   - Old balance text (`this.balanceText`) with slot machine animation
   - New wool wallet UI (`this.woolWalletPlaceholders.totalBalance`) after animation completes
5. Both UI elements now show the updated balance immediately

## Files Modified
- `scenes/GameScene.js` - Added direct wool wallet UI update in `handleGoldenClover()` method
- `scenes/HUDScene.js` - Updated `balance-updated` event handler to include wool wallet UI updates and debug logging

## Testing
Test with golden clover ability:
- Activate golden clover in Level 10+ or endless mode
- Verify the wool wallet UI updates immediately after the bonus is applied
- Check console logs for debug messages
- Verify the balance animation plays correctly
- Verify both the old balance text and new wool wallet UI show the same value
- Verify no need to place a call or use another ability to see the update
