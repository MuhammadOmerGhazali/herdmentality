# Dynamic Audio Balancing System - Quick Reference

## Overview
Herd Mentality uses an intelligent audio balancing system that automatically adjusts volumes in real-time to ensure all sounds are properly balanced relative to each other. No manual volume tweaking needed!

## Categories (Priority Order)

| Category | Priority | Ducking Level | Use For |
|----------|----------|---------------|---------|
| `CRITICAL_ALERT` | 100 | 40% | Wolves, Final Call alerts, Game-critical sounds |
| `IMPORTANT_SFX` | 80 | 60% | Sheep bleats, Call sounds, Gameplay-important SFX |
| `STANDARD_SFX` | 60 | 80% | UI sounds, Coins, Trades, Button clicks |
| `AMBIENT_SFX` | 40 | 90% | Rain, Farm ambience, Background sounds |
| `MUSIC` | 20 | 100% | Background music tracks |

**Ducking Level**: When a sound in this category plays, lower-priority sounds drop to this percentage.

## How It Works

### Automatic Behavior
1. When a **wolf howls** (CRITICAL_ALERT):
   - Music drops to 40% volume
   - All other sounds duck appropriately
   - Music restores after 2 seconds

2. When a **sheep bleats** (IMPORTANT_SFX):
   - Music drops to 60% volume
   - Ambient sounds duck to 60%
   - Restores after 1.5 seconds

3. When **multiple sounds overlap**:
   - System tracks all active sounds
   - Applies ducking based on highest priority
   - Smooth transitions (100-200ms)

## Adding New Sounds

### Step 1: Create Your Sound
```javascript
// Tone.js synth
const mySynth = new Tone.Synth().toDestination();

// OR HTML5 Audio
const myAudio = new Audio('url-to-sound.wav');
myAudio.volume = 0.7;
```

### Step 2: Register the Sound
```javascript
audioManager.registerSound(
  'soundName',           // Unique identifier
  mySynth,               // Your audio object
  'IMPORTANT_SFX',       // Category (see table above)
  -10,                   // Base volume (dB for Tone.js, 0-1 for HTML5)
  false                  // isHTML5 (true for HTML5 Audio, false for Tone.js)
);
```

### Step 3: Play with Balancing
```javascript
audioManager.playBalanced('soundName', () => {
  // Your play logic here
  mySynth.triggerAttackRelease('C4', '0.5');
}, 1.5); // Duration in seconds
```

## Real-World Examples

### Example 1: Golden Sheep Alert
```javascript
// In audioManager constructor or initialization:
this.goldenSheepSynth = new Tone.Synth({
  oscillator: { type: 'triangle' },
  envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.5 },
  volume: -8
}).toDestination();

this.registerSound('goldenSheep', this.goldenSheepSynth, 'CRITICAL_ALERT', -8);

// Later, when playing:
playGoldenSheepAlert() {
  if (this.isSoundMuted) return;
  this.playBalanced('goldenSheep', () => {
    this.goldenSheepSynth.triggerAttackRelease('E5', '0.3');
  }, 0.5);
}
```

### Example 2: New Background Music Track
```javascript
// In constructor:
this.level7Music = new Tone.Player({
  url: "https://your-music-url.mp3",
  loop: true,
  autostart: false,
  volume: -5
}).toDestination();

this.registerSound('level7Music', this.level7Music, 'MUSIC', -5);

// The music will automatically duck when higher priority sounds play!
```

### Example 3: UI Sound Effect
```javascript
// In constructor:
this.successChime = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'sine' },
  envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 },
  volume: -12
}).toDestination();

this.registerSound('successChime', this.successChime, 'STANDARD_SFX', -12);

// Play it:
playSuccess() {
  if (this.isSoundMuted) return;
  this.playBalanced('successChime', () => {
    this.successChime.triggerAttackRelease(['C5', 'E5', 'G5'], '16n');
  }, 0.3);
}
```

## Advanced Features

### Category Volume Control
Adjust all sounds in a category at once:
```javascript
// Reduce all music by 50%
audioManager.setCategoryVolume('MUSIC', 0.5);

// Make critical alerts louder
audioManager.setCategoryVolume('CRITICAL_ALERT', 1.2);
```

### Debug Audio State
Check what's happening with the audio system:
```javascript
audioManager.debugAudioState();
```

