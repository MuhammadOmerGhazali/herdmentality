# 🐑 WOOL WALLET REDESIGN — TWO-PHASE APPROACH

## PROJECT STATUS: PHASE 1 COMPLETE ✅

---

## OVERVIEW

This document outlines the complete redesign of the Wool Wallet display system using a **design-first, logic-later** approach. All existing statistics, calculations, and real-time update systems are **PRESERVED** and will be reconnected after design approval.

---

## 📋 PHASE 1: VISUAL DESIGN ONLY ✅ COMPLETE

### Purpose
Create a beautiful, game-ready sheep-themed UI **WITHOUT** any logic or data binding. This is pure visual design using placeholder labels.

### Deliverables
- ✅ New game-ready background panel (`wool-wallet-game-ui.webp`)
- ✅ Decorative icons (wool coins, level badges, graph panels)
- ✅ Complete UI layout with placeholder text
- ✅ Clear visual zones for all stats
- ✅ Professional sheep/pasture theme
- ✅ Zero logic attached

### Key Design Features

#### Visual Zones
1. **Hero Section** - Total Balance display with large numbers
2. **Left Panel** - Current level info (level, final call, result)
3. **Center Panels** - Performance chart + round stats
4. **Right Panel** - Final Call History grid (3x4 = 12 levels)
5. **Bottom Bar** - Efficiency, bonus wool, win streak metrics

#### Design Assets Generated
| Asset | Purpose | Dimensions |
|-------|---------|------------|
| `wool-wallet-game-ui.webp` | Main wooden panel background | 1344x768 (16:9) |
| `wool-coin-stack-icon.webp` | Currency icon | Square, transparent |
| `level-badge-icon.webp` | Level indicator | Square, transparent |
| `graph-paper-panel.webp` | Chart background | 4:3, transparent |

#### Style Direction
- Warm honey-oak wood texture
- Hand-painted lettering
- Decorative sheep icons
- Rope borders and dividers
- Pastel green grass accents
- Friendly cartoon art style
- Game-ready, not admin dashboard

### File Structure (Phase 1)
```
/scenes/WoolWalletRedesignPhase1.js  ← ACTIVE (placeholder design only)
/scenes/WoolWalletRedesign.js        ← PRESERVED (will be updated in Phase 2)
/scenes/HUDScene.js                  ← Imports Phase 1, all logic preserved
/scenes/BootScene.js                 ← Loads Phase 1 assets
```

### Current Implementation
```javascript
// HUDScene.js imports Phase 1 design
import { createWoolWalletDesignConcept } from './WoolWalletRedesignPhase1.js';

// All placeholder references stored for Phase 2
scene.woolWalletPlaceholders = {
    totalBalance,      // "### TOTAL W ###"
    allTimeGains,      // "▲ +###W"
    allTimeLosses,     // "▼ -###W"
    currentLevel,      // "LEVEL ##"
    finalCall,         // "## LEFT/RIGHT ##"
    result,            // "## STATUS ##"
    chartContainer,    // "[ CHART GOES HERE ]"
    woolSpent,         // "###W"
    profitLoss,        // "+###W"
    netWool,           // "+###W"
    efficiency,        // "##%"
    bonusWool,         // "+###W"
    winStreak          // "⭕ / ⭕ / ⭕ / ⭕"
};
```

### What Phase 1 Does NOT Include
❌ No stat calculations
❌ No data binding
❌ No real-time updates
❌ No logic from HUDScene
❌ No variable connections
❌ No chart rendering
❌ No color changes based on values

---

## 📋 PHASE 2: RECONNECT LOGIC (PENDING APPROVAL)

### Purpose
After design is approved, reconnect ALL existing Wool Wallet stats, calculations, and real-time update systems **WITHOUT CHANGING THEIR LOGIC**.

### Preserved Systems (Ready to Reconnect)

#### Stats & Calculations (HUDScene.js)
All these remain **UNTOUCHED** and fully functional:

