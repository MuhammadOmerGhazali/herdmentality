# 👀 WHAT YOU'RE LOOKING AT — VISUAL GUIDE

## 🎯 THIS IS A DESIGN CONCEPT WITH PLACEHOLDER LABELS

When you open the Wool Wallet, you'll see **placeholder text** instead of real numbers. **This is intentional.** We're reviewing the **LOOK** first, then connecting the data in Phase 2.

---

## 🔍 PLACEHOLDER LEGEND

### What You See → What It Means

#### **"### TOTAL W ###"**
→ Will become your actual total wool balance (e.g., "1,050W")
→ This is the biggest number, hero display

#### **"▲ +###W"** and **"▼ -###W"**
→ Will become your all-time gains and losses (e.g., "+300W" and "-200W")
→ Green for gains, red for losses

#### **"LEVEL ##"**
→ Will become current level number (e.g., "LEVEL 2")
→ Shows which level's stats you're viewing

#### **"## LEFT/RIGHT ##"**
→ Will become your final call for this level (e.g., "LEFT" or "RIGHT")
→ Or "UNDETERMINED" if you haven't locked it in yet

#### **"## STATUS ##"**
→ Will become level outcome (e.g., "WIN", "LOSS", or "IN PROGRESS")
→ Color-coded: green=win, red=loss, yellow=in progress

#### **"[ CHART GOES HERE ]"**
→ Will become the level performance chart
→ Shows your earnings/losses across sheep in that level

#### **"###W"** (various locations)
→ Will become actual wool amounts:
  - Wool Spent (how much you bet)
  - Profit/Loss (how much you won/lost)
  - Net Wool (your net for that level)

#### **"##%"**
→ Will become your call efficiency percentage (e.g., "80%")
→ Shows how often your calls are correct

#### **"+###W"** (bottom section)
→ Will become bonus wool earned (e.g., "+50W")
→ Extra rewards from perfect rounds, streaks, etc.

#### **"⭕ / ⭕ / ⭕ / ⭕"**
→ Will become win streak indicators (e.g., "O / X / O / X")
→ O = win, X = loss in last 4 levels

#### **"##"** (in history grid)
→ Will become level call abbreviations:
  - "LW" = Left Win
  - "LL" = Left Loss
  - "RW" = Right Win
  - "RL" = Right Loss
  - "--" = Not played yet
→ Color-coded: green=win, red=loss

---

## 📐 LAYOUT WALKTHROUGH

### TOP SECTION
```
🐑 WOOL WALLET 🐑
```
**What it is**: Title banner with sheep decorations  
**What to evaluate**: Title size, sheep placement, banner style

---

### HERO SECTION (Large Center Display)
```
TOTAL WOOL BALANCE
### TOTAL W ###
▲ +###W    ▼ -###W
```
**What it is**: Your main balance at a glance  
**What to evaluate**: Number size (should be largest), visibility, coin icon placement  
**In Phase 2**: Shows your actual total, gains, and losses

---

### LEFT PANEL (Current Level Info)
```
[Badge Icon]
CURRENT LEVEL
LEVEL ##

Final Call
## LEFT/RIGHT ##

Result
## STATUS ##
```
**What it is**: Information about the level you're currently viewing  
**What to evaluate**: Panel size, vertical spacing, badge icon look  
**In Phase 2**: Shows actual level number, your call, and outcome

---

### CENTER LEFT (Performance Chart)
```
📊 LEVEL PERFORMANCE
[ CHART GOES HERE ]
```
**What it is**: Area chart showing your wool changes across sheep  
**What to evaluate**: Chart area size, parchment background  
**In Phase 2**: Renders actual performance graph

---

### CENTER BOTTOM (Round Stats)
```
📈 ROUND STATS
Wool Spent: ###W
Profit/Loss: +###W
```
**What it is**: Financial summary for current level  
**What to evaluate**: Spacing, label clarity  
**In Phase 2**: Shows actual amounts spent and won/lost

---

### RIGHT PANEL (History Grid)
```
📜 FINAL CALL HISTORY

L1  L2  L3  L4
##  ##  ##  ##

L5  L6  L7  L8
##  ##  ##  ##

L9  L10 L11 L12
##  ##  ##  ##

NET WOOL: +###W
```
**What it is**: Grid showing your calls across all 12 levels  
**What to evaluate**: Grid spacing, cell size, readability  
**In Phase 2**: Shows actual calls with color coding (LW, RW, LL, RL)

---

### BOTTOM BAR (Performance Metrics)
```
🎯 CALL EFFICIENCY    ⭐ BONUS WOOL    🔥 WIN STREAK
      ##%                +###W          ⭕⭕⭕⭕
[========>____]
```
**What it is**: Overall performance indicators  
**What to evaluate**: Horizontal spacing, bar visibility  
**In Phase 2**: Shows actual efficiency %, bonus amounts, streak pattern

---

## 🎨 WHAT TO EVALUATE

### Visual Appeal
- [ ] Does it look like a finished game reward screen?
- [ ] Is the sheep/pasture theme appealing?
- [ ] Are the wood textures and decorations nice?
- [ ] Do the colors feel warm and inviting?

### Layout & Organization
- [ ] Are the sections clearly defined?
- [ ] Is information easy to locate?
- [ ] Does spacing feel comfortable (not cramped)?
- [ ] Is the visual hierarchy clear (important = bigger)?

