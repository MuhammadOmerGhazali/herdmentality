# Progressive Difficulty System - Sheep Market

## Overview
The game implements a sophisticated progressive difficulty system that makes levels 1→12 increasingly challenging by **only modifying sheep behavior parameters**, without changing any other game mechanics, assets, or UI elements.

## Implementation

### Location
All difficulty parameters are defined in `/entities/Sheep.js` in the `getLevelBehaviorConfig()` method.

### Seven Behavioral Parameters

#### 1. **centeringStrength** (0.05 → 0.70)
- **What it does**: Controls how strongly sheep are pulled toward the center of the pasture
- **Effect**: Higher values create 50/50 uncertainty, making predictions harder
- **Progression**: 
  - L1: 0.05 (weak centering, clear trends)
  - L12: 0.70 (oppressive centering, impossible to predict)

#### 2. **cohesionMultiplier** (1.3 → 0.50)
- **What it does**: Controls how much sheep follow the flock
- **Effect**: Higher values = more predictable group movement
- **Progression**:
  - L1: 1.3 (strong flock unity)
  - L12: 0.50 (every sheep for themselves)

#### 3. **panicMultiplier** (0.6 → 2.0)
- **What it does**: Controls chaos escalation as timer runs down
- **Effect**: Higher values create more last-second reversals
- **Progression**:
  - L1: 0.6 (calm, steady)
  - L12: 2.0 (total chaos)

#### 4. **earlyCommitment** (0.7 → 0.10)
- **What it does**: When sheep start showing clear directional bias (as fraction of total time)
- **Effect**: Lower values = sheep commit later in the round
- **Progression**:
  - L1: 0.7 (commit at 42s mark - early clarity)
  - L12: 0.10 (commit at 6s mark - last-second guessing)

#### 5. **responseDelay** (0ms → 600ms) ⭐ NEW
- **What it does**: Milliseconds delay before sheep react to player calls/clicks
- **Effect**: Higher delays make sheep feel sluggish and unresponsive
- **Progression**:
  - L1: 0ms (instant response)
  - L3: 100ms (barely noticeable)
  - L6: 250ms (noticeable delay)
  - L9: 400ms (significant lag)
  - L12: 600ms (frustratingly slow)

#### 6. **ignoreChance** (0% → 28%) ⭐ NEW
- **What it does**: Probability that a sheep will ignore a player call
- **Effect**: Sheep show "rejection emote" and refuse to follow the call
- **Progression**:
  - L1-2: 0% (always obey)
  - L3: 5% (rarely ignore)
  - L6: 12% (occasionally stubborn)
  - L9: 20% (frequently stubborn)
  - L12: 28% (very disobedient)

#### 7. **movementSpeed** (1.0 → 0.72) ⭐ NEW
- **What it does**: Multiplier applied to base movement speed
- **Effect**: Lower values make sheep move more sluggishly
- **Progression**:
  - L1: 1.0 (full speed, energetic)
  - L3: 0.95 (slightly slower)
  - L6: 0.88 (noticeably slower)
  - L9: 0.80 (sluggish)
  - L12: 0.72 (painfully slow)

## Target Win Rates

The system is calibrated to achieve these first-time player win rates:

| Level | Target Win Rate | Difficulty Tier |
|-------|----------------|----------------|
| L1    | 85-90%        | Tutorial       |
| L2    | 70-75%        | Easy           |
| L3    | 55-60%        | Moderate       |
| L4    | 60-65%        | Moderate       |
| L5    | 50-55%        | Challenging    |
| L6    | 55-60%        | Challenging    |
| L7    | 40-45%        | Hard           |
| L8    | 35-40%        | Very Hard      |
| L9    | 30-35%        | Expert         |
| L10   | 25-30%        | Master         |
| L11   | 20-25%        | Legendary      |
| L12   | 10-15%        | Nearly Impossible |

## Observable Behaviors by Level Tier

### Early Levels (1-3): Predictable & Responsive
- Sheep respond instantly to clicks/calls
- Never ignore player commands
- Move at full speed
- Show clear directional trends early
- Strong flock cohesion
- Minimal late-game chaos

**Player Experience**: "I can read the herd easily"

### Mid Levels (4-8): Unpredictable & Hesitant
- Sheep have 150-350ms response delays
- 8-18% chance to ignore calls (show rejection emote)
- Move 12-18% slower
- Trends become apparent later in the round
- Weakening flock cohesion
- Increasing late-game reversals

**Player Experience**: "The herd is harder to read, and sheep don't always listen"

### Late Levels (9-12): Chaotic & Stubborn
- Sheep have 400-600ms response delays
- 20-28% chance to ignore calls
- Move 20-28% slower (sluggish)
- Directional commitment only in final seconds
- Every sheep moves independently
- Extreme late-game chaos and reversals

**Player Experience**: "The sheep are unruly! I can barely influence them!"

## Technical Implementation

### reactToMarket() Method
When sheep receive a player call (LEFT/RIGHT button):
1. Checks `ignoreChance` - if true, shows rejection emote and returns
2. Applies `responseDelay` - wraps velocity change in a delayed callback
3. If delay is 0ms, applies instantly (early levels)
4. Visual feedback shows delayed or rejected responses

### update() Method
During normal movement calculations:
1. Gets `levelConfig` at start of update cycle
2. Applies `movementSpeed` multiplier to `baseSpeed` calculation
3. All movement feels proportionally slower in later levels
4. Combines with other parameters for comprehensive difficulty

### Debug Logging
At round start, console logs show all parameters:
```
🐑 Level 12 Behavior Config:
   Centering=0.7, Cohesion=0.5
   Panic=2.0, Commitment=0.1
   Response Delay=600ms, Ignore Chance=28%
   Movement Speed=72%
```

## Design Philosophy

**"I misread the herd" NOT "The game cheated me"**

- All difficulty comes from observable sheep behavior changes
- No hidden RNG or artificial difficulty spikes
- Players can see and feel the progression:
  - Sheep get slower (visible movement)
  - Sheep ignore calls (rejection emotes)
  - Sheep respond late (delayed reactions)
  - Trends become unclear (visual chaos)

## What Remains Unchanged

✅ **No changes to:**
- Game assets (sprites, sounds, UI)
- Button mechanics (all abilities work identically)
- Wolf behavior (Level 8+)
- Dog behavior (Level 7+)
- Black Sheep behavior (Level 10+)
- Grass, Lawn Mower, Mud mechanics
- Weather effects (rain, wind, lightning)
- Victory conditions
- Wool economy

✅ **Only sheep predictability and responsiveness change**

## Testing & Validation

To verify progressive difficulty:
1. Play Level 1 → Notice instant response, fast movement, clear trends
2. Play Level 6 → Notice slight delays, occasional ignoring, slower movement
3. Play Level 12 → Notice significant delays, frequent ignoring, sluggish movement

The progression should feel **gradual and fair**, not sudden or unfair.

## Future Tuning

Parameters can be adjusted in `getLevelBehaviorConfig()` if win rates don't match targets during playtesting. All seven parameters work together to create the complete difficulty curve.
