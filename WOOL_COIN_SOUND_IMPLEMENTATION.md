# Wool Coin Sound Implementation

## Overview
Added satisfying coin sound effects when wool is spent, creating better audio feedback for player actions.

## Implementation

### 1. Sound Asset
- Added `coins.mp3` to asset loading in `BootScene.js`
- Sound key: `'coin'`

### 2. Core Function
Created `playWoolSpendSound(amount)` in `GameScene.js`:
- Plays 1-5 coin sounds based on wool amount spent
- Each coin has random pitch variation (0.8-1.2x)
- 50ms delay between coins for cascading effect
- Volume decreases slightly for each coin (0.4 to 0.15)
- Respects audio mute settings

### 3. Integration Points
Coin sound now plays when wool is spent for:

1. **Placing Calls** (`handleBuyOrder`) - Main betting mechanic
2. **Rally Ability** (`handleRally`) - Shepherd's whistle ability
3. **Dog Ability** (`handleDog`) - Sheepdog herding
4. **Lawn Mower** (`handleLawnMower`) - Grass clearing ability
5. **Grass Placement** (`placeGrass`) - Strategic grass placement
6. **Grass Eating** (HUDScene) - When sheep eat grass for wool

## Audio Design
- Small purchases (5-10W): 1-2 coins
- Medium purchases (20-30W): 2-3 coins
- Large purchases (40W+): 3-5 coins
- Random pitch creates natural, non-repetitive sound
- Volume fade prevents audio clutter

## Result
Every wool transaction now has satisfying audio feedback, reinforcing the game's economy and making spending feel rewarding.