### Readability
- [ ] Are fonts large enough at this scale?
- [ ] Are labels clear and understandable?
- [ ] Is text properly aligned?
- [ ] Are placeholder "###" symbols obvious?

### Mobile Friendliness
- [ ] Are panels touch-friendly sized?
- [ ] Is everything visible without scrolling?
- [ ] Are buttons/areas large enough to tap?

### Professional Polish
- [ ] Does it look production-ready?
- [ ] Are borders and panels clean?
- [ ] Are decorations tasteful (not overwhelming)?
- [ ] Does it match the game's overall style?

---

## ⚠️ WHAT NOT TO EVALUATE YET

### Don't Worry About These (Phase 2 Items):
- ❌ "Stats don't show real numbers" → Intentional, placeholders only
- ❌ "Data doesn't update" → No logic connected yet
- ❌ "Chart is empty" → Will render in Phase 2
- ❌ "History shows ##" → Will show actual calls in Phase 2
- ❌ "Can't test calculations" → Math reconnects in Phase 2

---

## 🗣️ HOW TO PROVIDE FEEDBACK

### Good Feedback Examples

**Approve**:
- ✅ "Looks great! Proceed to Phase 2"
- ✅ "Design is good, connect the logic"
- ✅ "This works, move forward"

**Request Size Adjustments**:
- ✅ "Make the total balance number 30% bigger"
- ✅ "Increase spacing between bottom metrics"
- ✅ "History grid cells feel cramped, expand them"

**Request Position Changes**:
- ✅ "Move the history grid to the left side"
- ✅ "Swap positions of chart and stats panels"
- ✅ "Center the title more"

**Request Style Changes**:
- ✅ "Make the wood darker/lighter"
- ✅ "Change panel backgrounds to more transparent"
- ✅ "Add more sheep decorations at corners"
- ✅ "Use different font for headers"

**Request Color Changes**:
- ✅ "Make the gold color more vibrant"
- ✅ "Change brown borders to darker shade"
- ✅ "Adjust panel transparency"

### Avoid These (Too Vague)
- ❌ "Make it better"
- ❌ "Fix the numbers" (they're intentionally placeholders)
- ❌ "It's broken" (it's a design concept, not final)
- ❌ "Make it prettier" (be specific about what)

---

## 🎯 APPROVAL CHECKLIST

Before approving, confirm you're happy with:

- [ ] **Overall visual style** (sheep theme, wood panels)
- [ ] **Layout structure** (sections, zones, organization)
- [ ] **Font sizes** (large enough, hierarchy clear)
- [ ] **Spacing** (comfortable, not cramped)
- [ ] **Colors** (warm, appropriate, readable)
- [ ] **Decorations** (sheep icons, borders, backgrounds)
- [ ] **Professional appearance** (game-ready polish)
- [ ] **Placeholder clarity** (obvious these are temp labels)

---

## 🚀 WHAT HAPPENS NEXT

### If You Approve
1. We take this exact design
2. Replace every "###" with real variable references
3. Connect to all the preserved stat tracking in HUDScene
4. Wire up real-time updates
5. Test across all 12 levels
6. Deploy unified system

**Estimated time**: 30-45 minutes for Phase 2

### If You Request Changes
1. We adjust the specific elements you mention
2. You review the updated design
3. We iterate until you're happy
4. Then proceed to Phase 2

**Estimated time**: 5-15 minutes per adjustment

---

## 💡 HELPFUL CONTEXT

### Why Placeholders?
- Makes it obvious this is design review phase
- No confusion about broken stats (they're not connected yet)
- Easy to see if layout works before committing to integration
- Fast to adjust visuals without touching complex logic

### Why Two Phases?
- Separates design decisions from technical integration
- Prevents mixing "I don't like the layout" with "stats aren't updating"
- Allows fast visual iterations without breaking anything
- Ensures we get the look right before the complex work

### What's Protected?
- All 18 stat calculations (untouched)
- All real-time update functions (preserved)
- All level state tracking (intact)
- All data structures (unchanged)
- All chart rendering logic (ready)

**Nothing is lost or broken. Everything is ready to reconnect.**

---

## 📝 QUICK REFERENCE CARD

| Placeholder | Real Data Example | Location |
|-------------|-------------------|----------|
| ### TOTAL W ### | 1,050W | Hero section (center top) |
| ▲ +###W | +300W | Below hero (left) |
| ▼ -###W | -200W | Below hero (right) |
| LEVEL ## | LEVEL 2 | Left panel top |
| ## LEFT/RIGHT ## | LEFT | Left panel middle |
| ## STATUS ## | WIN | Left panel bottom |
| [ CHART GOES HERE ] | Line graph | Center left panel |
| Wool Spent: ###W | Wool Spent: 50W | Center bottom |
| Profit/Loss: +###W | Profit/Loss: +20W | Center bottom |
| L1-L12: ## | LW, RW, LL, RL | Right grid |
| NET WOOL: +###W | NET WOOL: +150W | Below right grid |
| ##% | 75% | Bottom left |
| [Progress bar] | Filled to 75% | Below efficiency |
| +###W (bonus) | +25W | Bottom center |
| ⭕⭕⭕⭕ | O/X/O/X | Bottom right |

---

## 🎉 YOU'RE READY!

**Open the game → Click Wool Wallet → Review the design!**

Remember:
- This is a visual concept with placeholders
- Focus on layout, style, and aesthetics
- Real data connects in Phase 2 after approval
- All your existing stats are safe and preserved

**We're excited to hear your feedback!** 🐑
