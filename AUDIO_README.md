# 🎵 Herd Mentality - Audio System Documentation

## Quick Links

- **[Audio Balancing Guide](AUDIO_BALANCING_GUIDE.md)** - Complete developer guide with examples
- **[System Summary](AUDIO_SYSTEM_SUMMARY.md)** - Technical overview and implementation details
- **[audio.js](audio.js)** - Source code with full JSDoc documentation

## What is This?

Herd Mentality features a **Dynamic Audio Balancing System** that automatically manages all game audio in real-time. Music, sound effects, alerts, and ambience are continuously balanced to ensure:

- Important sounds are never drowned out
- Music doesn't overwhelm gameplay sounds
- Smooth, natural transitions between audio states
- Professional audio experience without manual tweaking

## For Players

You'll experience:
- ✨ Crisp, clear audio at all times
- 🎵 Background music that automatically adjusts during important moments
- 🐺 Critical alerts (like wolves!) that cut through naturally
- 🔊 Balanced sound across all game levels

## For Developers

### Quick Start

**Test the system:**
```javascript
// Open browser console and run:
audioManager.testAudioBalancing();
```

**Add a new sound in 3 steps:**
```javascript
// 1. Create audio object
const mySynth = new Tone.Synth().toDestination();

// 2. Register it
audioManager.registerSound('mySound', mySynth, 'STANDARD_SFX', -10);

// 3. Play with auto-balancing
audioManager.playBalanced('mySound', () => {
  mySynth.triggerAttackRelease('C4', '0.5');
}, 0.5);
```

That's it! The system handles all volume balancing automatically.

### Documentation Structure

```
📁 Audio Documentation
├── 📄 AUDIO_README.md (this file)
│   └── Overview and quick links
│
├── 📄 AUDIO_BALANCING_GUIDE.md
│   ├── How the system works
│   ├── Audio categories explained
│   ├── Step-by-step examples
│   ├── Best practices
│   └── Troubleshooting
│
├── 📄 AUDIO_SYSTEM_SUMMARY.md
│   ├── Implementation details
│   ├── Technical architecture
│   ├── Performance notes
│   └── Testing checklist
│
└── 📄 audio.js
    └── Full source code with JSDoc comments
```

## Audio Categories

The system organizes sounds into 5 priority levels:

| Category | Priority | Examples | Ducking |
|----------|----------|----------|---------|
| 🚨 **CRITICAL_ALERT** | 100 | Wolf howls, final call alerts | Ducks others to 40% |
| ⭐ **IMPORTANT_SFX** | 80 | Sheep bleats, call sounds | Ducks others to 60% |
| 🔊 **STANDARD_SFX** | 60 | Coins, clicks, trades | Ducks others to 80% |
| 🌿 **AMBIENT_SFX** | 40 | Rain, farm ambience | Ducks others to 90% |
| 🎵 **MUSIC** | 20 | Background music | Gets ducked most |

Higher priority sounds automatically reduce the volume of lower priority sounds.

## Key Features

### ✅ Automatic Ducking
When a wolf howls, music automatically drops to 40% volume, then smoothly restores after the howl ends.

### ✅ Real-Time Balancing
Multiple overlapping sounds are continuously managed. The system tracks all active audio and adjusts volumes in real-time.

### ✅ Future-Proof
New sounds added in future levels automatically integrate with the balancing system. No additional configuration needed.

### ✅ Debug Tools
```javascript
audioManager.debugAudioState();     // See what's playing
audioManager.getSoundInfo('name');  // Query specific sound
audioManager.getAllSounds();        // List everything
```

### ✅ Category Control
```javascript
// Reduce all music by 50%
audioManager.setCategoryVolume('MUSIC', 0.5);

// Make alerts louder
audioManager.setCategoryVolume('CRITICAL_ALERT', 1.2);
```

## Common Use Cases

### 🎮 Gameplay Sounds
```javascript
// Sheep bleat (important gameplay feedback)
audioManager.playBalanced('bleatAudio', () => {
  // Play logic here
}, 1.5);
```

### 🐺 Critical Alerts
```javascript
// Wolf appears (critical game event)
audioManager.playBalanced('wolfSynth', () => {
  this.wolfSynth.triggerAttackRelease('C2', '2n');
}, 2);
```

### 🪙 UI Feedback
```javascript
// Coin sound (standard UI)
audioManager.playBalanced('coinAudio', () => {
  this.coinAudio.play();
}, 0.5);
```

### 🎵 Music Management
```javascript
// Music tracks are automatically registered
// They duck when other sounds play - no extra code needed!
audioManager.switchToLevel2Music();
```

## Console Commands

Open your browser console in the game:

```javascript
// Test the balancing system
audioManager.testAudioBalancing();

// See current state
audioManager.debugAudioState();

// List all registered sounds
audioManager.getAllSounds();

// Check a specific sound
audioManager.getSoundInfo('wolfSynth');

// Experiment with category volumes
audioManager.setCategoryVolume('MUSIC', 0.3);
```

## Examples in Code

All existing game sounds use the system. Check `audio.js` for real implementations:

- `playWolfHowl()` - Critical alert example
- `playBaa()` - Important SFX example
- `playCoin()` - Standard SFX example
- `playFlock()` - Complex multi-sound example

## FAQ

**Q: Do I need to use this for every sound?**  
A: No! Old code still works. But sounds using the system get automatic balancing.

**Q: What if I forget to register a sound?**  
A: It will play normally, just without automatic volume balancing.

**Q: Can I adjust individual sounds?**  
A: Yes! Use `getSoundInfo()` to check current state, or adjust the entire category with `setCategoryVolume()`.

**Q: Does this affect performance?**  
A: Negligible impact. Calculations only run when sounds play, and they're highly optimized.

**Q: What about mobile?**  
A: Works perfectly on all platforms. The system handles both Tone.js and HTML5 Audio.

## Status

✅ **Fully Implemented**  
✅ **Production Ready**  
✅ **20+ Sounds Registered**  
✅ **Zero Breaking Changes**  
✅ **Complete Documentation**  

## Need Help?

1. **Read the Guide**: [AUDIO_BALANCING_GUIDE.md](AUDIO_BALANCING_GUIDE.md)
2. **Check Examples**: See existing implementations in `audio.js`
3. **Test Console**: Run `audioManager.testAudioBalancing()`
4. **Debug State**: Run `audioManager.debugAudioState()`

---

**The audio system is designed to be automatic. Register your sounds, and balancing happens naturally! 🎵**
