# Per-Level Call History System - Complete Implementation

## Status: ✅ COMPLETE

A comprehensive per-level call history system has been implemented that tracks all final call attempts, including skipped rounds, and displays them in the wool wallet popup.

---

## Implementation Overview

### 1. Data Structure (Lines 162-174 in init)

```javascript
// ===== PER-LEVEL CALL HISTORY SYSTEM =====
// Tracks all final call attempts per level, including skipped rounds
// Format: { level: number, attempts: [{side: 'LEFT'|'RIGHT'|null, correct: boolean}] }
try {
    this.perLevelCallHistory = JSON.parse(localStorage.getItem('sheepMarket_perLevelCallHistory') || '{}');
} catch(e) {
    this.perLevelCallHistory = {};
}

// Ensure current level has an entry
if (!this.perLevelCallHistory[this.activeLevel]) {
    this.perLevelCallHistory[this.activeLevel] = [];
}
```

**Structure:**
```javascript
{
  "1": [
    { side: "LEFT", correct: false },
    { side: "RIGHT", correct: false },
    { side: "LEFT", correct: true }
  ],
  "2": [
    { side: null, correct: false },  // No call made
    { side: "RIGHT", correct: true }
  ],
  "3": []  // No attempts yet (shows "undefined")
}
```

---

### 2. Recording Function (Lines 7401-7417)

```javascript
recordFinalCallAttempt(side, correct) {
    // Ensure level entry exists
    if (!this.perLevelCallHistory[this.activeLevel]) {
        this.perLevelCallHistory[this.activeLevel] = [];
    }
    
    // Add attempt to level history
    this.perLevelCallHistory[this.activeLevel].push({
        side: side, // 'LEFT', 'RIGHT', or null
        correct: correct
    });
    
    // Save to localStorage
    localStorage.setItem('sheepMarket_perLevelCallHistory', JSON.stringify(this.perLevelCallHistory));
    
    console.log(`📝 Recorded final call attempt for Level ${this.activeLevel}:`, side || 'No Call', correct ? '✓' : 'X');
}
```

**Called in two places:**
1. **Line 653**: When no bet was made (skipped round)
   ```javascript
   this.recordFinalCallAttempt(null, false);
   ```

2. **Line 746**: When a bet was made
   ```javascript
   this.recordFinalCallAttempt(this.finalCallSide, data.finalCallCorrect);
   ```

---

### 3. Formatting Function (Lines 7424-7438)

```javascript
getFormattedCallHistory(level) {
    const attempts = this.perLevelCallHistory[level];
    
    if (!attempts || attempts.length === 0) {
        return 'undefined';
    }
    
    return attempts.map(attempt => {
        if (attempt.side === null) {
            return 'No Call';
        }
        const mark = attempt.correct ? '✓' : 'X';
        return `${attempt.side} ${mark}`;
    }).join(', ');
}
```

**Output Examples:**
- Level with no attempts: `"undefined"`
- Level with skipped round: `"No Call"`
- Level with wrong call: `"LEFT X"`
- Level with correct call: `"RIGHT ✓"`
- Level with multiple attempts: `"No Call, LEFT X, RIGHT X, LEFT ✓"`

---

### 4. Display Function (Lines 6925-6942)

```javascript
updateFinalCallHistoryDisplay() {
    if (!this.finalCallHistoryText) return;
    
    // Build per-level call history display
    // Show up to 6 levels of history
    const maxLevels = 6;
    const historyLines = [];
    
    for (let level = 1; level <= maxLevels; level++) {
        const formattedHistory = this.getFormattedCallHistory(level);
        historyLines.push(`L${level}: ${formattedHistory}`);
    }
    
    // Join with line breaks for vertical display
    const historyStr = historyLines.join('\n');
    
    this.finalCallHistoryText.setText(historyStr);
}
```

**Display Format:**
```
L1: LEFT X, RIGHT X, LEFT ✓
L2: No Call, LEFT X, RIGHT ✓
L3: RIGHT ✓
L4: undefined
L5: undefined
L6: undefined
```

---

## How It Works

### Recording Flow

1. **Round Ends with Bet:**
   - GameScene emits `round-settled` event with `data.hadBet = true`
   - HUDScene records: `recordFinalCallAttempt(this.finalCallSide, data.finalCallCorrect)`
   - Example: Player called LEFT and it was correct → `{ side: "LEFT", correct: true }`

2. **Round Ends without Bet:**
   - GameScene emits `round-settled` event with `data.hadBet = false`
   - HUDScene records: `recordFinalCallAttempt(null, false)`
   - Example: Player made no call → `{ side: null, correct: false }`

3. **Persistence:**
   - All history saved to `localStorage` immediately
   - Survives page refreshes, level changes, and retries
   - Never cleared on TRY AGAIN

### Display Flow

1. **Wool Wallet Opens:**
   - `toggleStatsModal()` called
   - `updateFinalCallHistoryDisplay()` called (lines 6151, 6243)