1. **Total Balance Tracking**
   - `this.totalWool` - Running total
   - `this.allTimeGains` - Total gains across all levels
   - `this.allTimeLosses` - Total losses across all levels

2. **Per-Level Data**
   - `this.levelStates[1-12]` - Complete state per level
   - Final calls (LEFT/RIGHT/UNDETERMINED)
   - Outcomes (WIN/LOSS/IN PROGRESS)
   - Wool spent, won, lost per level
   - Correct/incorrect call counts

3. **Real-Time Updates**
   - `updateWalletForCallResolution()` - Updates on each sheep resolution
   - `updateStatsModal()` - Refreshes display
   - `populateStatsModalForLevelEnd()` - End-of-level summary
   - `updateBalanceHistoryGraph()` - Chart rendering

4. **Performance Metrics**
   - Call efficiency percentage
   - Win streak tracking
   - Bonus wool calculations
   - Net wool calculations
   - Level performance charts

5. **Final Call History**
   - 12-level grid tracking
   - Color coding (green=win, red=loss, gray=pending)
   - Sequential display per level

### Phase 2 Implementation Plan

#### Step 1: Update Visual Layout
Take approved Phase 1 design and convert placeholder labels to real variable references:

```javascript
// Example: Replace placeholder
const balancePlaceholder = scene.add.text(0, -500, '### TOTAL W ###', {...});

// With real data binding
scene.statLabels.totalBalance = scene.add.text(0, -500, '1,050W', {...});
```

#### Step 2: Create All Required Variables
Match every variable name expected by HUDScene update functions:

```javascript
scene.statLabels = {
    totalBalance,          // Main balance display
    allTimeGains,          // Total gains
    allTimeLosses,         // Total losses
    woolSpent,             // Spent this round
    unrealizedWool,        // Profit/loss
    netWool,               // Net calculation
    levelOutcome           // WIN/LOSS/IN PROGRESS
};

scene.currentLevelValue;              // "LEVEL 2"
scene.currentFinalCallValue;          // "LEFT" / "RIGHT" / "UNDETERMINED"
scene.correctCallsValue;              // Number display
scene.efficiencyValue;                // Percentage display
scene.efficiencyBarFill;              // Progress bar graphic
scene.bonusWoolValue;                 // Bonus display
scene.winStreakValue;                 // Streak icons
scene.incorrectCallsValue;            // Error count
scene.levelPerfContainer;             // Chart container
scene.finalCallHistoryContainers[1-12]; // History grid array
scene.levelCallLossesText;            // Error message text
```

#### Step 3: Add Compatibility References
For backward compatibility with existing HUDScene code:

```javascript
// Some update functions reference these alternate names
scene.statLabels.allTimeGainsRight = scene.statLabels.allTimeGains;
scene.statLabels.allTimeLossesRight = scene.statLabels.allTimeLosses;
scene.statLabels.netWoolRight = scene.statLabels.netWool;
scene.finalCallHistoryText = scene.finalCallHistoryLeftText; // Legacy reference
```

#### Step 4: Test All Update Paths
Verify these HUDScene functions work with new layout:

1. `updateWalletForCallResolution()` - Real-time sheep updates
2. `updateStatsModal()` - General refresh
3. `populateStatsModalForLevelEnd()` - Level completion
4. `updateBalanceHistoryGraph()` - Chart rendering
5. `calculateNetWool()` - Net calculations
6. `updateCallEfficiency()` - Efficiency updates
7. `updateWinStreak()` - Streak tracking

#### Step 5: Switch Imports
```javascript
// HUDScene.js - Phase 2
// import { createWoolWalletDesignConcept } from './WoolWalletRedesignPhase1.js';
import { createWoolWalletUI } from './WoolWalletRedesign.js';
```

