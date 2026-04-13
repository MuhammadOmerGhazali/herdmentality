# 🛠️ Developer Tools Guide - HERD MENTALITY

## Welcome! 👋

This guide will help you use the developer tools in Herd Mentality to test, create, and experiment with the game. **Don't worry if you're new to game development** - everything here is designed to be beginner-friendly!

---

## 🎯 What Are These Tools?

The developer tools let you:
- **Test how the game works** without affecting real gameplay
- **Create and test new levels** safely
- **Adjust sheep behavior** and see what happens
- **Test environmental effects** like wind and wolves
- **Experiment with audio** and visual effects

### ⚡ Key Rule
**Nothing you do affects the real game unless you click SAVE.**  
Feel free to experiment!

---

## 🚪 How to Access

### Method 1: In-Game Button
Look for the **🛠️ icon** in the top-right corner during gameplay (next to the pause button).

### Method 2: Keyboard Shortcut
The developer tools are always accessible through the UI - just click the 🛠️ button!

### What You'll See
A menu with four main options:
1. 🎮 Sandbox Mode
2. ⚡ Event/Effect System
3. 🎵 Audio System
4. 📖 Help & Guide

---

## 🎮 SANDBOX MODE

### What Is It?
A safe testing playground where you can adjust the game and see changes in real-time.

### How to Use

#### Step 1: Open Sandbox Mode
Click **"🎮 SANDBOX MODE"** from the developer menu.

#### Step 2: Understand the Layout

```
┌─────────────────────────────────────────┐
│  [PAUSE] [RESET] [SAVE] [EXIT]         │ ← Top Controls
├─────────────────────────────────────────┤
│                                         │
│  📊 LIVE PREVIEW BOX                    │ ← See Changes Here
│  Shows: Prices, Balance, Stats          │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  [TOOLS]           [CONTROL PANEL]     │
│  🌪️ Wind           🐑 Sheep Behavior   │
│  🐺 Wolf           - Count: [slider]   │
│  🚧 Obstacle       - Speed: [slider]   │
│  🐑 Spawn          - Stubborn: [slider]│
│                    🌍 Environment       │
│                    - Wind: [toggle]     │
│                    - Wolves: [toggle]   │
└─────────────────────────────────────────┘
```

#### Step 3: Adjust Settings

**Right Panel - Sheep Behavior:**
- **Sheep Count:** How many sheep appear (10-50)
- **Speed:** How fast they move (50-200)
- **Stubbornness:** How likely they ignore calls (0-1)
- **Following:** How much they follow each other (0-1)

**Right Panel - Environment:**
- **Wind Effects:** Toggle wind on/off
- **Wolves:** Toggle wolf spawning
- **Obstacles:** Toggle obstacles

#### Step 4: Use Tools

**Left Panel - Tools:**
1. Click a tool (🌪️ Wind Zone, 🐺 Wolf, etc.)
2. Click on the field where you want to place it
3. Watch how it affects the game

#### Step 5: Test & Iterate

1. Make changes
2. Watch the **Live Preview** box update
3. See how prices and balance change
4. Click **PAUSE** if you need time to think
5. Click **RESET** to start over
6. Click **SAVE** to keep your configuration

### Pro Tips

✅ **DO:**
- Start by changing one thing at a time
- Use PAUSE when you need to think
- Watch the Live Preview to understand effects
- Save configurations you like