2. **History Built:**
   - For each level (1-6), calls `getFormattedCallHistory(level)`
   - Formats each attempt as `SIDE MARK` or `No Call`
   - Joins all attempts with commas

3. **Display Updated:**
   - Shows all 6 levels in format: `L#: history`
   - Levels with no attempts show `undefined`
   - Updates live every time wallet opens

---

## Examples

### Example 1: Player Makes Wrong Calls, Then Succeeds

**Gameplay:**
- Level 1, Round 1: Called LEFT → WRONG
- Level 1, Round 2 (Retry): Called RIGHT → WRONG
- Level 1, Round 3 (Retry): Called LEFT → CORRECT (Level Complete!)

**Wool Wallet Display:**
```
FINAL CALL HISTORY
L1: LEFT X, RIGHT X, LEFT ✓
L2: undefined
L3: undefined
L4: undefined
L5: undefined
L6: undefined
```

---

### Example 2: Player Skips First Round

**Gameplay:**
- Level 2, Round 1: Made no call (timeout)
- Level 2, Round 2 (Retry): Called LEFT → WRONG
- Level 2, Round 3 (Retry): Called RIGHT → WRONG
- Level 2, Round 4 (Retry): Called LEFT → CORRECT (Level Complete!)

**Wool Wallet Display:**
```
FINAL CALL HISTORY
L1: LEFT X, RIGHT X, LEFT ✓
L2: No Call, LEFT X, RIGHT X, LEFT ✓
L3: undefined
L4: undefined
L5: undefined
L6: undefined
```

---

### Example 3: Player Succeeds First Try

**Gameplay:**
- Level 3, Round 1: Called RIGHT → CORRECT (Level Complete!)

**Wool Wallet Display:**
```
FINAL CALL HISTORY
L1: LEFT X, RIGHT X, LEFT ✓
L2: No Call, LEFT X, RIGHT X, LEFT ✓
L3: RIGHT ✓
L4: undefined
L5: undefined
L6: undefined
```

---

### Example 4: Player in Progress (No Final Call Yet)

**Gameplay:**
- Currently playing Level 4, no final call made yet

**Wool Wallet Display:**
```
FINAL CALL HISTORY
L1: LEFT X, RIGHT X, LEFT ✓
L2: No Call, LEFT X, RIGHT X, LEFT ✓
L3: RIGHT ✓
L4: undefined
L5: undefined
L6: undefined
```

---

## Validation Checklist

### ✅ Correct or incorrect final call → displays CALL SIDE + ✓/X
- Correct: `LEFT ✓`, `RIGHT ✓`
- Incorrect: `LEFT X`, `RIGHT X`

### ✅ Skipped round → displays "No Call"
- When `data.hadBet = false`, records `{ side: null, correct: false }`
- Displays as `No Call`

### ✅ Multiple attempts → history shows all attempts in order
- All attempts stored in array, displayed comma-separated
- Example: `LEFT X, RIGHT X, LEFT ✓`

### ✅ Complete Level 1 → move to Level 2 → history of Level 1 remains
- Each level has separate array in `perLevelCallHistory`
- Level 1 history never deleted
- Level 2 gets new empty array

### ✅ Click TRY AGAIN → history is unchanged
- History only appended, never cleared
- TRY AGAIN adds new attempt to existing array

### ✅ Open wool wallet at any time → shows latest full history
- `updateFinalCallHistoryDisplay()` called every time wallet opens
- Reads current state from `perLevelCallHistory`
- Always shows up-to-date cumulative history

### ✅ If no final call made yet → displays "undefined"
- Empty arrays or non-existent levels return `'undefined'`
- Example: `L4: undefined` when Level 4 not started

---

## Technical Details

### localStorage Key
`'sheepMarket_perLevelCallHistory'`

### Data Persistence
- Saved immediately after each attempt
- Survives:
  - Level completions
  - Level retries
  - Page refreshes
  - Game sessions
  - Browser restarts

### Performance
- Minimal memory footprint (small arrays per level)
- O(1) write (append to array)
- O(n) read where n = number of attempts per level (typically 1-5)
- No cleanup needed (arrays stay small)

### Error Handling
- Try-catch on localStorage read (line 165-169)
- Graceful fallback to empty object `{}`
- Ensures level entry exists before writing (lines 7403-7405)

---

## Console Logging

For debugging, the system logs:
```
📝 Recorded final call attempt for Level 1: LEFT X
📝 Recorded final call attempt for Level 1: No Call
📝 Recorded final call attempt for Level 2: RIGHT ✓
```

---

## Summary

The per-level call history system:
- ✅ Tracks ALL final call attempts per level
- ✅ Records call side (LEFT/RIGHT) or No Call
- ✅ Records correctness (✓/X)
- ✅ Displays in wool wallet as `L#: SIDE MARK, SIDE MARK, ...`
- ✅ Shows "undefined" for levels with no attempts
- ✅ Persists across retries, levels, and sessions
- ✅ Updates live whenever wool wallet opens
- ✅ Never erases on TRY AGAIN
- ✅ Works for all levels and screen sizes

The system is production-ready and meets all requirements.
