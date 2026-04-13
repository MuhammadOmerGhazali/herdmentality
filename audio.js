import * as Tone from 'tone';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DYNAMIC AUDIO BALANCING SYSTEM - HERD MENTALITY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This AudioManager implements real-time dynamic audio balancing to ensure all
 * sounds (music, SFX, alerts, ambience) maintain optimal relative volumes during
 * gameplay without manual adjustment.
 * 
 * CORE FEATURES:
 * ─────────────
 * 1. PRIORITY-BASED CATEGORIES
 *    - CRITICAL_ALERT (Priority 100): Wolves, final call alerts
 *    - IMPORTANT_SFX (Priority 80): Sheep bleats, call sounds
 *    - STANDARD_SFX (Priority 60): UI sounds, coins, trades
 *    - AMBIENT_SFX (Priority 40): Rain, farm ambience
 *    - MUSIC (Priority 20): Background music tracks
 * 
 * 2. AUTOMATIC DUCKING
 *    - Higher priority sounds automatically reduce volume of lower priority sounds
 *    - Music ducks to 40% when critical alerts play
 *    - Smooth transitions (100-200ms) prevent abrupt changes
 *    - Volumes restore automatically when sounds end
 * 
 * 3. REAL-TIME BALANCING
 *    - Continuously tracks active sounds and their priorities
 *    - Adjusts volumes dynamically when multiple sounds overlap
 *    - Maintains relative importance even during complex audio scenarios
 * 
 * 4. FUTURE-PROOF DESIGN
 *    - All new sounds automatically integrate with the balancing system
 *    - Public API for registering new sounds: registerSound()
 *    - Category-wide volume control: setCategoryVolume()
 *    - Play with automatic balancing: playBalanced()
 * 
 * USAGE FOR NEW SOUNDS:
 * ────────────────────
 * 1. Create your Tone.js synth or HTML5 Audio object
 * 2. Register it: audioManager.registerSound(name, object, category, baseVolume, isHTML5)
 * 3. Play it: audioManager.playBalanced(name, () => yourPlayFunction(), duration)
 * 
 * Example:
 * --------
 *   const newAlertSynth = new Tone.Synth().toDestination();
 *   audioManager.registerSound('goldenSheep', newAlertSynth, 'CRITICAL_ALERT', -10);
 *   audioManager.playBalanced('goldenSheep', () => {
 *     newAlertSynth.triggerAttackRelease('C5', '0.5');
 *   }, 0.5);
 * 
 * AUTOMATIC BEHAVIOR:
 * ──────────────────
 * - When wolf howls (CRITICAL_ALERT), music drops to 40% volume
 * - When sheep bleats (IMPORTANT_SFX), music drops to 60% volume
 * - UI sounds (STANDARD_SFX) cause minimal ducking at 80%
 * - All transitions are smooth and hardly noticeable
 * - Original volumes restore after sounds complete
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