❌ **DON'T:**
- Worry about breaking anything (you can't!)
- Try to change everything at once
- Forget to SAVE if you want to keep changes

---

## ⚡ EVENT / EFFECT SYSTEM

### What Is It?
A library of all special events in the game. You can browse, test, and understand how each effect works.

### Categories

#### 🌍 Environmental Effects
- **Wind Gust:** Pushes sheep in one direction
- **Rain:** Slows down sheep movement
- **Sunshine:** Increases sheep energy

#### 🐑 Animal Behaviors
- **Wolf Appears:** Scares sheep away
- **Golden Sheep:** Special high-value sheep
- **Shepherd:** Guides sheep to one side

#### 🎵 Audio & Visual
- **Sheep Bleat:** Sound effect
- **Call Alert:** Announcement sound
- **Wool Particles:** Visual effects

### How to Use

1. **Open** the Event/Effect System from the dev menu
2. **Browse** events by category (tabs at top)
3. **Click** an event to see details
4. **Press TEST** to see the effect in action
5. **Watch** the Activity Log at the bottom

### Understanding Parameters

Each event shows its settings:
```
Wind Gust
  • strength: 50-200 (default: 100)
  • duration: 1-5 seconds (default: 2)
  • direction: left or right (default: left)
```

This tells you:
- What you can adjust
- The range of values
- The default setting

---

## 🎵 AUDIO SYSTEM

### What Is It?
A smart system that automatically balances all game sounds so music doesn't drown out important sounds.

### Sound Priorities

From highest to lowest:
1. **Critical Alerts** - Wolves, final call (LOUDEST)
2. **Important Sounds** - Sheep bleats, call announcements
3. **Standard Sounds** - Coins, clicks, UI sounds
4. **Background** - Ambience, rain
5. **Music** - Background music (QUIETEST)

### How It Works

When a wolf howls:
- Music automatically drops to 40% volume
- After the howl ends, music returns to normal
- Everything is smooth and natural

### How to Test

**From Dev Menu:**
1. Click **"🎵 AUDIO SYSTEM"**
2. Click **"▶ TEST AUDIO BALANCING"**
3. Listen as different sounds play
4. Notice how music volume changes

**From Browser Console (F12):**
```javascript
// Show help
audioManager.help()

// Test the system
audioManager.testAudioBalancing()

// See what's playing
audioManager.debugAudioState()
```

---

## 📖 HELP & GUIDE

### What Is It?
An in-game tutorial that walks you through everything step-by-step.

### How to Use
1. Click **"📖 HELP & GUIDE"** from the dev menu
2. Read through 7 easy pages
3. Use arrow keys or buttons to navigate
4. Press **FINISH** when done

### Page Overview
- **Page 1:** Welcome & Overview
- **Page 2:** Sandbox Mode Intro
- **Page 3:** Sandbox How-To
- **Page 4:** Event/Effect System
- **Page 5:** Audio System
- **Page 6:** Tips & Tricks
- **Page 7:** Quick Reference

---

## 🔧 Common Tasks

### "I want to test a new level setup"
1. Open **Sandbox Mode**
2. Adjust settings on the right panel
3. Place elements with tools on the left
4. Watch Live Preview
5. Click **SAVE** when happy

### "I want to see how an effect works"
1. Open **Event/Effect System**
2. Browse categories
3. Click an event to see details
4. Click **TEST** to try it

### "I want to test audio balancing"
1. Open **Audio System** from dev menu
2. Click **TEST AUDIO BALANCING**
3. Listen for music volume changes
4. Or use console: `audioManager.testAudioBalancing()`

### "I want to learn everything"
1. Open **Help & Guide**
2. Read through all 7 pages
3. Come back and try each tool
4. Experiment freely!

---

## 🎓 Learning Path (Recommended)

**For Complete Beginners:**
1. Read this guide (you're here!)
2. Open **Help & Guide** in-game
3. Try **Sandbox Mode** - just play with sliders
4. Explore **Event/Effect System** - click TEST on everything
5. Test **Audio System** - listen to the magic
6. Come back to Sandbox and create something!

**For Quick Learners:**
1. Open **Help & Guide** (skim Pages 1-3)
2. Jump into **Sandbox Mode**
3. Experiment with everything
4. Check Event System when curious
5. Test audio when you want

---

## ⌨️ Keyboard Shortcuts

- **ESC** - Close menus / Go back
- **H** - Toggle help overlay (in Sandbox)
- **F12** - Open browser console (for audio commands)
- **Arrow Keys** - Navigate Help Guide pages

---

## 💾 Where Things Are Saved

### Saved Automatically
- Audio settings
- Your game progress (not affected by dev tools)

### Saved When You Click "SAVE"
- Sandbox configurations (stored in localStorage)

### Never Saved (Temporary Only)
- Event/Effect tests
- Live adjustments in Sandbox (unless you click SAVE)

---

## 🐛 Troubleshooting

### "I broke something!"
**You didn't.** Everything resets when you close the tools or click RESET.

### "Changes aren't showing"
- Make sure you're in Sandbox Mode (not normal gameplay)
- Check the Live Preview box - it updates every second
- Try clicking RESET and starting fresh

### "Audio isn't working"
- Make sure sound isn't muted in the game
- Open console (F12) and type: `audioManager.help()`
- Check if browser has sound permission

### "I can't find the dev tools button"
- Look for 🛠️ in the top-right corner (next to pause button)
- It has a golden glow and slight transparency
- Hover over it to make it brighter

---

## 📚 Additional Documentation

For more advanced users:

- **Audio System:** See `AUDIO_README.md`
- **Audio Balancing:** See `AUDIO_BALANCING_GUIDE.md`
- **Technical Details:** See `AUDIO_SYSTEM_SUMMARY.md`

---

## 🎉 You're Ready!

The developer tools are designed to be:
- **Safe** - Can't break the game
- **Simple** - Clear labels and instructions
- **Helpful** - Lots of tooltips and guides
- **Fun** - Experiment and learn!

**Still confused?** Open the **Help & Guide** in-game and read through it. You'll be creating custom levels in no time!

---

## 📞 Quick Reference Card

```
┌─────────────────────────────────────────┐
│  DEVELOPER TOOLS QUICK REFERENCE        │
├─────────────────────────────────────────┤
│  Access: Click 🛠️ button (top-right)   │
│                                          │
│  🎮 SANDBOX MODE                        │
│     → Test levels & adjust settings     │
│     → Right panel: Change parameters    │
│     → Left panel: Place elements        │
│     → Top buttons: Control & save       │
│                                          │
│  ⚡ EVENT/EFFECT SYSTEM                 │
│     → Browse all game events            │
│     → Click TEST to try them            │
│     → Read Activity Log                 │
│                                          │
│  🎵 AUDIO SYSTEM                        │
│     → Test audio balancing              │
│     → Use browser console               │
│     → audioManager.help()               │
│                                          │
│  📖 HELP & GUIDE                        │
│     → Step-by-step tutorials            │
│     → 7 easy-to-read pages              │
│     → All questions answered            │
│                                          │
│  Remember: Nothing breaks the game!     │
│  Experiment freely and have fun! 🎉     │
└─────────────────────────────────────────┘
```

---

**Happy Creating! 🐑✨**