Output example:
```
🎵 ═══ AUDIO BALANCING STATE ═══
Active sounds: 2
Currently playing:
  • bleatAudio (IMPORTANT_SFX)
  • level3Music (MUSIC)

Category volumes:
  CRITICAL_ALERT: 100%
  IMPORTANT_SFX: 100%
  STANDARD_SFX: 100%
  AMBIENT_SFX: 100%
  MUSIC: 100%

Registered sounds:
  MUSIC:
    • aiMusic: -5 [Tone.js]
    • level2Music: -5 [Tone.js] (ducked to 60%)
  IMPORTANT_SFX:
    • bleatAudio: 0.6 [HTML5]
    • callAudio: 0.6 [HTML5]
═══════════════════════════════
```

## Best Practices

### ✅ DO
- Register all new sounds immediately after creating them
- Use appropriate categories based on importance
- Provide accurate duration estimates for proper ducking timing
- Test sounds with music and other effects playing

### ❌ DON'T
- Play sounds without registering them first (they'll work but won't balance)
- Use CRITICAL_ALERT for non-critical sounds (overuse reduces effectiveness)
- Manually adjust volumes after registering (use `setCategoryVolume` instead)
- Forget to specify duration in `playBalanced()` calls

## Volume Guidelines

### Tone.js (dB scale)
- **Quiet**: -15 to -12 dB (subtle UI clicks)
- **Normal**: -10 to -8 dB (standard SFX)
- **Moderate**: -5 to -3 dB (important sounds)
- **Loud**: 0 to +3 dB (critical alerts) - use sparingly!

### HTML5 Audio (0-1 scale)
- **Quiet**: 0.2 - 0.4
- **Normal**: 0.5 - 0.7
- **Loud**: 0.8 - 1.0

The balancing system will automatically adjust these based on what else is playing.

## Troubleshooting

### Sound too quiet?
1. Check if it's being ducked by higher priority sounds
2. Run `audioManager.debugAudioState()` to see ducking levels
3. Adjust base volume or category volume

### Sound too loud?
1. Lower the base volume when registering
2. Consider moving to a lower priority category
3. Use `setCategoryVolume()` to adjust the whole category

### Music not ducking?
1. Ensure sounds are registered with correct categories
2. Check that duration parameter is accurate
3. Verify mute states aren't interfering

## Public API Reference

### Core Methods

#### `registerSound(name, audioObject, category, baseVolume, isHTML5)`
Register a new sound for automatic balancing.

#### `unregisterSound(name)`
Remove a sound from the system and clean up.

#### `playBalanced(soundName, playCallback, duration)`
Play a registered sound with automatic ducking.

#### `setCategoryVolume(category, multiplier)`
Adjust volume for all sounds in a category (0-1 scale).

#### `getSoundInfo(name)`
Get detailed information about a specific sound.

#### `getAllSounds()`
Get array of all registered sounds, sorted by priority.

#### `debugAudioState()`
Print detailed system state to console.

## Console Access
For testing in browser console:
```javascript
// Quick test - plays sequence of sounds to demonstrate ducking
audioManager.testAudioBalancing();

// Register new sound on the fly
audioManager.registerSound('test', mySynth, 'STANDARD_SFX', -10);

// Get info about a sound
audioManager.getSoundInfo('wolfSynth');
// Returns: { name, category, baseVolume, currentDuck, effectiveVolume, isHTML5, isPlaying, priority }

// List all sounds
audioManager.getAllSounds();

// Check state
audioManager.debugAudioState();

// Adjust categories
audioManager.setCategoryVolume('MUSIC', 0.3);

// Unregister when done
audioManager.unregisterSound('test');
```

## Performance Notes

- **Lightweight**: Ducking calculations only run when sounds play
- **Efficient**: Smooth transitions use optimized ramp functions
- **No overhead**: Sounds not registered still work normally (just without balancing)
- **Memory safe**: Automatic cleanup of timeouts and references

## Migration for Existing Code

If you have existing sound calls that bypass the system:
```javascript
// OLD (still works, but no balancing)
this.mySynth.triggerAttackRelease('C4', '0.5');

// NEW (with balancing)
audioManager.playBalanced('mySynth', () => {
  this.mySynth.triggerAttackRelease('C4', '0.5');
}, 0.5);
```

The old code continues to work, but won't benefit from automatic balancing.

---

**Remember**: The system is designed to be automatic. Once sounds are registered with appropriate categories, balancing happens naturally without further intervention!