class AudioManager {
    constructor() {
        // Load persisted mute states
        // "Sound" controls SFX + Old Ambience
        this.isSoundMuted = localStorage.getItem('sheepMarket_soundMuted') === 'true';
        // "Music" controls New AI Music
        this.isMusicMuted = localStorage.getItem('sheepMarket_musicMuted') === 'true';

        // === DYNAMIC AUDIO BALANCING SYSTEM ===
        // Tracks all audio sources with their category, base volume, and current state
        this.audioRegistry = new Map();
        
        // Audio categories with relative importance (higher = more prominent)
        this.categories = {
            CRITICAL_ALERT: { priority: 100, duckOthers: 0.4 },      // Final call alerts, wolves
            IMPORTANT_SFX: { priority: 80, duckOthers: 0.6 },        // Call sounds, sheep bleats
            STANDARD_SFX: { priority: 60, duckOthers: 0.8 },         // Coins, clicks, trades
            AMBIENT_SFX: { priority: 40, duckOthers: 0.9 },          // Rain, farm ambience
            MUSIC: { priority: 20, duckOthers: 1.0 }                 // Background music
        };
        
        // Active sound tracking for dynamic ducking
        this.activeSounds = new Set();
        this.duckingTimeouts = new Map();
        
        // Master volume adjustments (applied to ALL sounds in category)
        this.categoryVolumes = {
            CRITICAL_ALERT: 1.0,
            IMPORTANT_SFX: 1.0,
            STANDARD_SFX: 1.0,
            AMBIENT_SFX: 1.0,
            MUSIC: 1.0
        };

        // Farm Ambience
        this.ambience = new Tone.Player({
            url: "assets/574730__crattray1997__farm-ambience-4416.wav",
            loop: true,
            autostart: false,
            volume: 12
        }).toDestination();

        // New AI Music (Separate Mute)
        this.aiMusic = new Tone.Player({
            url: "assets/generator.ai_OGNjYWNlM2YtMTYzYi00ZWI2LWI0YTItMWZjNWIxMzY0Y2Fm-ai-music-generator.ai.mp3",
            loop: true,
            autostart: false,
            volume: -5
        }).toDestination();

        // Level 2 Specific Music
        this.level2Music = new Tone.Player({
            url: "assets/generator.ai_NmE5NDI4MzgtMmJhYS00MjZjLWJlZTctYmQ0YzA2Y2Q3MzNi-ai-music-generator.ai.mp3",
            loop: true,
            autostart: false,
            volume: -5
        }).toDestination();

        // Level 3 Specific Music
        this.level3Music = new Tone.Player({
            url: "assets/generator.ai_NjhjMTdhMjAtOTg0Yi00MDRlLWFjZDgtNjNkYmFjZmE5Y2Nk-ai-music-generator.ai.mp3",
            loop: true,
            autostart: false,
            volume: -5
        }).toDestination();

        // Level 4 Specific Music
        this.level4Music = new Tone.Player({
            url: "assets/generator.ai_MmE2YzQwMzEtNDcyOC00ODE5LTk3YTQtOTY2OWQyNTU1OWFj-ai-music-generator.ai.mp3",
            loop: true,
            autostart: false,
            volume: -5
        }).toDestination();

        // Level 5 Specific Music
        this.level5Music = new Tone.Player({
            url: "assets/generator.ai_NzZmMDA4NGYtYjk1MS00NjEyLTgzMDQtZDI0NTQ2N2E1MDIx-ai-music-generator.ai.mp3",
            loop: true,
            autostart: false,
            volume: -5
        }).toDestination();

        // Level 6 Specific Music
        this.level6Music = new Tone.Player({
            url: "assets/generator.ai_MjQ0MzQyMWYtZjM0Ny00NzFkLWE1ZmMtNjM5M2QxNmE0MGNk-ai-music-generator.ai.mp3",
            loop: true,
            autostart: false,
            volume: -5
        }).toDestination();

        // Level 7 Specific Music
        this.level7Music = new Tone.Player({
            url: "assets/generator.ai_NWEwMWRhM2EtOWE3ZC00YjI2LWJhMjYtNWNjMjU1OWI5OTM4-ai-music-generator.ai.mp3",
            loop: true,
            autostart: false,
            volume: -5
        }).toDestination();

        // Level 8 Specific Music
        this.level8Music = new Tone.Player({
            url: "assets/generator.ai_N2U0ZDE0YTMtOGE2Yi00MWM2LTgzNGQtZDk0MzVjNGEyMmFk-ai-music-generator.ai.mp3",
            loop: true,
            autostart: false,
            volume: -5
        }).toDestination();

        // Level 9 Specific Music
        this.level9Music = new Tone.Player({
            url: "assets/generator.ai_MDM0YTljYTctN2EyNi00ODE2LTg4ODEtMGZjZmY1MTQxYTQx-ai-music-generator.ai.mp3",
            loop: true,
            autostart: false,
            volume: -5
        }).toDestination();
        console.log('🎵 Level 9 music created with URL:', this.level9Music.buffer?.url || 'URL not loaded yet');

        // Level 10 Specific Music
        this.level10Music = new Tone.Player({
            url: "assets/generator.ai_YmMzZDU4ZDctMWU5Zi00Y2UyLTk1NTMtMTllZjhiOWM4OTky-ai-music-generator.ai.mp3",
            loop: true,
            autostart: false,
            volume: -5
        }).toDestination();
        console.log('🎵 Level 10 music created with URL:', this.level10Music.buffer?.url || 'URL not loaded yet');

        // Level 11 Specific Music
        this.level11Music = new Tone.Player({
            url: "assets/generator.ai_YjJiMTZmOTctMzAwNi00ODhjLWJhM2YtNzE3YzA1MzVkYTAy-ai-music-generator.ai.mp3",
            loop: true,
            autostart: false,
            volume: -5
        }).toDestination();
        console.log('🎵 Level 11 music created with URL:', this.level11Music.buffer?.url || 'URL not loaded yet');

        // Level 12 Specific Music
        this.level12Music = new Tone.Player({
            url: "assets/generator.ai_NDgxNWNlOTQtNmRkMC00MGQ4LTg5NmEtZTQ4ZDc4YjZhYTQ4-ai-music-generator.ai.mp3",
            loop: true,
            autostart: false,
            volume: -5
        }).toDestination();
        console.log('🎵 Level 12 music created with URL:', this.level12Music.buffer?.url || 'URL not loaded yet');

        // Level 3 Rain Ambience
        this.rainAmbience = new Tone.Player({
            url: "assets/79270__ra_gun__ambience-summer-rain-05-090718.wav",
            loop: true,
            loopStart: 0,
            loopEnd: 7,
            autostart: false,
            volume: 0
        }).toDestination();

        // Track active music source
        this.activeMusic = this.aiMusic;

        this.buySynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'triangle8' },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 1 },
            volume: -10 // Lowered volume for trade sound
        }).toDestination();
        
        const reverb = new Tone.Reverb(1.5).toDestination();
        this.buySynth.connect(reverb);

        this.clickSynth = new Tone.MembraneSynth({
            pitchDecay: 0.01,
            octaves: 2,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.1, sustain: 0 }
        }).toDestination();

        this.baaSynth = new Tone.FMSynth({
            harmonicity: 3,
            modulationIndex: 10,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.2 },
            modulation: { type: 'square' },
            modulationEnvelope: { attack: 0.1, decay: 0.2, sustain: 1, release: 0.5 }
        }).toDestination();

        this.baaNoise = new Tone.NoiseSynth({
            noise: { type: 'brown' },
            envelope: { attack: 0.1, decay: 0.1, sustain: 0.1, release: 0.1 }
        }).toDestination();

        this.bleatAudio = new Audio("assets/210511__yuval__sheep-bleat-outdoors.1.wav");
        this.bleatAudio.volume = 0.6;

        // New winning bleat for flock celebration
        this.winBleatAudio = new Audio("assets/710299__michaelperfect__sheep-baaing-4-norwegian-sheep-expressing-itself-concisely.wav");
        this.winBleatAudio.volume = 0.35;

        // Coin sound for amount selection
        this.coinAudio = new Audio("assets/140382__dwoboyle__coins-01.wav");
        this.coinAudio.volume = 0.5;

        // Leather wallet opening sound (soft rustling/unfolding)
        this.walletOpenAudio = new Audio("assets/431478__kierankeegan__mower_close_startup_idle_shutoff.wav");
        this.walletOpenAudio.volume = 0.4;

        // "Away" Call Sound for betting
        this.callAudio = new Audio("assets/66543__benboncan__away.wav");
        this.callAudio.volume = 0.6;

        // Grass Tuft Plop Sound (appears in pasture)
        this.grassPlopAudio = new Audio("assets/569679__marokki__plop-effect.wav");
        this.grassPlopAudio.volume = 0.5;

        // Wolf Howl Sound Effect (HTML5 Audio)
        this.wolfHowlAudio = new Audio("assets/398430__naturestemper__wolf-howl.mp3");
        this.wolfHowlAudio.volume = 0.7;

        // Wolf Growl Synth (Sawtooth for aggression) - kept as fallback
        this.wolfSynth = new Tone.MonoSynth({
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.1, decay: 0.3, sustain: 0.5, release: 0.8 },
            filterEnvelope: { attack: 0.06, decay: 0.2, sustain: 0.5, release: 2, baseFrequency: 200, octaves: 3, exponent: 2 }
        }).toDestination();
        this.wolfSynth.volume.value = -5; 

        // Typing Synth (Mechanical Click) - Polyphonic to handle fast typing
        this.typingSynth = new Tone.PolySynth(Tone.MembraneSynth, {
            pitchDecay: 0.008,
            octaves: 4,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.05, sustain: 0 }
        }).toDestination();

        // Coin Fly Synth (Sparkly/Magic)
        this.coinFlySynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 },
            volume: -12
        }).toDestination();

        // Wallet Impact Synth (Satisfying Thud + Chime)
        this.walletImpactSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'fmsine', modulationType: 'square', modulationIndex: 3, harmonicity: 1 },
            envelope: { attack: 0.001, decay: 0.1, sustain: 0.1, release: 1 },
            volume: -6
        }).toDestination();

        // Gain Synth (Pleasant Chimes for profit)
        this.gainSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.02, decay: 0.3, sustain: 0.2, release: 1 },
            volume: -8
        }).toDestination();
        const gainReverb = new Tone.Reverb(2).toDestination();
        this.gainSynth.connect(gainReverb);

        // Firework Pop Synth (Explosion sound with noise burst)
        // Level 12 Firework Sound Effect (Real Audio)
        this.fireworkAudio = new Tone.Player({
            url: "assets/347119__novasoundtechnology__burst-fireworks-nova-sound.wav",
            autostart: false,
            volume: -8
        }).toDestination();

        // === REGISTER ALL AUDIO SOURCES FOR DYNAMIC BALANCING ===
        this._registerAudioSources();
        
        // Mobile Safari / Chrome Audio Context Resume on first interaction
        this._setupInteractionListeners();

        // Log initialization success
        console.log('🎵 Dynamic Audio Balancing System initialized');
        console.log(`   → ${this.audioRegistry.size} sounds registered across ${Object.keys(this.categories).length} categories`);
        console.log('   → Run audioManager.help() for available commands');
        console.log('   → See AUDIO_README.md for documentation');
    }

    /**
     * HELP: Display available audio system commands
     */
    help() {
        console.log('\n🎵 ═══ AUDIO SYSTEM HELP ═══');
        console.log('\nAvailable Commands:');
        console.log('  audioManager.help()                    - Show this help');
        console.log('  audioManager.testAudioBalancing()      - Test the ducking system');
        console.log('  audioManager.debugAudioState()         - Show current state');
        console.log('  audioManager.getAllSounds()            - List all registered sounds');
        console.log('  audioManager.getSoundInfo(\'name\')      - Get info about a sound');
        console.log('  audioManager.setCategoryVolume(cat, v) - Adjust category (0-1)');
        console.log('  audioManager.registerSound(...)        - Register new sound');
        console.log('  audioManager.unregisterSound(\'name\')   - Remove sound');
        console.log('\nCategories:');
        console.log('  CRITICAL_ALERT, IMPORTANT_SFX, STANDARD_SFX, AMBIENT_SFX, MUSIC');
        console.log('\nDocumentation:');
        console.log('  See AUDIO_README.md and AUDIO_BALANCING_GUIDE.md');
        console.log('═══════════════════════════════\n');
    }

    /**
     * CONVENIENCE: Quick test of the audio system
     * Plays a sequence of sounds to demonstrate ducking behavior
     */
    testAudioBalancing() {
        console.log('🎵 Testing audio balancing system...');
        console.log('   Listen for music ducking as different sounds play');
        
        // Start music if not playing
        if (!this.isMusicMuted && this.activeMusic.state !== 'started') {
            this.startMusic();
            console.log('   → Started music');
        }
        
        // Test sequence
        setTimeout(() => {
            console.log('   → Playing STANDARD_SFX (coin) - music should duck slightly');
            this.playCoin();
        }, 1000);
        
        setTimeout(() => {
            console.log('   → Playing IMPORTANT_SFX (sheep bleat) - music should duck more');
            this.playBaa();
        }, 2500);
        
        setTimeout(() => {
            console.log('   → Playing CRITICAL_ALERT (wolf howl) - music should duck significantly');
            this.playWolfHowl();
        }, 4500);
        
        setTimeout(() => {
            console.log('   → Test complete! Music should be back to normal volume.');
            console.log('   → Run audioManager.debugAudioState() to see current state');
        }, 7000);
    }

    /**
     * Register all audio sources with their categories and base volumes
     * This makes them available for dynamic balancing
     */
    _registerAudioSources() {
        // MUSIC (lowest priority, gets ducked most)
        this._registerAudio('aiMusic', this.aiMusic, 'MUSIC', -5);
        this._registerAudio('level2Music', this.level2Music, 'MUSIC', -5);
        this._registerAudio('level3Music', this.level3Music, 'MUSIC', -5);
        this._registerAudio('level4Music', this.level4Music, 'MUSIC', -5);
        this._registerAudio('level5Music', this.level5Music, 'MUSIC', -5);
        this._registerAudio('level6Music', this.level6Music, 'MUSIC', -5);
        this._registerAudio('level7Music', this.level7Music, 'MUSIC', -5);
        this._registerAudio('level8Music', this.level8Music, 'MUSIC', -5);
        this._registerAudio('level9Music', this.level9Music, 'MUSIC', -5);
        this._registerAudio('level10Music', this.level10Music, 'MUSIC', -5);

        // AMBIENT SFX (background sounds)
        this._registerAudio('ambience', this.ambience, 'AMBIENT_SFX', 12);
        this._registerAudio('rainAmbience', this.rainAmbience, 'AMBIENT_SFX', 0);

        // STANDARD SFX (UI sounds, trading)
        this._registerAudio('buySynth', this.buySynth, 'STANDARD_SFX', -10);
        this._registerAudio('clickSynth', this.clickSynth, 'STANDARD_SFX', -15);
        this._registerAudio('coinAudio', this.coinAudio, 'STANDARD_SFX', 0.5, true);
        this._registerAudio('typingSynth', this.typingSynth, 'STANDARD_SFX', -15);
        this._registerAudio('coinFlySynth', this.coinFlySynth, 'STANDARD_SFX', -12);
        this._registerAudio('walletImpactSynth', this.walletImpactSynth, 'STANDARD_SFX', -6);
        this._registerAudio('gainSynth', this.gainSynth, 'STANDARD_SFX', -8);
        this._registerAudio('fireworkAudio', this.fireworkAudio, 'STANDARD_SFX', -8);
        this._registerAudio('grassPlopAudio', this.grassPlopAudio, 'STANDARD_SFX', 0.5, true);
        this._registerAudio('bankruptcySynth', this.clickSynth, 'CRITICAL_ALERT', -5);

        // IMPORTANT SFX (gameplay-critical sounds)
        this._registerAudio('callAudio', this.callAudio, 'IMPORTANT_SFX', 0.6, true);
        this._registerAudio('bleatAudio', this.bleatAudio, 'IMPORTANT_SFX', 0.6, true);
        this._registerAudio('winBleatAudio', this.winBleatAudio, 'IMPORTANT_SFX', 0.35, true);
        this._registerAudio('baaSynth', this.baaSynth, 'IMPORTANT_SFX', -8);
        this._registerAudio('baaNoise', this.baaNoise, 'IMPORTANT_SFX', -10);

        // CRITICAL ALERTS (highest priority - wolves, alerts)
        this._registerAudio('wolfHowlAudio', this.wolfHowlAudio, 'CRITICAL_ALERT', 0.7, true);
        this._registerAudio('wolfSynth', this.wolfSynth, 'CRITICAL_ALERT', -5);
    }

    /**
     * Register a single audio source for dynamic balancing
     * @param {string} name - Unique identifier
     * @param {Object} audioObject - Tone.js or HTML5 Audio object
     * @param {string} category - Category key from this.categories
     * @param {number} baseVolume - Base volume (dB for Tone.js, 0-1 for HTML5)
     * @param {boolean} isHTML5 - Whether this is an HTML5 Audio element
     */
    _registerAudio(name, audioObject, category, baseVolume, isHTML5 = false) {
        this.audioRegistry.set(name, {
            object: audioObject,
            category: category,
            baseVolume: baseVolume,
            isHTML5: isHTML5,
            currentDuck: 1.0 // Current ducking multiplier (1.0 = no duck)
        });
    }

    /**
     * Play a sound with automatic dynamic balancing
     * This wraps the actual play call and handles ducking of other sounds
     * @param {string} soundName - Name of registered sound
     * @param {Function} playCallback - Function that actually plays the sound
     * @param {number} duration - Estimated duration in seconds (for ducking timing)
     */
    _playWithBalancing(soundName, playCallback, duration = 1) {
        const soundInfo = this.audioRegistry.get(soundName);
        if (!soundInfo) {
            // Sound not registered - play normally (future-proof for new sounds)
            playCallback();
            return;
        }

        const category = this.categories[soundInfo.category];
        
        // Add to active sounds
        this.activeSounds.add(soundName);

        // Duck lower-priority sounds
        this._duckLowerPrioritySounds(soundInfo.category, category.duckOthers);

        // Play the actual sound
        playCallback();

        // Remove from active sounds after duration
        const timeoutId = setTimeout(() => {
            this.activeSounds.delete(soundName);
            this._restoreVolumes();
        }, duration * 1000);

        this.duckingTimeouts.set(soundName, timeoutId);
    }

    /**
     * Duck (reduce volume of) all sounds with lower priority than the given category
     * @param {string} activeCategory - Category of the sound being played
     * @param {number} duckAmount - Multiplier for lower priority sounds (0-1)
     */
    _duckLowerPrioritySounds(activeCategory, duckAmount) {
        const activePriority = this.categories[activeCategory].priority;

        this.audioRegistry.forEach((soundInfo, name) => {
            const soundPriority = this.categories[soundInfo.category].priority;
            
            // Only duck sounds with lower priority
            if (soundPriority < activePriority) {
                const targetVolume = soundInfo.baseVolume * duckAmount * this.categoryVolumes[soundInfo.category];
                this._setVolume(soundInfo, targetVolume, 0.1); // 100ms transition
                soundInfo.currentDuck = duckAmount;
            }
        });
    }

    /**
     * Restore volumes to their base levels (accounting for active higher-priority sounds)
     */
    _restoreVolumes() {
        // Find highest priority currently active
        let highestActivePriority = 0;
        let highestActiveDuck = 1.0;

        this.activeSounds.forEach(activeName => {
            const activeInfo = this.audioRegistry.get(activeName);
            if (activeInfo) {
                const activeCat = this.categories[activeInfo.category];
                if (activeCat.priority > highestActivePriority) {
                    highestActivePriority = activeCat.priority;
                    highestActiveDuck = activeCat.duckOthers;
                }
            }
        });

        // Restore all sounds based on highest active priority
        this.audioRegistry.forEach((soundInfo, name) => {
            const soundPriority = this.categories[soundInfo.category].priority;
            
            let targetDuck = 1.0;
            if (soundPriority < highestActivePriority) {
                targetDuck = highestActiveDuck;
            }

            if (soundInfo.currentDuck !== targetDuck) {
                const targetVolume = soundInfo.baseVolume * targetDuck * this.categoryVolumes[soundInfo.category];
                this._setVolume(soundInfo, targetVolume, 0.2); // 200ms transition
                soundInfo.currentDuck = targetDuck;
            }
        });
    }

    /**
     * Set volume on an audio object (handles both Tone.js and HTML5 Audio)
     * @param {Object} soundInfo - Registered sound info object
     * @param {number} volume - Target volume (dB for Tone.js, 0-1 for HTML5)
     * @param {number} rampTime - Transition time in seconds
     */
    _setVolume(soundInfo, volume, rampTime = 0) {
        const obj = soundInfo.object;
        
        if (soundInfo.isHTML5) {
            // HTML5 Audio (0-1 range)
            const clampedVolume = Math.max(0, Math.min(1, volume));
            if (rampTime > 0) {
                // Smooth transition for HTML5 (manual ramping)
                const startVol = obj.volume;
                const volDiff = clampedVolume - startVol;
                const steps = 20;
                const stepTime = (rampTime * 1000) / steps;
                
                for (let i = 1; i <= steps; i++) {
                    setTimeout(() => {
                        obj.volume = startVol + (volDiff * (i / steps));
                    }, stepTime * i);
                }
            } else {
                obj.volume = clampedVolume;
            }
        } else if (obj && obj.volume) {
            // Tone.js object (dB range)
            if (rampTime > 0) {
                obj.volume.rampTo(volume, rampTime, Tone.now());
            } else {
                obj.volume.value = volume;
            }
        }
    }

    /**
     * Get effective volume for a sound (base * category multiplier * ducking)
     * Used when initially setting up sounds or adding new ones
     */
    _getEffectiveVolume(soundName) {
        const soundInfo = this.audioRegistry.get(soundName);
        if (!soundInfo) return 0;
        
        return soundInfo.baseVolume * this.categoryVolumes[soundInfo.category] * soundInfo.currentDuck;
    }

    /**
     * PUBLIC API: Register a new audio source dynamically (for future sounds)
     * @param {string} name - Unique identifier for the sound
     * @param {Object} audioObject - Tone.js or HTML5 Audio object
     * @param {string} category - Category: 'CRITICAL_ALERT', 'IMPORTANT_SFX', 'STANDARD_SFX', 'AMBIENT_SFX', 'MUSIC'
     * @param {number} baseVolume - Base volume (dB for Tone.js, 0-1 for HTML5)
     * @param {boolean} isHTML5 - Whether this is an HTML5 Audio element
     * 
     * Example: audioManager.registerSound('newAlert', myToneSynth, 'CRITICAL_ALERT', -8);
     */
    registerSound(name, audioObject, category = 'STANDARD_SFX', baseVolume = -10, isHTML5 = false) {
        if (!this.categories[category]) {
            console.warn(`Invalid category "${category}". Defaulting to STANDARD_SFX.`);
            category = 'STANDARD_SFX';
        }
        
        this._registerAudio(name, audioObject, category, baseVolume, isHTML5);
        console.log(`✓ Audio registered: "${name}" in ${category} category at ${baseVolume}${isHTML5 ? ' (HTML5)' : 'dB'}`);
    }

    _setupInteractionListeners() {
        const resumeAudio = () => {
            if (Tone.context.state !== 'running') {
                Tone.start().then(() => {
                    console.log('🎵 Tone.js context resumed via user interaction');
                    this._audioUnlocked = true;
                });
            }
            
            // Remove listeners after first successful resume
            if (this._audioUnlocked) {
                window.removeEventListener('click', resumeAudio);
                window.removeEventListener('touchstart', resumeAudio);
                window.removeEventListener('keydown', resumeAudio);
            }
        };

        window.addEventListener('click', resumeAudio);
        window.addEventListener('touchstart', resumeAudio);
        window.addEventListener('keydown', resumeAudio);
    }

    /**
     * PUBLIC API: Unregister a sound and clean up
     * @param {string} name - Name of sound to unregister
     * 
     * Example: audioManager.unregisterSound('oldSound');
     */
    unregisterSound(name) {
        if (!this.audioRegistry.has(name)) {
            console.warn(`Sound "${name}" not registered`);
            return;
        }
        
        // Remove from active sounds if playing
        this.activeSounds.delete(name);
        
        // Clear any pending ducking timeouts
        if (this.duckingTimeouts.has(name)) {
            clearTimeout(this.duckingTimeouts.get(name));
            this.duckingTimeouts.delete(name);
        }
        
        // Remove from registry
        this.audioRegistry.delete(name);
        
        // Restore volumes in case this was affecting ducking
        this._restoreVolumes();
        
        console.log(`✓ Audio unregistered: "${name}"`);
    }

    /**
     * PUBLIC API: Ensure AudioContext is running after a user gesture
     * Should be called on first button click/interaction
     */
    async unlockAudio() {
        if (this._audioUnlocked) return;
        
        console.log('🎵 Attempting to unlock audio context...');
        try {
            if (Tone.context.state !== 'running') {
                await Tone.start();
                console.log('🎵 Tone.js AudioContext resumed successfully');
            }
            
            // Also ensure HTML5 Audio objects are ready/unlocked
            // Some browsers require a play() call on them during the gesture
            const silentPlay = (audio) => {
                if (audio) {
                    const oldVol = audio.volume;
                    audio.volume = 0;
                    audio.play().then(() => {
                        audio.pause();
                        audio.volume = oldVol;
                    }).catch(() => {});
                }
            };
            
            silentPlay(this.coinAudio);
            silentPlay(this.bleatAudio);
            
            this._audioUnlocked = true;
            console.log('🎵 Audio system fully unlocked');
        } catch (e) {
            console.warn('🎵 Audio unlock failed:', e);
        }
    }

    /**
     * PUBLIC API: Play a registered sound with automatic balancing
     * @param {string} soundName - Name of registered sound
     * @param {Function} playCallback - Function that plays the sound
     * @param {number} duration - Duration in seconds
     * 
     * Example: audioManager.playBalanced('newAlert', () => mySynth.triggerAttack('C4'), 1.5);
     */
    playBalanced(soundName, playCallback, duration = 1) {
        // Log SFX requests for debugging
        if (window.DEV_MODE_AUDIO_LOGS) {
            console.log(`🔊 SFX Play Request: ${soundName}`);
        }
        this._playWithBalancing(soundName, playCallback, duration);
    }

    /**
     * PUBLIC API: Adjust master volume for an entire category
     * @param {string} category - Category to adjust
     * @param {number} multiplier - Volume multiplier (0-1, where 1 = full volume)
     * 
     * Example: audioManager.setCategoryVolume('MUSIC', 0.5); // Reduce all music by 50%
     */
    setCategoryVolume(category, multiplier) {
        if (!this.categories[category]) {
            console.warn(`Invalid category "${category}"`);
            return;
        }
        
        this.categoryVolumes[category] = Math.max(0, Math.min(1, multiplier));
        
        // Apply to all sounds in category immediately
        this.audioRegistry.forEach((soundInfo, name) => {
            if (soundInfo.category === category) {
                const targetVolume = soundInfo.baseVolume * this.categoryVolumes[category] * soundInfo.currentDuck;
                this._setVolume(soundInfo, targetVolume, 0.3);
            }
        });
        
        console.log(`✓ ${category} volume set to ${Math.round(multiplier * 100)}%`);
    }

    /**
     * PUBLIC API: Get information about a registered sound
     * @param {string} name - Sound name
     * @returns {Object|null} Sound info or null if not found
     */
    getSoundInfo(name) {
        const info = this.audioRegistry.get(name);
        if (!info) return null;
        
        return {
            name,
            category: info.category,
            baseVolume: info.baseVolume,
            currentDuck: info.currentDuck,
            effectiveVolume: this._getEffectiveVolume(name),
            isHTML5: info.isHTML5,
            isPlaying: this.activeSounds.has(name),
            priority: this.categories[info.category].priority
        };
    }

    /**
     * PUBLIC API: Get all registered sounds
     * @returns {Array} Array of sound info objects
     */
    getAllSounds() {
        const sounds = [];
        this.audioRegistry.forEach((info, name) => {
            sounds.push(this.getSoundInfo(name));
        });
        return sounds.sort((a, b) => b.priority - a.priority); // Sort by priority
    }

    /**
     * DEBUG: Display current audio balancing state
     * Shows all registered sounds, active sounds, and current ducking levels
     */
    debugAudioState() {
        console.log('\n🎵 ═══ AUDIO BALANCING STATE ═══');
        console.log(`Active sounds: ${this.activeSounds.size}`);
        
        if (this.activeSounds.size > 0) {
            console.log('Currently playing:');
            this.activeSounds.forEach(name => {
                const info = this.audioRegistry.get(name);
                if (info) {
                    console.log(`  • ${name} (${info.category})`);
                }
            });
        }
        
        console.log('\nCategory volumes:');
        Object.entries(this.categoryVolumes).forEach(([cat, vol]) => {
            console.log(`  ${cat}: ${Math.round(vol * 100)}%`);
        });
        
        console.log('\nRegistered sounds:');
        const byCategory = {};
        this.audioRegistry.forEach((info, name) => {
            if (!byCategory[info.category]) byCategory[info.category] = [];
            byCategory[info.category].push({
                name,
                baseVol: info.baseVolume,
                duck: info.currentDuck,
                isHTML5: info.isHTML5
            });
        });
        
        Object.entries(byCategory).forEach(([cat, sounds]) => {
            console.log(`  ${cat}:`);
            sounds.forEach(s => {
                const duckStr = s.duck < 1 ? ` (ducked to ${Math.round(s.duck * 100)}%)` : '';
                const typeStr = s.isHTML5 ? ' [HTML5]' : ' [Tone.js]';
                console.log(`    • ${s.name}: ${s.baseVol}${typeStr}${duckStr}`);
            });
        });
        
        console.log('═══════════════════════════════\n');
    }

    async playWolfHowl() {
        if (this.isSoundMuted) return;
        
        // Ensure audio context is running
        try {
            if (Tone.context.state !== 'running') {
                await Tone.start();
            }
        } catch (e) {
            console.warn('Could not start audio context:', e);
        }
        
        this._playWithBalancing('wolfHowlAudio', () => {
            // Play realistic wolf howl audio
            try {
                const clone = this.wolfHowlAudio.cloneNode();
                clone.volume = 0.7;
                clone.play().catch(() => {
                    // Fallback to synthesized howl if audio fails
                    this.playWolfHowlFallback();
                });
            } catch (e) {
                this.playWolfHowlFallback();
            }
        }, 3); // 3 second duration for the howl
    }

    playWolfHowlFallback() {
        if (this.isSoundMuted) return;
        if (Tone.context.state !== 'running') Tone.start();
        
        const now = Tone.now();
        // Low growl/howl effect
        this.wolfSynth.triggerAttackRelease("C2", "2n", now);
        this.wolfSynth.frequency.rampTo("C1", 0.5, now + 0.5); // Pitch drop
    }

    async playBaa() {
        if (this.isSoundMuted) return;
        try {
            if (Tone.context.state !== 'running') await Tone.start();
        } catch (e) {}
        
        this._playWithBalancing('bleatAudio', () => {
            // Try playing the shared asset
            try {
                if (this.bleatAudio) {
                    // Clone node for overlapping support
                    const clone = this.bleatAudio.cloneNode();
                    clone.volume = 0.4 + Math.random() * 0.3;
                    clone.play().catch(error => {
                        this.playFallbackBaa();
                    });
                } else {
                    this.playFallbackBaa();
                }
            } catch (e) {
                this.playFallbackBaa();
            }
        }, 1.5); // 1.5 second duration
    }

    playGoBleat() {
        if (this.isSoundMuted) return;
        
        this._playWithBalancing('winBleatAudio', () => {
            // Use the concise/distinct bleat for GO!
            if (this.winBleatAudio) {
                try {
                    const clone = this.winBleatAudio.cloneNode();
                    clone.volume = 0.5; // Slightly louder/clearer
                    clone.play().catch(() => {});
                } catch (e) {}
            }
        }, 1); // 1 second duration
    }

    async playFlock() {
        if (this.isSoundMuted) return;
        
        const count = 5 + Math.floor(Math.random() * 5);
        const totalDuration = (count * 150 + 200) / 1000; // Estimate total duration in seconds
        
        // Register this as a long-duration important sound to keep music ducked
        this._playWithBalancing('winBleatAudio', () => {
            // Play the distinct "Win" bleat immediately
            if (this.winBleatAudio) {
                try {
                    // Main clear win sound
                    const winClone = this.winBleatAudio.cloneNode();
                    winClone.volume = 0.4;
                    winClone.play().catch(() => {});
                    
                    // Echo/Layering for crowd effect
                    setTimeout(() => {
                        const winLayer = this.winBleatAudio.cloneNode();
                        winLayer.volume = 0.3;
                        winLayer.playbackRate = 0.9 + Math.random() * 0.2; // Slight pitch shift if supported (browser dependent)
                        winLayer.play().catch(() => {});
                    }, 100);
                } catch (e) {}
            }

            // Play multiple bleats (each will handle its own balancing)
            for (let i = 0; i < count; i++) {
                const delay = i * 150 + Math.random() * 200;
                setTimeout(() => {
                    this.playBaa();
                }, delay);
            }
        }, totalDuration); // Keep music ducked for entire flock celebration
    }

    playFallbackBaa() {
        if (this.isSoundMuted) return;
        // Only play this if the high-quality asset fails
        const now = Tone.now();
        const pitch = ["A3", "G3", "B3", "F3"][Math.floor(Math.random() * 4)];
        this.baaSynth.triggerAttackRelease(pitch, "4n", now, 0.8);
        this.baaNoise.triggerAttackRelease("8n", now, 0.5);
        this.baaSynth.frequency.rampTo(Tone.Frequency(pitch).transpose(-2), 0.4, now + 0.1);
    }

    startSoundEffects() {
        // Start Sound/Ambience Channel only (no music)
        if (!this.isSoundMuted) {
            try {
                if (this.ambience.loaded) {
                    if (this.ambience.state !== 'started') {
                        this.ambience.start();
                    }
                } else {
                    this.ambience.autostart = true;
                }
            } catch (e) {
                console.warn("Ambience start failed:", e);
            }
        }
    }

    startMusic() {
        // Start Sound/Ambience Channel
        if (!this.isSoundMuted) {
            try {
                if (this.ambience.loaded) {
                    if (this.ambience.state !== 'started') {
                        this.ambience.start();
                    }
                } else {
                    this.ambience.autostart = true;
                }
            } catch (e) {
                console.warn("Ambience start failed:", e);
            }
        }

        // Start Music Channel
        if (!this.isMusicMuted) {
            try {
                const music = this.activeMusic;
                if (music && music.loaded) {
                    if (music.state !== 'started') {
                        music.start();
                    }
                } else if (music) {
                    music.autostart = true;
                }
            } catch (e) {
                console.warn("Music start failed:", e);
            }
        }
    }

    startMusicOnly() {
        // Start Music Channel only (ambience should already be playing)
        if (!this.isMusicMuted) {
            try {
                const music = this.activeMusic;
                if (music && music.loaded) {
                    if (music.state !== 'started') {
                        music.start();
                    }
                } else if (music) {
                    music.autostart = true;
                }
            } catch (e) {
                console.warn("Music start failed:", e);
            }
        }
    }

    stopMusic() {
        this.stopAllMusic();
    }

    stopAllMusic() {
        // Force stop all music tracks to ensure no overlap
        [this.aiMusic, this.level2Music, this.level3Music, this.level4Music, this.level5Music, this.level6Music, this.level7Music, this.level8Music, this.level9Music, this.level10Music, this.level11Music, this.level12Music].forEach(track => {
            if (track && track.state === 'started') {
                track.stop();
            }
        });
        
        // Stop rain ambience when switching away from Level 3-4
        if (this.rainAmbience && this.rainAmbience.state === 'started') {
            this.rainAmbience.stop();
        }
    }

    _switchTrack(newTrack) {
        console.log('🎵 _switchTrack called, newTrack loaded:', newTrack?.loaded, 'state:', newTrack?.state);
        
        if (this.activeMusic === newTrack) {
            console.log('🎵 Track already active, checking if it needs to start...');
            // Already active, just ensure it plays if allowed
            if (!this.isMusicMuted && newTrack.state !== 'started') {
                console.log('🎵 Track needs to start. Loaded:', newTrack.loaded);
                if (newTrack.loaded) {
                    newTrack.start();
                    console.log('🎵 Track started!');
                } else {
                    newTrack.autostart = true;
                    console.log('🎵 Track set to autostart');
                }
            }
            return;
        }

        console.log('🎵 Switching from', this.activeMusic?.buffer?.url, 'to', newTrack?.buffer?.url);
        
        // Stop ALL other music explicitly
        this.stopAllMusic();
        console.log('🎵 All music stopped');
        
        // Set new active
        this.activeMusic = newTrack;
        console.log('🎵 Active music set to new track');
        
        // Start if allowed
        if (!this.isMusicMuted) {
            console.log('🎵 Music not muted, attempting to start. Loaded:', this.activeMusic.loaded);
             if (this.activeMusic.loaded) {
                 this.activeMusic.start();
                 console.log('🎵 New track started!');
             } else {
                 this.activeMusic.autostart = true;
                 console.log('🎵 New track set to autostart (will play when loaded)');
             }
        } else {
            console.log('🎵 Music is muted, not starting');
        }
        
        // Apply current ducking state to new track immediately
        // This ensures if sounds are playing when we switch, new music starts at correct volume
        this._restoreVolumes();
    }

    switchToLevel2Music() {
        this._switchTrack(this.level2Music);
    }

    switchToLevel3Music() {
        this._switchTrack(this.level3Music);
        
        // Start rain ambience for Level 3
        if (!this.isSoundMuted) {
            try {
                if (this.rainAmbience.loaded) {
                    if (this.rainAmbience.state !== 'started') {
                        this.rainAmbience.start();
                    }
                } else {
                    this.rainAmbience.autostart = true;
                }
            } catch (e) {
                console.warn("Rain ambience start failed:", e);
            }
        }
    }

    switchToLevel4Music() {
        this._switchTrack(this.level4Music);
        
        // Start rain ambience for Level 4 (rain continues from Level 3)
        if (!this.isSoundMuted) {
            try {
                if (this.rainAmbience.loaded) {
                    if (this.rainAmbience.state !== 'started') {
                        this.rainAmbience.start();
                    }
                } else {
                    this.rainAmbience.autostart = true;
                }
            } catch (e) {
                console.warn("Rain ambience start failed:", e);
            }
        }
    }

    switchToLevel5Music() {
        this._switchTrack(this.level5Music);
    }

    switchToLevel6Music() {
        this._switchTrack(this.level6Music);
    }

    switchToLevel7Music() {
        this._switchTrack(this.level7Music);
    }

    switchToLevel8Music() {
        this._switchTrack(this.level8Music);
    }

    switchToLevel9Music() {
        console.log('🎵 ===== SWITCHING TO LEVEL 9 MUSIC =====');
        console.log('🎵 level9Music player exists:', !!this.level9Music);
        console.log('🎵 level9Music state:', this.level9Music?.state);
        console.log('🎵 level9Music loaded:', this.level9Music?.loaded);
        console.log('🎵 level9Music buffer URL:', this.level9Music?.buffer?.url);
        console.log('🎵 Current activeMusic before switch:', this.activeMusic === this.level8Music ? 'LEVEL 8' : 'OTHER');
        
        // Use the standard track switching which stops all other music
        this._switchTrack(this.level9Music);
        
        console.log('🎵 activeMusic after switch:', this.activeMusic === this.level9Music ? 'LEVEL 9 ✓' : 'WRONG!');
        console.log('🎵 level9Music state after switch:', this.level9Music?.state);
        console.log('🎵 =====================================');
    }

    switchToLevel10Music() {
        console.log('🎵 ===== LEVEL 10: SWITCHING TO LEVEL 10 MUSIC =====');
        
        // Use standard track switching to stop all other music and start Level 10 music
        this._switchTrack(this.level10Music);
        
        // Stop rain ambience
        if (this.rainAmbience && this.rainAmbience.state === 'started') {
            console.log('🎵 Stopping rain ambience');
            this.rainAmbience.stop();
        }
        
        // KEEP farm/bird ambience playing
        if (!this.isSoundMuted) {
            if (this.ambience && this.ambience.loaded && this.ambience.state !== 'started') {
                console.log('🎵 Starting farm/bird ambience');
                this.ambience.start();
            }
        }
        
        console.log('🎵 Level 10 music URL:', this.level10Music?.buffer?.url);
        console.log('🎵 Level 10 music state:', this.level10Music?.state);
        console.log('🎵 ===== LEVEL 10 MUSIC ACTIVE =====');
    }

    switchToLevel11Music() {
        console.log('🎵 ===== LEVEL 11: SWITCHING TO LEVEL 11 MUSIC =====');
        
        // Use standard track switching to stop all other music and start Level 11 music
        this._switchTrack(this.level11Music);
        
        // Stop rain ambience (if still playing from previous levels)
        if (this.rainAmbience && this.rainAmbience.state === 'started') {
            console.log('🎵 Stopping rain ambience');
            this.rainAmbience.stop();
        }
        
        // KEEP farm/bird ambience playing
        if (!this.isSoundMuted) {
            if (this.ambience && this.ambience.loaded && this.ambience.state !== 'started') {
                console.log('🎵 Starting farm/bird ambience');
                this.ambience.start();
            }
        }
        
        console.log('🎵 Level 11 music URL:', this.level11Music?.buffer?.url);
        console.log('🎵 Level 11 music state:', this.level11Music?.state);
        console.log('🎵 ===== LEVEL 11 MUSIC ACTIVE =====');
    }

    switchToLevel12Music() {
        console.log('🎵 ===== LEVEL 12: SWITCHING TO LEVEL 12 MUSIC =====');
        
        // Use standard track switching to stop all other music and start Level 12 music
        this._switchTrack(this.level12Music);
        
        // Stop rain ambience (if still playing from previous levels)
        if (this.rainAmbience && this.rainAmbience.state === 'started') {
            console.log('🎵 Stopping rain ambience');
            this.rainAmbience.stop();
        }
        
        // STOP farm/bird ambience for Level 12 (storm atmosphere - no birds)
        if (this.ambience && this.ambience.state === 'started') {
            console.log('🎵 LEVEL 12: Stopping farm/bird ambience (storm has no birds)');
            this.ambience.stop();
        }
        
        console.log('🎵 Level 12 music URL:', this.level12Music?.buffer?.url);
        console.log('🎵 Level 12 music state:', this.level12Music?.state);
        console.log('🎵 ===== LEVEL 12 MUSIC ACTIVE (NO BIRD SOUNDS) =====');
    }

    switchToDefaultMusic() {
        this._switchTrack(this.aiMusic);
    }

    stopRainAmbience() {
        // Stop rain sound effect (for Level 4 sun transition)
        if (this.rainAmbience && this.rainAmbience.state === 'started') {
            // Fade out over 2 seconds for smooth transition
            const now = Tone.now();
            this.rainAmbience.volume.rampTo(-60, 2, now);
            setTimeout(() => {
                if (this.rainAmbience) this.rainAmbience.stop();
                // Reset volume for next use
                this.rainAmbience.volume.value = 0;
            }, 2000);
        }
    }

    toggleSoundMute() {
        this.isSoundMuted = !this.isSoundMuted;
        localStorage.setItem('sheepMarket_soundMuted', this.isSoundMuted);
        
        if (this.isSoundMuted) {
            this.ambience.stop();
            this.ambience.autostart = false;
            
            // Stop rain ambience when muting sound
            if (this.rainAmbience && this.rainAmbience.state === 'started') {
                this.rainAmbience.stop();
                this.rainAmbience.autostart = false;
            }
            
            // Notify GameScene to stop Phaser sounds (rain/wind loops)
            // GameScene will listen for this via a custom property check
            window.dispatchEvent(new CustomEvent('soundMuteChanged', { detail: { muted: true } }));
        } else {
            if (this.ambience.loaded) {
                this.ambience.start();
            } else {
                this.ambience.autostart = true;
            }
            
            // Restart rain ambience if currently on Level 3, 4, or 11
            if (this.currentLevel === 3 || this.currentLevel === 4 || this.currentLevel === 11) {
                console.log(`🌧️ Unmuted - restarting rain for Level ${this.currentLevel}`);
                if (this.rainAmbience.loaded) {
                    this.rainAmbience.start();
                } else {
                    this.rainAmbience.autostart = true;
                }
            }
            
            // Notify GameScene to restart Phaser sounds if needed (Level 12)
            window.dispatchEvent(new CustomEvent('soundMuteChanged', { detail: { muted: false } }));
        }
        
        return this.isSoundMuted;
    }

    toggleMusicMute() {
        this.isMusicMuted = !this.isMusicMuted;
        localStorage.setItem('sheepMarket_musicMuted', this.isMusicMuted);

        const music = this.activeMusic;
        if (!music) return this.isMusicMuted;

        if (this.isMusicMuted) {
            music.stop();
            music.autostart = false;
        } else {
            if (music.loaded) {
                music.start();
            } else {
                music.autostart = true;
            }
        }

        return this.isMusicMuted;
    }

    playCoin() {
        if (this.isSoundMuted) return;
        
        this._playWithBalancing('coinAudio', () => {
            try {
                this.coinAudio.currentTime = 0;
                this.coinAudio.play().catch(e => {});
            } catch (e) {}
        }, 0.5); // 0.5 second duration
    }

    playWalletOpen() {
        if (this.isSoundMuted) return;
        
        this._playWithBalancing('walletOpenAudio', () => {
            try {
                this.walletOpenAudio.currentTime = 0;
                this.walletOpenAudio.play().catch(e => {});
            } catch (e) {}
        }, 0.6); // 0.6 second duration for leather sound
    }

    playGrassPlop() {
        if (this.isSoundMuted) return;
        
        this._playWithBalancing('grassPlopAudio', () => {
            try {
                this.grassPlopAudio.currentTime = 0;
                this.grassPlopAudio.play().catch(e => {});
            } catch (e) {}
        }, 0.4); // 0.4 second duration for plop sound
    }

    playCall() {
        if (this.isSoundMuted) return;
        
        this._playWithBalancing('callAudio', () => {
            try {
                // Clone for overlapping calls
                const clone = this.callAudio.cloneNode();
                clone.volume = 0.6;
                clone.play().catch(e => {});
            } catch (e) {}
        }, 1); // 1 second duration
    }

    playDud() {
        if (this.isSoundMuted) return;
        if (Tone.context.state !== 'running') Tone.start();
        
        try {
            this._playWithBalancing('clickSynth', () => {
                // A low, thud-like sound for "minimum reached"
                // Use Tone.now() + random offset to avoid timing conflicts
                const now = Tone.now();
                const offset = 0.01 + Math.random() * 0.02; // 10-30ms random delay
                this.clickSynth.triggerAttackRelease("C1", "16n", now + offset, 0.5);
            }, 0.3); // 0.3 second duration
        } catch (e) {
            // Silently ignore Tone.js timing errors
            console.warn('Audio timing error (safely ignored):', e.message);
        }
    }

    playClick() {
        if (this.isSoundMuted) return; 
        if (Tone.context.state !== 'running') Tone.start();
        
        try {
            this._playWithBalancing('clickSynth', () => {
                // Subdued click
                // Use "+0.02" with slightly longer delay to avoid Tone.js timing conflicts
                const now = Tone.now();
                this.clickSynth.triggerAttackRelease("G2", "32n", now + 0.02, 0.3);
            }, 0.2); // 0.2 second duration
        } catch (e) {
            // Silently ignore Tone.js timing errors
            console.warn('Audio timing error (safely ignored):', e.message);
        }
    }

    playTrade() {
        if (this.isSoundMuted) return;
        if (Tone.context.state !== 'running') Tone.start();
        
        try {
            this._playWithBalancing('buySynth', () => {
                // Addictive "Ka-ching" style harmonic chord
                // Use relative timing "+" for scheduling slightly in future to prevent "past" errors
                const now = Tone.now();
                this.buySynth.triggerAttackRelease(["C5", "E5", "G5"], "16n", now + 0.05);
                this.buySynth.triggerAttackRelease(["C6"], "32n", now + 0.1);
            }, 0.5); // 0.5 second duration
        } catch (e) {
            console.warn('Audio timing error (safely ignored):', e.message);
        }
    }

    playTick() {
        if (this.isSoundMuted) return;
        if (Tone.context.state !== 'running') Tone.start();
        
        try {
            this._playWithBalancing('clickSynth', () => {
                // Even lighter "Stopwatch" tick
                // C6 is high pitch (light), 0.1 velocity makes it very quiet/subtle
                const now = Tone.now();
                this.clickSynth.triggerAttackRelease("C6", "64n", now + 0.02, 0.1);
            }, 0.1); // 0.1 second duration
        } catch (e) {
            console.warn('Audio timing error (safely ignored):', e.message);
        }
    }

    playTyping() {
        if (this.isSoundMuted) return;
        if (Tone.context.state !== 'running') Tone.start();
        
        this._playWithBalancing('typingSynth', () => {
            // Randomize pitch slightly for organic feel
            // Using high notes for a crisp "mechanical switch" sound
            const pitch = ["C5", "D5"][Math.floor(Math.random() * 2)];
            
            // Use Tone.now() to ensure we don't schedule in the past
            // PolySynth handles overlaps, but explicit timing is safer
            this.typingSynth.triggerAttackRelease(pitch, "32n", Tone.now(), 0.1 + Math.random() * 0.1);
        }, 0.15); // 0.15 second duration
    }

    playCoinFly() {
        if (this.isSoundMuted) return;
        if (Tone.context.state !== 'running') Tone.start();

        this._playWithBalancing('coinFlySynth', () => {
            // Ascending sparkle arpeggio using relative scheduling
            this.coinFlySynth.triggerAttackRelease("C6", "32n", "+0.05");
            this.coinFlySynth.triggerAttackRelease("E6", "32n", "+0.1");
            this.coinFlySynth.triggerAttackRelease("G6", "32n", "+0.15");
            this.coinFlySynth.triggerAttackRelease("C7", "32n", "+0.2");
        }, 0.5); // 0.5 second duration
    }

    playWalletImpact() {
        if (this.isSoundMuted) return;
        if (Tone.context.state !== 'running') Tone.start();

        this._playWithBalancing('coinAudio', () => {
            // Play the requested coin sound
            try {
                const clone = this.coinAudio.cloneNode();
                clone.volume = 0.8; 
                clone.play().catch(e => {});
            } catch (e) {}
        }, 0.8); // 0.8 second duration
    }

    playWalletGainSmall() {
        if (this.isSoundMuted) return;
        if (Tone.context.state !== 'running') Tone.start();
        
        this._playWithBalancing('gainSynth', () => {
            // Simple high ping
            const now = Tone.now();
            this.gainSynth.triggerAttackRelease(["C6"], "16n", now);
        }, 0.3); // 0.3 second duration
    }

    playWalletGainMedium() {
        if (this.isSoundMuted) return;
        if (Tone.context.state !== 'running') Tone.start();
        
        this._playWithBalancing('gainSynth', () => {
            // Major Triad Ascending
            const now = Tone.now();
            this.gainSynth.triggerAttackRelease("C5", "16n", now);
            this.gainSynth.triggerAttackRelease("E5", "16n", now + 0.05);
            this.gainSynth.triggerAttackRelease("G5", "16n", now + 0.1);
        }, 0.5); // 0.5 second duration
    }

    playWalletGainLarge() {
        if (this.isSoundMuted) return;
        if (Tone.context.state !== 'running') Tone.start();
        
        this._playWithBalancing('gainSynth', () => {
            // Grand Fanfare / Arpeggio
            const now = Tone.now();
            this.gainSynth.triggerAttackRelease("C5", "16n", now);
            this.gainSynth.triggerAttackRelease("E5", "16n", now + 0.05);
            this.gainSynth.triggerAttackRelease("G5", "16n", now + 0.1);
            this.gainSynth.triggerAttackRelease("C6", "16n", now + 0.15);
            this.gainSynth.triggerAttackRelease("E6", "16n", now + 0.2);
            this.gainSynth.triggerAttackRelease("G6", "8n", now + 0.25); // Longer hold on top
        }, 0.8); // 0.8 second duration
    }

    playRecordSet() {
        if (this.isSoundMuted) return;
        if (Tone.context.state !== 'running') Tone.start();
        
        this._playWithBalancing('gainSynth', () => {
            // High-impact career record chime: Pentatonic ascending sparkle + high chime
            const now = Tone.now();
            // Ascending pentatonic (C Major Pentatonic)
            const notes = ["C5", "D5", "E5", "G5", "A5", "C6", "D6", "E6", "G6"];
            notes.forEach((note, i) => {
                this.gainSynth.triggerAttackRelease(note, "32n", now + (i * 0.04));
            });
            // Final high impact shimmer chord
            this.gainSynth.triggerAttackRelease(["C7", "E7", "G7"], "4n", now + 0.4);
        }, 1.5);
    }

    playLockedThud() {
        if (this.isSoundMuted) return;
        if (Tone.context.state !== 'running') Tone.start();
        
        this._playWithBalancing('clickSynth', () => {
            // Heavy, dull thud for locked button
            // Use "+0.01" to avoid Tone.js timing conflicts when called rapidly
            this.clickSynth.triggerAttackRelease("G0", "8n", "+0.01", 0.6);
        }, 0.5); // 0.5 second duration
    }

    playFirework() {
        if (this.isSoundMuted) return;
        if (Tone.context.state !== 'running') Tone.start();
        
        this._playWithBalancing('fireworkAudio', () => {
            // Play the real firework audio sample
            if (this.fireworkAudio.loaded) {
                // Add slight random pitch variation for variety (±10%)
                const pitchVariation = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
                this.fireworkAudio.playbackRate = pitchVariation;
                
                // Restart from beginning to allow rapid firing
                this.fireworkAudio.start();
            }
        }, 1.5); // Firework audio duration ~1.5 seconds
    }

    playBankruptcy() {
        if (this.isSoundMuted) return;
        if (Tone.context.state !== 'running') Tone.start();
        
        this._playWithBalancing('bankruptcySynth', () => {
            // Descending, heavy, ominous thud for bankruptcy
            const now = Tone.now();
            this.clickSynth.triggerAttackRelease("G1", "4n", now, 1.0);
            this.clickSynth.triggerAttackRelease("C1", "4n", now + 0.2, 0.8);
            this.clickSynth.triggerAttackRelease("G0", "2n", now + 0.5, 0.6);
            
            // Add a sad descending sweep if possible with existing synths
            this.baaSynth.triggerAttackRelease("C2", "2n", now + 0.1, 0.3);
            this.baaSynth.frequency.rampTo("C1", 1.0, now + 0.1);
        }, 1.5);
    }

    fadeOut(duration = 2) {
        // Ramp down volume for both channels if they are playing
        const now = Tone.now();
        if (this.ambience && this.ambience.state === 'started') {
            this.ambience.volume.rampTo(-60, duration, now);
            setTimeout(() => {
                if (this.ambience) this.ambience.stop();
            }, duration * 1000);
        }
        
        // Fade out rain ambience
        if (this.rainAmbience && this.rainAmbience.state === 'started') {
            this.rainAmbience.volume.rampTo(-60, duration, now);
            setTimeout(() => {
                if (this.rainAmbience) this.rainAmbience.stop();
            }, duration * 1000);
        }
        
        const music = this.activeMusic;
        if (music && music.state === 'started') {
            music.volume.rampTo(-60, duration, now);
            setTimeout(() => {
                if (music) music.stop();
            }, duration * 1000);
        }
    }
}

export const audioManager = new AudioManager();
