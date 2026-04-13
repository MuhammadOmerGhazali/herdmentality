# ⚡ Quick Start - Developer Tools

## 1-Minute Setup

### Step 1: Find the Tools
```
Look at the top-right corner of the game screen:
[WOOL] [BALANCE] [LEVEL] [🛠️] [⏸]
                          ↑
                    Click Here!
```

### Step 2: Choose What You Want

```
┌────────────────────────────────────┐
│     🛠️ DEVELOPER TOOLS            │
├────────────────────────────────────┤
│                                    │
│  🎮 SANDBOX MODE                  │
│     ↑ Want to test levels?        │
│                                    │
│  ⚡ EVENT / EFFECT SYSTEM         │
│     ↑ Want to see how effects work?│
│                                    │
│  🎵 AUDIO SYSTEM                  │
│     ↑ Want to test sounds?        │
│                                    │
│  📖 HELP & GUIDE                  │
│     ↑ Need detailed instructions? │
│                                    │
└────────────────────────────────────┘
```

---

## For First-Time Users

### Recommended Path:

```
1. Click 🛠️ button

2. Choose "📖 HELP & GUIDE"
   └─ Read Pages 1-3 (takes 2 minutes)

3. Go back and choose "🎮 SANDBOX MODE"
   └─ Move sliders, watch what happens
   
4. Explore Event System when curious

5. Test Audio System when you want
```

---

## Sandbox Mode Layout

```
┌──────────────────────────────────────────────────┐
│ [⏸ PAUSE] [↻ RESET] [💾 SAVE] [✕ EXIT]        │ Top Controls
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────────────────────┐             │
│  │   📊 LIVE PREVIEW              │             │
│  │   Sheep: 20                    │             │
│  │   LEFT: 5W | RIGHT: 5W         │             │
│  │   Balance: 50/50               │             │
│  └────────────────────────────────┘             │
│                                                  │
│  ┌─────────┐                    ┌─────────────┐ │
│  │ 🛠️ TOOLS│                    │ 🎛️ CONTROLS│ │
│  │         │                    │             │ │
│  │ 🌪️ Wind │                    │ 🐑 Behavior │ │
│  │ 🐺 Wolf │                    │  Count: ▬▬● │ │
│  │ 🚧 Block│                    │  Speed: ▬▬● │ │
│  │ 🐑 Sheep│                    │             │ │
│  │         │                    │ 🌍 Environ  │ │
│  │(Click   │                    │  Wind: [ON] │ │
│  │ to use) │                    │  Wolves: [] │ │
│  └─────────┘                    └─────────────┘ │
│                                                  │
│  Status: ✓ Ready                                │
└──────────────────────────────────────────────────┘
```

---

## Event/Effect System Layout

```
┌──────────────────────────────────────────────────┐
│ ⚡ EVENT / EFFECT SYSTEM            [← BACK]    │
├──────────────────────────────────────────────────┤
│ [🌍 Environmental] [🐑 Animals] [🎵 Audio/Visual]│
│                                                  │
│  ┌──────────────────┐  ┌─────────────────────┐ │
│  │ EVENTS           │  │ DETAILS             │ │
│  │                  │  │                     │ │
│  │ 🌪️ Wind Gust    │  │ Wind Gust           │ │
│  │ [▶ TEST]        │  │                     │ │
│  │                  │  │ Parameters:         │ │
│  │ 🌧️ Rain         │  │ • strength: 50-200  │ │
│  │ [▶ TEST]        │  │ • duration: 1-5s    │ │
│  │                  │  │ • direction: L/R    │ │
│  │ ☀️ Sunshine     │  │                     │ │
│  │ [▶ TEST]        │  │ Click TEST to try!  │ │
│  │                  │  │                     │ │
│  └──────────────────┘  └─────────────────────┘ │
│                                                  │
│  📊 ACTIVITY LOG:                               │
│  [12:34:56] Wind Gust: Testing...               │
│  [12:34:45] Rain: Simulated effect             │
└──────────────────────────────────────────────────┘
```

---

## Help Guide Layout

```
┌──────────────────────────────────────────────────┐
│ 📖 HELP & GUIDE          Page 1/7   [← BACK]   │
├──────────────────────────────────────────────────┤
│                                                  │
│     Welcome to Developer Tools! 👋               │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │                                            │ │
│  │  🎮 WHAT ARE THESE TOOLS?                 │ │
│  │                                            │ │
│  │  These are safe, easy-to-use tools        │ │
│  │  that let you:                            │ │
│  │    • Test how the game works              │ │
│  │    • Create and test new levels           │ │
│  │    • Adjust sheep behavior               │ │
│  │    • See how pricing works               │ │
│  │                                            │ │
│  │  ✅ KEY RULE:                             │ │
│  │  Nothing affects the real game            │ │
│  │  unless you click SAVE!                   │ │
│  │                                            │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  [◀ PREVIOUS]                      [NEXT ▶]     │
└──────────────────────────────────────────────────┘
```

---

## Console Commands (F12)

```javascript
// Show audio help
audioManager.help()

// Test audio balancing
audioManager.testAudioBalancing()

// Check audio state
audioManager.debugAudioState()

// Get info about a sound
audioManager.getSoundInfo('wolfSynth')

// List all sounds
audioManager.getAllSounds()
```

---

## Common Scenarios

### "I just want to test if more sheep change the price"
```
1. Click 🛠️ → Sandbox Mode
2. Find "Sheep Count" slider
3. Move it right (increase sheep)
4. Watch "LIVE PREVIEW" box
5. See prices change!
```

### "I want to see what a wolf does"
```
1. Click 🛠️ → Event/Effect System
2. Click "Animals" tab
3. Find "🐺 Wolf Appears"
4. Click [▶ TEST]
5. Listen to the howl!
```

### "I want to understand audio balancing"
```
1. Click 🛠️ → Audio System
2. Click [▶ TEST AUDIO BALANCING]
3. Listen as:
   - Music plays
   - Coin sound (music dips slightly)
   - Sheep bleat (music dips more)
   - Wolf howl (music dips a lot!)
```

### "I'm totally lost"
```
1. Click 🛠️ → Help & Guide
2. Read all 7 pages (10 minutes)
3. Everything will make sense!
```

---

## Safety Notes

✅ **SAFE TO DO:**
- Click anything
- Move any slider
- Test any event
- Change any setting

❌ **WON'T AFFECT GAME:**
- Live gameplay
- Your progress
- Your balance
- Your level

🎯 **ONLY AFFECTS GAME IF:**
- You click **SAVE** in Sandbox
- (Even then, only saves test configs)

---

## Tips for Success

1. **Start Simple**
   - Change ONE thing
   - See what happens
   - Change ANOTHER thing

2. **Use Pause**
   - Sandbox has a PAUSE button
   - Use it to think
   - No rush!

3. **Watch the Preview**
   - Live Preview box shows everything
   - Updates every second
   - Very helpful!

4. **Don't Be Afraid**
   - You literally can't break anything
   - Click RESET if confused
   - Have fun!

---

## Still Need Help?

1. **In-Game:** Click 🛠️ → 📖 Help & Guide
2. **Detailed:** Read `DEVELOPER_TOOLS_GUIDE.md`
3. **Audio:** Read `AUDIO_README.md`

---

**You're Ready! Click the 🛠️ button and start exploring! 🎉**
