# 🎨 WOOL WALLET — PHASE 1 VISUAL DESIGN

## ✅ STATUS: DESIGN CONCEPT COMPLETE (AWAITING APPROVAL)

---

## WHAT YOU'RE SEEING

This is a **VISUAL DESIGN CONCEPT ONLY** with placeholder labels like:
- "### TOTAL W ###"
- "LEVEL ##"
- "## LEFT/RIGHT ##"
- "[ CHART GOES HERE ]"

**NO REAL DATA IS SHOWN YET** - This is intentional.

---

## DESIGN FEATURES

### 🎨 Visual Theme
- **Warm wooden panel** with hand-carved sheep decorations
- **Honey-oak texture** with visible wood grain
- **Rope borders** and wooden dividers
- **Cute sheep icons** scattered throughout
- **Pastel green grass** peeking at edges
- **Friendly cartoon style** - game-ready, not admin UI

### 📐 Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│                   🐑 WOOL WALLET 🐑                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              TOTAL WOOL BALANCE                         │
│                  ### TOTAL W ###                        │
│              ▲ +###W    ▼ -###W                        │
│                                                         │
├────────────┬──────────────────┬────────────────────────┤
│            │                  │                        │
│  CURRENT   │  📊 LEVEL        │   📜 FINAL CALL       │
│   LEVEL    │  PERFORMANCE     │      HISTORY          │
│            │                  │                        │
│  LEVEL ##  │  [ CHART GOES    │   L1  L2  L3  L4      │
│            │     HERE ]       │   ##  ##  ##  ##      │
│ Final Call │                  │                        │
│   ##       │ ───────────────  │   L5  L6  L7  L8      │
│            │                  │   ##  ##  ##  ##      │
│  Result    │  📈 ROUND STATS  │                        │
│   ##       │                  │   L9  L10 L11 L12     │
│            │  Wool Spent:###W │   ##  ##  ##  ##      │
│            │  Profit/Loss:+## │                        │
│            │                  │   NET WOOL: +###W     │
│            │                  │                        │
├────────────┴──────────────────┴────────────────────────┤
│                                                         │
│  🎯 CALL EFFICIENCY  ⭐ BONUS WOOL   🔥 WIN STREAK     │
│       ##%              +###W         ⭕⭕⭕⭕         │
│  [========>____]                                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 🎯 Information Zones

#### **Hero Section** (Top Center)
- Large total wool balance display
- Gains and losses side-by-side
- Gold coin icon decoration

#### **Left Panel** (Current Level Info)
- Level badge icon
- Current level number
- Final call (LEFT/RIGHT/UNDETERMINED)
- Result (WIN/LOSS/IN PROGRESS)

#### **Center Panels** (Charts & Stats)
- **Top**: Level performance chart area
- **Bottom**: Round statistics (wool spent, profit/loss)

#### **Right Panel** (History Grid)
- 3 rows × 4 columns = 12 levels
- Each cell shows level and call
- Net wool summary below grid

#### **Bottom Bar** (Performance Metrics)
- Call efficiency with progress bar
- Bonus wool earned
- Win streak with emoji indicators

---

## 📊 STATS PRESERVED (READY FOR PHASE 2)

All of these exist in HUDScene.js and will be reconnected:

### Balance & Currency
- ✅ Total Wool Balance
- ✅ All-Time Gains
- ✅ All-Time Losses
- ✅ Wool Spent (current round)
- ✅ Profit/Loss (unrealized)
- ✅ Net Wool

### Level Information
- ✅ Current Level Number (1-12)
- ✅ Final Call (LEFT/RIGHT/UNDETERMINED)
- ✅ Level Outcome (WIN/LOSS/IN PROGRESS)
- ✅ Correct Calls Count
- ✅ Incorrect Calls Count

### Performance Metrics
- ✅ Call Efficiency Percentage
- ✅ Efficiency Progress Bar
- ✅ Bonus Wool Earned
- ✅ Win Streak Display
- ✅ Level Performance Chart

### History Tracking
- ✅ Final Call History (12 levels)
- ✅ Color Coding (green=win, red=loss, gray=pending)
- ✅ Per-Level Earnings/Losses

### Real-Time Updates
- ✅ Updates during gameplay
- ✅ Updates on sheep resolution
- ✅ Updates on level completion
- ✅ Chart re-rendering
- ✅ Balance recalculations

---

## 🎨 DESIGN ASSETS GENERATED

| Asset | Description | Usage |
|-------|-------------|-------|
| **wool-wallet-game-ui.webp** | Main wooden panel with sheep decorations | Background layer |
| **wool-coin-stack-icon.webp** | Golden wool coins stack | Hero section decoration |
| **level-badge-icon.webp** | Wooden medallion with sheep head | Current level indicator |
| **graph-paper-panel.webp** | Aged parchment with grid lines | Chart background panel |