### Testing Checklist (Phase 2)
- [ ] All stats display correct values on wallet open
- [ ] Stats update in real-time during gameplay
- [ ] End-of-level summary shows complete data
- [ ] All 12 levels display in history grid
- [ ] Charts render in correct position
- [ ] Efficiency bar fills properly
- [ ] Win streak updates correctly
- [ ] Color coding works (green/red/gold)
- [ ] No console errors
- [ ] Works across all 12 levels

---

## 🎯 CRITICAL CONSTRAINTS

### Non-Negotiable Rules
1. **ZERO logic changes** - All calculations must work exactly as before
2. **ZERO stat removal** - Every metric must be preserved
3. **ZERO simplification** - Full feature parity required
4. **All 12 levels** - Complete history must be visible
5. **Real-time updates** - Live updates during gameplay must work
6. **Backward compatibility** - Existing save data must load correctly

### What Can Change
✅ Visual layout and positioning
✅ Font sizes and styles
✅ Colors and styling
✅ Panel designs and backgrounds
✅ Icon additions
✅ Spacing and organization
✅ Animation styles

### What Cannot Change
❌ Stat calculations
❌ Data structures
❌ Update function logic
❌ Variable names used by HUDScene
❌ localStorage save format
❌ Level state tracking
❌ Real-time update hooks

---

## 📁 FILE REFERENCE

### Active Files (Phase 1)
- `/scenes/WoolWalletRedesignPhase1.js` - Visual design only
- `/scenes/HUDScene.js` - All logic preserved, imports Phase 1
- `/scenes/BootScene.js` - Loads Phase 1 assets

### Preserved Files (Phase 2 Ready)
- `/scenes/WoolWalletRedesign.js` - Will receive approved design + logic

### Assets
- `wool-wallet-game-ui.webp` (2fxc) - Main panel background
- `wool-coin-stack-icon.webp` (YIsd) - Currency icon
- `level-badge-icon.webp` (rsLx) - Level badge
- `graph-paper-panel.webp` (6frR) - Chart background

---

## 🚀 NEXT STEPS

### Immediate (Awaiting User Approval)
1. User reviews Phase 1 visual design
2. User provides feedback or approval
3. Designer makes any visual adjustments needed

### After Approval
1. Begin Phase 2 implementation
2. Reconnect all existing logic to approved design
3. Create all required variable references
4. Test all update paths
5. Verify backward compatibility
6. Deploy unified system

---

## 📝 DESIGN NOTES

### Visual Hierarchy
1. **Primary Focus**: Total Wool Balance (hero section, largest text)
2. **Secondary**: Current level info + Final Call History
3. **Tertiary**: Performance metrics and charts
4. **Supporting**: Efficiency, bonuses, streaks

### Color Coding (Phase 2)
- **Gold (#FFD700)**: Main balance, level numbers
- **Green (#2E7D32)**: Gains, wins, bonuses
- **Red (#C62828)**: Losses, errors
- **Brown (#8B4513)**: Labels, wood accents
- **Gray (#888888)**: Undetermined states
- **Yellow (#FCD535)**: In-progress status

### Responsive Scaling
- Container scaled to 0.5 for optimal mobile fit
- All font sizes designed for readability at scale
- Touch-friendly button sizes
- Clear spacing for tap targets

---

## 💬 COMMUNICATION PROTOCOL

### Phase 1 Complete Message
"✅ **PHASE 1 COMPLETE** - Visual design concept is ready for review. This is placeholder-only with no logic attached. All existing stats and systems are preserved and ready to reconnect in Phase 2."

### Awaiting Approval
"🎨 Please review the visual design. Let me know if you'd like any adjustments to layout, colors, sizing, or spacing before we proceed to Phase 2."

### Phase 2 Trigger
"✅ Design approved! Beginning Phase 2: Reconnecting all existing logic and data to the new visual layout."

---

**Document Version**: 1.0  
**Last Updated**: Phase 1 Implementation Complete  
**Status**: Awaiting Design Approval
