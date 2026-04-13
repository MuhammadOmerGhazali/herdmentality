# Wool Wallet Text Color and All-Time Stats Removal

## Changes Made

### 1. Changed All Text to White with Black Borders

Updated all text elements in the wool wallet to use white (#FFFFFF) fill with black stroke for consistent, clean appearance:

#### Wool Balance (Top Section)
- **Before**: Gold (#FFD700)
- **After**: White (#FFFFFF)
- Stroke: Black (#000000), 6px thickness

#### Level Indicator
- **Before**: Orange (#FFA500)
- **After**: White (#FFFFFF)
- Stroke: Black (#000000), 6px thickness

#### Current Level Stats Labels
Changed all label text from cream (#FFF8DC) to white:
- WOOL SPENT
- WOOL GAINS
- WOOL LOSSES
- OUTCOME
- BONUSES

#### Current Level Stats Values
Changed all value text to white:
- **Before**: Various colors (Gold #FFD700, Green #44FF44, Red #FF4444)
- **After**: All white (#FFFFFF)
- Stroke: Black (#000000), 4px thickness

#### Call Breakdown Title
- **Before**: Orange (#FFA500)
- **After**: White (#FFFFFF)
- Stroke: Black (#000000), 5px thickness

### 2. Removed All-Time Stats Section

Completely removed the "ALL-TIME STATS" section from the wool wallet, including:

#### Removed UI Elements
- Section title: "ALL-TIME STATS"
- Divider line above the section
- GAINS label and value
- LOSSES label and value
- TOTAL SPENT (CALLS) label and value
- NET PROFIT label and value
- BEST CALL label and value
- Balance history graph container
- Right column sync values (allTimeGainsRight, allTimeLossesRight, netWoolRight)

#### Removed Code References
Cleaned up all references to removed stats in:
- `createStatsModal()` - Removed UI creation (~100 lines)
- `populateStatsModalForLevelEnd()` - Removed stat population
- `populateStatsModalForInProgress()` - Removed stat updates
- `executeLevel1Reset()` - Removed stat label resets
- Real-time update handlers - Removed totalSpentCalls and netWool updates

#### Preserved Tracking Variables
The following variables are still tracked in memory for potential future use:
- `this.lifetimeGains`
- `this.lifetimeLosses`
- `this.lifetimeSpentCalls`
- `this.lifetimeBestCall`

These are still saved to localStorage but no longer displayed in the UI.

### 3. Simplified Wool Wallet Structure

The wool wallet now contains only:
1. **Wool Balance** (top, white text)
2. **Gold divider line** (8px thick)
3. **Level indicator** (white text)
4. **Current level stats**:
   - Wool Spent
   - Wool Gains
   - Wool Losses
   - Outcome
   - Bonuses
5. **Call Breakdown** (scrollable list)
6. **Action buttons** (Continue/Try Again/Next Level/Restart Game)

## Visual Impact

### Before
- Mixed colors: Gold, orange, cream, green, red
- Two sections: Current Level + All-Time Stats
- Busy, information-heavy layout
- ~10 stat rows total

### After
- Unified white text with black borders
- Single section: Current Level only
- Clean, focused layout
- ~5 stat rows total
- More breathing room
- Easier to read

## Files Modified

1. **scenes/HUDScene.js**
   - Updated text colors in `createStatsModal()` (lines ~10047-10117)
   - Removed all-time stats section creation (~100 lines removed around line 10175)
   - Removed all-time stats population in `populateStatsModalForLevelEnd()` (lines ~11000-11030)
   - Removed all-time stats updates in `populateStatsModalForInProgress()` (lines ~11280-11310)
   - Removed stat label resets in `executeLevel1Reset()` (lines ~696-701)
   - Removed real-time stat updates (lines ~486-494)

## Benefits

1. **Cleaner UI** - Less visual clutter, easier to scan
2. **Consistent Design** - All text uses same white color scheme
3. **Better Readability** - White on brown leather with black borders is high contrast
4. **Focused Information** - Shows only current level performance
5. **Faster Rendering** - Fewer elements to update and display
6. **Simpler Code** - Removed ~200 lines of stat management code

## Backward Compatibility

- All tracking variables still exist and are saved
- No localStorage keys were removed
- Stats can be re-added in future if needed
- Existing save data remains valid
