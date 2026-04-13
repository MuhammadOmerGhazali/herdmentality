# Wolf Fleeing from Dog - Implementation Complete

## Summary
Wolves now respond to being chased by the herding dog by running away faster and ignoring all sheep and bones.

## Wolf Behavior Changes

### Priority System (in order)
1. **HIGHEST PRIORITY: Flee from Dog** (NEW)
   - Overrides all other behaviors
   - Wolves detect when dog is actively chasing them
   - Run away at 300 px/s (vs normal 180 px/s hunting speed)
   - Face away from dog while fleeing
   
2. Eating Bone (if not being chased)
3. Chasing Bones (if available)
4. Hunting Sheep (default)
5. Exiting/Leaving (timed out)

### Dog Detection
- Wolf checks if `scene.activeDogHerding.chasingWolf` is true
- Wolf checks if `scene.activeDogHerding.targetWolf === this` (is dog targeting ME?)
- Runs immediately when detected - no delay

### Fleeing Behavior
**Speed:**
- Normal hunting: 180 px/s
- Fleeing from dog: 300 px/s (66% faster)

**Movement:**
- Calculates flee angle (directly away from dog)
- Uses physics velocity for smooth, fast movement
- Updates facing direction to match flee direction

**Interruptions:**
- Stops eating bone immediately if caught mid-meal
- Cleans up eating effects (particles, sounds, emotes)
- Ignores all placed bones while fleeing
- Ignores all sheep while fleeing

### Visual Feedback
**Flee Emote:**
- 💨 emoji appears above wolf when fleeing
- Pulses alpha (1.0 to 0.5) for visibility
- Follows wolf position during chase
- Auto-removed when dog stops chasing

**Animation:**
- Wolf faces away from dog (direction of flight)
- Normal sprite facing logic applies (flipX based on velocity)

### State Management
**New Wolf Properties:**
- `this.isFleeing` - Boolean flag tracking flee state
- `this.fleeEmote` - Reference to visual emote object

**State Cleanup:**
- Flee state automatically cleared when dog stops chasing
- Emote destroyed and tweens killed
- Wolf returns to normal behavior (bone/sheep hunting)

## Integration with Dog System

### Dog Chasing Flow
1. Dog detects wolf presence
2. Dog sets `activeDogHerding.chasingWolf = true`
3. Dog sets `activeDogHerding.targetWolf = wolfObject`
4. **Wolf detects this state and flees** ← NEW
5. Dog pursues at 400 px/s, wolf flees at 300 px/s
6. Wolf eventually exits pasture or timer expires
7. Dog resumes herding

### Speed Dynamics
- Dog chasing speed: 400 px/s
- Wolf fleeing speed: 300 px/s
- Dog gradually catches up, encouraging wolf to leave
- Wolf's head start usually allows escape
- Creates dynamic chase sequences

## Console Logging
- "🐺 Wolf interrupted by dog - fleeing!" when eating interrupted
- Existing wolf behavior logs maintained

## Code Changes

### Wolf.js
**Lines 52-123:** New dog detection and fleeing logic
- Check for active dog herding
- Check if this wolf is the target
- Calculate and apply flee velocity
- Interrupt bone eating if necessary
- Show/update flee emote
- Handle state cleanup

**Behavior Flow:**
```
update() {
  1. Check if dog is chasing ME
     → YES: Flee at high speed, skip everything else
     → NO: Continue to step 2
  
  2. Am I eating a bone?
     → YES: Continue eating, skip everything else
     → NO: Continue to step 3
  
  3. Are there bones nearby?
     → YES: Move toward bone
     → NO: Continue to step 4
  
  4. Are there sheep nearby?
     → YES: Hunt sheep
     → NO: Idle/exit
}
```

## Level 9 Integration
Works seamlessly with new Level 9 two-wolf system:
- First wolf (from LEFT) flees when chased
- Second wolf (from RIGHT) flees when chased
- Dog can only chase one wolf at a time
- Other wolf continues hunting until dog switches targets

## Testing Notes
- Wolf immediately responds to dog chase state
- Smooth transition from hunting → fleeing
- Clean transition from fleeing → hunting when dog leaves
- Emote follows wolf accurately
- No visual glitches or stuck states
- Works across all levels 7-12

## No Breaking Changes
✅ Normal wolf hunting behavior unchanged
✅ Bone distraction still works when dog isn't present
✅ Sheep panic/flee from wolves still works
✅ Wolf spawn/despawn timing unchanged
✅ Wolf catch effects still trigger
✅ All existing systems functional