All assets use transparent backgrounds where appropriate and follow the warm, friendly sheep-farm aesthetic.

---

## 🚫 WHAT IS NOT INCLUDED (INTENTIONAL)

Phase 1 Design **DOES NOT INCLUDE**:
- ❌ Real stat values (using "###" placeholders)
- ❌ Data binding to HUDScene variables
- ❌ Calculation logic
- ❌ Real-time update hooks
- ❌ Color changes based on win/loss
- ❌ Chart rendering logic
- ❌ Variable connections

**This is by design.** We're reviewing the **LOOK** first, logic comes in Phase 2.

---

## 📝 PLACEHOLDER LABELS USED

These placeholders clearly show where real data will go:

```javascript
'### TOTAL W ###'        → Will become "1,050W"
'▲ +###W'               → Will become "+300W"
'▼ -###W'               → Will become "-200W"
'LEVEL ##'              → Will become "LEVEL 2"
'## LEFT/RIGHT ##'      → Will become "LEFT" or "RIGHT"
'## STATUS ##'          → Will become "WIN" or "IN PROGRESS"
'[ CHART GOES HERE ]'   → Will become performance chart
'###W'                  → Will become actual wool amounts
'+###W'                 → Will become profit values
'##%'                   → Will become efficiency percentage
'⭕ / ⭕ / ⭕ / ⭕'      → Will become O / X / O / X
'##'                    → Will become "LW" (Left Win), etc.
```

---

## 🔄 NEXT STEPS

### YOU (Review Phase)
1. Open the Wool Wallet in-game
2. Review the visual layout and design
3. Check spacing, sizing, and organization
4. Evaluate the sheep/pasture theme
5. Provide feedback or approval

### WE (Implementation Phase)
After your approval:
1. Take this exact visual design
2. Replace all "###" placeholders with real variables
3. Connect to existing HUDScene logic
4. Wire up all real-time updates
5. Test across all 12 levels
6. Verify calculations work identically
7. Deploy unified system

---

## 💬 APPROVAL CHECKLIST

Before moving to Phase 2, please confirm:

- [ ] **Visual style** looks good (wood, sheep, colors)
- [ ] **Layout structure** makes sense (zones are clear)
- [ ] **Information hierarchy** is appropriate (important stats prominent)
- [ ] **Spacing and sizing** feels balanced
- [ ] **Font sizes** look readable (considering 0.5 scale)
- [ ] **Icon placements** are appealing
- [ ] **Overall polish** feels game-ready

### Feedback Welcome:
- "Make the title bigger/smaller"
- "Move the history grid to the left"
- "Change the wood color to darker/lighter"
- "Add more sheep decorations"
- "Increase spacing between sections"
- "Different font for headers"
- Etc.

---

## 🎯 DESIGN PHILOSOPHY

### What We're Going For:
✅ **Game-like** - Looks like a reward screen from a finished game
✅ **Sheep-themed** - Warm, pastoral, friendly vibes
✅ **Readable** - Clear hierarchy, generous spacing
✅ **Polished** - Decorative but not cluttered
✅ **Mobile-friendly** - Large touch targets, scaled appropriately

### What We're Avoiding:
❌ Admin dashboard look
❌ Plain text boxes
❌ Cluttered information overload
❌ Boring spreadsheet layout
❌ Generic UI panels

---

## 📸 HOW TO VIEW

1. **Launch the game** (Herd Mentality)
2. **Click the Wool Wallet button** (top-right, sheep icon)
3. **Observe the design** - Remember, placeholders only!
4. **Check console** - Should see: "✅ Phase 1 Design Loaded - Visual concept only, no logic attached"

---

## ⚠️ IMPORTANT NOTES

- **This is not broken** - Placeholder text like "###" is intentional
- **Don't test logic yet** - Stats won't update because logic isn't connected
- **Focus on visuals** - Evaluate layout, colors, spacing, style
- **All logic is safe** - Every stat and calculation is preserved in HUDScene.js
- **Quick to adjust** - Visual tweaks are fast, just need your direction

---

## 🎨 CUSTOMIZATION OPTIONS

If you'd like changes, we can easily adjust:

### Colors
- Wood tone (lighter/darker)
- Text colors
- Panel backgrounds
- Border colors

### Layout
- Section positions
- Grid arrangements
- Panel sizes
- Spacing amounts

### Style
- Font sizes
- Font weights
- Icon sizes
- Decoration density

### Content
- Add more sheep icons
- Change emoji choices
- Adjust label text
- Modify headers

---

**Ready for your feedback!** 🐑

Once you approve the visual design, we'll proceed to Phase 2 where all the real data and logic gets connected to this beautiful new layout.
