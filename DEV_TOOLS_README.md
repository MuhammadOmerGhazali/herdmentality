# 🛠️ Developer Tools - Complete Documentation

## Table of Contents

1. [Overview](#overview)
2. [Quick Access](#quick-access)
3. [Tools Available](#tools-available)
4. [Documentation Index](#documentation-index)
5. [For Complete Beginners](#for-complete-beginners)
6. [For Experienced Developers](#for-experienced-developers)
7. [Architecture](#architecture)
8. [Future-Proofing](#future-proofing)

---

## Overview

Herd Mentality includes a comprehensive suite of developer tools designed to be:

- **🎯 Accessible** - One-click access from in-game
- **👶 Beginner-Friendly** - Clear labels, no jargon
- **🔒 Safe** - Can't affect live gameplay
- **📚 Well-Documented** - Multiple guides at different levels
- **🔮 Future-Proof** - Automatically integrates new features

### What's Included

```
Developer Tools Suite
├── 🎮 Sandbox Mode - Level testing & creation
├── ⚡ Event/Effect System - Centralized event manager
├── 🎵 Audio System Tools - Sound balancing & testing
└── 📖 Help & Guide - In-game tutorials
```

---

## Quick Access

### In-Game Button

**Location:** Top-right corner of the screen  
**Icon:** 🛠️ (wrench/tools emoji)  
**Visual:** Golden glow, slightly transparent  
**Behavior:** Hover to brighten, click to open menu

```
┌─────────────────────────────────────┐
│ HERD MENTALITY                      │
│                                     │
│ [WOOL] [BALANCE] [LEVEL] [🛠️] [⏸]│
│                           ↑         │
│                   Developer Tools   │
└─────────────────────────────────────┘
```

### Keyboard Shortcuts

Once in tools:
- **ESC** - Go back/close
- **H** - Toggle help (Sandbox Mode)
- **Arrow Keys** - Navigate Help Guide
- **F12** - Browser console (audio commands)

---

## Tools Available

### 1. 🎮 Sandbox Mode

**Purpose:** Safe environment for testing and creating levels

**Features:**
- Adjust sheep behavior (count, speed, stubbornness, following)
- Control environment (wind, wolves, obstacles)
- Live pricing preview
- Real-time stats display
- Save/load configurations
- Pause/resume/reset controls

**Use Cases:**
- Testing new level designs
- Balancing game difficulty
- Understanding pricing mechanics
- Experimenting with sheep AI

**Documentation:** `DEVELOPER_TOOLS_GUIDE.md` (Section: Sandbox Mode)

---

### 2. ⚡ Event/Effect System

**Purpose:** Centralized registry of all game events and effects

**Features:**
- Browse 9+ events across 3 categories
- Test each event individually
- View parameters and settings
- Real-time activity monitoring
- Category filtering

**Categories:**
- 🌍 **Environmental** - Wind, rain, sunshine
- 🐑 **Animal Behaviors** - Wolves, golden sheep, shepherd
- 🎵 **Audio/Visual** - Sounds, particles, alerts

**Use Cases:**
- Understanding how effects work
- Testing audio balancing
- Debugging event timing
- Adding new events (future-proof)

**Documentation:** `DEVELOPER_TOOLS_GUIDE.md` (Section: Event/Effect System)

---

### 3. 🎵 Audio System Tools

**Purpose:** Test and debug dynamic audio balancing

**Features:**
- One-click audio test
- Console command interface
- Real-time state inspection
- Category volume control
- Sound registration viewer

**Key Commands:**
```javascript
audioManager.help()                    // Show all commands
audioManager.testAudioBalancing()      // Interactive test
audioManager.debugAudioState()         // Current state
audioManager.getSoundInfo('name')      // Query sound
audioManager.getAllSounds()            // List all sounds
```

**Use Cases:**
- Testing sound priorities
- Debugging audio issues
- Verifying ducking behavior
- Adding new sounds

**Documentation:** `AUDIO_README.md`, `AUDIO_BALANCING_GUIDE.md`

---

### 4. 📖 Help & Guide

**Purpose:** In-game tutorial system

**Features:**
- 7 easy-to-read pages
- Step-by-step instructions
- Visual examples
- Beginner-friendly language
- Quick reference cards

**Page Structure:**
1. Welcome & Overview
2. Sandbox Mode Introduction
3. Sandbox How-To Guide
4. Event/Effect System
5. Audio System Explained
6. Tips & Tricks
7. Quick Reference

**Use Cases:**
- First-time user onboarding
- Quick reference while working
- Learning best practices
- Understanding terminology

**Documentation:** Self-contained in-game

---

## Documentation Index

### For Beginners

| Document | Purpose | Time to Read |
|----------|---------|--------------|
| `DEV_TOOLS_QUICK_START.md` | Get started in 1 minute | 1 min |
| In-Game Help Guide | Step-by-step tutorial | 10 min |
| `DEVELOPER_TOOLS_GUIDE.md` | Complete guide | 20 min |

### For Developers

| Document | Purpose | Details |
|----------|---------|---------|
| `AUDIO_README.md` | Audio system overview | Quick reference |
| `AUDIO_BALANCING_GUIDE.md` | Audio implementation | Examples & API |
| `AUDIO_SYSTEM_SUMMARY.md` | Technical deep dive | Architecture |
| This file | Complete documentation | Everything |

### Quick Reference

| Need | Document | Section |
|------|----------|---------|
| "How do I start?" | `DEV_TOOLS_QUICK_START.md` | Step 1 |
| "Test a level setup" | `DEVELOPER_TOOLS_GUIDE.md` | Common Tasks |
| "Add a new sound" | `AUDIO_BALANCING_GUIDE.md` | Adding New Sounds |
| "Understand events" | `DEVELOPER_TOOLS_GUIDE.md` | Event/Effect System |
| "Console commands" | `AUDIO_README.md` | Console Access |

---

## For Complete Beginners

### Your First 10 Minutes

**Minute 1-2: Access Tools**
1. Load the game
2. Look for 🛠️ in top-right corner
3. Click it

**Minute 3-5: Read In-Game Guide**
1. Choose "📖 Help & Guide"
2. Read Pages 1-3 (just the basics)
3. You'll understand the layout

**Minute 6-8: Try Sandbox**
1. Go back to menu
2. Choose "🎮 Sandbox Mode"
3. Move the "Sheep Count" slider
4. Watch the "LIVE PREVIEW" box update

**Minute 9-10: Test an Event**
1. Exit Sandbox (click EXIT button)
2. Choose "⚡ Event/Effect System"
3. Click [▶ TEST] on any event
4. See what happens!

**You're Done!** Now you understand the basics.

### Common Beginner Questions

**Q: Can I break the game?**  
A: No. Nothing you do in these tools affects the real game unless you click SAVE in Sandbox Mode.

**Q: What if I get confused?**  
A: Click the ← BACK button (top-right of any screen) to return to the main menu.

**Q: Do I need programming knowledge?**  
A: Not at all! These tools are designed for non-programmers.

**Q: Where do my changes go?**  
A: They're temporary unless you click SAVE. Even saved configs only affect testing, not live gameplay.

**Q: How do I undo something?**  
A: Click the RESET button in Sandbox Mode, or just exit and re-enter.

---

## For Experienced Developers

### Architecture Overview

```
Developer Tools Architecture
│
├── UI Layer (Phaser Scenes)
│   ├── DevMenuScene.js - Main menu & navigation
│   ├── SandboxScene.js - Level editor & testing
│   ├── EventSystemScene.js - Event browser & tester
│   └── HelpGuideScene.js - Tutorial system
│
├── Integration Layer
│   ├── HUDScene.js - Dev tools button
│   └── main.js - Scene registration
│
└── Core Systems (Existing)
    ├── audio.js - Audio balancing system
    ├── GameScene.js - Game logic
    └── CONFIG - Game configuration
```

### Code Organization

**Scenes:** `/scenes/`
- `DevMenuScene.js` - Entry point for tools
- `SandboxScene.js` - Interactive level editor
- `EventSystemScene.js` - Event registry & testing
- `HelpGuideScene.js` - Tutorial pages

**Documentation:** Root directory
- `DEV_TOOLS_README.md` - This file
- `DEVELOPER_TOOLS_GUIDE.md` - User guide
- `DEV_TOOLS_QUICK_START.md` - Quick reference
- `AUDIO_*.md` - Audio system docs

### Integration Points

**1. HUDScene.js**
```javascript
// Developer tools button added at line ~2956
const devBtn = this.add.text(CONFIG.width - 140, 70, '🛠️', {...})
devBtn.on('pointerdown', () => {
    this.scene.launch('DevMenuScene');
});
```

**2. main.js**
```javascript
// Scenes registered in config
scene: [
    BootScene, GameScene, HUDScene,
    DevMenuScene, SandboxScene, 
    EventSystemScene, HelpGuideScene
]
```

**3. Event Registry**
```javascript
// EventSystemScene.js - Centralized event registry
this.eventRegistry = {
    environmental: [...],
    animals: [...],
    audioVisual: [...]
}
```

### Key Design Patterns

**1. Scene-Based UI**
- Each tool is a separate Phaser scene
- Scenes can be launched independently
- Maintains game state while tools are open

**2. Centralized Registry**
- All events registered in one place
- Easy to add new events
- Automatic integration with UI

**3. Safe Isolation**
- Tools don't modify game state
- Changes are temporary by default
- Explicit SAVE required for persistence

**4. Beginner-Friendly UX**
- Clear visual hierarchy
- Color-coded categories
- Tooltips and help text everywhere
- Undo/reset always available

---

## Future-Proofing

### Adding New Events

**Step 1: Register in EventSystemScene.js**

```javascript
{
    id: 'new_event',
    name: 'New Event',
    description: 'What this event does',
    category: 'Environmental', // or Animals, Audio/Visual
    icon: '🎯',
    parameters: {
        param1: { min: 0, max: 100, default: 50 },
        param2: { options: ['a', 'b'], default: 'a' }
    },
    test: () => this.testNewEvent()
}
```

**Step 2: Implement test function**

```javascript
testNewEvent() {
    console.log('🎯 Testing New Event...');
    this.logActivity('New Event', 'Description of what happened');
    // Your test logic here
}
```

**That's it!** The event automatically appears in the UI.

### Adding New Audio

**Step 1: Create audio object in audio.js**

```javascript
this.newSound = new Tone.Synth().toDestination();
```

**Step 2: Register with audio system**

```javascript
this.registerSound('newSound', this.newSound, 'STANDARD_SFX', -10);
```

**Step 3: Play with balancing**

```javascript
this.playBalanced('newSound', () => {
    this.newSound.triggerAttackRelease('C4', '0.5');
}, 0.5);
```

**Automatic:** Sound appears in `getAllSounds()`, works with ducking, appears in debug state.

### Adding Sandbox Controls

**Add to sandboxConfig:**

```javascript
this.sandboxConfig = {
    // ... existing config ...
    newParameter: 0.5
}
```

**Add UI control:**

```javascript
this.createSlider(panelX, yPos, 'New Parameter', 0, 1, 
    this.sandboxConfig.newParameter, (value) => {
    this.sandboxConfig.newParameter = value;
    console.log(`New Parameter: ${value}`);
});
```

**That's it!** Automatically included in save/load, visible in UI.

---

## Best Practices

### For Users

✅ **DO:**
- Start with the Help Guide
- Test one thing at a time
- Use PAUSE when needed
- Save configurations you like
- Experiment freely

❌ **DON'T:**
- Skip the Help Guide your first time
- Change everything at once
- Worry about breaking things
- Forget to SAVE if you want to keep changes

### For Developers

✅ **DO:**
- Register new events in EventSystemScene
- Use the audio registration system
- Add tooltips and descriptions
- Test in Sandbox before implementing
- Document parameter ranges

❌ **DON'T:**
- Hardcode event logic in game scenes
- Bypass audio registration
- Use technical jargon in UI
- Forget to update help guide

---

## Testing Checklist

### For New Features

- [ ] Event registered in EventSystemScene?
- [ ] Test function implemented?
- [ ] Parameters documented?
- [ ] Audio registered (if applicable)?
- [ ] Sandbox controls added (if applicable)?
- [ ] Help guide updated?
- [ ] Tested in all tools?
- [ ] Console logs added?
- [ ] User-friendly error messages?

### For UI Changes

- [ ] Clear labels?
- [ ] Tooltips added?
- [ ] Mobile-friendly?
- [ ] Keyboard shortcuts work?
- [ ] Help button accessible?
- [ ] Colors consistent?
- [ ] Icons clear?

---

## Troubleshooting

### "Dev tools button not showing"

**Check:**
1. HUDScene.js has the devBtn code
2. Scene is properly loaded
3. Button isn't hidden behind other elements

**Fix:** Verify depth (should be high) and alpha (0.8 default)

### "Scene won't launch"

**Check:**
1. Scene imported in main.js
2. Scene registered in config.scene array
3. Scene constructor has correct key

**Fix:** Check console for errors, verify imports

### "Events not appearing in Event System"

**Check:**
1. Event added to correct category in eventRegistry
2. All required properties present (id, name, description, etc.)
3. Test function defined

**Fix:** Check console, verify object structure

### "Audio not balancing"

**Check:**
1. Sound registered with audioManager
2. Using playBalanced() not direct play
3. Audio manager initialized

**Fix:** See `AUDIO_BALANCING_GUIDE.md` troubleshooting section

---

## Performance Notes

### Memory Usage

**Minimal Impact:**
- Scenes only loaded when accessed
- No persistent background processes
- Event registry is lightweight

**Optimization:**
- Scenes unload when not in use
- Graphics generated once, reused
- No unnecessary polling

### Best Practices

- Don't keep multiple tool scenes open simultaneously
- Use EXIT buttons to properly close scenes
- Clear console logs in production build

---

## Version History

### v1.0 (Current)
- Initial release
- 4 main tools (Sandbox, Events, Audio, Help)
- 20+ events registered
- Complete documentation
- Beginner-friendly UI

### Future Enhancements (Planned)
- Visual level editor with drag-drop
- Real-time collaboration features
- Level sharing/export
- Analytics dashboard
- More event types

---

## Credits

**Developer Tools System**
- Designed for accessibility
- Built with Phaser 3
- Integrated with existing game systems

**Documentation**
- Multiple difficulty levels
- Visual examples included
- Regular updates

---

## Support

### Getting Help

1. **In-Game:** Open 📖 Help & Guide
2. **Quick Start:** See `DEV_TOOLS_QUICK_START.md`
3. **Detailed:** See `DEVELOPER_TOOLS_GUIDE.md`
4. **Technical:** See this file

### Reporting Issues

When reporting issues, include:
- Which tool you're using
- What you were trying to do
- What happened vs. what you expected
- Console errors (F12)

---

## Summary

Herd Mentality's developer tools provide a **complete**, **accessible**, and **safe** environment for:

- ✅ Testing and creating levels
- ✅ Understanding game mechanics
- ✅ Experimenting with parameters
- ✅ Learning game development
- ✅ Debugging issues
- ✅ Adding new content

**All without risk to the live game.**

---

**Ready to start? Click the 🛠️ button and begin exploring! 🎉**
