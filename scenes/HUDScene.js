import Phaser from 'phaser';
import { CONFIG, ABILITY_CONFIG } from '../config.js';
import { audioManager } from '../audio.js';
import { authService } from '../services/auth.js';
import { leaderboardService } from '../services/leaderboard.js';
import { WoolWalletButtonManager } from './WoolWalletButtonManager.js';

// ═══════════════════════════════════════════════════════════════════════════
// WOOL WALLET DESIGN PHASES
// ═══════════════════════════════════════════════════════════════════════════
// PHASE 1: Visual Design Only (placeholder labels, no logic, no data binding)
import { createWoolWalletDesignConcept } from './WoolWalletRedesignPhase1.js';
// PHASE 2 (when ready): Uncomment below to reconnect all existing logic
// import { createWoolWalletUI } from './WoolWalletRedesign.js';

import { whistleCallSystem } from '../WhistleCallSystem.js';

// ═══════════════════════════════════════════════════════════════════════════
// 🏆 LEVEL 12 VICTORY FLOW — WOOL WALLET HARD GATE
// ═══════════════════════════════════════════════════════════════════════════
// CRITICAL REQUIREMENT: Wool Wallet MUST NOT open until Golden Key sequence completes
//
// COMPLETE SEQUENCE (NO SHORTCUTS):
//   1. Player wins Level 12 (correct final call)
//   2. 15-second celebration (fireworks, confetti, sheep celebrating)
//   3. Golden Sheep walks in from right side
//   4. Golden Sheep offers Golden Key with "TAKE ME" button
//   5. Player clicks "TAKE ME" button
//   6. Golden Sheep flies to Button 0, Golden Key flies to Button 7
//   7. Both objects remain visible on buttons
//   8. Player clicks Golden Key button in Button 7
//   9. Golden Key lifts and spins (4 full rotations)
//  10. Golden Key flies horizontally across UI
//  11. Golden Key visits each level button (1-12) sequentially (150ms each)
//  12. Each level: golden flash, bounce animation, sound effect, visual unlock
//  13. Golden Key disappears in golden burst
//  14. GameScene emits 'golden-key-sequence-complete' event
//  15. Game Won popup appears: "YOU RULE THE PASTURE!" with sheep icon
//  16. Player clicks CONTINUE button (gate checks all flags)
//  17. ONLY NOW: Wool Wallet opens with full rewards
//
// STATE FLAGS:
//   - goldenKeyActivated: Set when player clicks Golden Key button (step 8)
//   - allLevelsUnlockedByGoldenKey: Set when unlock animation completes (step 13)
//   - level12WoolWalletLocked: Set true on win, cleared on CONTINUE click
//   - goldenKeyUnlockSequenceComplete: Set when GameScene completes sequence
//   - gameWonPopupAcknowledged: Set when player clicks CONTINUE
//
// HARD GATES (4 LAYERS OF PROTECTION):
//   1. toggleStatsModal(): Returns early if level12WoolWalletLocked == true
//   2. populateStatsModalForLevelEnd(): Returns early if level12WoolWalletLocked == true
//   3. showGameWonPopup(): Returns early if !goldenKeyActivated || !allLevelsUnlockedByGoldenKey
//   4. CONTINUE button click: Returns early if !goldenKeyActivated || !allLevelsUnlockedByGoldenKey
//
// PERSISTENCE:
//   - Golden Key state saved to localStorage on completion
//   - On subsequent sessions: Wool Wallet unlocked immediately (already completed)
//   - Player keeps full replay access to all 12 levels forever
//
// TESTING CHECKLIST:
//   ✅ Win Level 12 → Wool Wallet does NOT open
//   ✅ 15-second celebration plays → Wool Wallet does NOT open
//   ✅ Golden Sheep appears → Wool Wallet does NOT open
//   ✅ Click "TAKE ME" → Assets fly to buttons → Wool Wallet does NOT open
//   ✅ Try to open Wool Wallet manually → Blocked with error logs
//   ✅ Click Golden Key button → Key lifts and spins → Wool Wallet does NOT open
//   ✅ Golden Key unlocks all levels → Wool Wallet does NOT open
//   ✅ Game Won popup appears → Wool Wallet does NOT open
//   ✅ Click CONTINUE → Wool Wallet opens (FIRST TIME IT OPENS)
//   ✅ Refresh page → Wool Wallet opens normally (already unlocked)
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 DEV MODE — DEVELOPER MASTER KEY (REMOVE OR DISABLE BEFORE RELEASE)
// ═══════════════════════════════════════════════════════════════════════════
// PURPOSE: Allow developers to test any level without affecting progression
// 
// CRITICAL RULES:
// - Does NOT unlock levels for players
// - Does NOT mark levels as completed
// - Does NOT grant Golden Key
// - Does NOT affect player progression
// - Must be invisible to players
// 
// TOGGLE: Press Shift + D to toggle DEV MODE on/off
// ═══════════════════════════════════════════════════════════════════════════
const DEV_MODE = false; // DEFAULT: false (disabled)
// ═══════════════════════════════════════════════════════════════════════════

export class HUDScene extends Phaser.Scene {
    constructor() {
        super('HUDScene');
        
        // DEV MODE STATE (initialized from global constant)
        this.devModeActive = DEV_MODE;
        this.currentLeftPrice = 5; // Start at mid-range (5W out of 10W)
        this.currentRightPrice = 5; // Start at mid-range (5W out of 10W)
        this.lastDisplayedLeftPrice = 5; // Track last displayed rounded value
        this.lastDisplayedRightPrice = 5; // Track last displayed rounded value
        this.orderAmount = null; // No default amount, forcing user selection
        this.balance = 0;
        this.calls = []; // Array of Call objects
        this.totalWoolSpent = 0; // Total wool spent this round
        this.finalCallSide = null; // Final call selection (LEFT or RIGHT)
        
        // Store last round values for display persistence during wool wallet viewing
        this.lastRoundWoolSpent = 0;
        this.lastRoundCalls = null;
        
        // ===== SPAM PREVENTION SYSTEM =====
        // Maximum 3 calls per 5 seconds
        this.callSpamLimit = 3;
        this.callSpamWindow = 5000; // 5 seconds in milliseconds
        this.recentCallTimestamps = []; // Track recent call timestamps
        this.spamMessages = [
            "Whoa! Catch your breath.",
            "Easy there, shepherd. Let the flock breathe.",
            "Slow your roll. Sheep need time too.",
            "Patience, grasshopper. One call at a time.",
            "Even sheep get dizzy with too many calls.",
            "Take a moment. Your flock will wait."
        ];
        this.activeSpamMessage = false; // Track if spam message is currently displaying
        
        // Smooth Number Tracking
        this.displayedLeftPos = 0;
        this.displayedRightPos = 0;
        this.targetLeftPos = 0;
        this.targetRightPos = 0;

        // Fatigue State Tracking
        this.currentFatigueRatio = 0;
        this.isFatigueDanger = false;

        // Tracking for Projected Gains Particles
        this.prevProjectedGains = 0;
        
        // Final Call Locked Projections
        this.finalCallLocked = false;
        this.lockedProjectedGains = 0;
        this.lockedProjectedLosses = 0;
        
        // NEW: Sheep Distribution Tracking
        this.currentSheepLeft = 0;
        this.currentSheepRight = 0;
        
        // NEW: PnL History for Sparkline (stores last 60 data points)
        this.pnlHistory = [];
        this.pnlHistoryMaxLength = 60;
        
        // Initialize state for Best Call highlight
        this.newBestCallRecordSet = false;
        
        // Button Manager - Clean state-based button control
        this.buttonManager = new WoolWalletButtonManager(this);

        // UI OVERLAY GUARD: Prevents click-through to market buttons when closing overlays
        this.uiOverlayOpen = false;
    }

    init(data) {
        // ENDLESS MODE DETECTION
        this.isEndlessMode = data.isEndlessMode || localStorage.getItem('sheepMarket_endlessMode') === 'true';
        this.endlessRound = this.isEndlessMode ? (data.endlessRound || parseInt(localStorage.getItem('sheepMarket_endlessRound') || '1')) : 0;
        
        if (this.isEndlessMode) {
            console.log(`🎨 HUDScene: ENDLESS MODE - Round ${this.endlessRound}`);
            
            // Initialize endless mode stats tracking
            if (!this.endlessStats) {
                this.endlessStats = {
                    bidsWon: 0,
                    bidsLost: 0,
                    highestWool: parseFloat(localStorage.getItem('sheepMarket_endlessBalance') || '100'),
                    startingRound: this.endlessRound
                };
            }
        }
        
        // Track if this is a retry scenario (skip wallet intro)
        this.isRetrying = data.isRetrying || false;
        
        // Ensure balance is a valid number, defaulting to 0
        console.log(`🎨 HUDScene.init() - Received data.balance: ${data.balance}W`);
        this.balance = typeof data.balance === 'number' ? data.balance : parseFloat(data.balance || 0);
        if (isNaN(this.balance)) {
            console.warn(`⚠️ HUDScene.init() - Invalid balance, defaulting to 0`);
            this.balance = 0;
        }
        console.log(`🎨 HUDScene.init() - Final balance set to: ${this.balance}W`);
        
        this.displayBalance = this.balance;
        
        // Track last outcome messages to prevent immediate repeats
        this.lastWinMessage = null;
        this.lastLoseMessage = null;
        this.lastNoCallMessage = null;
        
        // Track whether level intro has completed (to prevent wallet sounds/animations during intro)
        this.introComplete = false;
        
        // Track if lawn mower has been clicked (for "CLICK ME!" text)
        this.lawnMowerHasBeenClicked = false;
        
        // Track bonuses received this level (resets each level)
        this.levelBonuses = []; // Array of {type: string, amount: number}
        
        // LEVEL 12: Sequence is now fully managed by GameScene
        // HUDScene only listens for the 'level12-complete' event to display the end-game popup.
        
        // Prevent false victory UI when not actually finishing Level 12
        this.goldenKeyActivated = data.goldenKeyActivated 
            || localStorage.getItem('sheepMarket_goldenKeyActivated') === 'true';
            
        this.allLevelsUnlockedByGoldenKey = data.allLevelsUnlocked 
            || localStorage.getItem('sheepMarket_allLevelsUnlocked') === 'true';
            
        this.level12WinState = null;

        
        // ===== RESET ABILITY CLICK DEBOUNCE =====
        // Clear all debounce timers to prevent stale state on restart
        this.abilityClickDebounce = {};
        
        // ===== RESET BET CLICK DEBOUNCE =====
        // Clear bet debounce to prevent stale state on restart
        this.betClickDebounce = {};
        
        // ===== RESET GLOBAL WHISTLE COUNTER =====
        // Reset whistle count on every level start/retry
        whistleCallSystem.reset();
        
        // ===== RESET CALL BUTTON COUNTER (CENTRALIZED) =====
        // Single source of truth for call button clicks
        // Reset on level start or retry ONLY
        this.leftCallCount = 0;
        this.rightCallCount = 0;
        
        // Active Level (Current Gameplay Context)
        this.activeLevel = data.activeLevel || parseInt(localStorage.getItem('sheepMarket_playerLevel') || '1');
        
        // STARTING BONUS - Constant for the run
        this.startingBonus = 50.0;
        
        // Set sessionStartWool to the saved level start balance
        // This is used to reset gains/losses tracking for each level
        if (this.activeLevel === 1) {
            this.sessionStartWool = this.balance;
        } else if (this.activeLevel === 2) {
            const saved = localStorage.getItem('sheepMarket_level2StartBalance');
            this.sessionStartWool = saved ? parseFloat(saved) : this.balance;
        } else if (this.activeLevel === 3) {
            const saved = localStorage.getItem('sheepMarket_level3StartBalance');
            this.sessionStartWool = saved ? parseFloat(saved) : this.balance;
        } else if (this.activeLevel === 4) {
            const saved = localStorage.getItem('sheepMarket_level4StartBalance');
            this.sessionStartWool = saved ? parseFloat(saved) : this.balance;
        } else if (this.activeLevel === 5) {
            const saved = localStorage.getItem('sheepMarket_level5StartBalance');
            this.sessionStartWool = saved ? parseFloat(saved) : this.balance;
        } else if (this.activeLevel === 6) {
            const saved = localStorage.getItem('sheepMarket_level6StartBalance');
            this.sessionStartWool = saved ? parseFloat(saved) : this.balance;
        } else {
            this.sessionStartWool = this.balance;
        }
        
        this.roundsPlayed = 0;
        
        // Session Stats (Level 1)
        if (data && data.sessionStats) {
            console.log('📊 HUDScene: Initializing with carried over session stats');
            this.sessionGains = data.sessionStats.sessionGains || 0;
            this.sessionLosses = data.sessionStats.sessionLosses || 0;
            this.totalWoolLost = data.sessionStats.totalWoolLost || 0;
            this.sessionWins = data.sessionStats.sessionWins || 0;
            this.sessionLossesCount = data.sessionStats.sessionLossesCount || 0;
        } else {
            this.sessionGains = 0;
            this.sessionLosses = 0;
            this.totalWoolLost = 0; // Legacy tracking
            this.sessionWins = 0;
            this.sessionLossesCount = 0;
        }
        
        // Reset recent level stats to prevent showing stale data from previous attempts
        this.recentLevelStats = {
            gains: 0,
            losses: 0
        };
        this.recentLevelResult = null;

        // One-shot guard for round-settled processing
        this._roundSettledProcessed = false;
        
        this.spentThisRound = 0; 
        this.gameScore = parseInt(localStorage.getItem('sheepMarket_gameScore') || '0');
        this.negAmountClicks = 0; 

        // Wallet State
        this.isWalletLocked = true; // Starts locked for Level 1
        
        // Track disabled state for buttons
        this.isLeftDisabled = false;
        this.isRightDisabled = false;
        this.isPaused = false;
        
        // Load history for 24h stats
        try {
            const historyKey = this.getStorageKey('history');
            this.tradeHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
        } catch(e) {
            this.tradeHistory = [];
        }

        // Load Lifetime Stats
        this.lifetimeGains = parseFloat(localStorage.getItem(this.getStorageKey('lifetimeGains')) || '0');
        this.lifetimeLosses = parseFloat(localStorage.getItem(this.getStorageKey('lifetimeLosses')) || '0');
        this.lifetimeSpentCalls = parseFloat(localStorage.getItem(this.getStorageKey('lifetimeSpentCalls')) || '0');
        this.lifetimeBestCall = parseFloat(localStorage.getItem(this.getStorageKey('lifetimeBestCall')) || '0');
        
        // ===== PER-CALL LOSS TRACKING =====
        // Track wool losses per call per level
        // Format: { level: number, calls: [{side: 'LEFT'|'RIGHT', woolSpent: number, lost: boolean}] }
        try {
            const lossKey = this.getStorageKey('perLevelCallLosses');
            this.perLevelCallLosses = JSON.parse(localStorage.getItem(lossKey) || '{}');
        } catch(e) {
            this.perLevelCallLosses = {};
        }
        
        // NEW: Load All-Time Final Call History (for wallet display)
        try {
            const finalCallKey = this.getStorageKey('finalCallHistory');
            this.finalCallHistory = JSON.parse(localStorage.getItem(finalCallKey) || '[]');
        } catch(e) {
            this.finalCallHistory = [];
        }
        
        // NEW: Load Level Performance History (for charts)
        try {
            const perfKey = this.getStorageKey('levelPerformance');
            this.levelPerformanceHistory = JSON.parse(localStorage.getItem(perfKey) || '[]');
        } catch(e) {
            this.levelPerformanceHistory = [];
        }
        
        // ===== PER-LEVEL CALL HISTORY SYSTEM =====
        // Tracks all final call attempts per level, including skipped rounds
        // Format: { level: number, attempts: [{side: 'LEFT'|'RIGHT'|null, correct: boolean}] }
        try {
            const callHistoryKey = this.getStorageKey('perLevelCallHistory');
            this.perLevelCallHistory = JSON.parse(localStorage.getItem(callHistoryKey) || '{}');
        } catch(e) {
            this.perLevelCallHistory = {};
        }
        
        // Ensure current level has an entry
        if (!this.perLevelCallHistory[this.activeLevel]) {
            this.perLevelCallHistory[this.activeLevel] = [];
        }
        
        // ===== WIN/LOSS STREAK SYSTEM =====
        // Tracks consecutive correct final calls across all levels
        this.winStreak = parseInt(localStorage.getItem(this.getStorageKey('winStreak')) || '0');
        
        // ===== CALL EFFICIENCY TRACKING =====
        // Tracks wool gained vs wool spent per level
        // Format: { level: number, woolGained: number, woolSpent: number, efficiency: number }
        try {
            const efficiencyKey = this.getStorageKey('callEfficiencyHistory');
            this.callEfficiencyHistory = JSON.parse(localStorage.getItem(efficiencyKey) || '{}');
        } catch(e) {
            this.callEfficiencyHistory = {};
        }
        
        // Track current round wool spent (for efficiency calculation) - synced with totalWoolSpent
        this.woolSpentThisRound = 0;
        
        // Track last streak bonus for display in wallet
        this.lastStreakBonus = 0;
        
        // Tutorial State
        this.isTutorialActive = data.tutorialMode || false;
        this.tutorialStep = 0;
        this.tutorialComplete = !this.isTutorialActive;
        
        // Track how many times tutorial has been started to offer SKIP option
        this.tutorialStarts = parseInt(localStorage.getItem('sheepMarket_tutorialStarts') || '0');
        
        // Player Level (Max Unlocked)
        this.playerLevel = parseInt(localStorage.getItem('sheepMarket_playerLevel') || '1');
        
        // Check transition flag from GameScene
        this.fromGraduation = data.fromGraduation || false;

        // Daily Login Data
        this.lastLoginDate = localStorage.getItem('sheepMarket_lastLoginDate');
        this.loginStreak = parseInt(localStorage.getItem('sheepMarket_loginStreak') || '0');

        // FLAG: If starting level 2, keep new buttons locked until intro finishes
        this.lockLevel2Start = (this.activeLevel === 2);
        
        // FLAG: If starting level 3, keep new buttons locked until intro finishes
        this.lockLevel3Start = (this.activeLevel === 3);

        // FLAG: Track if we just graduated in this session to trigger transition
        this.justGraduated = false;

        // Wallet Lock State based on ACTIVE level
        // Only Level 1 has a locked wallet (Entrance Exam mode)
        // Level 2 locks wallet temporarily for graduation animation
        // Levels 3+ are always unlocked
        if (this.activeLevel === 1) {
            // Unlock wallet for retries so player can see their carried over balance
            this.isWalletLocked = !this.isRetrying;
        } else if (this.activeLevel === 2 && this.fromGraduation) {
            this.isWalletLocked = true; // Will be unlocked by animation
        } else {
            this.isWalletLocked = false;
        }

        // Global Input Lock
        this.isControlsLocked = false;
        
        // Audio Throttling
        this.lastAudioTime = 0;
        this.lastAudioValue = 0;

        // Fatigue State Tracking (REMOVED)
        // this.currentFatigueRatio = 0;
        // this.isFatigueDanger = false;
        
        // Confidence Tracking
        this.isWolfActive = false;

        // Market Active State
        this.isMarketActive = false;
        
        // Reset State Flags for Restart/Retry
        this.isClaimPopupOpen = false;
        this.isResolvingFreeWool = false;
        this.isShowingBrokeAlert = false;
        this.isTransitioning = false;
        this.isForcedRestartModal = false; // Initialize forced restart flag
        
        // Track if we've already granted starter wool (prevent double grants)
        this.hasGrantedStarterWool = false;
        
        // COOLDOWN SYSTEM
        this.callCooldownActive = false;
        this.callCooldownDuration = 1000; // 1 second in milliseconds
        this.lastCallTime = 0;
        this.rapidCallCount = 0; // Track consecutive rapid calls
        this.woolCostMultiplier = 1.0; // 1.0 = normal, 1.2 = +20%, etc.
        this.timeLeft = 60; // Initialize timeLeft
        this.finalCallLockShown = false; // Initialize final call lock flag
        
        // PAUSE MODE (for wallet clicks during gameplay)
        this.isPauseMode = false;
        
        // LOSS MODAL (for bankruptcy/loss scenarios)
        this.isLossModal = false;
        
        // WIN MODAL (for level completion/win scenarios)
        this.isWinModal = false;
        
        this.levelStartBalance = 0; // Track balance at start of level
    }

    // Helper to lock controls and update visuals
    setControlsLocked(locked) {
        this.isControlsLocked = locked;
        this.updateBetButtonInteractability();
    }

    // Helper method to get correct localStorage key based on game mode
    getStorageKey(baseKey) {
        if (this.isEndlessMode) {
            return `endless_${baseKey}`;
        }
        return `sheepMarket_${baseKey}`;
    }

    // Helper for "Integer" display (No decimals) - UPDATED TO 1 DECIMAL FOR CONSISTENCY
    // Handles floating-point precision errors
    formatWool(val) {
        if (typeof val !== 'number') return val;
        // Enforce exactly one decimal place with thousands separators
        return val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    
    // Helper for displaying wool with 1 decimal place (for precise values)
    formatWoolDecimal(val) {
        if (typeof val !== 'number') return val;
        // Round to 1 decimal place to avoid floating-point errors
        return (Math.round(val * 10) / 10).toFixed(1);
    }

    // Helper for CALL button price display (1 decimal place)
    // SINGLE SOURCE OF TRUTH for price formatting
    // Used exclusively for LEFT/RIGHT button price text
    // Keeps internal calculations at full precision, displays rounded
    formatPrice(price) {
        if (typeof price !== 'number') return '0.0';
        // Round to 1 decimal place and format consistently
        const rounded = Math.round(price * 10) / 10;
        return rounded.toFixed(1);
    }

    // Track call spending for lifetime stats
    trackCallSpending(amount) {
        this.lifetimeSpentCalls += amount;
        localStorage.setItem(this.getStorageKey('lifetimeSpentCalls'), this.lifetimeSpentCalls.toString());
        console.log(`💸 Call Spending Tracked: +${amount.toFixed(1)}W (Total: ${this.lifetimeSpentCalls.toFixed(1)}W)`);
        
        // Update modal display in real-time if wool wallet is open
        if (this.statsContainer && this.statsContainer.alpha > 0 && this.statLabels) {
            // Real-time updates removed - all-time stats section removed
        }
    }

    /**
     * Helper to automatically shrink text to fit within a specific width
     * @param {Phaser.GameObjects.Text} textObj The text object to adjust
     * @param {number} maxWidth Maximum allowed width in pixels
     * @param {number} defaultFontSize Initial/preferred font size
     * @param {number} minFontSize Minimum allowed font size before wrapping
     */
    fitTextToWidth(textObj, maxWidth, defaultFontSize, minFontSize = 24) {
        if (!textObj) return;
        
        let currentSize = defaultFontSize;
        textObj.setFontSize(currentSize);
        textObj.setWordWrapWidth(0); // Disable wrapping for measurement
        
        // Use the object's current alignment/origin to determine wrap alignment
        const align = textObj.originX === 0.5 ? 'center' : (textObj.originX === 1 ? 'right' : 'left');
        textObj.setAlign(align);
        
        // Loop to reduce font size if text is too wide
        // Using a small safety margin for width
        const safetyWidth = maxWidth - 20;
        
        while (textObj.width > safetyWidth && currentSize > minFontSize) {
            currentSize -= 2;
            textObj.setFontSize(currentSize);
        }
        
        // If still too wide, enable word wrap as a last resort
        if (textObj.width > safetyWidth) {
            textObj.setWordWrapWidth(safetyWidth);
        }
    }

    // Start blinking animation for "IN PROGRESS" text
    startInProgressBlink() {
        // Stop any existing blink animation first
        this.stopInProgressBlink();
        
        // Create new blink animation
        if (this.statLabels && this.statLabels.levelOutcome) {
            this.inProgressBlinkTween = this.tweens.add({
                targets: this.statLabels.levelOutcome,
                alpha: { from: 1, to: 0.3 },
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    // Stop blinking animation for "IN PROGRESS" text
    stopInProgressBlink() {
        if (this.inProgressBlinkTween) {
            this.inProgressBlinkTween.stop();
            this.inProgressBlinkTween = null;
        }
        
        // Reset alpha to full opacity
        if (this.statLabels && this.statLabels.levelOutcome) {
            this.statLabels.levelOutcome.setAlpha(1);
        }
    }

    // Create particle explosion effect behind balance text
    createBalanceExplosionEffect(x, y, gainAmount) {
        // Create a temporary particle system for the explosion
        const particleCount = Math.min(50, Math.max(15, Math.floor(gainAmount / 10)));
        
        // Generate sparkle texture if it doesn't exist
        if (!this.textures.exists('balance_sparkle')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xFFD700, 1); // Gold color
            graphics.fillCircle(8, 8, 8);
            graphics.generateTexture('balance_sparkle', 16, 16);
            graphics.destroy();
        }
        
        // Create particle emitter at balance text position
        const emitter = this.add.particles(x, y, 'balance_sparkle', {
            speed: { min: 150, max: 300 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            gravityY: 200,
            blendMode: 'ADD',
            quantity: particleCount
        });
        
        // Set depth behind balance text
        emitter.setDepth(49);
        
        // Explode once
        emitter.explode();
        
        // Destroy emitter after particles are done
        this.time.delayedCall(800, () => {
            emitter.destroy();
        });
    }

    // Deadlock Detection: Check if player is stuck with 0 wool and no way to proceed
    checkForDeadlock() {
        // Check if:
        // 1. Player has 0 wool
        // 2. Player has placed 0 calls this round
        const hasZeroWool = this.balance <= 0;
        const hasPlacedNoCalls = this.calls.length === 0;
        
        if (hasZeroWool && hasPlacedNoCalls) {
            console.log('🚨 DEADLOCK DETECTED: 0 Wool, 0 Calls - Granting Emergency Wool');
            return true; // Grant emergency wool
        }
        
        return false;
    }

    // Grant emergency wool to prevent deadlock (ONE-TIME ONLY per game)
    // REMOVED: Emergency wool system per user request

    // REMOVED: Emergency wool message per user request

    // Trigger RESTART GAME mode (show modal with only RESTART GAME button)
    // NOTE: This is no longer used since emergency wool always triggers
    triggerRestartGameMode() {
        console.log('🔄 ENTERING RESTART GAME MODE');
        
        // Set flag for restart game mode
        this.isRestartGameMode = true;
        this.isLossModal = false;
        this.isWinModal = false;
        
        // Populate stats and open modal with RESTART GAME button
        this.populateStatsModalForLevelEnd();
        this.toggleStatsModal();
    }
    
    // Execute Level 1 reset (called when RESTART GAME button is clicked)
    executeLevel1Reset() {
        console.log('🔄 ═══════════════════════════════════════════════');
        console.log('🔄 EXECUTING FULL RUN RESET (NEW GAME)');
        console.log('🔄 ═══════════════════════════════════════════════');
        
        this.levelStartBalance = 0;
        
        // 1. Reset Internal In-Memory State
        this.balance = 0; // Starting wool is granted by the Level 1 Intro sequence
        this.sessionGains = 0;
        this.sessionLosses = 0;
        this.totalWoolLost = 0;
        this.sessionWins = 0;
        this.sessionLossesCount = 0;
        this.lifetimeGains = 0;
        this.lifetimeLosses = 0;
        this.lifetimeSpentCalls = 0;
        this.lifetimeBestCall = 0;
        this.winStreak = 0;
        this.gameScore = 0;
        this.roundsPlayed = 0;
        this.tradeHistory = [];
        this.finalCallHistory = [];
        this.levelPerformanceHistory = [];
        this.perLevelCallHistory = { 1: [] };
        this.callEfficiencyHistory = {};
        this.perLevelCallLosses = {};
        this.levelBonuses = [];
        
        // 2. Wipe Persistent LocalStorage
        const keysToClear = [
            'sheepMarket_playerLevel',
            'sheepMarket_history',
            'sheepMarket_lifetimeGains',
            'sheepMarket_lifetimeLosses',
            'sheepMarket_lifetimeSpentCalls',
            'sheepMarket_perLevelCallLosses',
            'sheepMarket_finalCallHistory',
            'sheepMarket_levelPerformance',
            'sheepMarket_perLevelCallHistory',
            'sheepMarket_winStreak',
            'sheepMarket_callEfficiencyHistory',
            'sheepMarket_gameScore',
            'sheepMarket_level2StartBalance',
            'sheepMarket_level3StartBalance',
            'sheepMarket_level4StartBalance',
            'sheepMarket_level5StartBalance',
            'sheepMarket_level6StartBalance',
            'sheepMarket_goldenKeyActivated',
            'sheepMarket_allLevelsUnlocked',
            'sheepMarket_lifetimeBestCall'
        ];
        
        keysToClear.forEach(key => localStorage.removeItem(key));
        
        // Save initial balance state via authService
        authService.saveBalance(0);
        
        // 3. Reset UI Displays
        if (this.statLabels) {
            this.statLabels.totalBalance.setText('0W');
            this.statLabels.woolSpent.setText('0W');
            this.statLabels.levelGains.setText('+0W');
            this.statLabels.levelLosses.setText('-0W');
            this.statLabels.levelOutcome.setText('PENDING');
            this.statLabels.levelBonuses.setText('0W');
        }
        
        // Update high score display if it exists
        if (this.highScoreText) this.highScoreText.setText('BEST: 0');
        
        // Set current player level tracking to 1
        this.playerLevel = 1;
        this.activeLevel = 1;
        
        // Close modal
        this.toggleStatsModal();
        
        // Request Level 1 restart - ensure it starts completely fresh
        this.time.delayedCall(300, () => {
            const gameScene = this.scene.get('GameScene');
            if (gameScene) {
                gameScene.events.emit('request-next-level', { 
                    level: 1, 
                    extra: { fromReset: true, force: true, resetStats: true } 
                });
            }
        });
    }

    showLevel1ResetMessage() {
        const messageText = "🔄 RESTARTING\nReturning to Level 1\nwith 50 Fresh WOOL!";
        
        const toast = this.add.container(CONFIG.width / 2, CONFIG.height / 2);
        toast.setDepth(6000);
        
        const bg = this.add.graphics();
        bg.fillStyle(0x4444ff, 0.95);
        bg.fillRoundedRect(-250, -80, 500, 160, 20);
        bg.lineStyle(4, 0xfcd535, 1);
        bg.strokeRoundedRect(-250, -80, 500, 160, 20);
        
        const text = this.add.text(0, 0, messageText, {
            font: 'bold 24px Inter',
            fill: '#ffffff',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        toast.add([bg, text]);
        
        // Animate in
        toast.setScale(0);
        this.tweens.add({
            targets: toast,
            scale: 1,
            duration: 400,
            ease: 'Back.easeOut'
        });
        
        audioManager.playCoin();
    }

    update(time, delta) {
        // Emergency wool system removed
        
        // Ability Cooldowns - Optimized to reduce graphics redraws
        if (this.abilityButtons) {
            this.abilityButtons.forEach((btn, index) => {
                if (btn && btn.onCooldown) {
                    btn.cooldownTimer -= delta;
                    
                    if (btn.cooldownTimer <= 0) {
                        // Cooldown Finished
                        btn.onCooldown = false;
                        // Only show icon if it's not a special image button
                        if (index !== 2 && index !== 3 && index !== 4 && index !== 5 && index !== 1) {
                            btn.icon.setVisible(true);
                        }
                        if (btn.dogImage) {
                            btn.dogImage.setVisible(true);
                            btn.dogImage.setAlpha(1);
                        }
                        if (btn.grassTuftImage) btn.grassTuftImage.setVisible(true);
                        if (btn.lawnMowerImage) btn.lawnMowerImage.setVisible(true);
                        if (btn.boneIcon) btn.boneIcon.setVisible(true);
                        if (btn.goldenCloverImage) btn.goldenCloverImage.setVisible(true);
                        if (btn.cdText) btn.cdText.setVisible(false);
                        
                        // Redraw Active State - only once when cooldown finishes
                        const radius = 56;
                        btn.bg.clear();
                        btn.bg.fillStyle(0x1a1a1a, 1);
                        btn.bg.lineStyle(3, 0xfcd535, 1);
                        btn.bg.fillCircle(0, 0, radius);
                        btn.bg.strokeCircle(0, 0, radius);
                        
                        // Flash Ready
                        this.tweens.add({
                            targets: btn.container,
                            scale: 1.2,
                            duration: 200,
                            yoyo: true
                        });
                        
                    } else {
                        // Update Text only once per second instead of every frame
                        if (btn.cdText && index !== 6) {
                            const newSeconds = Math.ceil(btn.cooldownTimer / 1000);
                            if (!btn._lastCdSeconds || btn._lastCdSeconds !== newSeconds) {
                                btn._lastCdSeconds = newSeconds;
                                btn.cdText.setText(newSeconds);
                            }
                        }
                    }
                }
                
                // BLACK SHEEP (Button 6) - Hide countdown text when active
                if (index === 6 && btn.cdText) {
                    btn.cdText.setVisible(false);
                }
                
                // GOLDEN CLOVER COUNTDOWN (Button 1) - Syncs with level timer
                if (index === 1 && btn && btn.countdownActive) {
                    const gameScene = this.scene.get('GameScene');
                    if (gameScene && gameScene.timeLeft !== undefined) {
                        const newSeconds = Math.max(0, Math.ceil(gameScene.timeLeft));
                        // Only update if seconds changed
                        if (!btn._lastCloverSeconds || btn._lastCloverSeconds !== newSeconds) {
                            btn._lastCloverSeconds = newSeconds;
                            if (btn.cdText) {
                                btn.cdText.setText(newSeconds.toString());
                                
                                // Match level timer visual urgency (red at 10 seconds)
                                if (gameScene.timeLeft <= 10) {
                                    btn.cdText.setColor('#ff4444');
                                } else {
                                    btn.cdText.setColor('#ffffff');
                                }
                            }
                        }
                        
                        // Level ended - countdown complete
                        if (gameScene.timeLeft <= 0) {
                            btn.countdownActive = false;
                            if (btn.cdText) btn.cdText.setVisible(false);
                        }
                    }
                }
            });
        }

        // Smooth interpolation removed - using combined unrealized PnL display instead
    }

    create() {
        window.dispatchEvent(new CustomEvent('hide-auth-ui'));
        const gameScene = this.scene.get('GameScene');

        // ── Global GameFlowManager event listeners ───────────────────────────
        // Remove stale listeners first (scene may have been restarted)
        this.game.events.off('flow:show-warning');
        this.game.events.off('flow:blocked-advance');
        this.game.events.off('flow:blocked-retry');
        this.game.events.off('flow:retry-cost-deducted');

        // Show warning toast when GameFlowManager blocks a transition
        this.game.events.on('flow:show-warning', ({ message }) => {
            if (this.showToast) this.showToast(message);
        });

        // Blocked advance: highlight the NEXT LEVEL button as unavailable
        this.game.events.on('flow:blocked-advance', ({ level, balance, required }) => {
            console.warn(`[HUDScene] Advance blocked at level ${level}: ${balance}W < ${required}W required`);
            // Shake the action button to signal the block
            if (this.buttonManager && this.buttonManager.actionBtn) {
                this.tweens.add({
                    targets: this.buttonManager.actionBtn,
                    x: this.buttonManager.actionBtn.x + 8,
                    duration: 50,
                    yoyo: true,
                    repeat: 4,
                    ease: 'Sine.easeInOut',
                });
            }
        });

        // Blocked retry: show warning (newGame will fire automatically after delay)
        this.game.events.on('flow:blocked-retry', ({ level, balance, cost }) => {
            console.warn(`[HUDScene] Retry blocked at level ${level}: ${balance}W < ${cost}W cost`);
        });

        // Retry cost deducted: update wallet balance display immediately
        this.game.events.on('flow:retry-cost-deducted', ({ cost, balance }) => {
            this.balance = balance;
            if (this.balanceText) {
                this.balanceText.setText(`${this.formatWool(balance)}W`);
            }
            console.log(`[HUDScene] 💸 Retry cost -${cost}W applied. New balance: ${balance}W`);
        });
        // ────────────────────────────────────────────────────────────────────
        
        // LEVEL 9+: Set target music but DON'T start yet (will start on GO!)
        if (this.activeLevel === 9) {
            console.log('🎵 LEVEL 9 CREATE: Setting target music (will start on GO!)');
            
            // Start ambience/sound effects only
            audioManager.startSoundEffects();
            
            this.targetMusic = 'level9';
        } else if (this.activeLevel >= 10) {
            console.log('🎵 LEVEL 10+ CREATE: NO MUSIC, but keep ambience');
            
            // Start ambience/sound effects (bird sounds should play)
            audioManager.startSoundEffects();
            
            // Stop all music explicitly
            audioManager.stopAllMusic();
            
            this.targetMusic = 'level10';
        } else {
            // Prepare correct music track but DO NOT start it yet
            // Music will be triggered by playStartSequence -> GO!
            if (this.activeLevel === 2) {
                this.targetMusic = 'level2';
            } else if (this.activeLevel >= 3) {
                this.targetMusic = 'level3';
            } else {
                this.targetMusic = 'default';
            }
            
            // Ensure any previous music is stopped to start fresh
            audioManager.stopMusic();
        }

        // Generate Thick Arrow Texture (Landing Page Style)
        if (!this.textures.exists('thick_arrow')) {
            const gfx = this.make.graphics({ x: 0, y: 0, add: false });
            
            gfx.fillStyle(0xffffff, 1); // White for tinting
            gfx.lineStyle(6, 0x000000, 1); // Black stroke
            
            // Draw relative to center of texture (65, 75)
            const cx = 65, cy = 75;
            
            gfx.beginPath();
            gfx.moveTo(cx - 25, cy + 40); // Bottom Left Stem
            gfx.lineTo(cx + 25, cy + 40); // Bottom Right Stem
            gfx.lineTo(cx + 25, cy - 10); // Top Right Stem
            gfx.lineTo(cx + 60, cy - 10); // Right Head Wing
            gfx.lineTo(cx + 0,  cy - 70); // Tip
            gfx.lineTo(cx - 60, cy - 10); // Left Head Wing
            gfx.lineTo(cx - 25, cy - 10); // Top Left Stem
            gfx.closePath();
            
            gfx.fillPath();
            gfx.strokePath();
            
            gfx.generateTexture('thick_arrow', 130, 150);
        }

        // UI COORDINATES
        const topBarY = 40;
        const timerY = 220;
        const controlsY = CONFIG.height - 200; // Raised slightly for larger panel

        // 1. TOP INFO BAR (Floating Glassmorphism)
        this.createTopBar(topBarY);
        
        // 1b. TOOLKIT BUTTON (Top Right)
        this.createToolkitButton();

        // 2. PROBABILITY BAR (Very top edge)
        this.createProbBar();
        
        // 3. STATS MODAL (Hidden by default)
        this.createStatsModal();
        
        // 3b. LEADERBOARD MODAL (Hidden by default)
        this.createLeaderboardModal();
        
        // 3c. ENDLESS MODE GAME OVER POPUP (Hidden by default)
        if (this.isEndlessMode) {
            this.createEndlessModeGameOverPopup();
        }

        // 4. LARGE FLOATING TIMER
        this.timerText = this.add.text(CONFIG.width / 2, timerY, '60', {
            font: '900 130px Inter',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 12
        }).setOrigin(0.5);
        this.timerText.setAlpha(0); // Hidden initially until round starts
        
        // ENDLESS MODE: Keep timer hidden permanently
        if (this.isEndlessMode) {
            this.timerText.setVisible(false);
        }

        // 5. MAIN CONTROL PANEL (Cohesive bottom group)
        this.createControlPanel(controlsY);
        
        // 5b. NEW INDICATORS (Farm-themed UI enhancements)
        this.createSheepDistributionBar();
        this.createPnLSparkline();
        // Call counter logic removed - red counter text remains visible
        this.createGoldenSheepTracker();

        // 6. LEVEL INDICATORS (Bottom Right)
        this.createLevelIndicators();

        // Status Messages
        this.statusText = this.add.text(CONFIG.width / 2, 400, '', {
            font: '600 64px Inter', // SemiBold (600 weight)
            fill: '#ffffff',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 10
        }).setOrigin(0.5);
        this.statusText.setDepth(100);
        this.statusText.setAlpha(0);

        // Check for Tutorial / First Time User (Strictly Level 1 only)
        // If Active Level is 1, we ALWAYS enforce Entrance Exam flow
        if (this.activeLevel === 1) {
            this.statusText.setText('LEVEL STARTING');
            this.statusText.setAlpha(0); // Hidden initially, shown by events or tutorial

            // Enable tutorial clamping in GameScene
            gameScene.events.emit('set-tutorial-mode', true);

            // LEVEL 1 STARTUP SEQUENCE
            // Skip intro if this is a retry
            if (this.isRetrying) {
                // On Level 1 retry: Never grant free wool, just start immediately
                // This preserves their current balance (of 0 or higher) and skips the popup
                console.log('🔄 Level 1 Retry: Skipping intro and free wool popup');
                this.playStartSequence();
            } else {
                this.showLevel1Intro(gameScene);
            }
            
        } else if (this.activeLevel === 2) {
            // LEVEL 2 STARTUP SEQUENCE
            this.showLevel2Intro(gameScene);
            // Ensure tutorial mode is disabled for Level 2+
            gameScene.events.emit('set-tutorial-mode', false);
        } else if (this.activeLevel === 3) {
            // LEVEL 3 STARTUP SEQUENCE
            this.showLevel3Intro(gameScene);
            gameScene.events.emit('set-tutorial-mode', false);
        } else if (this.activeLevel === 4) {
            // LEVEL 4 STARTUP SEQUENCE
            if (this.fromGraduation) {
                // Skip wallet popup on graduation, just show intro
                this.showLevel4Intro(gameScene);
                gameScene.events.emit('set-tutorial-mode', false);
            } else {
                this.showLevel4Intro(gameScene);
                gameScene.events.emit('set-tutorial-mode', false);
            }
        } else if (this.activeLevel === 5) {
            // LEVEL 5 STARTUP SEQUENCE
            this.showLevel5Intro(gameScene);
            gameScene.events.emit('set-tutorial-mode', false);
        } else if (this.activeLevel === 6) {
            // LEVEL 6 STARTUP SEQUENCE
            this.showLevel6Intro(gameScene);
            gameScene.events.emit('set-tutorial-mode', false);
        } else if (this.activeLevel === 7) {
            // LEVEL 7 STARTUP SEQUENCE
            this.showLevel7Intro(gameScene);
            gameScene.events.emit('set-tutorial-mode', false);
        } else if (this.activeLevel === 8) {
            // LEVEL 8 STARTUP SEQUENCE
            this.showLevel8Intro(gameScene);
            gameScene.events.emit('set-tutorial-mode', false);
        } else if (this.activeLevel === 9) {
            // LEVEL 9 STARTUP SEQUENCE
            this.showLevel9Intro(gameScene);
            gameScene.events.emit('set-tutorial-mode', false);
        } else if (this.activeLevel === 10) {
            // LEVEL 10 STARTUP SEQUENCE
            this.showLevel10Intro(gameScene);
            gameScene.events.emit('set-tutorial-mode', false);
        } else {
            // Level 11+ Normal start (Generic fallback)
            // Start sound effects (farm ambience)
            audioManager.startSoundEffects();
            this.playStartSequence();
            
            // Ensure tutorial mode is disabled
            gameScene.events.emit('set-tutorial-mode', false);
        }

        if (this.isTutorialActive) {
            this.startTutorial();
        }

        // Daily Login Bonus REMOVED - Only using FREE WOOL popup

        // ===== CLEAN UP PREVIOUS EVENT LISTENERS =====
        // Remove all GameScene event listeners to prevent duplicate registrations
        // This is critical to prevent multiple counter increments from stacked listeners
        gameScene.events.off('update-market');
        gameScene.events.off('balance-updated');
        gameScene.events.off('calls-updated');
        gameScene.events.off('round-settled');
        gameScene.events.off('round-started');
        gameScene.events.off('unlock-ability-button');
        gameScene.events.off('grass-spawned');
        gameScene.events.off('market-event');
        gameScene.events.off('bones-collected');
        gameScene.events.off('bounce-bone-button');
        gameScene.events.off('level12-complete'); // ✅ FIX: Clear stale listeners on boot

        // Events - Register ONCE per scene create
        gameScene.events.on('bones-collected', (count) => {
            // Update bone counter on button 5
            const btn = this.abilityButtons[5];
            if (btn && btn.boneCountText) {
                btn.boneCountText.setText(`${count}`);
                // LEVEL 7: Only show counter if button is unlocked (after bone impact)
                // LEVEL 8+: Always show counter (button starts unlocked)
                if (!btn.locked) {
                    btn.boneCountText.setVisible(true);
                }
            }
        });
        
        gameScene.events.on('update-market', (data) => {
            this.currentLeftPrice = data.leftPrice;
            this.currentRightPrice = data.rightPrice;
            this.finalCallSide = data.finalCallSide; // Update final call side
            
            // NEW: Update sheep distribution
            this.currentSheepLeft = data.sheepLeft || 0;
            this.currentSheepRight = data.sheepRight || 0;
            
            // Track when we cross into FINAL CALL territory (15 seconds)
            const wasAbove15 = this.timeLeft > 15;
            const isNow15OrBelow = data.timeLeft <= 15;
            
            this.timeLeft = data.timeLeft; // Store for lock logic
            this.updatePrices();
            this.updatePortfolioDisplay();
            this.updateSheepDistributionBar();
            
            // ENDLESS MODE: Don't update timer text (it's hidden)
            if (!this.isEndlessMode) {
                this.timerText.setText(`${data.timeLeft}`);
            }
            
            // Final Call Warning Logic (handles all warning display)
            this.updateFinalCallWarning(data.timeLeft, data.finalCallSide);

            // Confidence Meter Update (REMOVED)

            if (data.timeLeft <= 10 && data.timeLeft > 0) { // Only animate if running
                this.timerText.setColor('#ff4444');
                if (!this.timerTween) {
                    this.timerTween = this.tweens.add({
                        targets: this.timerText,
                        scale: 1.1,
                        duration: 500,
                        yoyo: true,
                        repeat: -1
                    });
                }
            } else {
                this.timerText.setColor('#ffffff');
                if (this.timerTween) {
                    this.timerTween.stop();
                    this.timerTween = null;
                    this.timerText.setScale(1);
                }
            }
        });

        gameScene.events.on('balance-updated', (bal) => {
            console.log('🎯 balance-updated event received in HUDScene. Balance:', bal);
            const diff = bal - this.balance;
            
            this.balance = bal;
            
            // Guard: balanceText may not exist yet if this fires before create() completes
            if (!this.balanceText) {
                console.warn('⚠️ balanceText does not exist yet');
                return;
            }

            // --- SLOT MACHINE SPINNING ANIMATION ---
            if (diff !== 0 && Math.abs(diff) >= 0.01) {
                console.log('🎰 Starting balance animation. Diff:', diff);
                const duration = Math.min(2000, Math.max(600, Math.abs(diff) * 15));
                
                if (this.balanceTween) this.balanceTween.stop();
                if (this.spinTween) this.spinTween.stop();
                
                const startValue = this.displayBalance;
                const endValue = this.balance;
                
                this.balanceTween = this.tweens.add({
                    targets: { progress: 0 },
                    progress: 1,
                    duration: duration,
                    ease: 'Cubic.easeOut',
                    onUpdate: (tween) => {
                        if (!this.balanceText) return;
                        const progress = tween.getValue();
                        
                        if (progress < 0.4) {
                            const randomOffset = Math.floor(Math.random() * 100) - 50;
                            const spinValue = startValue + randomOffset;
                            this.balanceText.setText(`${this.formatWool(Math.abs(Math.floor(spinValue)))}W`);
                            this.balanceText.setAlpha(0.8);
                        } else {
                            const decelerateProgress = (progress - 0.4) / 0.6;
                            const currentValue = startValue + (endValue - startValue) * decelerateProgress;
                            this.balanceText.setText(`${this.formatWool(Math.floor(currentValue))}W`);
                            this.balanceText.setAlpha(1);
                        }
                    },
                    onComplete: () => {
                        if (!this.balanceText) return;
                        this.displayBalance = this.balance;
                        this.balanceText.setText(`${this.formatWool(this.balance)}W`);
                        this.balanceText.setAlpha(1);
                        this.balanceText.setScale(1);
                        
                        // Update wool wallet UI if it exists
                        if (this.woolWalletPlaceholders && this.woolWalletPlaceholders.totalBalance) {
                            this.woolWalletPlaceholders.totalBalance.setText(`${this.formatWool(this.balance)}W`);
                            console.log('✅ Updated wool wallet UI in animation complete:', this.balance);
                        } else {
                            console.warn('⚠️ woolWalletPlaceholders.totalBalance does not exist');
                        }
                    }
                });
            } else {
                console.log('📊 No animation needed, updating immediately');
                // No animation, just update immediately
                if (this.woolWalletPlaceholders && this.woolWalletPlaceholders.totalBalance) {
                    this.woolWalletPlaceholders.totalBalance.setText(`${this.formatWool(this.balance)}W`);
                    console.log('✅ Updated wool wallet UI immediately:', this.balance);
                } else {
                    console.warn('⚠️ woolWalletPlaceholders.totalBalance does not exist');
                }
            }
            
            const highScore = localStorage.getItem('sheepMarket_highScore') || 0;
            if (this.highScoreText) this.highScoreText.setText(`BEST: ${parseInt(highScore).toLocaleString()}`);

            if (this.statsContainer && this.statsContainer.alpha > 0 && this.statLabels && this.statLabels.totalBalance) {
                this.statLabels.totalBalance.setText(`${this.formatWool(this.balance)}W`);
            }

            // Emergency wool system removed
        });

        gameScene.events.on('calls-updated', (data) => {
            this.calls = data.calls;
            const previousFinalCallSide = this.finalCallSide;
            this.finalCallSide = data.finalCallSide;
            
            // Animate on new call placed
            if (this.calls.length > 0) {
                this.animateValueUpdate(this.woolSpentText);
                this.animateValueUpdate(this.unrealizedWoolText);
            }
            
            this.updatePortfolioDisplay();
            
            // NEW: Update Final Call display in Wool Wallet if it's open AND the final call changed
            if (this.statsContainer && this.statsContainer.alpha > 0 && previousFinalCallSide !== this.finalCallSide) {
                this.updateFinalCallDisplayInModal();
            }
        });

        // Remove any old listeners before adding new one
        gameScene.events.off('round-settled');
        gameScene.events.on('round-settled', (data) => {
            // ONE-SHOT GUARD: prevent duplicate settlement processing
            if (this._roundSettledProcessed) {
                console.warn('[HUDScene] round-settled fired again – ignoring duplicate');
                return;
            }
            this._roundSettledProcessed = true;
            // Reset guard at the start of the next round (see round-started handler)

            // Ensure we are NOT in pause mode when round settles
            this.isPauseMode = false;
            
            // ENDLESS MODE: Handle game over
            if (this.isEndlessMode && data.endlessGameOver) {
                console.log(`💀 ENDLESS MODE: Game Over at Round ${data.endlessRound}`);
                
                // Update balance (THREE-STEP UPDATE for consistency)
                this.balance = data.balance;
                this.displayBalance = data.balance;
                
                // 1. Update balanceText directly
                if (this.balanceText) {
                    this.balanceText.setText(`${this.formatWool(data.balance)}W`);
                }
                
                // 2. Update woolWalletPlaceholders.totalBalance directly
                if (this.woolWalletPlaceholders && this.woolWalletPlaceholders.totalBalance) {
                    this.woolWalletPlaceholders.totalBalance.setText(`${this.formatWool(data.balance)}W`);
                }
                
                // 3. Emit balance-updated event
                this.events.emit('balance-updated', data.balance);
                
                // Track final call result for stats
                if (data.finalCallCorrect !== undefined) {
                    if (data.finalCallCorrect) {
                        this.endlessStats.bidsWon++;
                    } else {
                        this.endlessStats.bidsLost++;
                    }
                }
                
                // Update highest wool if current balance is higher
                if (this.balance > this.endlessStats.highestWool) {
                    this.endlessStats.highestWool = this.balance;
                }
                
                // Show game over message briefly
                this.statusText.setText(`GAME OVER`);
                this.statusText.setStyle({ font: '900 64px Inter', fill: '#ff4444', align: 'center', stroke: '#000000', strokeThickness: 12 });
                const maxTextWidth = CONFIG.width * 0.85;
                this.fitTextToWidth(this.statusText, maxTextWidth, 64, 32);
                this.statusText.setAlpha(1);
                
                // Play game over sound
                audioManager.playBankruptcy();
                
                // Show endless mode game over popup after delay
                this.time.delayedCall(1500, () => {
                    this.statusText.setAlpha(0);
                    
                    // Rounds played = current round (they failed this round, so count it)
                    const roundsPlayed = data.endlessRound;
                    
                    this.showEndlessModeGameOver({
                        roundsSurvived: roundsPlayed,
                        finalBalance: data.balance, // Use data.balance directly (already includes payout)
                        bidsWon: this.endlessStats.bidsWon,
                        bidsLost: this.endlessStats.bidsLost,
                        highestWool: this.endlessStats.highestWool
                    });
                });
                
                return; // Skip normal logic
            }

            // ===== MODEL A: FINAL MARKET SETTLEMENT (SINGLE SOURCE OF TRUTH) =====
            // Settlement occurs once at level end. Each call resolves exactly once.
            let levelGainsThisRound = 0;
            let levelLossesThisRound = 0;
            let netLevelWool = 0;
            
            // Reset best call record flag for new settlement
            this.newBestCallRecordSet = false;

            if (data.settledCalls) {
                data.settledCalls.forEach(result => {
                    netLevelWool += result.delta;
                    if (result.delta > 0) {
                        levelGainsThisRound += result.delta;
                        // NEW: Track best call achieved in this run
                        if (result.delta > this.lifetimeBestCall) {
                            this.lifetimeBestCall = result.delta;
                            localStorage.setItem(this.getStorageKey('lifetimeBestCall'), this.lifetimeBestCall.toString());
                            this.newBestCallRecordSet = true; // Flag for visual feedback
                        }
                    } else if (result.delta < 0) {
                        levelLossesThisRound += Math.abs(result.delta);
                    }
                });
                
                // ENDLESS MODE: Track bid results for stats
                if (this.isEndlessMode) {
                    if (data.finalCallCorrect) {
                        this.endlessStats.bidsWon++;
                    } else {
                        this.endlessStats.bidsLost++;
                    }
                    
                    // Update highest wool
                    if (this.balance > this.endlessStats.highestWool) {
                        this.endlessStats.highestWool = this.balance;
                    }
                }
            }
            
            // ===== FORCED GAME RESTART CHECK (PRIORITY #1) =====
            // If player has < 1W balance (effectively 0 for gameplay) at end of level, force complete restart
            // Since calls cost at least 1W, any balance below 1W is a deadlock/bankruptcy
            const isBroke = data.balance < 1;
            
            if (isBroke) {
                console.log('🚫 ═══════════════════════════════════════════════');
                console.log(`🚫 FORCED GAME RESTART - BROKE (${data.balance}W)`);
                console.log('🚫 ═══════════════════════════════════════════════');
                
                // Update internal balance and ensure it's saved as 0 if effectively broke
                this.balance = 0;
                authService.saveBalance(0);
                
                // Initialize result object for modal
                this.recentLevelResult = {
                    profit: data.profit || 0,
                    winner: data.winner || 'NONE',
                    balance: 0, // Hard zero for display
                    nextAction: 'FORCED_RESTART',
                    noBet: !data.hadBet,
                    finalCallCorrect: data.finalCallCorrect,
                    woolSpent: this.totalWoolSpent || 0,
                    levelGains: levelGainsThisRound,
                    levelLosses: levelLossesThisRound
                };

                // Clear displays
                this.spentThisRound = 0; 
                this.calls = [];
                this.totalWoolSpent = 0;
                this.finalCallSide = null;
                
                // Set flags to force restart
                this.isForcedRestartModal = true;
                this.isLossModal = false;
                this.isWinModal = false;
                
                // Show "Level Over" status briefly
                this.statusText.setText('NO MORE WOOL TO PLAY WITH!');
                this.statusText.setStyle({ font: '900 64px Inter', fill: '#ff4444', align: 'center', stroke: '#000000', strokeThickness: 12 });
                // Use 85% of screen width to ensure padding on both sides (7.5% padding each side)
                const maxTextWidth = CONFIG.width * 0.85;
                this.fitTextToWidth(this.statusText, maxTextWidth, 64, 32);
                this.statusText.setAlpha(1);
                
                // Play bankruptcy sound
                audioManager.playBankruptcy();
                
                // Show modal after delay
                this.time.delayedCall(2500, () => {
                    this.populateStatsModalForLevelEnd();
                    this.toggleStatsModal();
                });
                
                return; // Skip all normal logic
            }

            // 1. TIME'S UP CHECK (Inaction)
            if (!data.hadBet) {
                // ===== RECORD NO CALL IN HISTORY =====
                this.recordFinalCallAttempt(null, false);
                
                // Add to finalCallHistory with null side
                this.finalCallHistory.push({
                    level: this.activeLevel,
                    side: null,
                    correct: false,
                    profit: 0,
                    timestamp: Date.now()
                });
                localStorage.setItem('sheepMarket_finalCallHistory', JSON.stringify(this.finalCallHistory));
                
                // Treat inaction as a loss/retry event, showing stats instead of Game Over screen
                // We fake a result object to ensure populateStatsModal works
                this.recentLevelResult = {
                    profit: 0,
                    winner: 'NONE',
                    balance: this.balance,
                    nextAction: 'RETRY',
                    noBet: true // FLAG: No bet was placed, don't show wool wallet celebration
                };
                
                // Initialize empty stats for the modal to read
                this.recentLevelStats = {
                    gains: 0,
                    losses: 0
                };
                
                // Show "Level Over" status - Player loses if no bet placed
                // RANDOM NO-CALL MESSAGE (prevent immediate repeat)
                const noCallMessages = [
                    "TOO LATE! YOU DIDN'T CALL YOUR FLOCK IN TIME.",
                    "YOU DIDN'T CALL THE SHEEP AND NOW THEY'RE CONFUSED.",
                    "NO CALL MADE. SHEEP EGO BOOST!",
                    "THE FLOCK GOT RESTLESS WHILE YOU HESITATED.",
                    "OOPS! NO CALL, NO HERD. TRY AGAIN."
                ];
                
                // Filter out last message if it exists
                const availableMessages = this.lastNoCallMessage 
                    ? noCallMessages.filter(msg => msg !== this.lastNoCallMessage)
                    : noCallMessages;
                
                const randomNoCallMessage = availableMessages[Math.floor(Math.random() * availableMessages.length)];
                this.lastNoCallMessage = randomNoCallMessage;
                
                const fontSize = this.cameras.main.width < 768 ? 28 : 34;
                this.statusText.setText(randomNoCallMessage);
                this.statusText.setStyle({
                    font: `600 ${fontSize}px Inter`, // SemiBold
                    fill: '#9ca3af', // Neutral gray
                    align: 'center',
                    stroke: '#000000',
                    strokeThickness: 6
                });
                this.fitTextToWidth(this.statusText, CONFIG.width * 0.9, fontSize, 24);
                this.statusText.setAlpha(0);

                // Fade in
                this.tweens.add({
                    targets: this.statusText,
                    alpha: 1,
                    duration: 400,
                    ease: 'Sine.easeOut'
                });

                // Fade out after 2.5 seconds
                this.tweens.add({
                    targets: this.statusText,
                    alpha: 0,
                    delay: 2500,
                    duration: 400,
                    ease: 'Sine.easeIn'
                });

                // Show Stats Modal
                this.time.delayedCall(2500, () => {
                    this.isLossModal = true; // Treat no-bet as loss (need to retry)
                    this.isWinModal = false;
                    this.populateStatsModalForLevelEnd();
                    this.toggleStatsModal();
                });
                return; 
            }

            // ===== CAPTURE WOOL SPENT BEFORE ANY RESETS =====
            // Use the authoritative value from GameScene (source of truth)
            const woolSpentThisAttempt = data.totalSpent !== undefined ? data.totalSpent : (this.totalWoolSpent || 0);
            
            // Store starting balance for wallet display (balance before this round's net)
            this.lastRoundStartingBalance = data.startingBalance !== undefined ? data.startingBalance : this.sessionStartWool;
            
            this.spentThisRound = 0; 
            this.roundsPlayed++; // Increment round counter

            // Add to history
            this.tradeHistory.push({
                time: Date.now(),
                profit: data.profit
            });
            // Keep only last 24h of history
            const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
            this.tradeHistory = this.tradeHistory.filter(t => t.time > oneDayAgo);
            localStorage.setItem('sheepMarket_history', JSON.stringify(this.tradeHistory));

            const isProfit = data.profit > 0;

            // Session Stats Update
            if (isProfit) {
                this.sessionWins++;
                this.sessionGains += data.profit;
                
                // Score Logic
                const scoreGain = 10 + Math.floor(data.profit * 0.2);
                this.gameScore += scoreGain;
            } else {
                const lostAmt = Math.abs(data.profit);
                this.sessionLossesCount++;
                this.sessionLosses += lostAmt;
                this.totalWoolLost += lostAmt; // Legacy
                
                // Score Penalty
                this.gameScore = Math.max(0, this.gameScore - 5);
            }
            
            // ===== LIFETIME STATS UPDATE (MODEL A NET PROFIT/LOSS) =====
            // Sum all positive and negative deltas from individual calls
            this.lifetimeGains += levelGainsThisRound;
            this.lifetimeLosses += levelLossesThisRound;
            
            // Persist Lifetime Stats
            localStorage.setItem(this.getStorageKey('lifetimeGains'), this.lifetimeGains.toString());
            localStorage.setItem(this.getStorageKey('lifetimeLosses'), this.lifetimeLosses.toString());
            localStorage.setItem(this.getStorageKey('gameScore'), this.gameScore.toString());
            
            console.log(`📈 Lifetime Stats Updated: Gains +${this.lifetimeGains.toFixed(1)}W, Losses -${this.lifetimeLosses.toFixed(1)}W`);
            
            // NEW: Track final call for history
            this.finalCallHistory.push({
                level: this.activeLevel,
                side: data.finalCallSide,
                correct: data.finalCallCorrect,
                profit: data.profit,
                timestamp: Date.now()
            });
            localStorage.setItem(this.getStorageKey('finalCallHistory'), JSON.stringify(this.finalCallHistory));
            
            // ===== RECORD FINAL CALL ATTEMPT IN PER-LEVEL HISTORY =====
            // Convert lowercase 'left'/'right' to uppercase 'LEFT'/'RIGHT' for storage
            const callSideUppercase = data.finalCallSide ? data.finalCallSide.toUpperCase() : null;
            this.recordFinalCallAttempt(callSideUppercase, data.finalCallCorrect);
            
            // ===== RECORD PER-CALL LOSSES =====
            // Track wool spent per call and whether it was lost
            const callLosses = [];
            let totalWoolLostThisRound = 0;
            
            this.calls.forEach(call => {
                const callWasOnWinningSide = call.side === data.winner;
                const woolLost = callWasOnWinningSide ? 0 : call.entryPrice; // Lost if on losing side
                totalWoolLostThisRound += woolLost;
                
                callLosses.push({
                    side: call.side,
                    woolSpent: call.entryPrice,
                    lost: !callWasOnWinningSide,
                    woolLost: woolLost
                });
            });
            
            // Store in per-level call losses
            if (!this.perLevelCallLosses[this.activeLevel]) {
                this.perLevelCallLosses[this.activeLevel] = [];
            }
            this.perLevelCallLosses[this.activeLevel].push({
                timestamp: Date.now(),
                calls: callLosses,
                winner: data.winner,
                finalCallCorrect: data.finalCallCorrect,
                totalLost: totalWoolLostThisRound
            });
            localStorage.setItem(this.getStorageKey('perLevelCallLosses'), JSON.stringify(this.perLevelCallLosses));
            
            // ===== CRITICAL: SYNC WOOL BALANCE FROM GAMESCENE FIRST =====
            // GameScene is the source of truth for wool balance
            // Sync HUDScene's balance BEFORE calculating win streak bonus
            const oldBalance = this.balance;
            const newBalance = data.balance;
            const balanceDiff = newBalance - oldBalance;
            
            this.balance = newBalance;
            
            console.log(`💰 WOOL Balance Synced: ${this.balance}W (Profit: ${data.profit >= 0 ? '+' : ''}${data.profit}W)`);
            
            // ===== UPDATE WIN/LOSS STREAK =====
            // ENDLESS MODE: Skip win streak bonus (not applicable)
            let streakBonusWool = 0;
            if (!this.isEndlessMode && data.finalCallCorrect) {
                // Increment streak on correct call
                this.winStreak++;
                localStorage.setItem(this.getStorageKey('winStreak'), this.winStreak.toString());
                
                // Calculate win streak bonus based on wool gained this round
                const woolGained = Math.max(0, data.profit); // Only positive profit counts
                if (woolGained > 0) {
                    if (this.winStreak === 1) {
                        streakBonusWool = Math.floor(woolGained * 0.05); // +5%
                    } else if (this.winStreak === 2) {
                        streakBonusWool = Math.floor(woolGained * 0.10); // +10%
                    } else if (this.winStreak === 3) {
                        streakBonusWool = Math.floor(woolGained * 0.15); // +15%
                    } else if (this.winStreak >= 4) {
                        streakBonusWool = Math.floor(woolGained * 0.20); // +20% cap
                    }
                    
                    // Apply bonus wool immediately
                    if (streakBonusWool > 0) {
                        this.balance += streakBonusWool;
                        authService.saveBalance(this.balance);
                        console.log(`🔥 Win Streak Bonus: +${streakBonusWool}W (Streak: ${this.winStreak})`);
                    }
                }
            } else if (!this.isEndlessMode) {
                // Reset streak on incorrect call (main game only)
                this.winStreak = 0;
                localStorage.setItem(this.getStorageKey('winStreak'), this.winStreak.toString());
                console.log(`❌ Win Streak Reset (Incorrect Call)`);
            }
            
            // ===== TRACK CALL EFFICIENCY =====
            // Record wool spent and wool gained for this level attempt
            const woolGained = Math.max(0, data.profit);
            const woolSpent = this.woolSpentThisRound || 0;
            const efficiency = woolSpent > 0 ? (woolGained / woolSpent) : 0;
            
            // Store efficiency data for current level
            if (!this.callEfficiencyHistory[this.activeLevel]) {
                this.callEfficiencyHistory[this.activeLevel] = [];
            }
            this.callEfficiencyHistory[this.activeLevel].push({
                woolGained: woolGained,
                woolSpent: woolSpent,
                efficiency: efficiency,
                timestamp: Date.now()
            });
            localStorage.setItem(this.getStorageKey('callEfficiencyHistory'), JSON.stringify(this.callEfficiencyHistory));
            
            console.log(`📊 Call Efficiency - Level ${this.activeLevel}: Gained ${woolGained}W / Spent ${woolSpent}W = ${Math.round(efficiency * 100)}%`);
            
            // Store bonus wool for display in wallet
            this.lastStreakBonus = streakBonusWool;
            
            // NEW: Track level performance for charts
            const levelPerf = {
                level: this.activeLevel,
                netWool: data.profit,
                finalCallCorrect: data.finalCallCorrect,
                balance: this.balance, // Use already-synced balance
                timestamp: Date.now()
            };
            this.levelPerformanceHistory.push(levelPerf);
            localStorage.setItem(this.getStorageKey('levelPerformance'), JSON.stringify(this.levelPerformanceHistory));

            // Trigger slot machine spinning animation for balance change
            if (balanceDiff !== 0 && Math.abs(balanceDiff) >= 0.01) {
                // Calculate duration (Dynamic based on change magnitude)
                const duration = Math.min(3000, Math.max(1000, Math.abs(balanceDiff) * 20));
                
                // Kill previous tween to prevent conflict
                if (this.balanceTween) this.balanceTween.stop();
                if (this.spinTween) this.spinTween.stop();
                
                const baseY = 86;
                const startValue = oldBalance;
                const endValue = this.balance;
                
                // Track last played value for coin sound triggers
                let lastSoundValue = Math.floor(oldBalance);
                
                // Calculate sound interval - play more frequently for better feedback
                const soundInterval = Math.max(1, Math.floor(Math.abs(balanceDiff) / 15));
                
                // Slot Machine Spin Animation (same as balance-updated)
                // Phase 1: Fast random spin (40% of duration)
                // Phase 2: Smooth deceleration to final value (60% of duration)
                this.balanceTween = this.tweens.add({
                    targets: { progress: 0 },
                    progress: 1,
                    duration: duration,
                    ease: 'Cubic.easeOut',
                    onUpdate: (tween) => {
                        const progress = tween.getValue();
                        
                        if (progress < 0.4) {
                            // SPINNING PHASE: Rapidly cycle through random numbers
                            const randomOffset = Math.floor(Math.random() * 100) - 50;
                            const spinValue = startValue + randomOffset;
                            if (this.balanceText) {
                                this.balanceText.setText(`${this.formatWool(Math.abs(Math.floor(spinValue)))}W`);
                                this.balanceText.setAlpha(0.8); // Visual blur during spin
                            }
                            
                        } else {
                            // DECELERATION PHASE: Smoothly count to final value
                            const decelerateProgress = (progress - 0.4) / 0.6;
                            const currentValue = startValue + (endValue - startValue) * decelerateProgress;
                            const val = Math.floor(currentValue);
                            
                            if (this.balanceText) {
                                this.balanceText.setText(`${this.formatWool(val)}W`);
                                this.balanceText.setAlpha(1); // Full opacity during deceleration
                            }
                            
                            // Play coin sound at intervals during counting
                            if (Math.abs(val - lastSoundValue) >= soundInterval) {
                                audioManager.playCoin();
                                lastSoundValue = val;
                            }
                        }
                    },
                    onComplete: () => {
                        // Final snap to exact value
                        this.displayBalance = this.balance;
                        if (this.balanceText) {
                            this.balanceText.setText(`${this.formatWool(this.balance)}W`);
                            this.balanceText.setAlpha(1);
                            this.balanceText.setScale(1);
                        }
                    }
                });
            } else {
                // No change, just update display
                if (this.balanceText) {
                    this.balanceText.setText(`${this.formatWool(this.balance)}W`);
                }
            }
            
            // Store recent stats for the modal - USE CUMULATIVE SESSION STATS
            this.recentLevelStats = {
                gains: this.sessionGains,
                losses: this.sessionLosses
            };
            this.recentLevelResult = {
                profit: data.profit,
                winner: data.winner,
                balance: data.balance,
                startingBalance: this.lastRoundStartingBalance, // balance before this round
                woolEarned: data.payout || 0,                   // gross payout from winning calls
                nextAction: null, // Will be determined below
                finalCallSide: data.finalCallSide,
                finalCallCorrect: data.finalCallCorrect,
                woolSpent: woolSpentThisAttempt, // Store wool spent for modal display
                levelGains: levelGainsThisRound,
                levelLosses: levelLossesThisRound,
                hadBet: data.hadBet, // CRITICAL: Track if player had bet for Level 12 logic
                settledCalls: data.settledCalls // MODEL A COMPLIANT: Pass finalized settlement results to the wallet
            };

            // LEVEL 1 PROGRESSION: Unlock Level 2 on Win (Entrance Exam)
            if (this.activeLevel === 1) {
                // VICTORY CONDITION: Final call must be correct.
                // We removed the balance >= 50 check to ensure any correct call win allows progression.
                if (data.finalCallCorrect) {
                     // SAVE LEVEL 1 STATS FOR LATER VIEWING
                     const l1Stats = {
                         gains: this.sessionGains,
                         losses: this.sessionLosses
                     };
                     localStorage.setItem('sheepMarket_level1Stats', JSON.stringify(l1Stats));

                     // Play graduation feedback audio
                     this.time.delayedCall(1500, () => {
                        audioManager.playCoin();
                        // 🎵 AUDIO FIX: Keep music playing during the Wool Wallet celebration.
                        // Music should only change when the next level actually begins.
                        // audioManager.fadeOut(2); // REMOVED to keep music playing
                     });

                     this.recentLevelResult.nextAction = 'LEVEL_2';
                } else {
                    // DEFEAT CONDITION: Lost the Entrance Exam
                    this.recentLevelResult.nextAction = 'RETRY';
                }
            }
            
            // LEVEL 2 PROGRESSION: Unlock Level 3 on Win
            else if (this.activeLevel === 2) {
                if (data.finalCallCorrect) {
                    // WIN: Graduate to Level 3
                    // SAVE LEVEL 2 STATS FOR LATER VIEWING
                    const l2Stats = {
                        gains: this.sessionGains,
                        losses: this.sessionLosses
                    };
                    localStorage.setItem('sheepMarket_level2Stats', JSON.stringify(l2Stats));
                    
                    this.recentLevelResult.nextAction = 'LEVEL_3';
                } else {
                    // LOSS: Repeat Level 2
                    this.recentLevelResult.nextAction = 'RETRY';
                }
            }
            // LEVEL 3 PROGRESSION: Unlock Level 4 on Win
            else if (this.activeLevel === 3) {
                if (data.finalCallCorrect) {
                    // WIN: Graduate to Level 4
                    // SAVE LEVEL 3 STATS FOR LATER VIEWING
                    const l3Stats = {
                        gains: this.sessionGains,
                        losses: this.sessionLosses
                    };
                    localStorage.setItem('sheepMarket_level3Stats', JSON.stringify(l3Stats));
                    
                    this.recentLevelResult.nextAction = 'LEVEL_4';
                } else {
                    // LOSS: Repeat Level 3
                    this.recentLevelResult.nextAction = 'RETRY';
                }
            }
            // LEVEL 4 PROGRESSION: Unlock Level 5 on Win
            else if (this.activeLevel === 4) {
                if (data.finalCallCorrect) {
                    // WIN: Graduate to Level 5
                    // SAVE LEVEL 4 STATS FOR LATER VIEWING
                    const l4Stats = {
                        gains: this.sessionGains,
                        losses: this.sessionLosses
                    };
                    localStorage.setItem('sheepMarket_level4Stats', JSON.stringify(l4Stats));
                    
                    this.recentLevelResult.nextAction = 'LEVEL_5';
                } else {
                    // LOSS: Repeat Level 4
                    this.recentLevelResult.nextAction = 'RETRY';
                }
            }
            // LEVEL 5 PROGRESSION: Unlock Level 6 on Win
            else if (this.activeLevel === 5) {
                if (data.finalCallCorrect) {
                    // WIN: Graduate to Level 6
                    // SAVE LEVEL 5 STATS FOR LATER VIEWING
                    const l5Stats = {
                        gains: this.sessionGains,
                        losses: this.sessionLosses
                    };
                    localStorage.setItem('sheepMarket_level5Stats', JSON.stringify(l5Stats));
                    
                    this.recentLevelResult.nextAction = 'LEVEL_6';
                } else {
                    // LOSS: Repeat Level 5
                    this.recentLevelResult.nextAction = 'RETRY';
                }
            }
            else {
                // Standard Level (e.g. Level 6+) or Level Retry
                // Use finalCallCorrect for win/loss determination
                if (data.finalCallCorrect) {
                     // Save Level 6+ stats
                     const l6Stats = {
                         gains: this.sessionGains,
                         losses: this.sessionLosses
                     };
                     localStorage.setItem('sheepMarket_level6Stats', JSON.stringify(l6Stats));
                     
                     // ENDLESS MODE: Continue to next round
                     if (this.isEndlessMode) {
                         this.recentLevelResult.nextAction = 'ENDLESS_NEXT_ROUND';
                     }
                     // Level 6-7: Continue to next level on win
                     // Level 8+: Endless mode, restart current level
                     else if (this.activeLevel >= 6 && this.activeLevel < 8) {
                         this.recentLevelResult.nextAction = 'WIN'; // Use standard WIN progression
                     } else if (this.activeLevel >= 8) {
                         this.recentLevelResult.nextAction = 'LEVEL_COMPLETE'; // Endless mode
                     } else {
                         this.recentLevelResult.nextAction = 'RETRY'; // Placeholder
                     }
                } else {
                     this.recentLevelResult.nextAction = 'RETRY';
                }
            }

            const sign = data.profit >= 0 ? '+' : '';
            
            // Use finalCallCorrect for outcome feedback
            if (data.finalCallCorrect && data.hadBet) {
                // CALL WON - Final call matched the majority
                if (data.goldenSheepWon) {
                    audioManager.playCoin(); // Extra cha-ching for golden sheep
                }
                
                // RANDOM WIN MESSAGE (prevent immediate repeat)
                const winMessages = [
                    "BAA-RILLIANT! YOU RULED THE PASTURE!",
                    "FLOCK YEAH! YOU CALLED IT PERFECTLY.",
                    "SHEAR GENIUS! THE SHEEP OBEYED.",
                    "EWE DID IT! THE FLOCK SALUTES YOU."
                ];
                
                // Filter out last message if it exists
                const availableMessages = this.lastWinMessage 
                    ? winMessages.filter(msg => msg !== this.lastWinMessage)
                    : winMessages;
                
                const randomWinMessage = availableMessages[Math.floor(Math.random() * availableMessages.length)];
                this.lastWinMessage = randomWinMessage;
                
                const fontSize = this.cameras.main.width < 768 ? 28 : 34;
                this.statusText.setText(randomWinMessage);
                this.statusText.setStyle({
                    font: `600 ${fontSize}px Inter`, // SemiBold
                    fill: data.profit > 0 ? '#e8f5e9' : '#d4edda', // Soft off-white / pale green
                    align: 'center',
                    stroke: '#000000',
                    strokeThickness: 6
                });
                this.fitTextToWidth(this.statusText, CONFIG.width * 0.9, fontSize, 24);
            } else if (!data.finalCallCorrect && data.hadBet) {
                // CALL WRONG - Final call didn't match the majority
                // RANDOM LOSE MESSAGE (prevent immediate repeat)
                const loseMessages = [
                    "OH NO! THE FLOCK GOT OUT OF HAND.",
                    "SHEEP HAPPEN. BETTER LUCK NEXT TIME.",
                    "YOUR HERD WENT BAA-CKWARDS!",
                    "PASTURE CHAOS! TIME TO REGROUP."
                ];
                
                // Filter out last message if it exists
                const availableMessages = this.lastLoseMessage 
                    ? loseMessages.filter(msg => msg !== this.lastLoseMessage)
                    : loseMessages;
                
                const randomLoseMessage = availableMessages[Math.floor(Math.random() * availableMessages.length)];
                this.lastLoseMessage = randomLoseMessage;
                
                const fontSize = this.cameras.main.width < 768 ? 28 : 34;
                this.statusText.setText(randomLoseMessage);
                this.statusText.setStyle({
                    font: `600 ${fontSize}px Inter`, // SemiBold
                    fill: '#f59e0b', // Muted amber
                    align: 'center',
                    stroke: '#000000',
                    strokeThickness: 6
                });
                this.fitTextToWidth(this.statusText, CONFIG.width * 0.9, fontSize, 24);
            } else {
                // Fallback for spectators
                this.statusText.setText(`LEVEL OVER\n${data.winner} SIDE WON`);
                this.statusText.setStyle({
                    font: '600 42px Inter',
                    fill: '#ffffff',
                    align: 'center',
                    stroke: '#000000',
                    strokeThickness: 10
                });
                this.fitTextToWidth(this.statusText, CONFIG.width * 0.9, 42, 24);
            }

            // Fade in animation
            this.statusText.setAlpha(0);
            this.tweens.add({
                targets: this.statusText,
                alpha: 1,
                duration: 400,
                ease: 'Sine.easeOut'
            });
            
            // REMOVED immediate confetti
            // if (isProfit) this.showConfetti(data.winner);

            const highScore = localStorage.getItem('sheepMarket_highScore') || 0;
            if (this.highScoreText) this.highScoreText.setText(`BEST: ${parseInt(highScore).toLocaleString()}`);

            // ===== PRESERVE DISPLAY VALUES FOR WOOL WALLET =====
            // Store final values before clearing calls so they persist until next round starts
            this.lastRoundWoolSpent = this.totalWoolSpent || 0;
            this.lastRoundCalls = [...this.calls]; // Clone array for display
            
            this.calls = []; // Clear all calls
            this.totalWoolSpent = 0; // Reset spent tracker
            this.finalCallSide = null; // Reset final call
            if (this.leftSharesText) this.leftSharesText.setText('');
            if (this.rightSharesText) this.rightSharesText.setText('');
            
            // Close Market
            this.isMarketActive = false;
            this.updatePrices();
            
            // Stop grass button throb animation when round ends
            if (this.grassButtonThrobTween) {
                this.grassButtonThrobTween.stop();
                this.grassButtonThrobTween = null;
                const btn = this.abilityButtons[3];
                if (btn && btn.container) {
                    btn.container.setScale(1); // Reset scale
                }
            }

            // DON'T update portfolio display yet - keep last round's values showing
            // Display will be cleared when next round starts in playStartSequence()

            // Fade out after 2.75 seconds (within 2.5-3 second visibility requirement)
            this.tweens.add({
                targets: this.statusText,
                alpha: 0,
                delay: 2750,
                duration: 400,
                ease: 'Sine.easeIn'
            });
            
            // OPEN STATS MODAL AFTER DELAY (to show text first)
            this.time.delayedCall(2500, () => {
                // Check if this is a win (nextAction is not RETRY)
                const isWin = this.recentLevelResult && this.recentLevelResult.nextAction !== 'RETRY';
                this.isLossModal = false;
                this.isWinModal = isWin;
                
                console.log(`🔍 MODAL TRIGGER CHECK:`, {
                    activeLevel: this.activeLevel,
                    isWin: isWin,
                    hadBet: this.recentLevelResult.hadBet,
                    nextAction: this.recentLevelResult.nextAction
                });
                
                // ═══════════════════════════════════════════════════════════════════════════
                // LEVEL 12 WIN: HARD OVERRIDE - Complete custom sequence with strict gates
                // ═══════════════════════════════════════════════════════════════════════════
                // REQUIRED SEQUENCE (NO SKIPPING):
                //   1. Player wins Level 12 (final call correct)
                //   2. 15-second celebration (fireworks, confetti)
                //   3. Golden Sheep walks in and offers key
                //   4. Player clicks "TAKE ME" button
                //   5. Golden Sheep → Button 0, Golden Key → Button 7
                //   6. Player clicks Golden Key button (sets goldenKeyActivated = true)
                //   7. Golden Key flies across UI, unlocks all 12 levels
                //   8. Golden Key disappears in burst (sets allLevelsUnlockedByGoldenKey = true)
                //   9. GameScene emits 'golden-key-sequence-complete'
                //  10. Game Won popup appears: "YOU RULE THE PASTURE!"
                //  11. Player clicks CONTINUE (gate checks goldenKeyActivated + allLevelsUnlockedByGoldenKey)
                //  12. ONLY NOW: Wool Wallet opens
                //
                // STRICT GATES:
                //   - toggleStatsModal() blocks if level12WoolWalletLocked == true
                //   - populateStatsModalForLevelEnd() blocks if level12WoolWalletLocked == true
                //   - showGameWonPopup() blocks if !goldenKeyActivated || !allLevelsUnlockedByGoldenKey
                //   - CONTINUE button blocks if !goldenKeyActivated || !allLevelsUnlockedByGoldenKey
                // ═══════════════════════════════════════════════════════════════════════════
                if (this.activeLevel === 12 && isWin && this.recentLevelResult.hadBet) {
                    console.log('🚨 ═══ LEVEL 12 WIN DETECTED - ACTIVATING HARD OVERRIDE ═══');
                    console.log('❌ WOOL WALLET HARD BLOCKED');
                    console.log('✅ Entering Golden Key sequence...');
                    console.log('🎉 State: CELEBRATING (15-second fireworks starting now)');
                    
                    // ✅ HARD BLOCK WOOL WALLET - Will NOT open until full sequence completes
                    // (State is now fully managed by GameScene)
                    
                    // ❌ DO NOT show Wool Wallet
                    // ❌ DO NOT populate Wool Wallet
                    // ❌ DO NOT trigger any default UI
                    // ✅ GameScene will handle: CELEBRATION → GOLDEN SHEEP → GOLDEN KEY → EVENT
                    // ✅ HUDScene will show: GAME WON POPUP → WOOL WALLET (only after gates pass)
                    
                } else {
                    // Normal levels: show popup immediately
                    this.populateStatsModalForLevelEnd();
                    this.toggleStatsModal();
                }
            });
        });

        gameScene.events.off('round-started');
        gameScene.events.on('round-started', () => {
            // Reset one-shot guard so the next round-settled can be processed
            this._roundSettledProcessed = false;

            // Reset wool spent tracking for new round
            this.woolSpentThisRound = 0;
            
            // Reset final call to null/undetermined for new round
            this.finalCallSide = null;
            
            // Update Wool Wallet display if it's open
            if (this.statsContainer && this.statsContainer.alpha > 0) {
                this.updateFinalCallDisplayInModal();
            }
            
            this.playStartSequence();
        });

        gameScene.events.off('unlock-ability-button');
        gameScene.events.on('unlock-ability-button', (data) => {
            this.unlockAbilityButton(data.index);
        });
        
        // Listen for lawn mower animation event
        this.events.on('animate-lawnmower', (data) => {
            this.animateLawnMowerToButton(data);
        });
        
        // Listen for grass spawning in Level 5
        gameScene.events.off('grass-spawned');
        gameScene.events.on('grass-spawned', () => {
            this.bounceLawnMowerButton();
        });
        
        // Listen for grass asset collection (first grass cut)
        this.events.on('grass-asset-collected', (data) => {
            this.unlockGrassButton(data.buttonIndex);
        });
        
        // ===== ESC KEY LISTENER FOR CLOSING WOOL WALLET =====
        // Only for desktop/keyboard input
        this.input.keyboard.on('keydown-ESC', () => {
            this.handleEscapeKey();
        });
        
        // ===== ENTER KEY LISTENER FOR WOOL WALLET BUTTONS =====
        // Only for desktop/keyboard input
        this.input.keyboard.on('keydown-ENTER', () => {
            this.handleEnterKey();
        });
        
        // ═══════════════════════════════════════════════════════════════════════════
        // 🔧 DEV MODE TOGGLE (SHIFT + D) — DEVELOPER ONLY
        // ═══════════════════════════════════════════════════════════════════════════
        this.input.keyboard.on('keydown-D', (event) => {
            if (event.shiftKey) {
                this.devModeActive = !this.devModeActive;
                console.log(`🔧 DEV MODE: ${this.devModeActive ? 'ENABLED' : 'DISABLED'}`);
                
                // Update visual indicator
                if (this.devModeActive && !this.devModeIndicator) {
                    this.createDevModeIndicator();
                } else if (!this.devModeActive && this.devModeIndicator) {
                    this.devModeIndicator.destroy();
                    this.devModeIndicator = null;
                }
                
                // Refresh level indicators to show/hide access
                this.createLevelIndicators();
            }
        });
        // ═══════════════════════════════════════════════════════════════════════════
        
        gameScene.events.off('bounce-bone-button');
        gameScene.events.on('bounce-bone-button', () => {
            this.bounceBoneButton();
        });

        // Placement-mode completion → start the correct cooldown
        gameScene.events.off('placement-complete');
        gameScene.events.off('placement-cancelled');

        gameScene.events.on('placement-complete', ({ type }) => {
            console.log(`[HUDScene] placement-complete: ${type}`);
            if (type === 'grass')      this.startGrassTuftCooldown();
            if (type === 'bone')       this.startBoneCooldown();
            if (type === 'blackSheep') { /* button already dimmed in placeBlackSheep */ }
        });

        // Placement cancelled (ESC / right-click) → restore button to usable state
        gameScene.events.on('placement-cancelled', ({ type }) => {
            console.log(`[HUDScene] placement-cancelled: ${type}`);
            if (type === 'blackSheep') {
                const btn = this.abilityButtons[6];
                if (btn) {
                    btn.usedThisLevel = false;
                    btn.countdownActive = false;
                    if (btn.blackSheepImage) btn.blackSheepImage.setAlpha(1);
                    if (btn.blackSheepBorder) btn.blackSheepBorder.setAlpha(1);
                    btn.bg.clear();
                    btn.bg.fillStyle(0x1a1a1a, 1);
                    btn.bg.lineStyle(3, 0xfcd535, 1);
                    btn.bg.fillCircle(0, 0, 56);
                    btn.bg.strokeCircle(0, 0, 56);
                }
            }
        });
        
        // LEVEL 12: Listen for completion directly from GameScene
        gameScene.events.off('level12-complete');
        gameScene.events.on('level12-complete', () => {
            if (this.activeLevel !== 12) return;
            console.log('🎉 SHOWING GAME WON POPUP');
            this.showGameWonPopup();
        });
        
        gameScene.events.off('market-event');
        gameScene.events.on('market-event', (data) => {
            if (data.type === 'REJECTION') {
                const rejectPhrases = [
                    "SHEEP SPOOKED!",
                    "FLOCK REJECTED!",
                    "CONTRARIAN FLOCK!",
                    "THEY'RE RUNNING AWAY!",
                    "PANIC REVERSAL!"
                ];
                const msg = rejectPhrases[Math.floor(Math.random() * rejectPhrases.length)];
                
                // Use standard showReactionText for consistency
                // Positioned slightly higher to ensure visibility during chaos
                this.showReactionText(CONFIG.width / 2, CONFIG.height / 2 - 50, msg, '#ff4444');
                
            } else if (data.type === 'REACTION') {
                // Show floating text for obedience reaction
                // Position slightly above center to avoid blocking too much
                const x = CONFIG.width / 2;
                const y = CONFIG.height / 2 - 50; 
                
                this.showReactionText(x, y, data.message, data.color);
            } else if (data.type === 'WOLF_WARNING') {
                this.isWolfActive = true;
                this.time.delayedCall(10000, () => this.isWolfActive = false);

                // 8-Second Warning: Red Border on the approaching side
                const side = data.side; // 'LEFT' or 'RIGHT'
                const isLeft = side === 'LEFT';
                
                // Create red border overlay
                const border = this.add.graphics();
                border.setDepth(5000); // Very top
                
                // Draw a thick vertical bar on the edge
                const barWidth = 40;
                border.fillStyle(0xff0000, 0.6);
                
                if (isLeft) {
                    border.fillRect(0, 0, barWidth, CONFIG.height);
                    // Gradient fade out to the right
                    const gradient = this.add.graphics();
                    gradient.fillGradientStyle(0xff0000, 0x000000, 0xff0000, 0x000000, 0.5, 0, 0.5, 0);
                    gradient.fillRect(barWidth, 0, 100, CONFIG.height);
                    gradient.setDepth(5000);
                    border.gradient = gradient; // Attach to destroy later
                } else {
                    border.fillRect(CONFIG.width - barWidth, 0, barWidth, CONFIG.height);
                    // Gradient fade out to the left
                    const gradient = this.add.graphics();
                    gradient.fillGradientStyle(0x000000, 0xff0000, 0x000000, 0xff0000, 0, 0.5, 0, 0.5);
                    gradient.fillRect(CONFIG.width - barWidth - 100, 0, 100, CONFIG.height);
                    gradient.setDepth(5000);
                    border.gradient = gradient;
                }

                // Pulse Animation (8 seconds)
                // Cycle: 250ms fade out + 250ms fade in = 500ms total
                // 8000ms / 500ms = 16 cycles
                // repeat: 15 (initial + 15 repeats = 16 total)
                this.tweens.add({
                    targets: [border, border.gradient],
                    alpha: 0.2,
                    duration: 250, 
                    yoyo: true,
                    repeat: 15, 
                    onComplete: () => {
                        border.destroy();
                        if (border.gradient) border.gradient.destroy();
                    }
                });

            } else if (data.type === 'WOLF_ATTACK') {
                // Removed previous indicator. 
                // We can add a subtle screen shake here if desired when it actually spawns
                this.cameras.main.shake(200, 0.005);
            } else if (data.type === 'GOLDEN_SHEEP') {
                this.showBurstText(CONFIG.width / 2, CONFIG.height / 2, "GOLDEN SHEEP SIGHTED!\n2X MULTIPLIER ACTIVE", "#fcd535");
                audioManager.playCoin();
                
                // NEW: Update golden sheep tracker (count = 1 for now, could be expanded later)
                this.updateGoldenSheepTracker(1);
            }
        });
    }

    updateFinalCallWarning(timeLeft, lastBetSide) {
        // Warning triggers at <= 15 seconds (25% of 60s)
        const warningThreshold = 15;
        
        if (timeLeft <= warningThreshold && timeLeft > 0) {
            
            // 1. Initial Warning Trigger (One-time)
            if (!this.finalCallWarningTriggered) {
                this.finalCallWarningTriggered = true;
                
                // Show floating text
                this.showReactionText(CONFIG.width / 2, CONFIG.height / 2 - 200, "FINAL CALL APPROACHING...", "#fcd535");
                audioManager.playTick(); // Or specific warning sound
                
                // Pulse the active button if any
                if (lastBetSide) {
                    this.highlightFinalCallSide(lastBetSide);
                }
            }
            
            // 2. Continuous State Update
            // If side switched during warning phase, update highlight immediately
            if (this.currentFinalCallSide !== lastBetSide) {
                this.highlightFinalCallSide(lastBetSide);
            }
            
        } else if (timeLeft > warningThreshold) {
            // Reset if round restarted or heavy lag
            this.finalCallWarningTriggered = false;
            this.clearFinalCallHighlight();
        } else if (timeLeft <= 0) {
            // Cleanup on round end
            this.clearFinalCallHighlight();
        }
    }

    highlightFinalCallSide(side) {
        this.currentFinalCallSide = side;
        
        // Remove old highlights
        this.clearFinalCallHighlight(false); // False = don't reset state tracker yet
        
        if (!side) return; // No bet placed yet
        
        const container = side === 'LEFT' ? this.leftBtnContainer : this.rightBtnContainer;
        const width = this.btnDims ? this.btnDims.w : 680;
        const height = this.btnDims ? this.btnDims.h : 150;
        
        if (!container) return;

        // Create Final Call Label
        // Position at bottom center line of button (moved from top)
        const labelText = `FINAL CALL: ${side}`;
        const label = this.add.text(0, height/2, labelText, {
            font: '900 24px Inter',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setDepth(100);
        
        // Create Glow/Border
        const border = this.add.graphics();
        border.lineStyle(6, 0xfcd535, 1); // Gold
        border.strokeRoundedRect(-width/2 - 5, -height/2 - 5, width + 10, height + 10, 30);
        
        // Add to container
        container.add([border, label]);
        
        // Pulse Animation for Border
        this.tweens.add({
            targets: border,
            alpha: 0.5,
            duration: 400,
            yoyo: true,
            repeat: -1
        });
        
        // Store references to destroy later
        this.finalCallHighlight = { border, label, container };
    }

    clearFinalCallHighlight(resetState = true) {
        if (this.finalCallHighlight) {
            if (this.finalCallHighlight.border) this.finalCallHighlight.border.destroy();
            if (this.finalCallHighlight.label) this.finalCallHighlight.label.destroy();
            this.finalCallHighlight = null;
        }
        
        if (resetState) {
            this.currentFinalCallSide = null;
            this.finalCallWarningTriggered = false;
        }
    }

    // --- LEVEL 1 TUTORIAL SEQUENCE ---
    // Tutorial sequence removed to allow direct gameplay
    // --- END TUTORIAL SEQUENCE ---

    // --- END TUTORIAL SEQUENCE ---

    playStartSequence() {
        // Mark intro as complete - enable wallet sounds/animations
        this.introComplete = true;

        // ── DEBUG: unlock all ability buttons ────────────────────────────────
        import('../services/DebugConfig.js').then(({ DEBUG_CONFIG }) => {
            if (DEBUG_CONFIG.enabled && DEBUG_CONFIG.unlockAllAbilities && this.abilityButtons) {
                console.log('[DEBUG] Unlocking all ability buttons');
                [0, 1, 2, 3, 4, 5, 6, 7].forEach(i => {
                    const btn = this.abilityButtons[i];
                    if (btn && btn.locked) {
                        this.unlockAbilityButton(i);
                    }
                });
            }
        }).catch(() => {});
        // ─────────────────────────────────────────────────────────────────────
        
        // ===== CLEAR LAST ROUND DISPLAY VALUES =====
        // Now that new round is starting, clear the stored values from previous round
        this.lastRoundWoolSpent = 0;
        this.lastRoundCalls = null;
        
        // Reset Market Active State
        this.isMarketActive = false;
        this.finalCallLocked = false; // Reset for new round
        this.lockedProjectedGains = 0;
        this.lockedProjectedLosses = 0;
        this.finalCallLockShown = false; // Reset final call lock message flag
        this.isForcedRestartModal = false; // Reset forced restart flag for new round
        
        // Reset final call to null/undetermined for new round
        this.finalCallSide = null;
        
        // NEW: Reset indicators for new round
        this.pnlHistory = []; // Clear sparkline history
        if (this.sparklineContainer) this.sparklineContainer.setAlpha(0);
        if (this.goldenSheepTrackerContainer) this.goldenSheepTrackerContainer.setAlpha(0);
        
        // Update portfolio display to show "NO ACTIVE CALLS" for new round
        this.updatePortfolioDisplay();
        
        // RESET BLACK SHEEP BUTTON (Button 6) - Once per level usage
        if (this.abilityButtons && this.abilityButtons[6]) {
            const btn = this.abilityButtons[6];
            
            // Reset usage flag for new level
            btn.usedThisLevel = false;
            btn.countdownActive = false;
            
            // Restore button to active state (if unlocked)
            if (!btn.locked) {
                // Restore black sheep icon visibility
                if (btn.blackSheepImage) btn.blackSheepImage.setAlpha(1);
                if (btn.blackSheepBorder) btn.blackSheepBorder.setAlpha(1); // Restore white border
                if (btn.cdText) btn.cdText.setVisible(false);
                
                // Restore active button background
                btn.bg.clear();
                btn.bg.fillStyle(0x1a1a1a, 1);
                btn.bg.lineStyle(3, 0xfcd535, 1); // Yellow border (unlocked)
                btn.bg.fillCircle(0, 0, 56);
                btn.bg.strokeCircle(0, 0, 56);
                
                console.log('🐑 Black Sheep button reset - ready for new level');
            }
        }
        
        // RESET GOLDEN CLOVER BUTTON (Button 1) - Once per level usage
        if (this.abilityButtons && this.abilityButtons[1]) {
            const btn = this.abilityButtons[1];
            
            // Reset usage flag for new level
            btn.usedThisLevel = false;
            btn.countdownActive = false;
            
            // Restore button to active state (if unlocked)
            if (!btn.locked) {
                // Check if golden clover has been consumed in main game
                const inFreePlayMode = this.goldenKeyActivated && this.allLevelsUnlockedByGoldenKey;
                const goldenCloverUsedMainGame = localStorage.getItem('sheepMarket_goldenCloverUsed') === 'true';
                
                // Only restore visibility if NOT consumed (or in free-play mode)
                if (btn.goldenCloverImage) {
                    if (!inFreePlayMode && goldenCloverUsedMainGame) {
                        btn.goldenCloverImage.setAlpha(0.3); // Keep dimmed if already used
                    } else {
                        btn.goldenCloverImage.setAlpha(1); // Restore if not used yet
                    }
                }
                if (btn.cdText) btn.cdText.setVisible(false);
                
                // Restore active button background
                btn.bg.clear();
                btn.bg.fillStyle(0x1a1a1a, 1);
                btn.bg.lineStyle(3, 0xfcd535, 1); // Yellow border (unlocked)
                btn.bg.fillCircle(0, 0, 56);
                btn.bg.strokeCircle(0, 0, 56);
            }
        }
        
        // === TRACK LEVEL START BALANCE ===
        // Store balance at start of level to detect if player gained any wool
        this.levelStartBalance = this.balance;
        console.log('📊 Level start balance:', this.levelStartBalance);
        
        console.log('🎬 playStartSequence: Starting round. Balance:', this.balance);
        
        this.updatePrices();

        // Stop any existing tweens on statusText
        this.tweens.killTweensOf(this.statusText);
        
        // Hide Timer initially (revealed on GO!)
        if (this.timerText) this.timerText.setAlpha(0);

        // Ensure visible and reset
        this.statusText.setAlpha(1);
        this.statusText.setScale(1);
        this.statusText.setText("");
        this.statusText.setFontSize(100); // Larger for the countdown
        
        // Phaser 3.60+ uses chain() instead of createTimeline()
        this.tweens.chain({
            targets: this.statusText,
            tweens: [
                // READY?
                {
                    scale: { from: 0.5, to: 1.2 },
                    alpha: { from: 0, to: 1 },
                    duration: 400,
                    onStart: () => {
                        this.statusText.setText("READY?");
                        this.statusText.setColor('#fcd535'); // Gold
                        audioManager.playBaa(); 
                        
                        const gameScene = this.scene.get('GameScene');
                        if (gameScene) gameScene.events.emit('global-bleat');
                    },
                    yoyo: true,
                    hold: 400
                },
                // SET?
                {
                    scale: { from: 0.5, to: 1.2 },
                    alpha: { from: 0, to: 1 },
                    duration: 400,
                    onStart: () => {
                        this.statusText.setText("SET?");
                        this.statusText.setColor('#fcd535');
                        audioManager.playBaa();
                        
                        const gameScene = this.scene.get('GameScene');
                        if (gameScene) gameScene.events.emit('global-bleat');
                    },
                    yoyo: true,
                    hold: 400
                },
                // GO!
                {
                    scale: { from: 0.5, to: 1.5 },
                    alpha: { from: 0, to: 1 },
                    duration: 300,
                    onStart: () => {
                        this.statusText.setText("GO!");
                        this.statusText.setColor('#44ff44'); // Green
                        audioManager.playGoBleat(); 
                        
                        // START MUSIC ON GO! (Sound effects already playing from intro)
                        if (this.activeLevel === 2) {
                            audioManager.switchToLevel2Music();
                            audioManager.startMusicOnly();
                        } else if (this.activeLevel === 3) {
                            audioManager.switchToLevel3Music();
                            audioManager.startMusicOnly();
                        } else if (this.activeLevel === 4) {
                            audioManager.switchToLevel4Music();
                            audioManager.startMusicOnly();
                        } else if (this.activeLevel === 5) {
                            audioManager.switchToLevel5Music();
                            audioManager.startMusicOnly();
                        } else if (this.activeLevel === 6) {
                            audioManager.switchToLevel6Music();
                            audioManager.startMusicOnly();
                        } else if (this.activeLevel === 7) {
                            audioManager.switchToLevel7Music();
                            audioManager.startMusicOnly();
                        } else if (this.activeLevel === 8) {
                            console.log('🎵 HUD: Switching to Level 8 music');
                            audioManager.switchToLevel8Music();
                            audioManager.startMusicOnly();
                        } else if (this.activeLevel === 9) {
                            console.log('🎵 HUD GO!: LEVEL 9 - Starting Level 9 music NOW');
                            // Level 9 music starts on GO! (not during countdown)
                            audioManager.switchToLevel9Music();
                            audioManager.startMusicOnly();
                        } else if (this.activeLevel === 10) {
                            console.log('🎵 HUD GO!: LEVEL 10 - Starting Level 10 music');
                            audioManager.switchToLevel10Music();
                            audioManager.startMusicOnly();
                        } else if (this.activeLevel === 11) {
                            console.log('🎵 HUD GO!: LEVEL 11 - Starting Level 11 music');
                            audioManager.switchToLevel11Music();
                            audioManager.startMusicOnly();
                        } else if (this.activeLevel === 12) {
                            console.log('🎵 HUD GO!: LEVEL 12 - Starting Level 12 music');
                            audioManager.switchToLevel12Music();
                            audioManager.startMusicOnly();
                        } else {
                            audioManager.switchToDefaultMusic();
                            audioManager.startMusicOnly();
                        }
                        
                        // Market Open!
                        this.isMarketActive = true;
                        this.breakLocks();
                        this.updatePrices();

                        // Reveal Timer
                        this.tweens.add({
                            targets: this.timerText,
                            alpha: 1,
                            duration: 300,
                            ease: 'Power2'
                        });

                        // START GAME
                        const gameScene = this.scene.get('GameScene');
                        if (gameScene) {
                            gameScene.events.emit('global-bleat');
                            gameScene.events.emit('start-timer');
                        }
                        
                        // Start grass button throb animation for Level 6
                        if (this.activeLevel === 6) {
                            this.startGrassButtonThrob();
                        }
                    },
                    onComplete: () => {
                        // Fade out GO
                        this.tweens.add({
                            targets: this.statusText,
                            alpha: 0,
                            scale: 2,
                            duration: 500,
                            onComplete: () => {
                                this.statusText.setFontSize(64); // Reset to normal size
                            }
                        });
                    }
                }
            ]
        });
    }

    showReactionText(x, y, text, color) {
        // Specialized text display for narrative reactions
        // Consistent font size and style for both Red (Ignored) and Green (Obeyed)
        const reactionText = this.add.text(x, y, text, {
            font: '900 54px Inter',
            fill: color,
            stroke: '#000000',
            strokeThickness: 10,
            align: 'center',
            wordWrap: { width: CONFIG.width - 100 } // Safety wrapping
        }).setOrigin(0.5).setDepth(2000);

        // Entrance Animation: Quick pop in
        this.tweens.add({
            targets: reactionText,
            scale: { from: 0.5, to: 1 },
            alpha: { from: 0, to: 1 },
            y: y - 40,
            duration: 400,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Hold and slow float up
                this.tweens.add({
                    targets: reactionText,
                    y: y - 120, // Float up further
                    alpha: 0,
                    delay: 2500, // Hold for 2.5 seconds (plenty of read time)
                    duration: 800, // Smooth fade out
                    onComplete: () => reactionText.destroy()
                });
            }
        });
    }

    // playCoinFlyAnimation removed as per request


    showFreeWoolPopup() {
        console.log('🎉 showFreeWoolPopup called!');
        
        // Lock controls
        this.setControlsLocked(true);
        
        // Dim call counters during popup (only if they're visible)
        if (this.leftCallCounter && this.leftCallCount > 0) {
            this.leftCallCounter.setAlpha(0.3);
        }
        if (this.rightCallCounter && this.rightCallCount > 0) {
            this.rightCallCounter.setAlpha(0.3);
        }
        
        const cx = CONFIG.width / 2;
        const cy = CONFIG.height / 2;
        
        const container = this.add.container(cx, cy);
        container.setDepth(6000); // VERY high depth to be above everything
        container.setScale(0);
        
        console.log('Container created at:', cx, cy, 'depth:', container.depth);

        // Background Box (Wider to breathe)
        const bgWidth = 650;
        const bgHeight = 220;
        const bg = this.add.graphics();
        bg.fillStyle(0x161a1e, 0.95);
        bg.lineStyle(4, 0xfcd535);
        bg.fillRoundedRect(-bgWidth/2, -bgHeight/2, bgWidth, bgHeight, 25);
        bg.strokeRoundedRect(-bgWidth/2, -bgHeight/2, bgWidth, bgHeight, 25);

        // Interactive Hit Zone for speeding up
        const hitZone = this.add.rectangle(0, 0, bgWidth, bgHeight, 0x000000, 0);
        hitZone.setInteractive({ useHandCursor: true });

        // Wool Coin (Far Left)
        const coin = this.add.image(-240, 0, 'wool').setScale(0.5);
        
        // Text Content (Right Side - Left Aligned)
        const textX = -40; 
        
        const title = this.add.text(textX, -60, "FREE WOOL!", {
            font: '900 48px Inter',
            fill: '#fcd535',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0, 0.5); // Left align

        const msg = this.add.text(textX, 10, "Here is 50W to start with.\nDon't lose it all!\nThis is currency around here.", {
            font: 'bold 24px Inter',
            fill: '#ffffff',
            align: 'left',
            wordWrap: { width: 350 }
        }).setOrigin(0, 0.5); // Left align

        // OK Button (positioned on bottom yellow border)
        // bgHeight/2 = 110, so bottom edge is at y=110
        // Place button centered on the bottom border
        const btnY = bgHeight/2 - 2; // 108 (just inside the border)
        const okBtn = this.add.container(0, btnY); // Centered horizontally
        const okBtnBg = this.add.graphics();
        okBtnBg.fillStyle(0xfcd535, 1);
        okBtnBg.fillRoundedRect(-60, -25, 120, 50, 10); // Larger button
        
        const okBtnLabel = this.add.text(0, 0, 'OK', {
            font: '900 28px Inter',
            fill: '#000000'
        }).setOrigin(0.5);
        
        okBtn.add([okBtnBg, okBtnLabel]);
        
        container.add([bg, coin, title, msg, okBtn]);
        
        // Set button interactive AFTER adding to container (more reliable)
        // Use a generous hit area with padding for easier clicking
        const btnHitArea = new Phaser.Geom.Rectangle(-70, -35, 140, 70);
        okBtn.setInteractive({
            hitArea: btnHitArea,
            hitAreaCallback: Phaser.Geom.Rectangle.Contains,
            useHandCursor: true,
            draggable: false
        });
        
        console.log('All elements added to container. Animating in...');
        
        this.tweens.add({
            targets: container,
            scale: 1,
            duration: 500,
            ease: 'Back.easeOut',
            onComplete: () => {
                console.log('FREE WOOL popup fully visible!');
            }
        });

        // Float coin
        this.coinFloatTween = this.tweens.add({
            targets: coin,
            y: -15,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        const resolve = () => {
             if (this.isResolvingFreeWool) return;
             this.isResolvingFreeWool = true;
             
             // Unlock controls
             this.setControlsLocked(false);
             
             // Restore call counters when popup closes (only if they've been used)
             if (this.leftCallCounter && this.leftCallCount > 0) {
                 this.leftCallCounter.setAlpha(1);
             }
             if (this.rightCallCounter && this.rightCallCount > 0) {
                 this.rightCallCounter.setAlpha(1);
             }

             // 1. Fade out Box & Text
             this.tweens.add({
                 targets: [bg, title, msg, okBtn],
                 alpha: 0,
                 duration: 300
             });

             // 2. Detach Coin for flight
             // Stop float
             if (this.coinFloatTween) this.coinFloatTween.stop();
             
             // Create World Coin matching current state
             const flyCoin = this.add.image(cx - 240, cy + coin.y, 'wool').setScale(0.5).setDepth(3001);
             container.destroy(); // Destroy original popup

             // 3. Fly to Wallet (90, 87)
             audioManager.playCoinFly(); // Play fly sound
             this.tweens.add({
                 targets: flyCoin,
                 x: 90,
                 y: 87,
                 scale: 0.275, // Match wallet coin scale
                 duration: 1000,
                 ease: 'Power2',
                 onComplete: () => {
                     flyCoin.destroy();
                     // Trigger Wallet Unlock
                     this.unlockWalletFromFreeWool();
                 }
             });
        };

        this.isResolvingFreeWool = false;
        
        // Click OK button to resolve
        okBtn.on('pointerover', () => {
            console.log('Button hover detected');
            okBtn.setScale(1.05);
            okBtnBg.clear();
            okBtnBg.fillStyle(0xffe066, 1); // Lighter gold on hover
            okBtnBg.fillRoundedRect(-60, -25, 120, 50, 10);
        });
        
        okBtn.on('pointerout', () => {
            console.log('Button hover ended');
            okBtn.setScale(1);
            okBtnBg.clear();
            okBtnBg.fillStyle(0xfcd535, 1);
            okBtnBg.fillRoundedRect(-60, -25, 120, 50, 10);
        });
        
        okBtn.on('pointerdown', () => {
            console.log('Button clicked!');
            audioManager.playClick();
            resolve();
        });
        
        // Also allow clicking anywhere on the popup to close (fallback)
        hitZone.on('pointerdown', () => {
            console.log('Background clicked - closing popup');
            audioManager.playClick();
            resolve();
        });
    }

    unlockWalletFromFreeWool() {
        if (!this.isWalletLocked) return;
        this.isWalletLocked = false;
        
        // VISUAL UPDATE: Spin up numbers from 0
        if (this.balanceText) {
            this.displayBalance = 0;
            this.tweens.add({
                targets: this,
                displayBalance: this.balance,
                duration: 1500,
                ease: 'Cubic.easeOut',
                onUpdate: () => {
                    this.balanceText.setText(`${this.formatWool(this.displayBalance)}W`);
                },
                onComplete: () => {
                    // Particle Burst on finish
                    if (this.walletEmitter) {
                        this.walletEmitter.explode(30);
                        audioManager.playCoin();
                    }
                    
                    // If this is a retry OR player has seen wallet tutorial before, skip it
                    const hasSeenWalletTutorial = localStorage.getItem('sheepMarket_hasSeenWalletTutorial') === 'true';
                    
                    if (this.isRetrying || hasSeenWalletTutorial) {
                        this.time.delayedCall(500, () => {
                            this.playStartSequence();
                        });
                    } else {
                        // First time EVER: Show tutorial AFTER particles fly out
                        this.time.delayedCall(500, () => {
                            this.showWalletUnlockTutorial();
                        });
                    }
                }
            });
        }

        // Visual Unlock (Simplified from unlockWalletAnimation)
        if (this.walletLock) {
            this.tweens.add({
                targets: this.walletLock,
                scale: 2,
                alpha: 0,
                duration: 400,
                ease: 'Back.easeIn',
                onComplete: () => this.walletLock.destroy()
            });
        }

        // Brighten Items
        const targets = [this.walletCoin, this.walletBg, this.balanceText, this.livePnlText].filter(x => x);
        if (targets.length > 0) {
            targets.forEach(t => {
                if (t.clearTint) t.clearTint();
                this.tweens.add({ targets: t, alpha: 1, duration: 500 });
            });
        }
        
        // Spin Coin
        if (this.walletCoin) {
            this.tweens.add({
                targets: this.walletCoin,
                scaleX: 0,
                duration: 150,
                yoyo: true,
                repeat: 1
            });
        }
    }

    grantStarterWool() {
        console.log('💰 grantStarterWool() called! isClaimPopupOpen:', this.isClaimPopupOpen);
        
        if (this.isClaimPopupOpen) {
            console.log('⚠️ Popup already open, returning early');
            return;
        }
        
        this.isClaimPopupOpen = true; // Use same flag to prevent double calls
        this.hasGrantedStarterWool = true; // Mark that we've granted wool this session
        
        // Mark in localStorage so popup won't show again on refresh (unless balance goes to 0)
        localStorage.setItem('sheepMarket_hasReceivedStarterWool', 'true');
        
        // Reset Broke Alert flag since we are bailing them out
        this.isShowingBrokeAlert = false; 

        // 1. Grant Wool (50W)
        // SET balance to exactly 50 (not add 50 to existing balance)
        this.balance = 50;
        this.displayBalance = 0; // Start display at 0 for animation
        
        console.log('Balance SET to:', this.balance);
        
        const gameScene = this.scene.get('GameScene');
        if (gameScene) {
            gameScene.woolBalance = 50;
            gameScene.saveBalance();
            console.log('GameScene balance synced to 50');
        } else {
            console.error('⚠️ GameScene not found!');
        }
        
        // Feedback
        console.log('About to call showFreeWoolPopup...');
        this.showFreeWoolPopup();
        audioManager.playCoin();
        
        this.isClaimPopupOpen = false;
    }

    unlockWalletAnimation(callback) {
        // Refresh Level Indicators (Level Up)
        this.createLevelIndicators();

        if (!this.isWalletLocked) {
            if (callback) callback();
            return;
        }
        
        this.isWalletLocked = false;
        
        // WALLET UNLOCK SEQUENCE (Start immediately)
        this.time.delayedCall(500, () => {
             // Destroy Lock
             if (this.walletLock) {
                 this.tweens.add({
                     targets: this.walletLock,
                     scale: 2,
                     alpha: 0,
                     duration: 400,
                     ease: 'Back.easeIn',
                     onComplete: () => this.walletLock.destroy()
                 });
             }

             // Brighten Coin & BG
             if (this.walletCoin) {
                 this.walletCoin.clearTint();
                 this.tweens.add({ targets: this.walletCoin, alpha: 1, duration: 500 });
                 
                 // Spin animation
                 this.tweens.add({
                     targets: this.walletCoin,
                     scaleX: 0,
                     duration: 150,
                     yoyo: true,
                     repeat: 1
                 });
             }
             if (this.walletBg) {
                 this.tweens.add({ targets: this.walletBg, alpha: 1, duration: 500 });
             }
             if (this.balanceText) {
                 this.tweens.add({ targets: this.balanceText, alpha: 1, duration: 500 });
             }
             if (this.livePnlText) {
                 this.tweens.add({ targets: this.livePnlText, alpha: 1, duration: 500 });
             }

             if (callback) callback();
        });
        
        // Open Wallet Tutorial after all that - REMOVED
    }

    createTutorialPopupWithButton(x, y, text, btnText, callback) {
        // Lock controls
        this.setControlsLocked(true);
        
        const container = this.add.container(x, y);
        container.setDepth(4000);

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0x161a1e, 0.95);
        bg.lineStyle(2, 0xfcd535);
        bg.fillRoundedRect(-175, -100, 350, 230, 15); // Increased height to encompass button comfortably
        bg.strokeRoundedRect(-175, -100, 350, 230, 15);

        // Text - Centered in the space above button
        // Available space: Top -100 to Button Top ~75. Center is -12.5.
        const msg = this.add.text(0, -15, text, {
            font: 'bold 22px Inter',
            fill: '#ffffff',
            align: 'center',
            wordWrap: { width: 300 }
        }).setOrigin(0.5);

        // Button - Shifted down slightly to fit new bg
        const btn = this.add.container(0, 80);
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0xfcd535, 1);
        btnBg.fillRoundedRect(-60, -25, 120, 50, 10);
        
        const btnLabel = this.add.text(0, 0, btnText, {
            font: '900 24px Inter',
            fill: '#000000'
        }).setOrigin(0.5);
        
        btn.add([btnBg, btnLabel]);
        
        // Interaction
        const hitArea = new Phaser.Geom.Rectangle(-60, -25, 120, 50);
        btn.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
        
        btn.on('pointerover', () => btn.setScale(1.05));
        btn.on('pointerout', () => btn.setScale(1));
        btn.on('pointerdown', () => {
            audioManager.playTyping();
            
            // Unlock controls
            this.setControlsLocked(false);
            
            if (callback) callback();
            container.destroy();
        });

        container.add([bg, msg, btn]);
        
        // Pop In
        container.setScale(0);
        this.tweens.add({
            targets: container,
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });

        return container;
    }

    createTutorialArrow(x, y, angle) {
        const container = this.add.container(x, y);
        container.setDepth(4000);
        
        const gfx = this.add.graphics();
        gfx.fillStyle(0xfcd535, 1);
        gfx.lineStyle(2, 0x000000);
        
        // Triangle pointing DOWN by default
        gfx.beginPath();
        gfx.moveTo(0, 20);
        gfx.lineTo(15, -10);
        gfx.lineTo(-15, -10);
        gfx.closePath();
        gfx.fillPath();
        gfx.strokePath();
        
        container.add(gfx);
        container.setRotation(angle);

        // Bobbing animation (Local Y)
        this.tweens.add({
            targets: gfx,
            y: 10, // Move down relative to container
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        return container;
    }

    showWalletUnlockTutorial() {
        // Dim call counters during wallet introduction (only if visible)
        if (this.leftCallCounter && this.leftCallCount > 0) {
            this.leftCallCounter.setAlpha(0.3);
        }
        if (this.rightCallCounter && this.rightCallCount > 0) {
            this.rightCallCounter.setAlpha(0.3);
        }
        
        // Target: The Wallet Coin in Top Left
        // Wallet Container is at (0,0). Coin is at (90, 87).
        const targetX = 90;
        const targetY = 87;

        // Position popup to the right and slightly down to clear the UI
        const popupX = 350;
        const popupY = 250;

        // Add movement to ONLY the wool coin (Pulse)
        if (this.walletCoin) {
            this.walletTutTween = this.tweens.add({
                targets: this.walletCoin,
                scale: 0.35,
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        // 1. Popup
        this.walletUnlockPopup = this.createTutorialPopupWithButton(
            popupX,
            popupY,
            "This is your WOOL Wallet. Your WOOL Wallet keeps track of everything you gain and lose.",
            "OK",
            () => {
                // Mark tutorial as seen (persist across sessions)
                localStorage.setItem('sheepMarket_hasSeenWalletTutorial', 'true');
                
                // Restore call counters when tutorial closes (only if they've been used)
                if (this.leftCallCounter && this.leftCallCount > 0) {
                    this.leftCallCounter.setAlpha(1);
                }
                if (this.rightCallCounter && this.rightCallCount > 0) {
                    this.rightCallCounter.setAlpha(1);
                }
                
                // Stop coin animation and reset scale
                if (this.walletTutTween) {
                    this.walletTutTween.stop();
                    this.walletCoin.setScale(0.275); // Reset to normal coin scale
                    this.walletTutTween = null;
                }

                if (this.walletUnlockArrow) this.walletUnlockArrow.destroy();
                this.walletUnlockPopup = null;
                // REMOVED: toggleStatsModal() call
                // User requested to disable the popup display after introduction
                
                // START GAME NOW (Delayed by tutorial interaction)
                const gameScene = this.scene.get('GameScene');
                this.playStartSequence();
            }
        );

        // 2. Arrow pointing UP at the wallet coin
        // Position arrow slightly below the coin (Y + offset)
        this.walletUnlockArrow = this.createTutorialArrow(targetX, targetY + 70, Math.PI);
    }

    showLevel1Intro(gameScene) {
        // Start sound effects immediately
        audioManager.startSoundEffects();
        
        // Overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.85);
        overlay.fillRect(0, 0, CONFIG.width, CONFIG.height);
        overlay.setDepth(4000);
        overlay.setAlpha(0);

        const container = this.add.container(CONFIG.width / 2, CONFIG.height / 2);
        container.setDepth(4001);
        container.setAlpha(0);

        // Level Title
        const lvlText = this.add.text(0, -50, 'LEVEL 1', {
            font: '900 120px Inter',
            fill: '#fcd535',
            stroke: '#000000',
            strokeThickness: 15,
            shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 10, fill: true }
        }).setOrigin(0.5);

        // Subtitle
        const subText = this.add.text(0, 70, 'SHEPHERD TRAINING', {
            font: 'bold 48px Inter',
            fill: '#ffffff',
            letterSpacing: 4,
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        container.add([lvlText, subText]);

        // Sequence
        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 500
        });

        this.tweens.add({
            targets: container,
            alpha: 1,
            scale: { from: 0.8, to: 1 },
            duration: 800,
            ease: 'Back.out',
            onComplete: () => {
                // Exit
                this.time.delayedCall(3000, () => {
                    this.tweens.add({
                        targets: [container, overlay],
                        alpha: 0,
                        duration: 500,
                        onComplete: () => {
                            container.destroy();
                            overlay.destroy();
                            
                            // START GAME LOGIC
                            // Grant FREE WOOL if player is new or broke (Level 1 Entrance Exam needs starting capital)
                            console.log('Level 1 Intro Complete - Balance:', this.balance, 'hasGrantedStarterWool:', this.hasGrantedStarterWool);
                            
                            // Check if player has completed the game (unlocked all levels via Golden Key)
                            const hasCompletedGame = this.goldenKeyActivated && this.allLevelsUnlockedByGoldenKey;
                            console.log('Has completed game:', hasCompletedGame);
                            
                            // Only grant starter wool if:
                            // 1. Player has NOT completed the game, AND
                            // 2. Balance is 0 OR they've never received starter wool
                            if (!hasCompletedGame && (this.balance <= 0 || !this.hasGrantedStarterWool)) {
                                console.log('Granting starter wool...');
                                this.grantStarterWool();
                            } else {
                                if (hasCompletedGame) {
                                    console.log('Player has completed game - skipping starter wool grant, unlocking wallet directly');
                                    // Unlock wallet without granting wool (for completed players)
                                    this.unlockWalletAnimation(() => {
                                        this.playStartSequence();
                                    });
                                } else {
                                    this.playStartSequence();
                                }
                            }
                        }
                    });
                });
            }
        });
        
        // No sound on level start
    }

    showLevel2Intro(gameScene) {
        // Start sound effects immediately
        audioManager.startSoundEffects();
        
        // Overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.85);
        overlay.fillRect(0, 0, CONFIG.width, CONFIG.height);
        overlay.setDepth(4000);
        overlay.setAlpha(0);

        const container = this.add.container(CONFIG.width / 2, CONFIG.height / 2);
        container.setDepth(4001);
        container.setAlpha(0);

        // Level Title
        const lvlText = this.add.text(0, -50, 'LEVEL 2', {
            font: '900 120px Inter',
            fill: '#fcd535',
            stroke: '#000000',
            strokeThickness: 15,
            shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 10, fill: true }
        }).setOrigin(0.5);

        // Subtitle
        const subText = this.add.text(0, 70, 'JUNIOR SHEPHERD', {
            font: 'bold 48px Inter',
            fill: '#ffffff',
            letterSpacing: 4,
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        container.add([lvlText, subText]);

        // Sequence
        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 500
        });

        this.tweens.add({
            targets: container,
            alpha: 1,
            scale: { from: 0.8, to: 1 },
            duration: 800,
            ease: 'Back.out',
            onComplete: () => {
                // Exit
                this.time.delayedCall(3500, () => {
                    this.tweens.add({
                        targets: [container, overlay],
                        alpha: 0,
                        duration: 500,
                        onComplete: () => {
                            container.destroy();
                            overlay.destroy();
                            
                            // START GAME
                            console.log('HUDScene: Emitting start-timer from Level 2 Intro');
                            
                            if (this.fromGraduation) {
                                this.unlockWalletAnimation(() => {
                                    this.playStartSequence();
                                });
                            } else {
                                this.playStartSequence();
                            }
                            
                            // TRIGGER UNLOCK ANIMATION for Level 2 Buttons
                            this.time.delayedCall(500, () => {
                                this.animateLevel2Unlock();
                            });
                        }
                    });
                });
            }
        });
        
        // No sound on level start
    }

    showLevel3Intro(gameScene) {
        // DON'T start farm ambience for Level 3 - only rain
        // Stop farm ambience if it's playing
        if (audioManager.ambience && audioManager.ambience.state === 'started') {
            audioManager.ambience.stop();
        }
        
        // Start rain ambience for Level 3
        import('tone').then((Tone) => {
            if (!audioManager.isSoundMuted) {
                try {
                    if (audioManager.rainAmbience.loaded) {
                        if (audioManager.rainAmbience.state !== 'started') {
                            audioManager.rainAmbience.start();
                        }
                    } else {
                        audioManager.rainAmbience.autostart = true;
                    }
                } catch (e) {
                    console.warn("Rain ambience start failed:", e);
                }
            }
        }).catch(e => console.error(e));
        
        // Overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.9); // Darker than L2
        overlay.fillRect(0, 0, CONFIG.width, CONFIG.height);
        overlay.setDepth(4000);
        overlay.setAlpha(0);

        const container = this.add.container(CONFIG.width / 2, CONFIG.height / 2);
        container.setDepth(4001);
        container.setAlpha(0);

        // Level Title
        const lvlText = this.add.text(0, -50, 'LEVEL 3', {
            font: '900 120px Inter',
            fill: '#fcd535',
            stroke: '#000000',
            strokeThickness: 15,
            shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 10, fill: true }
        }).setOrigin(0.5);

        // Subtitle
        const subText = this.add.text(0, 70, 'SENIOR SHEPHERD', {
            font: 'bold 48px Inter',
            fill: '#ffffff',
            letterSpacing: 4,
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        container.add([lvlText, subText]);

        // Sequence
        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 500
        });

        this.tweens.add({
            targets: container,
            alpha: 1,
            scale: { from: 0.8, to: 1 },
            duration: 800,
            ease: 'Back.out',
            onComplete: () => {
                // Exit
                this.time.delayedCall(3000, () => {
                    this.tweens.add({
                        targets: [container, overlay],
                        alpha: 0,
                        duration: 500,
                        onComplete: () => {
                            container.destroy();
                            overlay.destroy();
                            
                            // START GAME
                            this.playStartSequence();
                            
                            // TRIGGER UNLOCK ANIMATION for Level 3 Buttons
                            this.time.delayedCall(500, () => {
                                this.animateLevel3Unlock();
                            });
                        }
                    });
                });
            }
        });
    }

    showLevel4Intro(gameScene) {
        // Start sound effects immediately
        audioManager.startSoundEffects();
        
        // Start rain ambience immediately for atmosphere
        import('tone').then((Tone) => {
            if (!audioManager.isSoundMuted) {
                try {
                    if (audioManager.rainAmbience.loaded) {
                        if (audioManager.rainAmbience.state !== 'started') {
                            audioManager.rainAmbience.start();
                        }
                    } else {
                        audioManager.rainAmbience.autostart = true;
                    }
                } catch (e) {
                    console.warn("Rain ambience start failed:", e);
                }
            }
        }).catch(e => console.error(e));
        
        // Overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.95); // Nearly pitch black
        overlay.fillRect(0, 0, CONFIG.width, CONFIG.height);
        overlay.setDepth(4000);
        overlay.setAlpha(0);

        const container = this.add.container(CONFIG.width / 2, CONFIG.height / 2);
        container.setDepth(4001);
        container.setAlpha(0);

        // Level Title
        const lvlText = this.add.text(0, -100, 'LEVEL 4', {
            font: '900 120px Inter',
            fill: '#fcd535',
            stroke: '#000000',
            strokeThickness: 15,
            shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 10, fill: true }
        }).setOrigin(0.5);

        // Subtitle
        const subText = this.add.text(0, 20, 'MASTER SHEPHERD', {
            font: 'bold 48px Inter',
            fill: '#ffffff',
            letterSpacing: 4,
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        container.add([lvlText, subText]);

        // Sequence
        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 500
        });

        this.tweens.add({
            targets: container,
            alpha: 1,
            scale: { from: 0.8, to: 1 },
            duration: 800,
            ease: 'Back.out',
            onComplete: () => {
                audioManager.playCoin();

                // Exit
                this.time.delayedCall(2500, () => {
                    this.tweens.add({
                        targets: [container, overlay],
                        alpha: 0,
                        duration: 500,
                        onComplete: () => {
                            container.destroy();
                            overlay.destroy();
                            
                            // START GAME
                            this.playStartSequence();
                        }
                    });
                });
            }
        });
    }

    showLevel5Intro(gameScene) {
        // Start sound effects immediately
        audioManager.startSoundEffects();
        
        // Overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.85); // Consistent with other levels
        overlay.fillRect(0, 0, CONFIG.width, CONFIG.height);
        overlay.setDepth(4000);
        overlay.setAlpha(0);

        const container = this.add.container(CONFIG.width / 2, CONFIG.height / 2);
        container.setDepth(4001);
        container.setAlpha(0);

        // Level Title
        const lvlText = this.add.text(0, -50, 'LEVEL 5', {
            font: '900 120px Inter',
            fill: '#fcd535',
            stroke: '#000000',
            strokeThickness: 15,
            shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 10, fill: true }
        }).setOrigin(0.5);

        // Subtitle
        const subText = this.add.text(0, 70, 'GRAND SHEPHERD', {
            font: 'bold 48px Inter',
            fill: '#ffffff',
            letterSpacing: 4,
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        container.add([lvlText, subText]);

        // Sequence
        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 500
        });

        this.tweens.add({
            targets: container,
            alpha: 1,
            scale: { from: 0.8, to: 1 },
            duration: 800,
            ease: 'Back.out',
            onComplete: () => {
                // Exit
                this.time.delayedCall(3500, () => {
                    this.tweens.add({
                        targets: [container, overlay],
                        alpha: 0,
                        duration: 500,
                        onComplete: () => {
                            container.destroy();
                            overlay.destroy();
                            
                            // START GAME
                            this.playStartSequence();
                        }
                    });
                });
            }
        });
    }

    showLevel6Intro(gameScene) {
        // Start sound effects immediately
        audioManager.startSoundEffects();
        
        // Overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.85);
        overlay.fillRect(0, 0, CONFIG.width, CONFIG.height);
        overlay.setDepth(4000);
        overlay.setAlpha(0);

        const container = this.add.container(CONFIG.width / 2, CONFIG.height / 2);
        container.setDepth(4001);
        container.setAlpha(0);

        // Level Title
        const lvlText = this.add.text(0, -50, 'LEVEL 6', {
            font: '900 120px Inter',
            fill: '#fcd535',
            stroke: '#000000',
            strokeThickness: 15,
            shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 10, fill: true }
        }).setOrigin(0.5);

        // Subtitle
        const subText = this.add.text(0, 70, 'ELITE SHEPHERD', {
            font: 'bold 48px Inter',
            fill: '#ffffff',
            letterSpacing: 4,
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        container.add([lvlText, subText]);

        // Sequence
        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 500
        });

        this.tweens.add({
            targets: container,
            alpha: 1,
            scale: { from: 0.8, to: 1 },
            duration: 800,
            ease: 'Back.out',
            onComplete: () => {
                // Exit
                this.time.delayedCall(3500, () => {
                    this.tweens.add({
                        targets: [container, overlay],
                        alpha: 0,
                        duration: 500,
                        onComplete: () => {
                            container.destroy();
                            overlay.destroy();
                            
                            // START GAME
                            this.playStartSequence();
                        }
                    });
                });
            }
        });
    }

    showLevel7Intro(gameScene) {
        // Start sound effects immediately
        audioManager.startSoundEffects();
        
        // Overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.85);
        overlay.fillRect(0, 0, CONFIG.width, CONFIG.height);
        overlay.setDepth(4000);
        overlay.setAlpha(0);

        const container = this.add.container(CONFIG.width / 2, CONFIG.height / 2);
        container.setDepth(4001);
        container.setAlpha(0);

        // Level Title
        const lvlText = this.add.text(0, -50, 'LEVEL 7', {
            font: '900 120px Inter',
            fill: '#fcd535',
            stroke: '#000000',
            strokeThickness: 15,
            shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 10, fill: true }
        }).setOrigin(0.5);

        // Subtitle
        const subText = this.add.text(0, 70, 'LEGENDARY SHEPHERD', {
            font: 'bold 48px Inter',
            fill: '#ffffff',
            letterSpacing: 4,
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        container.add([lvlText, subText]);

        // Sequence
        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 500
        });

        this.tweens.add({
            targets: container,
            alpha: 1,
            scale: { from: 0.8, to: 1 },
            duration: 800,
            ease: 'Back.out',
            onComplete: () => {
                // Exit
                this.time.delayedCall(3500, () => {
                    this.tweens.add({
                        targets: [container, overlay],
                        alpha: 0,
                        duration: 500,
                        onComplete: () => {
                            container.destroy();
                            overlay.destroy();
                            
                            // START GAME
                            this.playStartSequence();
                        }
                    });
                });
            }
        });
    }

    showLevel8Intro(gameScene) {
        // Start sound effects immediately
        audioManager.startSoundEffects();
        
        // Overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.85);
        overlay.fillRect(0, 0, CONFIG.width, CONFIG.height);
        overlay.setDepth(4000);
        overlay.setAlpha(0);

        const container = this.add.container(CONFIG.width / 2, CONFIG.height / 2);
        container.setDepth(4001);
        container.setAlpha(0);

        // Level Title
        const lvlText = this.add.text(0, -50, 'LEVEL 8', {
            font: '900 120px Inter',
            fill: '#fcd535',
            stroke: '#000000',
            strokeThickness: 15,
            shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 10, fill: true }
        }).setOrigin(0.5);

        // Subtitle
        const subText = this.add.text(0, 70, 'ULTIMATE SHEPHERD', {
            font: 'bold 48px Inter',
            fill: '#ffffff',
            letterSpacing: 4,
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        container.add([lvlText, subText]);

        // Sequence
        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 500
        });

        this.tweens.add({
            targets: container,
            alpha: 1,
            scale: { from: 0.8, to: 1 },
            duration: 800,
            ease: 'Back.out',
            onComplete: () => {
                // Exit
                this.time.delayedCall(3500, () => {
                    this.tweens.add({
                        targets: [container, overlay],
                        alpha: 0,
                        duration: 500,
                        onComplete: () => {
                            container.destroy();
                            overlay.destroy();
                            
                            // START GAME
                            this.playStartSequence();
                        }
                    });
                });
            }
        });
    }

    showLevel9Intro(gameScene) {
        // Start sound effects immediately
        audioManager.startSoundEffects();
        
        // Overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.85);
        overlay.fillRect(0, 0, CONFIG.width, CONFIG.height);
        overlay.setDepth(4000);
        overlay.setAlpha(0);

        const container = this.add.container(CONFIG.width / 2, CONFIG.height / 2);
        container.setDepth(4001);
        container.setAlpha(0);

        // Level Title
        const lvlText = this.add.text(0, -50, 'LEVEL 9', {
            font: '900 120px Inter',
            fill: '#fcd535',
            stroke: '#000000',
            strokeThickness: 15,
            shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 10, fill: true }
        }).setOrigin(0.5);

        // Subtitle
        const subText = this.add.text(0, 70, 'SUPREME SHEPHERD', {
            font: 'bold 48px Inter',
            fill: '#ffffff',
            letterSpacing: 4,
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        container.add([lvlText, subText]);

        // Sequence
        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 500
        });

        this.tweens.add({
            targets: container,
            alpha: 1,
            scale: { from: 0.8, to: 1 },
            duration: 800,
            ease: 'Back.out',
            onComplete: () => {
                // Exit
                this.time.delayedCall(3500, () => {
                    this.tweens.add({
                        targets: [container, overlay],
                        alpha: 0,
                        duration: 500,
                        onComplete: () => {
                            container.destroy();
                            overlay.destroy();
                            
                            // START GAME
                            this.playStartSequence();
                        }
                    });
                });
            }
        });
    }

    showLevel10Intro(gameScene) {
        // Start sound effects immediately
        audioManager.startSoundEffects();
        
        // Overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.85);
        overlay.fillRect(0, 0, CONFIG.width, CONFIG.height);
        overlay.setDepth(4000);
        overlay.setAlpha(0);

        const container = this.add.container(CONFIG.width / 2, CONFIG.height / 2);
        container.setDepth(4001);
        container.setAlpha(0);

        // Level Title
        const lvlText = this.add.text(0, -50, 'LEVEL 10', {
            font: '900 120px Inter',
            fill: '#fcd535',
            stroke: '#000000',
            strokeThickness: 15,
            shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 10, fill: true }
        }).setOrigin(0.5);

        // Subtitle
        const subText = this.add.text(0, 70, 'APEX SHEPHERD', {
            font: 'bold 48px Inter',
            fill: '#ffffff',
            letterSpacing: 4,
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        container.add([lvlText, subText]);

        // Sequence
        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 500
        });

        this.tweens.add({
            targets: container,
            alpha: 1,
            scale: { from: 0.8, to: 1 },
            duration: 800,
            ease: 'Back.out',
            onComplete: () => {
                // Exit
                this.time.delayedCall(3500, () => {
                    this.tweens.add({
                        targets: [container, overlay],
                        alpha: 0,
                        duration: 500,
                        onComplete: () => {
                            container.destroy();
                            overlay.destroy();
                            
                            // START GAME
                            this.playStartSequence();
                        }
                    });
                });
            }
        });
    }

    animateLevel2Unlock() {
        this.lockLevel2Start = false;
        // Buttons removed, no animation needed
    }

    animateLevel3Unlock() {
        this.lockLevel3Start = false;
        // Buttons removed, no animation needed
    }

    createLeaderboardModal() {
        this.leaderboardContainer = this.add.container(CONFIG.width / 2, CONFIG.height / 2);
        this.leaderboardContainer.setAlpha(0);
        this.leaderboardContainer.setScale(0.8);
        this.leaderboardContainer.setDepth(3100);

        const modalWidth = 900;
        const modalHeight = 700;
        const modalBg = this.add.graphics();
        
        // Outer shadow for depth
        modalBg.fillStyle(0x3E2723, 0.8);
        modalBg.fillRoundedRect(-modalWidth/2 + 8, -modalHeight/2 + 8, modalWidth, modalHeight, 15);
        
        // Main wooden board - medium brown
        modalBg.fillStyle(0x6D4C41, 1);
        modalBg.fillRoundedRect(-modalWidth/2, -modalHeight/2, modalWidth, modalHeight, 15);
        
        // Wood grain effect - darker brown horizontal lines
        modalBg.lineStyle(2, 0x5D4037, 0.4);
        for (let i = 0; i < 15; i++) {
            const yPos = -modalHeight/2 + (i * 50);
            modalBg.lineBetween(-modalWidth/2 + 20, yPos, modalWidth/2 - 20, yPos);
        }
        
        // Darker wooden frame border
        modalBg.lineStyle(8, 0x4E342E, 1);
        modalBg.strokeRoundedRect(-modalWidth/2, -modalHeight/2, modalWidth, modalHeight, 15);
        
        // Inner lighter wood trim
        modalBg.lineStyle(3, 0x8D6E63, 1);
        modalBg.strokeRoundedRect(-modalWidth/2 + 12, -modalHeight/2 + 12, modalWidth - 24, modalHeight - 24, 12);
        
        // Corner "nails" - metallic rivets
        const nailPositions = [
            [-modalWidth/2 + 30, -modalHeight/2 + 30],
            [modalWidth/2 - 30, -modalHeight/2 + 30],
            [-modalWidth/2 + 30, modalHeight/2 - 30],
            [modalWidth/2 - 30, modalHeight/2 - 30]
        ];
        
        nailPositions.forEach(([x, y]) => {
            // Nail head - dark metal
            modalBg.fillStyle(0x424242, 1);
            modalBg.fillCircle(x, y, 6);
            // Nail shine
            modalBg.fillStyle(0x757575, 1);
            modalBg.fillCircle(x - 2, y - 2, 2);
        });

        // Title on wooden sign plaque
        const titleBg = this.add.graphics();
        titleBg.fillStyle(0x8D6E63, 1);
        titleBg.lineStyle(3, 0x5D4037, 1);
        titleBg.fillRoundedRect(-300, -modalHeight/2 + 20, 600, 70, 10);
        titleBg.strokeRoundedRect(-300, -modalHeight/2 + 20, 600, 70, 10);
        
        const title = this.add.text(0, -modalHeight/2 + 55, 'LEADERBOARD', { 
            font: '900 42px Inter', 
            fill: '#FFF8DC', // Cornsilk - light wood color
            stroke: '#3E2723',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Create scrollable DOM element for leaderboard content - parchment style
        const scrollDiv = document.createElement('div');
        scrollDiv.style.width = '820px';
        scrollDiv.style.height = '490px';
        scrollDiv.style.overflowY = 'scroll';
        scrollDiv.style.overflowX = 'hidden';
        scrollDiv.style.padding = '25px';
        scrollDiv.style.backgroundColor = '#F5E6D3'; // Parchment/old paper color
        scrollDiv.style.border = '4px solid #8D6E63'; // Medium wood border
        scrollDiv.style.borderRadius = '8px';
        scrollDiv.style.boxShadow = 'inset 0 0 20px rgba(139, 69, 19, 0.2)'; // Inner shadow for aged paper look
        scrollDiv.style.color = '#3E2723'; // Dark brown text
        scrollDiv.style.fontSize = '22px';
        scrollDiv.style.fontFamily = 'Inter, sans-serif';
        scrollDiv.style.fontWeight = '900';
        
        // Custom scrollbar styling - wooden theme
        const style = document.createElement('style');
        style.innerHTML = `
            #leaderboard-scroll::-webkit-scrollbar {
                width: 14px;
            }
            #leaderboard-scroll::-webkit-scrollbar-track {
                background: rgba(139, 69, 19, 0.2);
                border-radius: 7px;
            }
            #leaderboard-scroll::-webkit-scrollbar-thumb {
                background: #8D6E63;
                border-radius: 7px;
                border: 2px solid #6D4C41;
            }
            #leaderboard-scroll::-webkit-scrollbar-thumb:hover {
                background: #A1887F;
            }
        `;
        scrollDiv.id = 'leaderboard-scroll';
        document.head.appendChild(style);
        
        this.leaderboardScrollDiv = scrollDiv;
        this.leaderboardScrollStyle = style;
        
        // Add DOM element to scene at proper position
        this.leaderboardDomElement = this.add.dom(0, 20, scrollDiv);
        this.leaderboardDomElement.setDepth(3102);
        
        // Close Button - wooden style matching toolkit (positioned at bottom like landing page)
        const closeBtnContainer = this.add.container(0, modalHeight/2 - 20);
        
        const closeBtnBg = this.add.graphics();
        // Shadow
        closeBtnBg.fillStyle(0x3E2723, 0.6);
        closeBtnBg.fillRoundedRect(-98, -28, 200, 60, 12);
        // Main wood
        closeBtnBg.fillStyle(0x8D6E63, 1);
        closeBtnBg.fillRoundedRect(-100, -30, 200, 60, 12);
        // Dark border
        closeBtnBg.lineStyle(4, 0x5D4037, 1);
        closeBtnBg.strokeRoundedRect(-100, -30, 200, 60, 12);
        
        const closeBtnText = this.add.text(0, 0, 'CLOSE', {
            font: '900 32px Inter',
            fill: '#FFF8DC',
            stroke: '#3E2723',
            strokeThickness: 5
        }).setOrigin(0.5);
        
        closeBtnContainer.add([closeBtnBg, closeBtnText]);
        
        const closeBtnHitArea = new Phaser.Geom.Rectangle(-100, -30, 200, 60);
        closeBtnContainer.setInteractive(closeBtnHitArea, Phaser.Geom.Rectangle.Contains);
        
        closeBtnContainer.on('pointerover', () => {
            closeBtnContainer.setScale(1.08);
            closeBtnBg.clear();
            // Lighter wood on hover
            closeBtnBg.fillStyle(0x3E2723, 0.6);
            closeBtnBg.fillRoundedRect(-98, -28, 200, 60, 12);
            closeBtnBg.fillStyle(0xA1887F, 1);
            closeBtnBg.fillRoundedRect(-100, -30, 200, 60, 12);
            closeBtnBg.lineStyle(4, 0x5D4037, 1);
            closeBtnBg.strokeRoundedRect(-100, -30, 200, 60, 12);
        });
        
        closeBtnContainer.on('pointerout', () => {
            closeBtnContainer.setScale(1);
            closeBtnBg.clear();
            // Reset to normal wood
            closeBtnBg.fillStyle(0x3E2723, 0.6);
            closeBtnBg.fillRoundedRect(-98, -28, 200, 60, 12);
            closeBtnBg.fillStyle(0x8D6E63, 1);
            closeBtnBg.fillRoundedRect(-100, -30, 200, 60, 12);
            closeBtnBg.lineStyle(4, 0x5D4037, 1);
            closeBtnBg.strokeRoundedRect(-100, -30, 200, 60, 12);
        });
        
        closeBtnContainer.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
            audioManager.playClick();
            this.toggleLeaderboardModal();
        });

        this.leaderboardContainer.add([modalBg, titleBg, title, this.leaderboardDomElement, closeBtnContainer]);
    }

    updateLeaderboardView() {
        if (!this.leaderboardScrollDiv) return;
        
        // Submit current score first to ensure we are up to date
        const playerName = localStorage.getItem('sheepMarket_playerName') || 'YOU';
        const isGrandmaster = localStorage.getItem('sheepMarket_goldenKeyActivated') === 'true';
        leaderboardService.submitScore(playerName, Math.floor(this.balance), isGrandmaster);
        
        const data = leaderboardService.getLeaderboard();
        
        let htmlContent = '';
        
        data.forEach((entry, index) => {
            const rank = index + 1;
            const isPlayer = entry.isPlayer;
            const isGrandmaster = entry.isGrandmaster;
            
            // Background color - wooden/parchment theme
            let bgColor = 'rgba(139, 110, 99, 0.2)'; // Light wood tint
            if (isPlayer) {
                bgColor = 'rgba(255, 215, 0, 0.3)'; // Golden highlight
            } else if (rank <= 3) {
                bgColor = 'rgba(141, 110, 99, 0.3)'; // Medium wood tint
            }
            
            // Rank Color
            let rankColor = '#8B4513'; // Saddle brown
            if (rank === 1) rankColor = '#DAA520'; // Goldenrod
            else if (rank === 2) rankColor = '#C0C0C0'; // Silver
            else if (rank === 3) rankColor = '#CD7F32'; // Bronze
            
            const nameColor = isPlayer ? '#8B0000' : '#3E2723'; // Dark red for player, dark brown for others
            const nameFontWeight = isPlayer ? '900' : 'bold';
            const scoreColor = isPlayer ? '#228B22' : '#2F4F2F'; // Brighter green for player, darker for others
            
            // Grandmaster Badge
            const gmBadge = isGrandmaster ? '<span style="color: #DAA520; margin-right: 5px;" title="Grandmaster Shepherd">👑</span>' : '';

            htmlContent += `
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 15px;
                    margin-bottom: 10px;
                    background: ${bgColor};
                    border-radius: 8px;
                    border: 2px solid #8D6E63;
                ">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span style="color: ${rankColor}; font-size: 26px; font-weight: 900; min-width: 55px;">#${rank}</span>
                        <div style="display: flex; align-items: center;">
                            ${gmBadge}
                            <span style="color: ${nameColor}; font-size: 22px; font-weight: ${nameFontWeight};">${entry.name.toUpperCase()}</span>
                        </div>
                    </div>
                    <span style="color: ${scoreColor}; font-size: 22px; font-weight: 900;">${entry.score.toLocaleString()}W</span>
                </div>
            `;
        });
        
        // If player is NOT in top 10, show them at the bottom
        const playerRank = leaderboardService.getRank(Math.floor(this.balance));
        if (playerRank > 10) {
            htmlContent += `
                <div style="
                    height: 3px;
                    background: #8D6E63;
                    margin: 20px 0;
                    border-radius: 2px;
                "></div>
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 15px;
                    margin-bottom: 10px;
                    background: rgba(255, 215, 0, 0.3);
                    border-radius: 8px;
                    border: 2px solid #8D6E63;
                ">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span style="color: #8B4513; font-size: 26px; font-weight: 900; min-width: 55px;">#${playerRank}</span>
                        <span style="color: #8B0000; font-size: 22px; font-weight: 900;">${playerName.toUpperCase()}</span>
                    </div>
                    <span style="color: #228B22; font-size: 22px; font-weight: 900;">${Math.floor(this.balance).toLocaleString()}W</span>
                </div>
            `;
        }
        
        this.leaderboardScrollDiv.innerHTML = htmlContent;
    }

    toggleLeaderboardModal() {
        const show = this.leaderboardContainer.alpha === 0;
        const gameScene = this.scene.get('GameScene');
        
        if (show) {
            // Set overlay guard
            this.uiOverlayOpen = true;

            audioManager.playCoin();
            this.updateLeaderboardView();
            
            // Pause the game and freeze sheep movement
            if (gameScene) {
                if (gameScene.timerEvent) {
                    gameScene.timerEvent.paused = true;
                    gameScene.roundActive = false;
                }
                // Pause the entire GameScene to freeze sheep movement
                gameScene.scene.pause();
            }
            
            this.tweens.add({
                targets: this.leaderboardContainer,
                alpha: 1,
                scale: 1,
                duration: 400,
                ease: 'Back.out'
            });
            
            this.setControlsLocked(true);
        } else {
            // Resume the game and unfreeze sheep movement
            if (gameScene) {
                if (gameScene.timerEvent) {
                    gameScene.timerEvent.paused = false;
                    gameScene.roundActive = true;
                }
                // Resume the GameScene to unfreeze sheep movement
                gameScene.scene.resume();
            }
            
            this.tweens.add({
                targets: this.leaderboardContainer,
                alpha: 0,
                scale: 0.8,
                duration: 300,
                ease: 'Back.in'
            });
            
            this.setControlsLocked(false);

            // Clear overlay guard after small delay
            this.time.delayedCall(150, () => {
                this.uiOverlayOpen = false;
            });
        }
    }

    createTopBar(y) {
        // --- 1. WOOL WALLET SECTION (Interactive Container) ---
        this.walletContainer = this.add.container(0, 0);

        // Generate Sparkle Texture if not exists
        if (!this.textures.exists('wallet_sparkle')) {
            const pg = this.make.graphics({ x: 0, y: 0, add: false });
            pg.fillStyle(0xfcd535, 1); // Gold
            pg.fillCircle(4, 4, 4);
            pg.generateTexture('wallet_sparkle', 8, 8);
        }

        // Create Particle Emitter
        this.walletEmitter = this.add.particles(0, 0, 'wallet_sparkle', {
            speed: { min: 100, max: 250 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: 800,
            gravityY: 100,
            blendMode: 'ADD',
            emitting: false
        });
        this.walletEmitter.setPosition(90, 87); // Coin center
        // this.walletContainer.add(this.walletEmitter); // Moved to end for Z-ordering

        // Generate Star Texture for High Value
        if (!this.textures.exists('wallet_star')) {
            const pg = this.make.graphics({ x: 0, y: 0, add: false });
            pg.fillStyle(0xffffff, 1);
            // Draw star shape
            const cx = 16, cy = 16, spikes = 5, outerRadius = 15, innerRadius = 7;
            let rot = Math.PI / 2 * 3;
            let x = cx;
            let y = cy;
            const step = Math.PI / spikes;

            pg.beginPath();
            pg.moveTo(cx, cy - outerRadius);
            for (let i = 0; i < spikes; i++) {
                x = cx + Math.cos(rot) * outerRadius;
                y = cy + Math.sin(rot) * outerRadius;
                pg.lineTo(x, y);
                rot += step;

                x = cx + Math.cos(rot) * innerRadius;
                y = cy + Math.sin(rot) * innerRadius;
                pg.lineTo(x, y);
                rot += step;
            }
            pg.lineTo(cx, cy - outerRadius);
            pg.closePath();
            pg.fillPath();
            pg.generateTexture('wallet_star', 32, 32);
        }

        // High Value Emitter (Stars)
        this.highValueEmitter = this.add.particles(0, 0, 'wallet_star', {
            speed: { min: 200, max: 450 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 1500,
            gravityY: 150,
            rotate: { min: 0, max: 360 },
            blendMode: 'ADD',
            emitting: false
        });
        this.highValueEmitter.setPosition(90, 87);
        // this.walletContainer.add(this.highValueEmitter); // Moved to end for Z-ordering
        
        // Background - Interactive Zone
        const bgWidth = 410; // Slightly reduced to match new text position
        const bgHeight = 125;
        const bgX = 20;
        const bgY = 30;
        
        const walletBg = this.add.graphics();
        this.walletBg = walletBg; // Store reference for dynamic resizing
        this.defaultWalletBgWidth = 410; // Updated default width

        walletBg.fillStyle(0x000000, 0.5);
        walletBg.fillRoundedRect(bgX, bgY, bgWidth, bgHeight, 22);
        
        // Make the background interactive - LARGE hit area covering entire wallet including coin
        // Align hit area with the actual drawn rectangle position
        const hitArea = new Phaser.Geom.Rectangle(bgX, bgY, bgWidth + 50, bgHeight);
        walletBg.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

        // Balance Content - Enlarged Coin (Ensure alpha is always 1)
        this.walletCoin = this.add.image(90, 87, 'wool').setScale(0.275);
        
        // Make coin FULLY interactive and clickable with all events
        this.walletCoin.setInteractive({ useHandCursor: true });
        
        // Coin hover - same as background
        this.walletCoin.on('pointerover', () => {
            if (this.isWalletLocked) return;
            this.tweens.add({ targets: this.walletContainer, scale: 1.05, duration: 150, ease: 'Back.easeOut' });
            
            this.tweens.add({ 
                targets: walletBg, 
                width: bgWidth + 40, 
                duration: 200, 
                ease: 'Quad.easeOut' 
            });

            this.tweens.add({ 
                targets: this.walletCoin, 
                y: 75, 
                scale: 0.33, 
                duration: 200, 
                ease: 'Back.easeOut' 
            });
            
            this.tweens.add({ 
                targets: this.walletLabel, 
                alpha: 1, 
                y: 105,
                x: 90,
                duration: 150, 
                ease: 'Quad.easeOut' 
            });
        });
        
        // Coin out
        this.walletCoin.on('pointerout', () => {
            if (this.isWalletLocked) return;
            this.tweens.add({ targets: this.walletContainer, scale: 1, duration: 150, ease: 'Quad.easeOut' });
            
            this.tweens.add({ 
                targets: walletBg, 
                width: bgWidth, 
                duration: 200, 
                ease: 'Quad.easeOut' 
            });

            this.tweens.add({ 
                targets: this.walletCoin, 
                y: 87, 
                scale: 0.275,
                duration: 200, 
                ease: 'Quad.easeOut' 
            });
            
            this.tweens.add({ 
                targets: this.walletLabel, 
                alpha: 0, 
                y: 130, 
                x: 90,
                duration: 150, 
                ease: 'Quad.easeOut' 
            });
        });
        
        // Coin click - full wallet opening logic
        this.walletCoin.on('pointerdown', () => {
            if (this.isWalletLocked) {
                audioManager.playDud();
                this.tweens.add({
                    targets: this.walletContainer,
                    x: 10,
                    duration: 50,
                    yoyo: true,
                    repeat: 3,
                    onComplete: () => { this.walletContainer.x = 0; }
                });
                return;
            }
            
            // If already open, close it with animation
            if (this.statsContainer && this.statsContainer.alpha > 0) {
                 this.handleStatsClose();
            } else {
                 // No sound on wallet open
                 this.isPauseMode = true; // Set pause mode flag
                 
                 // Animate coin flying out to center
                 const flyingCoin = this.add.image(this.walletCoin.x, this.walletCoin.y, 'wool');
                 flyingCoin.setScale(0.275);
                 flyingCoin.setDepth(10000);
                 
                 this.tweens.add({
                     targets: flyingCoin,
                     x: CONFIG.width / 2,
                     y: CONFIG.height / 2,
                     scale: 1.2,
                     duration: 600,
                     ease: 'Power2',
                     onComplete: () => {
                         flyingCoin.destroy();
                         this.isLossModal = false; // Manual wallet click, not a loss
                         this.isWinModal = false; // Not a win either
                         this.toggleStatsModal();
                     }
                 });
                 
                 // Dim the wallet coin at top left
                 this.walletCoin.setAlpha(0.2);
                 this.walletBg.setAlpha(0.3);
            }
        });
        
        // Branded "WOOL WALLET" text - Hidden by default
        this.walletLabel = this.add.text(90, 130, 'WOOL WALLET', { 
            font: '900 19px Inter', 
            fill: '#000000',
            align: 'center'
        }).setOrigin(0.5).setAlpha(0);

        // Wallet Events
        walletBg.on('pointerover', () => {
            if (this.isWalletLocked) return;
            this.tweens.add({ targets: this.walletContainer, scale: 1.05, duration: 150, ease: 'Back.easeOut' });
            
            // Slide background width out
            this.tweens.add({ 
                targets: walletBg, 
                width: bgWidth + 40, 
                duration: 200, 
                ease: 'Quad.easeOut' 
            });

            // Slide coin up AND scale it up (bounce forward effect)
            this.tweens.add({ 
                targets: this.walletCoin, 
                y: 75, 
                scale: 0.33, 
                duration: 200, 
                ease: 'Back.easeOut' 
            });
            // Fade in and center label over the coin
            this.tweens.add({ 
                targets: this.walletLabel, 
                alpha: 1, 
                y: 105, // Lowered position over coin
                x: 90, // Center horizontally over coin
                duration: 150, 
                ease: 'Quad.easeOut' 
            });
        });
        
        walletBg.on('pointerout', () => {
            if (this.isWalletLocked) return;
            this.tweens.add({ targets: this.walletContainer, scale: 1, duration: 150, ease: 'Quad.easeOut' });
            
            // Reset background width
            this.tweens.add({ 
                targets: walletBg, 
                width: bgWidth, 
                duration: 200, 
                ease: 'Quad.easeOut' 
            });

            // Reset coin position and scale
            this.tweens.add({ 
                targets: this.walletCoin, 
                y: 87, 
                scale: 0.275,
                duration: 200, 
                ease: 'Quad.easeOut' 
            });
            // Hide label and reset position
            this.tweens.add({ 
                targets: this.walletLabel, 
                alpha: 0, 
                y: 130, 
                x: 90, // Reset x position
                duration: 150, 
                ease: 'Quad.easeOut' 
            });
        });

        walletBg.on('pointerdown', () => {
            if (this.isWalletLocked) {
                audioManager.playDud();
                // Shake
                this.tweens.add({
                    targets: this.walletContainer,
                    x: 10,
                    duration: 50,
                    yoyo: true,
                    repeat: 3,
                    onComplete: () => { this.walletContainer.x = 0; }
                });
                return;
            }
            
            // If already open, close it with animation
            if (this.statsContainer && this.statsContainer.alpha > 0) {
                 this.handleStatsClose();
            } else {
                 // No sound on wallet open
                 
                 // Mark that this is a pause request (not end-of-round stats)
                 this.isPauseMode = true;
                 
                 // Pause the game
                 const gameScene = this.scene.get('GameScene');
                 if (gameScene && gameScene.scene.isActive()) {
                     gameScene.scene.pause();
                 }
                 
                 // Animate coin flying out to center
                 const flyingCoin = this.add.image(this.walletCoin.x, this.walletCoin.y, 'wool');
                 flyingCoin.setScale(0.275);
                 flyingCoin.setDepth(10000);
                 
                 this.tweens.add({
                     targets: flyingCoin,
                     x: CONFIG.width / 2,
                     y: CONFIG.height / 2,
                     scale: 1.2,
                     duration: 600,
                     ease: 'Power2',
                     onComplete: () => {
                         flyingCoin.destroy();
                         this.isLossModal = false; // Manual wallet click, not a loss
                         this.isWinModal = false; // Not a win either
                         this.toggleStatsModal();
                     }
                 });
                 
                 // Dim the wallet coin at top left
                 this.walletCoin.setAlpha(0.2);
                 this.walletBg.setAlpha(0.3);
            }
        });

        // Balance Text
        this.balanceText = this.add.text(200, 86, `${this.formatWool(this.balance)}W`, {
            font: 'bold 48px Inter',
            fill: CONFIG.colors.wool
        }).setOrigin(0, 0.5);

        // Player Name
        const storedName = localStorage.getItem('sheepMarket_playerName') || 'NOVICE';
        const displayName = `SHEPHERD ${storedName}`;
        this.playerNameText = this.add.text(200, 50, displayName.toUpperCase(), {
            font: '900 21px Inter',
            fill: '#ffffff',
            alpha: 0.6,
            letterSpacing: 2
        }).setOrigin(0, 0.5);

        // PnL Text - Shows current level and updates each scene restart
        // ENDLESS MODE: Hide round number (don't show progress)
        const levelLabel = this.isEndlessMode ? '' : `LEVEL ${this.activeLevel}`;
        this.livePnlText = this.add.text(200, 125, levelLabel, {
            font: 'bold 22px Inter',
            fill: '#888888'
        }).setOrigin(0, 0.5);

        // Lock Icon (Initially Visible)
        // If locked, hide contents and show centralized lock message
        if (this.isWalletLocked) {
            // DIM STATE for Level 1
            this.walletCoin.setTint(0x000000); // Black out the coin
            this.walletCoin.setAlpha(0.3); // Faint black silhouette
            this.walletBg.setAlpha(0.5); // Dim background
            this.balanceText.setAlpha(0); // Hide balance until unlocked
            
            // Name STAYS VISIBLE but maybe slightly dimmed? 
            // User requested: "Display the players name at top left at all times"
            this.playerNameText.setAlpha(0.6); 

            this.livePnlText.setAlpha(0);
            
            // Lock icon placed directly over the blacked-out coin
            this.walletLock = this.add.text(90, 87, '🔒', { 
                font: '900 48px Inter', 
                fill: '#ffffff' 
            }).setOrigin(0.5);
        } else {
            this.walletCoin.setAlpha(1);
            this.walletCoin.clearTint();
            this.walletBg.setAlpha(1);
            
            this.walletLock = this.add.text(380, 50, '🔒', { font: '32px Inter' }).setOrigin(0.5);
            this.walletLock.setVisible(false);
        }

        this.tweens.add({
            targets: this.walletLock,
            scale: 1.1,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });

        // Add everything to the container
        this.walletContainer.add([
            walletBg, 
            this.walletCoin, 
            this.walletEmitter,      // Particles now in front of coin
            this.highValueEmitter,   // Particles now in front of coin
            this.walletLabel, 
            this.balanceText, 
            this.playerNameText, 
            this.livePnlText, 
            this.walletLock
        ]);


        // --- 2. REST OF TOP BAR (Static) ---
        const staticBg = this.add.graphics();
        staticBg.fillStyle(0x000000, 0.5);
        
        // P&L Box (Center) - Increased height for 4 lines
        staticBg.fillRoundedRect(CONFIG.width / 2 - 200, 25, 400, 140, 15);
        
        // Pause Box (Left of Music)
        staticBg.fillRoundedRect(CONFIG.width - 280, 30, 80, 80, 15);
        // Leaderboard Box (Left of Pause)
        staticBg.fillRoundedRect(CONFIG.width - 370, 30, 80, 80, 15);
        // Toolkit Box (Left of Leaderboard)
        staticBg.fillRoundedRect(CONFIG.width - 460, 30, 80, 80, 15);
        // Music Box (Left Mute)
        staticBg.fillRoundedRect(CONFIG.width - 190, 30, 80, 80, 15);
        // Sound Box (Right Mute)
        staticBg.fillRoundedRect(CONFIG.width - 100, 30, 80, 80, 15);

        // ... rest of profile logic ...

        // P&L Content (Floating in middle)
        // Line 1: WOOL SPENT (static - sum of entry prices)
        this.woolSpentText = this.add.text(CONFIG.width / 2, 60, 'NO ACTIVE CALLS', {
            font: '900 28px Inter',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Line 2: UNREALIZED WOOL (dynamic - current net PnL)
        this.unrealizedWoolText = this.add.text(CONFIG.width / 2, 95, '', {
            font: 'bold 24px Inter',
            fill: '#888888',
            alpha: 1
        }).setOrigin(0.5);

        // PnL Change Emitter (Sparkles)
        this.pnlEmitter = this.add.particles(0, 0, 'wallet_sparkle', {
            x: CONFIG.width / 2,
            y: 95,
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            lifespan: 600,
            blendMode: 'ADD',
            emitting: false
        });
        this.pnlEmitter.setDepth(200);

        // Hidden Wager Text (Unused but kept for reference if needed, or removed)
        this.wagerText = null; 
        /*
        this.wagerText = this.add.text(CONFIG.width / 2, 80, '', {
            font: 'bold 20px Inter',
            fill: '#cccccc'
        }).setOrigin(0.5);
        */

        // Music Mute Button (New AI Music)
        const musicBtn = this.add.image(CONFIG.width - 150, 70, audioManager.isMusicMuted ? 'mute_icon' : 'music_icon')
            .setOrigin(0.5)
            .setScale(0.5)
            .setInteractive({ useHandCursor: true });
            
        musicBtn.on('pointerdown', () => {
            const muted = audioManager.toggleMusicMute();
            musicBtn.setTexture(muted ? 'mute_icon' : 'music_icon');
            this.tweens.add({ targets: musicBtn, scale: 0.45, duration: 50, yoyo: true, onComplete: () => {
                musicBtn.setScale(0.5);
            }});
        });

        // Sound Mute Button (SFX + Ambience)
        const soundBtn = this.add.image(CONFIG.width - 60, 70, audioManager.isSoundMuted ? 'mute_icon' : 'sound_icon')
            .setOrigin(0.5)
            .setScale(0.5)
            .setInteractive({ useHandCursor: true });
            
        soundBtn.on('pointerdown', () => {
            const muted = audioManager.toggleSoundMute();
            soundBtn.setTexture(muted ? 'mute_icon' : 'sound_icon');
            this.tweens.add({ targets: soundBtn, scale: 0.45, duration: 50, yoyo: true, onComplete: () => {
                soundBtn.setScale(0.5);
            }});
        });

        // Leaderboard Button (Trophy)
        const leaderBtn = this.add.image(CONFIG.width - 330, 70, 'leaderboard_icon')
            .setOrigin(0.5)
            .setScale(0.5)
            .setInteractive({ useHandCursor: true });
            
        leaderBtn.on('pointerdown', () => {
            audioManager.playClick();
            this.toggleLeaderboardModal();
            this.tweens.add({ targets: leaderBtn, scale: 0.45, duration: 50, yoyo: true, onComplete: () => {
                leaderBtn.setScale(0.5);
            }});
        });

        // RESET BUTTON REMOVED - Replaced by Shepherd's Toolkit

        // Pause Button (Opens Wool Wallet)
        const pauseBtn = this.add.image(CONFIG.width - 240, 70, 'pause_icon')
            .setOrigin(0.5)
            .setScale(0.5)
            .setInteractive({ useHandCursor: true });
            
        pauseBtn.on('pointerdown', () => {
            // Open Wool Wallet with live stats (pause mode)
            this.isPauseMode = true; // Set pause mode flag for live stats
            this.isLossModal = false; // Not a loss
            this.isWinModal = false; // Not a win
            this.toggleStatsModal();
            
            audioManager.playClick();
            this.tweens.add({ targets: pauseBtn, scale: 0.45, duration: 50, yoyo: true, onComplete: () => {
                pauseBtn.setScale(0.5);
            }});
        });

        // --- LOCK BREAK PARTICLES ---
        this.createLockBreakEmitter();
    }



    createLockBreakEmitter() {
        if (!this.textures.exists('lock_shard')) {
            const pg = this.make.graphics({ x: 0, y: 0, add: false });
            pg.fillStyle(0xffffff, 1);
            pg.beginPath();
            pg.moveTo(0, 0);
            pg.lineTo(6, 4);
            pg.lineTo(2, 8);
            pg.lineTo(-4, 6);
            pg.closePath();
            pg.fillPath();
            pg.generateTexture('lock_shard', 12, 12);
        }

        this.lockBreakEmitter = this.add.particles(0, 0, 'lock_shard', {
            speed: { min: 100, max: 300 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: 600,
            gravityY: 400,
            rotate: { min: 0, max: 360 },
            emitting: false
        });
        this.lockBreakEmitter.setDepth(5000);
    }

    breakLocks() {
        if (!this.controlPanelContainer || !this.leftBtnContainer || !this.rightBtnContainer) return;
        
        // Calculate World Positions
        const cx = this.controlPanelContainer.x;
        const cy = this.controlPanelContainer.y;
        
        const leftX = cx + this.leftBtnContainer.x;
        const leftY = cy + this.leftBtnContainer.y;
        
        const rightX = cx + this.rightBtnContainer.x;
        const rightY = cy + this.rightBtnContainer.y;

        // Burst!
        if (this.lockBreakEmitter) {
            this.lockBreakEmitter.explode(40, leftX, leftY);
            this.lockBreakEmitter.explode(40, rightX, rightY);
        }
        
        // Sound removed - silent button unlock
    }

    createControlPanel(y) {
        const panelWidth = CONFIG.width - 40; // Full width with 20px margins on each side
        const panelHeight = 230; // Reduced height for tighter fit
        const panelYOffset = 60; // Shift down to reduce upper part while keeping bottom position
        const x = CONFIG.width / 2;
        
        const container = this.add.container(x, y + 400); // Start off-screen
        this.controlPanelContainer = container;

        // Glassmorphism Main Panel - Enhanced with gradient-like look
        const bg = this.add.graphics();
        
        // Shadow/Glow
        bg.fillStyle(0x000000, 0.4);
        bg.fillRoundedRect(-panelWidth/2 + 10, -panelHeight/2 + panelYOffset + 10, panelWidth, panelHeight, 35);

        // Main Body
        bg.fillStyle(0x414850, 0.95);
        bg.lineStyle(4, 0x5b6777);
        bg.fillRoundedRect(-panelWidth/2, -panelHeight/2 + panelYOffset, panelWidth, panelHeight, 35);
        bg.strokeRoundedRect(-panelWidth/2, -panelHeight/2 + panelYOffset, panelWidth, panelHeight, 35);

        // Inner Glow (Top Edge)
        bg.lineStyle(2, 0xffffff, 0.1);
        bg.strokeRoundedRect(-panelWidth/2 + 4, -panelHeight/2 + panelYOffset + 4, panelWidth - 8, panelHeight - 8, 33);

        // Subtle Header Line
        bg.lineStyle(1, 0x555555, 0.5);
        bg.lineBetween(-panelWidth/2 + 60, -60, panelWidth/2 - 60, -60);
        
        container.add(bg);

        // ===== CRITICAL FIX: Remove ALL old event listeners before creating new buttons =====
        // This prevents stacking listeners across level restarts/retries
        
        // Remove CALL button listeners (LEFT and RIGHT)
        if (this.leftBtnContainer) {
            this.leftBtnContainer.removeAllListeners();
        }
        if (this.rightBtnContainer) {
            this.rightBtnContainer.removeAllListeners();
        }
        
        // Remove ability button listeners
        if (this.abilityButtons && this.abilityButtons.length > 0) {
            this.abilityButtons.forEach(btn => {
                if (btn && btn.container) {
                    btn.container.removeAllListeners();
                    btn.container.destroy();
                }
            });
        }
        this.abilityButtons = []; // Reset array

        // Betting Buttons - Shifted UP slightly (-40)
        const btnWidth = 680; // Increased width (was 530)
        const btnHeight = 150; // Increased height (was 135)
        const gap = 25; // Smaller gap since meter is gone
        const btnY = -40; 

        this.createImmersiveBetBtn(container, 'LEFT', -(btnWidth/2 + gap/2), btnY, btnWidth, btnHeight, CONFIG.colors.left);
        this.createImmersiveBetBtn(container, 'RIGHT', (btnWidth/2 + gap/2), btnY, btnWidth, btnHeight, CONFIG.colors.right);

        // --- LOCKED BUTTONS ROW (Bottom) ---
        const lockedY = 100; // Moved up to fit within panel
        const lockedButtonSize = 56; // Reduced size
        const spacing = 145; // Adjusted spacing
        const totalWidth = (7 * spacing); 
        let lockedX = -totalWidth / 2;

        for (let i = 0; i < 8; i++) {
            const btnContainer = this.add.container(lockedX, lockedY);
            
            const btnBg = this.add.graphics();
            const btnIcon = this.add.text(0, 0, '🔒', { font: '20px Inter', fill: '#ffffff' }).setOrigin(0.5);
            
            // LOGIC: 
            // - Button 2 (Dog Herding) starts LOCKED in Level 7, unlocked on first bone click, stays unlocked 7-12
            // - Button 5 (Bone Placement) starts LOCKED in Level 7, unlocked on first bone click, stays unlocked 7-12
            // - Check localStorage to see if dog/bone have been unlocked (persists across levels 7-12)
            // - IN LEVEL 8+: ALWAYS START UNLOCKED (localStorage check OR level >= 8)
            // - Unlock button 3 (Grass Tuft) for Level 6+ ONLY (Level 5 requires first grass cut)
            // - Unlock button 4 (Lawn Mower) for Level 4+
            // - Button 1 (Golden Clover) unlocked in Level 11-12
            // - Button 6 (Black Sheep) unlocked in Level 11-12
            // - Keep buttons 0, 7 locked initially
            const dogBoneUnlocked = localStorage.getItem('sheepMarket_dogBoneUnlocked') === 'true';
            const isUnlocked = (i === 3 && this.activeLevel >= 6) || 
                               (i === 4 && this.activeLevel >= 4) ||
                               (i === 2 && this.activeLevel >= 8) || // Dog: LOCKED in Level 7 (unlocks on impact), unlocked in Level 8+
                               (i === 5 && this.activeLevel >= 8) ||  // Bone: LOCKED in Level 7 (unlocks on impact), unlocked in Level 8+
                               (i === 1 && this.activeLevel >= 11) || // Golden Clover: Unlocked in Level 11-12
                               (i === 6 && this.activeLevel >= 11);   // Black Sheep: Unlocked in Level 11-12
            
            // Add interaction to ALL buttons (locked or unlocked)
            const hit = new Phaser.Geom.Circle(0, 0, lockedButtonSize);
            btnContainer.setInteractive(hit, Phaser.Geom.Circle.Contains);
            
            // Shared Props
            let cdText = null;
            let dogImage = null;
            let lawnMowerImage = null;
            let grassTuftImage = null;

            if (isUnlocked) {
                // LEVEL 7 SPECIAL: Dog (i=2) and Bone (i=5) buttons appear locked until impact
                if ((i === 2 || i === 5) && this.activeLevel === 7) {
                    btnBg.fillStyle(0x111111, 1); // Dark grey background (locked style)
                    btnBg.lineStyle(2, 0x444444, 1); // Grey border (locked style)
                } else {
                    // Normal Unlocked Style (Gold/Active)
                    btnBg.fillStyle(0x1a1a1a, 1); 
                    btnBg.lineStyle(3, 0xfcd535, 1); // Gold border (unlocked style)
                } 
                
                // Ability Icons
                // 0: Rally (Whistle/Megaphone) - Boosts Obedience
                // 1: Sheepdog (Dog) - Scares/Scatters
                // 2: Dog Herding - Herds sheep to call side
                // 3: Grass Tuft - Remove grass
                // 4: Lawn Mower - Wind disruption
                // 5: Bone Collection - Throw bones to distract dog
                if (i === 0) {
                    btnIcon.setText('📢');
                    btnIcon.setFontSize('48px');
                } else if (i === 1) {
                    // Golden Clover button (Level 11-12)
                    if (this.activeLevel >= 11) {
                        btnIcon.setVisible(false); // Hide emoji, use image instead
                    } else {
                        btnIcon.setText('🐕');
                        btnIcon.setFontSize('48px');
                    }
                } else if (i === 2) {
                    // Dog herding uses image asset
                    // LEVEL 7: Keep lock visible until bone/dog impact (match locked style)
                    // LEVEL 8+: Hide lock immediately
                    if (this.activeLevel === 7) {
                        btnIcon.setVisible(true);
                        btnIcon.setAlpha(0.5);
                        btnIcon.setFontSize('36px');
                    } else {
                        btnIcon.setVisible(false);
                    }
                } else if (i === 3) {
                    // Grass tuft uses image asset - hide text icon
                    btnIcon.setVisible(false);
                } else if (i === 4) {
                    // Lawn mower uses image asset - hide text icon
                    btnIcon.setVisible(false);
                } else if (i === 5) {
                    // Bone collection uses emoji icon
                    // LEVEL 7: Keep lock visible until bone/dog impact (match locked style)
                    // LEVEL 8+: Hide lock immediately
                    if (this.activeLevel === 7) {
                        btnIcon.setVisible(true);
                        btnIcon.setAlpha(0.5);
                        btnIcon.setFontSize('36px');
                    } else {
                        btnIcon.setVisible(false);
                    }
                } else if (i === 6) {
                    // Black Sheep button (Level 11-12)
                    if (this.activeLevel >= 11) {
                        btnIcon.setVisible(false); // Hide lock icon, use image instead
                    }
                }
                
                // Cooldown Text (Hidden by default)
                cdText = this.add.text(0, 0, '', {
                    font: 'bold 36px Inter', // Scaled down
                    fill: '#ffffff'
                }).setOrigin(0.5);
                cdText.setVisible(false);
                
            } else {
                // Locked Style (Grey)
                btnBg.fillStyle(0x111111, 1);
                btnBg.lineStyle(2, 0x444444, 1);
                btnIcon.setAlpha(0.5);
                btnIcon.setFontSize('36px'); // Scaled down lock
            }
            
            btnBg.fillCircle(0, 0, lockedButtonSize);
            btnBg.strokeCircle(0, 0, lockedButtonSize);
            
            // Add background and icon first
            btnContainer.add([btnBg, btnIcon]);
            
            // Add dog herding image AFTER background (button 2 in Level 7+)
            if (i === 2 && this.activeLevel >= 7) {
                dogImage = this.add.image(0, 0, 'sheepdog')
                    .setOrigin(0.5)
                    .setScale(0.10); // Standardized size across all levels
                // LEVEL 7 ONLY: Start hidden even when unlocked, show ONLY after bone/dog impact
                // LEVEL 8+: Show immediately if unlocked
                dogImage.setVisible(isUnlocked && this.activeLevel >= 8);
                btnContainer.add(dogImage);
            }
            
            // Add grass tuft image AFTER background (if button 3 is unlocked)
            let grassCountText = null;
            if (isUnlocked && i === 3) {
                grassTuftImage = this.add.image(0, 0, 'grass_tuft')
                    .setOrigin(0.5)
                    .setScale(0.18);
                btnContainer.add(grassTuftImage);
                
                // Add grass count text (inventory number)
                // STANDARDIZED COUNTER STYLE: Matches bone counter exactly (SMALLER SIZE)
                grassCountText = this.add.text(18, 18, '0', {
                    font: 'bold 24px Inter',
                    fill: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 3
                }).setOrigin(0.5);
                btnContainer.add(grassCountText);
            }
            
            // Add lawn mower image AFTER background (if button 4 is unlocked)
            if (isUnlocked && i === 4) {
                lawnMowerImage = this.add.image(0, 0, 'lawn_mower')
                    .setOrigin(0.5)
                    .setScale(0.14);
                btnContainer.add(lawnMowerImage);
            }
            
            // Add golden clover image AFTER background (button 1 in Level 11-12)
            let goldenCloverImage = null;
            if (isUnlocked && i === 1 && this.activeLevel >= 11) {
                goldenCloverImage = this.add.image(0, 0, 'golden_clover')
                    .setOrigin(0.5)
                    .setScale(0.10);
                
                // Check if Golden Clover was consumed in main game
                const inFreePlayMode = this.goldenKeyActivated && this.allLevelsUnlockedByGoldenKey;
                const goldenCloverUsedMainGame = localStorage.getItem('sheepMarket_goldenCloverUsed') === 'true';
                
                // If used in main game and NOT in free-play, show dimmed/consumed state
                if (!inFreePlayMode && goldenCloverUsedMainGame) {
                    goldenCloverImage.setAlpha(0.3); // Dim the icon
                    console.log('🍀 Golden Clover button: Showing CONSUMED state (used in main game)');
                }
                
                btnContainer.add(goldenCloverImage);
            }
            
            // Add black sheep image AFTER background (button 6 in Level 11-12)
            let blackSheepImage = null;
            let blackSheepBorder = null;
            if (isUnlocked && i === 6 && this.activeLevel >= 11) {
                // Background white sheep (outline effect)
                blackSheepBorder = this.add.image(0, 0, 'sheep')
                    .setOrigin(0.5)
                    .setTint(0xffffff) // White
                    .setScale(0.11); // Slightly larger to create outline effect
                btnContainer.add(blackSheepBorder);
                
                // Foreground black sheep (actual icon)
                blackSheepImage = this.add.image(0, 0, 'sheep')
                    .setOrigin(0.5)
                    .setTint(0x4a4a4a) // Dark grey tint
                    .setScale(0.10);
                btnContainer.add(blackSheepImage);
            }
            
            // Add bone icon AFTER background for button 5 (only in level 7+)
            let boneIcon = null;
            let boneCountText = null;
            if (i === 5 && this.activeLevel >= 7) {
                // Bone icon - clicking lets you PLACE bones to distract wolves
                boneIcon = this.add.text(0, 0, '🦴', {
                    font: '48px Arial'
                }).setOrigin(0.5);
                // LEVEL 7: Start hidden, show after bone/dog impact
                // LEVEL 8+: Show immediately if unlocked
                const shouldShowBone = isUnlocked && this.activeLevel >= 8;
                boneIcon.setVisible(shouldShowBone);
                console.log(`🦴 Bone icon created - Level: ${this.activeLevel}, isUnlocked: ${isUnlocked}, visible: ${shouldShowBone}`);
                btnContainer.add(boneIcon);
                
                // Add bone count text (inventory number) - create for Level 7+ but hide in Level 7 until revealed
                // STANDARDIZED COUNTER STYLE: Matches grass counter exactly
                if (isUnlocked || this.activeLevel === 7) {
                    boneCountText = this.add.text(18, 18, '0', {
                        font: 'bold 36px Inter',
                        fill: '#ffffff',
                        stroke: '#000000',
                        strokeThickness: 4
                    }).setOrigin(0.5);
                    // Hide count text in Level 7 until unlocked, show in Level 8+ immediately
                    boneCountText.setVisible(isUnlocked && this.activeLevel >= 8);
                    btnContainer.add(boneCountText);
                }
            }
            
            // Add cooldown text last (on top)
            if (cdText) {
                btnContainer.add(cdText);
            }
            container.add(btnContainer);
            
            // ENDLESS MODE: Hide Golden Sheep (button 0) and Golden Key (button 7) as they're not used
            if (this.isEndlessMode && (i === 0 || i === 7)) {
                btnContainer.setVisible(false);
            }
            
            // Store reference
            const grassCooldown = (i === 3) ? 20000 : 0;
            
            this.abilityButtons[i] = { 
                container: btnContainer, 
                bg: btnBg, 
                icon: btnIcon, 
                cdText: cdText,
                dogImage: dogImage, // Store dog herding image if it exists (button 2)
                grassTuftImage: grassTuftImage, // Store grass tuft image if it exists
                grassCountText: grassCountText, // Store grass count text if it exists
                lawnMowerImage: lawnMowerImage, // Store lawn mower image if it exists
                boneIcon: boneIcon, // Store bone icon if it exists (button 5)
                boneCountText: boneCountText, // Store bone count text if it exists (button 5)
                goldenCloverImage: goldenCloverImage, // Store golden clover image if it exists (button 1)
                blackSheepImage: blackSheepImage, // Store black sheep image if it exists (button 6)
                blackSheepBorder: blackSheepBorder, // Store black sheep white border if it exists (button 6)
                onCooldown: false,
                cooldownTimer: 0,
                maxCooldown: i === 0 ? ABILITY_CONFIG.whistle.cooldown : 
                            (i === 1 ? ABILITY_CONFIG.dog.cooldown : 
                            (i === 2 ? ABILITY_CONFIG.herdDog.cooldown : 
                            (i === 3 ? ABILITY_CONFIG.grass.cooldown : 
                            (i === 4 ? ABILITY_CONFIG.lawnMower.cooldown : 
                            ABILITY_CONFIG.bone.cooldown)))),
                locked: !isUnlocked // Track locked state
            };
            
            // Hover animation - scale up
            btnContainer.on('pointerover', () => {
                this.tweens.add({
                    targets: btnContainer,
                    scale: 1.15,
                    duration: 150,
                    ease: 'Back.easeOut'
                });
            });
            
            // Hover out - scale back to normal
            btnContainer.on('pointerout', () => {
                this.tweens.add({
                    targets: btnContainer,
                    scale: 1,
                    duration: 150,
                    ease: 'Quad.easeOut'
                });
            });
            
            // Click animation - quick press down and up
            btnContainer.on('pointerdown', () => {
                console.log(`🔘 Button ${i} clicked (raw pointerdown event)`);
                
                // Quick press down
                this.tweens.add({
                    targets: btnContainer,
                    scale: 0.95,
                    duration: 80,
                    ease: 'Quad.easeIn',
                    onComplete: () => {
                        // Pop back up to hover state
                        this.tweens.add({
                            targets: btnContainer,
                            scale: 1.15,
                            duration: 100,
                            ease: 'Back.easeOut'
                        });
                    }
                });
                
                console.log(`🔘 Button ${i} calling handleAbilityClick...`);
                this.handleAbilityClick(i);
            });
            
            lockedX += spacing;
        }

        // Entrance Animation
        this.tweens.add({
            targets: container,
            y: y,
            duration: 800,
            ease: 'Back.easeOut'
        });
        
        // ENDLESS MODE: Unlock all abilities at start (except Golden Sheep and Golden Key)
        if (this.isEndlessMode) {
            console.log('🔓 ENDLESS MODE: Unlocking all abilities (except buttons 0 and 7)');
            for (let i = 0; i < this.abilityButtons.length; i++) {
                // Skip Golden Sheep (0) and Golden Key (7) in endless mode
                if (i === 0 || i === 7) continue;
                
                const btn = this.abilityButtons[i];
                if (btn && btn.locked) {
                    this.unlockAbilityButton(i);
                }
            }
        }
        
        // MAIN GAME: Auto-unlock black sheep and golden clover at Level 10+
        if (!this.isEndlessMode && this.level >= 10) {
            console.log('🔓 LEVEL 10+: Auto-unlocking Black Sheep and Golden Clover buttons');
            
            // Unlock Golden Clover (button 1)
            if (this.abilityButtons[1] && this.abilityButtons[1].locked) {
                this.unlockGoldenCloverButton(1, null);
            }
            
            // Unlock Black Sheep (button 6)
            if (this.abilityButtons[6] && this.abilityButtons[6].locked) {
                this.unlockBlackSheepButton(6, null);
            }
        }
        
        // Initialize grass count display if button is unlocked and player has collected grass
        const gameScene = this.scene.get('GameScene');
        if (gameScene && gameScene.collectedGrassCount && this.abilityButtons[3] && !this.abilityButtons[3].locked) {
            this.updateGrassCount(gameScene.collectedGrassCount);
        }
    }

    unlockAbilityButton(index) {
        const btn = this.abilityButtons[index];
        if (!btn || !btn.locked) return;
        
        // Mark as unlocked
        btn.locked = false;
        
        // Update visual style to unlocked
        btn.bg.clear();
        btn.bg.fillStyle(0x1a1a1a, 1);
        btn.bg.lineStyle(3, 0xfcd535, 1);
        btn.bg.fillCircle(0, 0, 56);
        btn.bg.strokeCircle(0, 0, 56);
        
        // Replace lock icon with appropriate ability icon
        btn.icon.setVisible(false);
        
        // Add the correct icon based on button index
        let abilityImage = null;
        
        if (index === 0) {
            // Button 0: Rally/Whistle OR Golden Sheep (if collected in Level 12)
            const goldenSheepCollected = localStorage.getItem('sheepMarket_goldenSheepCollected') === 'true';
            
            if (goldenSheepCollected) {
                // Show Golden Sheep icon if collected
                abilityImage = this.add.image(0, 0, 'golden_sheep')
                    .setOrigin(0.5)
                    .setScale(0.10);
                btn.goldenSheepImage = abilityImage;
            } else {
                // Show Rally/Whistle icon
                abilityImage = this.add.image(0, 0, 'shepherds_whistle')
                    .setOrigin(0.5)
                    .setScale(0.14);
            }
        } else if (index === 1) {
            // Golden Clover
            abilityImage = this.add.image(0, 0, 'golden_clover')
                .setOrigin(0.5)
                .setScale(0.12);
            btn.goldenCloverImage = abilityImage;
        } else if (index === 2) {
            // Dog Herding - use sheepdog image
            abilityImage = this.add.image(0, 0, 'sheepdog')
                .setOrigin(0.5)
                .setScale(0.10);
            btn.dogImage = abilityImage;
        } else if (index === 3) {
            // Grass Tuft
            abilityImage = this.add.image(0, 0, 'grass_tuft')
                .setOrigin(0.5)
                .setScale(0.18);
            btn.grassTuftImage = abilityImage;
            
            // Add grass count text
            const grassCountText = this.add.text(18, 18, '0', {
                font: 'bold 24px Inter',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5);
            btn.container.add(grassCountText);
            btn.grassCountText = grassCountText;
        } else if (index === 4) {
            // Lawn Mower
            abilityImage = this.add.image(0, 0, 'lawn_mower')
                .setOrigin(0.5)
                .setScale(0.14);
            btn.lawnMowerImage = abilityImage;
        } else if (index === 5) {
            // Bone - use emoji
            const boneIcon = this.add.text(0, 0, '🦴', {
                font: '48px Arial'
            }).setOrigin(0.5);
            btn.container.add(boneIcon);
            btn.boneIcon = boneIcon;
            
            // Add bone count text
            const boneCountText = this.add.text(18, 18, '0', {
                font: 'bold 36px Inter',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5);
            btn.container.add(boneCountText);
            btn.boneCountText = boneCountText;
        } else if (index === 6) {
            // Black Sheep - white border + black sheep
            const blackSheepBorder = this.add.image(0, 0, 'sheep')
                .setOrigin(0.5)
                .setTint(0xffffff)
                .setScale(0.11);
            btn.container.add(blackSheepBorder);
            btn.blackSheepBorder = blackSheepBorder;
            
            abilityImage = this.add.image(0, 0, 'sheep')
                .setOrigin(0.5)
                .setScale(0.10)
                .setTint(0x4a4a4a);
            btn.blackSheepImage = abilityImage;
        } else if (index === 7) {
            // Golden Key
            abilityImage = this.add.image(0, 0, 'golden_key')
                .setOrigin(0.5)
                .setScale(0.14);
        }
        
        if (abilityImage) {
            btn.container.add(abilityImage);
            btn.abilityImage = abilityImage; // Store reference
        }
        
        // Create cooldown text if it doesn't exist
        if (!btn.cdText) {
            btn.cdText = this.add.text(0, 0, '', {
                font: 'bold 36px Inter',
                fill: '#ffffff'
            }).setOrigin(0.5);
            btn.cdText.setVisible(false);
            btn.container.add(btn.cdText);
        }
        
        // ENDLESS MODE: Skip animations
        if (this.isEndlessMode) {
            return;
        }
        
        // STANDARDIZED IMPACT ANIMATION
        this.cameras.main.shake(150, 0.003);
        
        // Button impact animation
        this.tweens.add({
            targets: btn.container,
            scale: 1.3,
            duration: 100,
            yoyo: true,
            ease: 'Quad.easeOut',
            onComplete: () => {
                // CRITICAL: Ensure lawn mower icon is visible after animation completes
                if (btn.lawnMowerImage) {
                    btn.lawnMowerImage.setVisible(true);
                    btn.lawnMowerImage.setAlpha(1);
                }
            }
        });
        
        // Particle burst
        const particles = this.add.particles(btn.container.x, btn.container.y, 'dust_particle', {
            speed: { min: 100, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 600,
            quantity: 15,
            blendMode: 'ADD',
            tint: 0xfcd535 // Gold tint matching button border
        });
        particles.setDepth(10001);
        particles.explode();
        
        this.time.delayedCall(800, () => {
            particles.destroy();
        });
        
        // Play unlock sound
        audioManager.playCoin();
    }
    
    unlockDogHerdingButton(index) {
        const btn = this.abilityButtons[index];
        console.log('🐕 unlockDogHerdingButton called', { index, hasBtn: !!btn, locked: btn?.locked });
        if (!btn) return;
        
        // In Level 7, button might already be "unlocked" but icons hidden - reveal them
        const needsReveal = this.activeLevel === 7 && !btn.locked && !btn.dogImage?.visible;
        
        if (!btn.locked && !needsReveal) return; // Already fully unlocked and visible
        
        console.log('🐕 Unlocking dog herding button!');
        
        // Mark as unlocked
        btn.locked = false;
        
        // Update visual style to unlocked (with gold border)
        btn.bg.clear();
        btn.bg.fillStyle(0x1a1a1a, 1);
        btn.bg.lineStyle(3, 0xfcd535, 1); // Gold border
        btn.bg.fillCircle(0, 0, 56);
        btn.bg.strokeCircle(0, 0, 56);
        
        // Hide lock icon and show dog image
        btn.icon.setVisible(false);
        if (btn.dogImage) {
            btn.dogImage.setVisible(true);
            btn.dogImage.setScale(0.10); // Ensure consistent scale (Level 8 reference size)
        }
        
        // Create cooldown text if it doesn't exist (since locked buttons don't have it)
        if (!btn.cdText) {
            btn.cdText = this.add.text(0, 0, '', {
                font: 'bold 36px Inter',
                fill: '#ffffff'
            }).setOrigin(0.5);
            btn.cdText.setVisible(false);
            btn.container.add(btn.cdText);
        }
        
        // Set localStorage flag so buttons stay unlocked in levels 7-12
        localStorage.setItem('sheepMarket_dogBoneUnlocked', 'true');
        
        // ALSO unlock bone button (button 5) at the same time
        const boneBtn = this.abilityButtons[5];
        if (boneBtn && boneBtn.locked) {
            this.unlockBoneButton(5);
        }
        
        // STANDARDIZED IMPACT ANIMATION
        this.cameras.main.shake(150, 0.003);
        
        // Button impact animation
        this.tweens.add({
            targets: btn.container,
            scale: 1.3,
            duration: 100,
            yoyo: true,
            ease: 'Quad.easeOut',
            onComplete: () => {
                // CRITICAL: Ensure dog icon is visible and correct scale after animation completes
                if (btn.dogImage) {
                    btn.dogImage.setVisible(true);
                    btn.dogImage.setScale(0.10); // Level 8 reference size - static final state
                    btn.dogImage.setAlpha(1); // Ensure full opacity
                }
            }
        });
        
        // Particle burst
        const particles = this.add.particles(btn.container.x, btn.container.y, 'dust_particle', {
            speed: { min: 100, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 600,
            quantity: 15,
            blendMode: 'ADD',
            tint: 0xfcd535 // Gold tint matching button border
        });
        particles.setDepth(10001);
        particles.explode();
        
        this.time.delayedCall(800, () => {
            particles.destroy();
        });
        
        // Play unlock sound
        audioManager.playCoin();
    }
    
    unlockBoneButton(index) {
        const btn = this.abilityButtons[index];
        console.log('🦴 unlockBoneButton called', { index, hasBtn: !!btn, locked: btn?.locked });
        if (!btn) return;
        
        // In Level 7, button might already be "unlocked" but icons hidden - reveal them
        const needsReveal = this.activeLevel === 7 && !btn.locked && !btn.boneIcon?.visible;
        
        if (!btn.locked && !needsReveal) return; // Already fully unlocked and visible
        
        console.log('🦴 Unlocking bone button!');
        
        // Mark as unlocked
        btn.locked = false;
        
        // Update visual style to unlocked (with gold border)
        btn.bg.clear();
        btn.bg.fillStyle(0x1a1a1a, 1);
        btn.bg.lineStyle(3, 0xfcd535, 1); // Gold border
        btn.bg.fillCircle(0, 0, 56);
        btn.bg.strokeCircle(0, 0, 56);
        
        // Hide lock icon and show bone icon
        btn.icon.setVisible(false);
        if (btn.boneIcon) {
            console.log('🦴 Setting bone icon visible');
            btn.boneIcon.setVisible(true);
        } else {
            console.warn('🦴 WARNING: No bone icon found on button!');
        }
        
        // Show bone count text if it exists, create if it doesn't
        const gameScene = this.scene.get('GameScene');
        const currentBoneCount = gameScene?.collectedBonesCount || 0;
        
        if (btn.boneCountText) {
            // Update to current bone count before showing
            btn.boneCountText.setText(currentBoneCount.toString());
            btn.boneCountText.setVisible(true);
        } else {
            // Create bone count text if it doesn't exist (Level 7 case)
            // STANDARDIZED COUNTER STYLE: Matches grass counter exactly
            btn.boneCountText = this.add.text(18, 18, currentBoneCount.toString(), {
                font: 'bold 36px Inter',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5);
            btn.container.add(btn.boneCountText);
        }
        
        // Create cooldown text if it doesn't exist (since locked buttons don't have it)
        if (!btn.cdText) {
            btn.cdText = this.add.text(0, 0, '', {
                font: 'bold 36px Inter',
                fill: '#ffffff'
            }).setOrigin(0.5);
            btn.cdText.setVisible(false);
            btn.container.add(btn.cdText);
        }
        
        // Set localStorage flag so buttons stay unlocked in levels 7-12
        localStorage.setItem('sheepMarket_dogBoneUnlocked', 'true');
        
        // STANDARDIZED IMPACT ANIMATION
        this.cameras.main.shake(150, 0.003);
        
        // Button impact animation
        this.tweens.add({
            targets: btn.container,
            scale: 1.3,
            duration: 100,
            yoyo: true,
            ease: 'Quad.easeOut',
            onComplete: () => {
                // CRITICAL: Ensure bone icon is visible after animation completes
                if (btn.boneIcon) {
                    btn.boneIcon.setVisible(true);
                    btn.boneIcon.setAlpha(1);
                }
                if (btn.boneCountText) {
                    btn.boneCountText.setVisible(true);
                }
            }
        });
        
        // Particle burst
        const particles = this.add.particles(btn.container.x, btn.container.y, 'dust_particle', {
            speed: { min: 100, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 600,
            quantity: 15,
            blendMode: 'ADD',
            tint: 0xfcd535 // Gold tint matching button border
        });
        particles.setDepth(10001);
        particles.explode();
        
        this.time.delayedCall(800, () => {
            particles.destroy();
        });
        
        // Play unlock sound
        audioManager.playCoin();
    }

    unlockGrassButton(index) {
        const btn = this.abilityButtons[index];
        if (!btn || !btn.locked) return;
        
        // Mark as unlocked
        btn.locked = false;
        
        // Update visual style to unlocked with yellow border
        btn.bg.clear();
        btn.bg.fillStyle(0x1a1a1a, 1);
        btn.bg.lineStyle(3, 0xfcd535, 1); // Yellow border (consistent with all unlocked buttons)
        btn.bg.fillCircle(0, 0, 56);
        btn.bg.strokeCircle(0, 0, 56);
        
        // Replace lock icon with grass tuft image
        btn.icon.setVisible(false);
        const grassImage = this.add.image(0, 0, 'grass_tuft')
            .setOrigin(0.5)
            .setScale(0.18); // Fit inside button circle
        btn.container.add(grassImage);
        btn.grassImage = grassImage; // Store reference
        
        // Add grass count text
        const countText = this.add.text(18, 18, '0', {
            font: 'bold 33px Inter',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        btn.container.add(countText);
        btn.grassCountText = countText; // Store reference
        
        // STANDARDIZED IMPACT ANIMATION
        this.cameras.main.shake(150, 0.003);
        
        // Button impact animation
        this.tweens.add({
            targets: btn.container,
            scale: 1.3,
            duration: 100,
            yoyo: true,
            ease: 'Quad.easeOut',
            onComplete: () => {
                // CRITICAL: Ensure grass icon is visible after animation completes
                if (btn.grassImage) {
                    btn.grassImage.setVisible(true);
                    btn.grassImage.setAlpha(1);
                }
                if (btn.grassCountText) {
                    btn.grassCountText.setVisible(true);
                }
            }
        });
        
        // Particle burst
        const particles = this.add.particles(btn.container.x, btn.container.y, 'dust_particle', {
            speed: { min: 100, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 600,
            quantity: 15,
            blendMode: 'ADD',
            tint: 0xfcd535 // Gold tint matching button border
        });
        particles.setDepth(10001);
        particles.explode();
        
        this.time.delayedCall(800, () => {
            particles.destroy();
        });
        
        // Play unlock sound
        audioManager.playCoin();
    }

    updateGrassCount(count) {
        // Update the grass count display on button 3
        const btn = this.abilityButtons[3];
        if (!btn || btn.locked) return;
        
        if (btn.grassCountText) {
            btn.grassCountText.setText(count.toString());
            
            // Bounce animation when count updates
            this.tweens.add({
                targets: btn.grassCountText,
                scale: 1.5,
                duration: 150,
                yoyo: true,
                ease: 'Back.easeOut'
            });
        }
    }

    updateBoneCount(count) {
        // Update the bone count display on button 5
        const btn = this.abilityButtons[5];
        if (!btn || btn.locked) return;
        
        if (btn.boneCountText) {
            btn.boneCountText.setText(count.toString());
            
            // Bounce animation when count updates (matching grass counter)
            this.tweens.add({
                targets: btn.boneCountText,
                scale: 1.5,
                duration: 150,
                yoyo: true,
                ease: 'Back.easeOut'
            });
        }
    }

    unlockDogButton(index, flyingDogSprite) {
        const btn = this.abilityButtons[index];
        if (!btn) return;
        
        // Skip if already fully unlocked and visible
        if (!btn.locked && btn.dogImage && btn.dogImage.visible) return;
        
        // Mark as unlocked
        btn.locked = false;
        
        // Update visual style to unlocked with yellow border
        btn.bg.clear();
        btn.bg.fillStyle(0x1a1a1a, 1);
        btn.bg.lineStyle(3, 0xfcd535, 1); // Yellow border
        btn.bg.fillCircle(0, 0, 56);
        btn.bg.strokeCircle(0, 0, 56);
        
        // Remove lock icon
        if (btn.icon) {
            btn.icon.setVisible(false);
        }
        
        // Show dog image (already exists from initialization)
        if (btn.dogImage) {
            btn.dogImage.setVisible(true);
            btn.dogImage.setScale(0.10); // Ensure consistent scale (Level 8 reference size)
        } else {
            // Create dog image if it doesn't exist
            const dogImage = this.add.image(0, 0, 'sheepdog')
                .setOrigin(0.5)
                .setScale(0.10); // Level 8 reference size
            btn.container.add(dogImage);
            btn.dogImage = dogImage;
        }
        
        // Create cooldown text if it doesn't exist
        if (!btn.cdText) {
            btn.cdText = this.add.text(0, 0, '', {
                font: 'bold 36px Inter',
                fill: '#ffffff'
            }).setOrigin(0.5);
            btn.cdText.setVisible(false);
            btn.container.add(btn.cdText);
        }
        
        // Set localStorage flag so buttons stay unlocked in levels 7-12
        localStorage.setItem('sheepMarket_dogBoneUnlocked', 'true');
        
        // ALSO unlock bone button (button 5) at the same time
        const boneBtn = this.abilityButtons[5];
        if (boneBtn && boneBtn.locked) {
            this.unlockBoneButton(5);
        }
        
        // Destroy flying dog sprite after adding to button
        if (flyingDogSprite) {
            flyingDogSprite.destroy();
        }
        
        // CRITICAL: Force dog icon visible IMMEDIATELY before animations
        if (btn.dogImage) {
            btn.dogImage.setVisible(true);
            btn.dogImage.setScale(0.10); // Level 8 reference size - static final state
            btn.dogImage.setAlpha(1); // Ensure full opacity
        }
        
        // STANDARDIZED IMPACT ANIMATION
        this.cameras.main.shake(150, 0.003);
        
        // Button impact animation
        this.tweens.add({
            targets: btn.container,
            scale: 1.3,
            duration: 100,
            yoyo: true,
            ease: 'Quad.easeOut',
            onComplete: () => {
                // CRITICAL: Re-ensure dog icon is visible after animation completes
                if (btn.dogImage) {
                    btn.dogImage.setVisible(true);
                    btn.dogImage.setScale(0.10); // Level 8 reference size - static final state
                    btn.dogImage.setAlpha(1); // Ensure full opacity
                }
            }
        });
        
        // Particle burst
        const particles = this.add.particles(btn.container.x, btn.container.y, 'dust_particle', {
            speed: { min: 100, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 600,
            quantity: 15,
            blendMode: 'ADD',
            tint: 0xfcd535 // Gold tint matching button border
        });
        particles.setDepth(10001);
        particles.explode();
        
        this.time.delayedCall(800, () => {
            particles.destroy();
        });
        
        // Play unlock sound
        audioManager.playCoin();
    }

    unlockGoldenCloverButton(index, flyingCloverSprite) {
        const btn = this.abilityButtons[index];
        if (!btn) return;
        
        // Skip if already fully unlocked
        if (!btn.locked && btn.goldenCloverImage && btn.goldenCloverImage.visible) return;
        
        // Mark as unlocked
        btn.locked = false;
        
        // Update visual style to unlocked with yellow border
        btn.bg.clear();
        btn.bg.fillStyle(0x1a1a1a, 1);
        btn.bg.lineStyle(3, 0xfcd535, 1); // Yellow border
        btn.bg.fillCircle(0, 0, 56);
        btn.bg.strokeCircle(0, 0, 56);
        
        // Remove lock icon
        if (btn.icon) {
            btn.icon.setVisible(false);
        }
        
        // Show golden clover image
        if (btn.goldenCloverImage) {
            btn.goldenCloverImage.setVisible(true);
            btn.goldenCloverImage.setScale(0.10);
            
            // Check if consumed in main game
            const inFreePlayMode = this.goldenKeyActivated && this.allLevelsUnlockedByGoldenKey;
            const goldenCloverUsedMainGame = localStorage.getItem('sheepMarket_goldenCloverUsed') === 'true';
            
            if (!inFreePlayMode && goldenCloverUsedMainGame) {
                btn.goldenCloverImage.setAlpha(0.3); // Show consumed state
            } else {
                btn.goldenCloverImage.setAlpha(1.0); // Show available state
            }
        } else {
            // Create golden clover image if it doesn't exist
            const goldenCloverImage = this.add.image(0, 0, 'golden_clover')
                .setOrigin(0.5)
                .setScale(0.10);
            
            // Check if consumed in main game
            const inFreePlayMode = this.goldenKeyActivated && this.allLevelsUnlockedByGoldenKey;
            const goldenCloverUsedMainGame = localStorage.getItem('sheepMarket_goldenCloverUsed') === 'true';
            
            if (!inFreePlayMode && goldenCloverUsedMainGame) {
                goldenCloverImage.setAlpha(0.3); // Show consumed state
            }
            
            btn.container.add(goldenCloverImage);
            btn.goldenCloverImage = goldenCloverImage;
        }
        
        // STANDARDIZED IMPACT ANIMATION
        this.cameras.main.shake(150, 0.003);
        
        // Button impact animation
        this.tweens.add({
            targets: btn.container,
            scale: 1.3,
            duration: 100,
            yoyo: true,
            ease: 'Quad.easeOut'
        });
        
        // Particle burst (golden)
        const particles = this.add.particles(btn.container.x, btn.container.y, 'dust_particle', {
            speed: { min: 100, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 600,
            quantity: 15,
            blendMode: 'ADD',
            tint: 0xffd700 // Gold tint
        });
        particles.setDepth(10001);
        particles.explode();
        
        this.time.delayedCall(800, () => {
            particles.destroy();
        });
        
        // Play unlock sound
        audioManager.playCoin();
    }
    
    unlockBlackSheepButton(index, flyingBlackSheepSprite) {
        const btn = this.abilityButtons[index];
        if (!btn) return;
        
        // Skip if already fully unlocked
        if (!btn.locked && btn.blackSheepImage && btn.blackSheepImage.visible) return;
        
        // Mark as unlocked
        btn.locked = false;
        
        // Update visual style to unlocked with yellow border
        btn.bg.clear();
        btn.bg.fillStyle(0x1a1a1a, 1);
        btn.bg.lineStyle(3, 0xfcd535, 1); // Yellow border
        btn.bg.fillCircle(0, 0, 56);
        btn.bg.strokeCircle(0, 0, 56);
        
        // Remove lock icon
        if (btn.icon) {
            btn.icon.setVisible(false);
        }
        
        // Show black sheep image
        if (btn.blackSheepImage) {
            btn.blackSheepImage.setVisible(true);
            btn.blackSheepImage.setScale(0.10);
            // Show white border
            if (btn.blackSheepBorder) {
                btn.blackSheepBorder.setVisible(true);
            }
        } else {
            // Create black sheep image with white outline effect
            // We'll create TWO sheep sprites: a white one slightly larger behind, and a black one in front
            
            // Background white sheep (outline effect)
            const whiteSheepOutline = this.add.image(0, 0, 'sheep')
                .setOrigin(0.5)
                .setTint(0xffffff) // White
                .setScale(0.11); // Slightly larger to create outline effect
            btn.container.add(whiteSheepOutline);
            btn.blackSheepBorder = whiteSheepOutline; // Store as border reference
            
            // Foreground black sheep (actual icon)
            const blackSheepImage = this.add.image(0, 0, 'sheep')
                .setOrigin(0.5)
                .setTint(0x4a4a4a) // Dark grey tint
                .setScale(0.10);
            btn.container.add(blackSheepImage);
            btn.blackSheepImage = blackSheepImage;
        }
        
        // Create cooldown text if it doesn't exist
        if (!btn.cdText) {
            btn.cdText = this.add.text(0, 0, '', {
                font: 'bold 36px Inter',
                fill: '#ffffff'
            }).setOrigin(0.5);
            btn.cdText.setVisible(false);
            btn.container.add(btn.cdText);
        }
        
        // Destroy flying black sheep sprite after adding to button
        if (flyingBlackSheepSprite) {
            flyingBlackSheepSprite.destroy();
        }
        
        // CRITICAL: Force black sheep icon visible IMMEDIATELY
        if (btn.blackSheepImage) {
            btn.blackSheepImage.setVisible(true);
            btn.blackSheepImage.setScale(0.10);
            btn.blackSheepImage.setAlpha(1);
        }
        
        // STANDARDIZED IMPACT ANIMATION
        this.cameras.main.shake(150, 0.003);
        
        // Button impact animation
        this.tweens.add({
            targets: btn.container,
            scale: 1.3,
            duration: 100,
            yoyo: true,
            ease: 'Quad.easeOut',
            onComplete: () => {
                // Re-ensure black sheep icon is visible after animation
                if (btn.blackSheepImage) {
                    btn.blackSheepImage.setVisible(true);
                    btn.blackSheepImage.setScale(0.10);
                    btn.blackSheepImage.setAlpha(1);
                }
            }
        });
        
        // Particle burst
        const particles = this.add.particles(btn.container.x, btn.container.y, 'dust_particle', {
            speed: { min: 100, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 600,
            quantity: 15,
            blendMode: 'ADD',
            tint: 0xfcd535
        });
        particles.setDepth(10001);
        particles.explode();
        
        this.time.delayedCall(800, () => {
            particles.destroy();
        });
        
        // Play unlock sound
        audioManager.playCoin();
    }

    unlockGoldenKeyButton(index, flyingKeySprite) {
        const btn = this.abilityButtons[index];
        if (!btn) return;
        
        // Skip if already unlocked
        if (!btn.locked && btn.goldenKeyImage && btn.goldenKeyImage.visible) return;
        
        // Mark as unlocked
        btn.locked = false;
        
        // Update visual style to unlocked with yellow border
        btn.bg.clear();
        btn.bg.fillStyle(0x1a1a1a, 1);
        btn.bg.lineStyle(3, 0xfcd535, 1); // Yellow border
        btn.bg.fillCircle(0, 0, 56);
        btn.bg.strokeCircle(0, 0, 56);
        
        // Remove lock icon
        if (btn.icon) {
            btn.icon.setVisible(false);
        }
        
        // Show golden key image
        if (btn.goldenKeyImage) {
            btn.goldenKeyImage.setVisible(true);
            btn.goldenKeyImage.setScale(0.10);
        } else {
            // Create golden key image (using the separate golden key asset)
            const goldenKeyImage = this.add.image(0, 0, 'golden_key')
                .setOrigin(0.5)
                .setScale(0.10);
            btn.container.add(goldenKeyImage);
            btn.goldenKeyImage = goldenKeyImage;
        }
        
        // Move flying sprite into button instead of destroying it
        if (flyingKeySprite) {
            // Reparent the flying sprite to the button container
            btn.container.add(flyingKeySprite);
            flyingKeySprite.setPosition(0, 0);
            flyingKeySprite.setScale(0.10);
            flyingKeySprite.setRotation(0);
            // Store reference
            btn.goldenKeyImage = flyingKeySprite;
        }
        
        // Force visibility
        if (btn.goldenKeyImage) {
            btn.goldenKeyImage.setVisible(true);
            btn.goldenKeyImage.setScale(0.10);
            btn.goldenKeyImage.setAlpha(1);
        }
        
        // STANDARDIZED IMPACT ANIMATION
        this.cameras.main.shake(150, 0.003);
        
        // Button impact animation
        this.tweens.add({
            targets: btn.container,
            scale: 1.3,
            duration: 100,
            yoyo: true,
            ease: 'Quad.easeOut'
        });
        
        // Particle burst (golden)
        const particles = this.add.particles(btn.container.x, btn.container.y, 'dust_particle', {
            speed: { min: 100, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 600,
            quantity: 20,
            blendMode: 'ADD',
            tint: 0xffd700 // Gold tint
        });
        particles.setDepth(10001);
        particles.explode();
        
        this.time.delayedCall(800, () => {
            particles.destroy();
        });
        
        // Play unlock sound
        audioManager.playCoin();
        
        // ✅ GOLDEN KEY ACQUIRED
        this.goldenKeyAcquired = true;
        console.log('✅ Golden Key Acquired - stored in button', index);
        
        // Make the button interactable for Golden Key unlock
        btn.container.removeAllListeners('pointerdown'); // Clear any existing handlers
        btn.container.on('pointerdown', () => {
            if (this.goldenKeyActivated) {
                console.log('🔑 Golden Key already activated');
                return;
            }
            
            console.log('🔑 GOLDEN KEY CLICKED - ACTIVATING MASTER UNLOCK!');
            this.activateGoldenKey(btn, index);
        });
    }
    
    placeGoldenSheepOnButton(index, flyingSheepSprite) {
        const btn = this.abilityButtons[index];
        if (!btn) return;
        
        console.log('🐑 Placing Golden Sheep on button', index);
        
        // Mark as unlocked
        btn.locked = false;
        
        // Update visual style to unlocked with yellow border
        btn.bg.clear();
        btn.bg.fillStyle(0x1a1a1a, 1);
        btn.bg.lineStyle(3, 0xfcd535, 1); // Yellow border
        btn.bg.fillCircle(0, 0, 56);
        btn.bg.strokeCircle(0, 0, 56);
        
        // Remove lock icon
        if (btn.icon) {
            btn.icon.setVisible(false);
        }
        
        // Move flying sprite into button container
        if (flyingSheepSprite) {
            // Reparent the flying sprite to the button container
            btn.container.add(flyingSheepSprite);
            flyingSheepSprite.setPosition(0, 0);
            flyingSheepSprite.setScale(0.10);
            flyingSheepSprite.setRotation(0);
            flyingSheepSprite.setVisible(true);
            flyingSheepSprite.setAlpha(1);
            // Store reference
            btn.goldenSheepImage = flyingSheepSprite;
        }
        
        // STANDARDIZED IMPACT ANIMATION
        this.cameras.main.shake(150, 0.003);
        
        // Button impact animation
        this.tweens.add({
            targets: btn.container,
            scale: 1.3,
            duration: 100,
            yoyo: true,
            ease: 'Quad.easeOut'
        });
        
        // ✅ GOLDEN SHEEP ACQUIRED - Make clickable for Level 12
        this.goldenSheepAcquired = true;
        console.log('✅ Golden Sheep placed on button', index);
        
        // Make the button interactable for Golden Sheep activation (Level 12 only)
        btn.container.removeAllListeners('pointerdown'); // Clear any existing handlers
        btn.container.on('pointerdown', () => {
            const gameScene = this.scene.get('GameScene');
            if (!gameScene || gameScene.activeLevel !== 12) {
                console.log('🐑 Golden Sheep button - not Level 12, ignoring click');
                return;
            }
            
            if (this.goldenSheepActivated) {
                console.log('🐑 Golden Sheep already activated');
                return;
            }
            
            console.log('🐑 GOLDEN SHEEP BUTTON CLICKED - ACTIVATING RESTORATION!');
            this.goldenSheepActivated = true;
            
            // Call GameScene to activate Golden Sheep effects
            gameScene.activateGoldenSheepButton();
        });
    }
    
    _oldBounceGoldenSheepButton() {
        // OLD IMPLEMENTATION - REMOVED - USING standardBouncePrompt() now
    }
    
    _oldBounceGoldenKeyButton() {
        // OLD IMPLEMENTATION - REMOVED - USING standardBouncePrompt() now
    }
    
    activateGoldenKey(btn, btnIndex) {
        console.log('🔑 ═══ GOLDEN KEY ACTIVATION SEQUENCE ═══');
        console.log('🖱️  Player clicked Golden Key button');
        console.log('🔑 Setting state flags:');
        console.log('   - goldenKeyActivated: false → true');
        
        // Mark as activated
        this.goldenKeyActivated = true;
        
        console.log('✅ Flag set: goldenKeyActivated = true');
        console.log('⏭️  Next: Golden Key will lift, spin, and fly across UI to unlock all levels');
        
        // Play dramatic sound
        audioManager.playCoin();
        
        // Lift Golden Key out of button
        const goldenKey = btn.goldenKeyImage;
        if (!goldenKey) {
            console.error('❌ No golden key image found in button');
            return;
        }
        
        // Get button world position
        const buttonWorldX = btn.container.x;
        const buttonWorldY = btn.container.y;
        
        // Remove from button container and add to HUD scene at same position
        btn.container.remove(goldenKey);
        goldenKey.setPosition(buttonWorldX, buttonWorldY);
        this.add.existing(goldenKey);
        goldenKey.setDepth(20000);
        
        // Hide button icon temporarily
        btn.bg.clear();
        btn.bg.fillStyle(0x1a1a1a, 1);
        btn.bg.lineStyle(3, 0x666666, 1);
        btn.bg.fillCircle(0, 0, 56);
        btn.bg.strokeCircle(0, 0, 56);
        
        // Create golden trail
        const keyTrail = this.add.particles(buttonWorldX, buttonWorldY, 'sparkle_particle', {
            speed: 0,
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.9, end: 0 },
            lifespan: 600,
            frequency: 20,
            quantity: 1,
            blendMode: 'ADD',
            tint: 0xffd700,
            follow: goldenKey
        });
        keyTrail.setDepth(19999);
        
        // Lift animation
        this.tweens.add({
            targets: goldenKey,
            y: buttonWorldY - 100,
            scale: 0.2,
            duration: 800,
            ease: 'Power2.easeOut',
            onComplete: () => {
                console.log('🔑 Golden Key lifted - beginning unlock sequence');
                
                // Start cascading unlock animation
                this.time.delayedCall(300, () => {
                    this.unlockAllLevelsAnimation(goldenKey, keyTrail);
                });
            }
        });
        
        // Rotate key dramatically
        this.tweens.add({
            targets: goldenKey,
            rotation: Math.PI * 4,
            duration: 2000,
            ease: 'Linear'
        });
    }
    
    unlockAllLevelsAnimation(goldenKey, keyTrail) {
        console.log('🔓 ═══ UNLOCKING ALL LEVELS ═══');
        
        // Get all level indicator buttons (both right and left containers)
        const allLevelButtons = [];
        
        // Collect level buttons from right container (levels 1-6)
        if (this.levelIndicatorsContainer) {
            const rightButtons = this.levelIndicatorsContainer.list.filter(child => child.type === 'Container');
            allLevelButtons.push(...rightButtons.map((btn, idx) => ({ btn, level: idx + 1, container: this.levelIndicatorsContainer })));
        }
        
        // Collect level buttons from left container (levels 7-12)
        if (this.levelIndicatorsLeftContainer) {
            const leftButtons = this.levelIndicatorsLeftContainer.list.filter(child => child.type === 'Container');
            allLevelButtons.push(...leftButtons.map((btn, idx) => ({ btn, level: idx + 7, container: this.levelIndicatorsLeftContainer })));
        }
        
        console.log(`🔓 Found ${allLevelButtons.length} level buttons to unlock`);
        
        if (allLevelButtons.length === 0) {
            console.warn('⚠️ No level buttons found');
            this.completeGoldenKeyUnlock(goldenKey, keyTrail);
            return;
        }
        
        // Fly key across screen, unlocking each level in sequence
        let delay = 0;
        const delayIncrement = 150; // 150ms between each unlock
        
        allLevelButtons.forEach(({ btn, level, container }, index) => {
            this.time.delayedCall(delay, () => {
                // Get button world position
                const btnWorldX = container.x + btn.x;
                const btnWorldY = container.y + btn.y;
                
                // Fly key to this button
                this.tweens.add({
                    targets: goldenKey,
                    x: btnWorldX,
                    y: btnWorldY,
                    duration: delayIncrement,
                    ease: 'Power2.easeInOut'
                });
                
                // Unlock the level
                this.unlockLevelButton(btn, level);
                
                console.log(`🔓 Level ${level} unlocked by Golden Key`);
            });
            
            delay += delayIncrement;
        });
        
        // After all unlocks, complete sequence
        this.time.delayedCall(delay + 500, () => {
            this.completeGoldenKeyUnlock(goldenKey, keyTrail);
        });
    }
    
    unlockLevelButton(btnContainer, levelNum) {
        // Flash golden unlock effect
        const unlockFlash = this.add.circle(
            btnContainer.x, 
            btnContainer.y, 
            40, 
            0xffd700, 
            0.8
        );
        unlockFlash.setDepth(19998);
        
        this.tweens.add({
            targets: unlockFlash,
            scale: 2,
            alpha: 0,
            duration: 400,
            ease: 'Power2.easeOut',
            onComplete: () => unlockFlash.destroy()
        });
        
        // Play unlock sound
        audioManager.playCoin();
        
        // Bounce button
        this.tweens.add({
            targets: btnContainer,
            scale: 1.4,
            duration: 100,
            yoyo: true,
            ease: 'Quad.easeOut'
        });
        
        // Update visuals - find children and update
        const icon = btnContainer.list.find(child => child.texture && child.texture.key === 'shepherd_icon');
        const badgeBg = btnContainer.list.find(child => child.type === 'Graphics');
        const badgeText = btnContainer.list.find(child => child.type === 'Text');
        
        if (icon) {
            icon.setAlpha(1);
            icon.clearTint();
        }
        
        if (badgeBg && badgeText) {
            badgeBg.clear();
            badgeBg.fillStyle(0xfcd535, 1);
            badgeBg.lineStyle(2, 0x000000);
            badgeBg.fillCircle(18, 18, 10);
            badgeBg.strokeCircle(18, 18, 10);
            
            badgeText.setText(levelNum.toString());
            badgeText.setFontSize(12);
            badgeText.setStyle({ fill: '#000000' });
        }
    }
    
    completeGoldenKeyUnlock(goldenKey, keyTrail) {
        console.log('✨ ═══ GOLDEN KEY UNLOCK SEQUENCE COMPLETE ═══');
        console.log('🔓 All 12 levels have been unlocked');
        console.log('🔑 Setting state flags:');
        console.log('   - allLevelsUnlockedByGoldenKey: false → true');
        
        // Stop trail
        if (keyTrail) keyTrail.stop();
        
        // Golden Key disappears in golden burst
        const burstParticles = this.add.particles(goldenKey.x, goldenKey.y, 'sparkle_particle', {
            speed: { min: 200, max: 400 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.0, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 1000,
            quantity: 40,
            blendMode: 'ADD',
            tint: 0xffd700
        });
        burstParticles.setDepth(20000);
        burstParticles.explode();
        
        // Fade out key
        this.tweens.add({
            targets: goldenKey,
            alpha: 0,
            scale: 0.4,
            duration: 500,
            ease: 'Power2.easeIn',
            onComplete: () => {
                goldenKey.destroy();
                if (keyTrail) keyTrail.destroy();
            }
        });
        
        // Clean up burst after animation
        this.time.delayedCall(1200, () => {
            burstParticles.destroy();
        });
        
        // Mark as complete
        this.allLevelsUnlockedByGoldenKey = true;
        
        console.log('✅ Flag set: allLevelsUnlockedByGoldenKey = true');
        
        // Persist unlock state to localStorage (survives page refresh)
        localStorage.setItem('sheepMarket_goldenKeyActivated', 'true');
        localStorage.setItem('sheepMarket_allLevelsUnlocked', 'true');
        
        console.log('💾 State persisted to localStorage');
        console.log('🎉 ALL LEVELS PERMANENTLY UNLOCKED');
        console.log('🎉 FULL REPLAY ACCESS GRANTED');
        
        // Refresh level indicators to show all unlocked
        this.createLevelIndicators();
        
        // Notify GameScene that Golden Key sequence is complete
        console.log('⏭️  Notifying GameScene to finalize sequence...');
        const gameScene = this.scene.get('GameScene');
        if (gameScene && gameScene.finalizeGoldenKeySequence) {
            gameScene.finalizeGoldenKeySequence();
        }
    }
    
    // ✅ CLEANUP METHOD for Game Won popup
    destroyGameWonPopup() {
        if (this.gameWonConfetti) {
            this.gameWonConfetti.stop();
            this.gameWonConfetti.destroy();
            this.gameWonConfetti = null;
        }
        
        if (this.gameWonContainer) {
            this.gameWonContainer.destroy(true);
            this.gameWonContainer = null;
        }
        
        console.log('[HUDScene] 🧹 Game Won popup destroyed');
    }
    
    // ✅ CLEANUP METHOD for Retry Confirmation popup
    destroyRetryConfirmationPopup() {
        if (this.retryConfirmationContainer) {
            this.retryConfirmationContainer.destroy(true);
            this.retryConfirmationContainer = null;
        }
        
        console.log('[HUDScene] 🧹 Retry Confirmation popup destroyed');
    }
    
    /**
     * Show retry confirmation popup
     * @param {number} retryCost - Cost to retry in wool
     * @param {number} currentBalance - Player's current balance
     * @param {Function} onConfirm - Callback when player confirms
     * @param {Function} onCancel - Callback when player cancels
     */
    showRetryConfirmationPopup(retryCost, currentBalance, onConfirm, onCancel) {
        console.log(`[RetryConfirmation] 🔄 Showing retry popup: cost=${retryCost}W, balance=${currentBalance}W`);
        
        // ✅ GUARD: Prevent duplicate popups
        if (this.retryConfirmationContainer) {
            console.warn('[HUDScene] Retry Confirmation popup already exists, skipping duplicate');
            return;
        }
        
        // ✅ CREATE CONTAINER for lifecycle management
        this.retryConfirmationContainer = this.add.container(0, 0);
        this.retryConfirmationContainer.setDepth(15000);
        this.retryConfirmationContainer.setScrollFactor(0);
        
        const modalX = CONFIG.width / 2;
        const modalY = CONFIG.height / 2;
        const modalWidth = 600;
        const modalHeight = 350;
        
        // Dark overlay
        const overlay = this.add.rectangle(0, 0, CONFIG.width, CONFIG.height, 0x000000, 0.85);
        overlay.setOrigin(0);
        overlay.setDepth(15000);
        overlay.setScrollFactor(0);
        
        // Modal background
        const modalBg = this.add.graphics();
        modalBg.fillStyle(0x1a1c1e, 1);
        modalBg.fillRoundedRect(modalX - modalWidth/2, modalY - modalHeight/2, modalWidth, modalHeight, 20);
        modalBg.lineStyle(4, 0xfcd535, 1);
        modalBg.strokeRoundedRect(modalX - modalWidth/2, modalY - modalHeight/2, modalWidth, modalHeight, 20);
        modalBg.setDepth(15001);
        modalBg.setScrollFactor(0);
        
        // Check if player can afford retry
        const canAfford = currentBalance >= retryCost;
        
        // Title
        const titleText = canAfford ? 'RETRY LEVEL?' : 'NOT ENOUGH WOOL!';
        const title = this.add.text(modalX, modalY - 100, titleText, {
            font: '900 48px Inter',
            fill: canAfford ? '#fcd535' : '#ff4444',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5);
        title.setDepth(15002);
        title.setScrollFactor(0);
        
        // Message
        let messageText;
        if (retryCost === 0) {
            messageText = 'Retry this level for FREE?';
        } else if (canAfford) {
            messageText = `Retry will cost ${retryCost}W\nYou have ${Math.floor(currentBalance)}W`;
        } else {
            messageText = `You need ${retryCost}W to retry\nYou only have ${Math.floor(currentBalance)}W\n\nGAME OVER`;
        }
        
        const message = this.add.text(modalX, modalY, messageText, {
            font: '600 28px Inter',
            fill: '#ffffff',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        message.setDepth(15002);
        message.setScrollFactor(0);
        
        // Button helper
        const createButton = (x, y, text, primary, onClick) => {
            const btnWidth = 220;
            const btnHeight = 60;
            
            const btnContainer = this.add.container(x, y);
            btnContainer.setDepth(15002);
            btnContainer.setScrollFactor(0);
            
            const btnBg = this.add.graphics();
            // Shadow
            btnBg.fillStyle(0x000000, 0.4);
            btnBg.fillRoundedRect(-btnWidth/2 + 4, -btnHeight/2 + 4, btnWidth, btnHeight, 12);
            // Main button 
            btnBg.fillStyle(primary ? 0xfcd535 : 0x444444, 1);
            btnBg.fillRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
            // Border
            btnBg.lineStyle(4, 0x000000, 1);
            btnBg.strokeRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
            
            const btnTextObj = this.add.text(0, 0, text, {
                font: '900 24px Inter',
                fill: primary ? '#000000' : '#ffffff',
                align: 'center'
            }).setOrigin(0.5);
            
            btnContainer.add([btnBg, btnTextObj]);
            
            // Make button interactive
            const hitArea = new Phaser.Geom.Rectangle(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight);
            btnContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
            
            btnContainer.on('pointerover', () => {
                btnContainer.setScale(1.05);
                btnBg.clear();
                btnBg.fillStyle(0x000000, 0.4);
                btnBg.fillRoundedRect(-btnWidth/2 + 4, -btnHeight/2 + 4, btnWidth, btnHeight, 12);
                btnBg.fillStyle(primary ? 0xffed4e : 0x666666, 1);
                btnBg.fillRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
                btnBg.lineStyle(4, 0x000000, 1);
                btnBg.strokeRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
            });
            
            btnContainer.on('pointerout', () => {
                btnContainer.setScale(1);
                btnBg.clear();
                btnBg.fillStyle(0x000000, 0.4);
                btnBg.fillRoundedRect(-btnWidth/2 + 4, -btnHeight/2 + 4, btnWidth, btnHeight, 12);
                btnBg.fillStyle(primary ? 0xfcd535 : 0x444444, 1);
                btnBg.fillRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
                btnBg.lineStyle(4, 0x000000, 1);
                btnBg.strokeRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
            });
            
            btnContainer.on('pointerdown', () => {
                import('../audio.js').then(({ audioManager }) => audioManager.playClick());
                onClick();
            });
            
            return btnContainer;
        };
        
        const btnY = modalY + modalHeight/2 - 80;
        
        let confirmBtn, cancelBtn;
        
        if (canAfford) {
            // Show CONTINUE and CANCEL buttons
            confirmBtn = createButton(modalX - 130, btnY, 'CONTINUE', true, () => {
                this.destroyRetryConfirmationPopup();
                onConfirm();
            });
            
            cancelBtn = createButton(modalX + 130, btnY, 'CANCEL', false, () => {
                this.destroyRetryConfirmationPopup();
                onCancel();
            });
        } else {
            // Show only RESTART GAME button (game over)
            confirmBtn = createButton(modalX, btnY, 'RESTART GAME', true, () => {
                this.destroyRetryConfirmationPopup();
                // Trigger game over flow
                import('../services/GameFlowManager.js').then(({ gameFlowManager }) => {
                    gameFlowManager.newGame();
                });
            });
        }
        
        // ✅ ADD ALL ELEMENTS TO CONTAINER
        this.retryConfirmationContainer.add([
            overlay,
            modalBg,
            title,
            message,
            confirmBtn
        ]);
        
        if (cancelBtn) {
            this.retryConfirmationContainer.add(cancelBtn);
        }
        
        console.log('[HUDScene] ✅ Retry Confirmation popup created');
        
        // Entrance animation
        modalBg.setAlpha(0);
        title.setAlpha(0);
        message.setAlpha(0);
        confirmBtn.setAlpha(0);
        if (cancelBtn) cancelBtn.setAlpha(0);
        overlay.setAlpha(0);
        
        this.tweens.add({
            targets: overlay,
            alpha: 0.85,
            duration: 300,
            ease: 'Power2'
        });
        
        this.tweens.add({
            targets: [modalBg, title, message, confirmBtn, cancelBtn].filter(Boolean),
            alpha: 1,
            duration: 400,
            delay: 100,
            ease: 'Back.easeOut'
        });
    }
    
    showGameWonPopup() {
        console.log('🎉 ═══ GAME WON POPUP REQUESTED ═══');
        
        // ✅ GUARD: Prevent duplicate popups
        if (this.gameWonContainer) {
            console.warn('[HUDScene] Game Won popup already exists, skipping duplicate');
            return;
        }
        
        // ✅ GUARD: Only show on Level 12
        if (this.activeLevel !== 12) {
            console.warn('[HUDScene] Game Won popup called on non-Level 12, aborting');
            return;
        }
        
        const width = CONFIG.width;
        const height = CONFIG.height;
        
        // ✅ CREATE CONTAINER to track all popup elements
        this.gameWonContainer = this.add.container(0, 0);
        this.gameWonContainer.setDepth(15000);
        this.gameWonContainer.setScrollFactor(0);
        
        // Darken overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.85);
        overlay.fillRect(0, 0, width, height);
        overlay.setDepth(15000);
        overlay.setScrollFactor(0);
        
        // Modal container
        const modalWidth = 700;
        const modalHeight = 500;
        const modalX = width / 2;
        const modalY = height / 2;
        
        // Background with gold gradient effect
        const modalBg = this.add.graphics();
        
        // Shadow
        modalBg.fillStyle(0x000000, 0.4);
        modalBg.fillRoundedRect(modalX - modalWidth/2 + 8, modalY - modalHeight/2 + 8, modalWidth, modalHeight, 20);
        
        // Main background - dark with gold border
        modalBg.fillStyle(0x1a1a1a, 1);
        modalBg.fillRoundedRect(modalX - modalWidth/2, modalY - modalHeight/2, modalWidth, modalHeight, 20);
        
        // Gold border (thick and prominent)
        modalBg.lineStyle(6, 0xffd700, 1);
        modalBg.strokeRoundedRect(modalX - modalWidth/2, modalY - modalHeight/2, modalWidth, modalHeight, 20);
        
        // Inner gold accent border
        modalBg.lineStyle(2, 0xffed4e, 0.6);
        modalBg.strokeRoundedRect(modalX - modalWidth/2 + 12, modalY - modalHeight/2 + 12, modalWidth - 24, modalHeight - 24, 16);
        
        modalBg.setDepth(15001);
        modalBg.setScrollFactor(0);
        
        // Title: YOU RULE THE PASTURE!
        const title = this.add.text(modalX, modalY - modalHeight/2 + 80, 'YOU RULE THE PASTURE!', {
            font: '900 56px Inter',
            fill: '#ffd700',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);
        title.setDepth(15002);
        title.setScrollFactor(0);
        
        // Add golden glow to title
        const titleGlow = this.add.text(modalX, modalY - modalHeight/2 + 80, 'YOU RULE THE PASTURE!', {
            font: '900 56px Inter',
            fill: '#ffed4e',
            align: 'center'
        }).setOrigin(0.5).setAlpha(0.3);
        titleGlow.setDepth(15001);
        titleGlow.setScrollFactor(0);
        
        // Pulse animation for title
        this.tweens.add({
            targets: [title, titleGlow],
            scale: 1.05,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Sheep icon (standard sheep, not golden) - positioned between title and buttons
        const sheepIcon = this.add.image(modalX, modalY - 20, 'sheep');
        sheepIcon.setScale(0.25);
        sheepIcon.setDepth(15002);
        sheepIcon.setScrollFactor(0);
        
        // Add golden glow around sheep icon
        const sheepGlow = this.add.circle(modalX, modalY - 20, 60, 0xffd700, 0.2);
        sheepGlow.setDepth(15001);
        sheepGlow.setScrollFactor(0);
        
        // Pulse animation for sheep
        this.tweens.add({
            targets: [sheepIcon, sheepGlow],
            scale: sheepIcon.scale * 1.1,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Buttons
        const createButton = (x, y, text, primary, onClick) => {
            const btnWidth = 300;
            const btnHeight = 60;
            
            const btnContainer = this.add.container(x, y);
            btnContainer.setDepth(15002);
            btnContainer.setScrollFactor(0);
            
            const btnBg = this.add.graphics();
            // Shadow
            btnBg.fillStyle(0x000000, 0.4);
            btnBg.fillRoundedRect(-btnWidth/2 + 4, -btnHeight/2 + 4, btnWidth, btnHeight, 12);
            // Main button 
            btnBg.fillStyle(primary ? 0xffd700 : 0x444444, 1);
            btnBg.fillRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
            // Dark border
            btnBg.lineStyle(4, 0x000000, 1);
            btnBg.strokeRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
            
            const btnTextObj = this.add.text(0, 0, text, {
                font: '900 24px Inter',
                fill: primary ? '#000000' : '#ffffff',
                align: 'center'
            }).setOrigin(0.5);
            
            btnContainer.add([btnBg, btnTextObj]);
            
            // Make button interactive
            const hitArea = new Phaser.Geom.Rectangle(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight);
            btnContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
            
            btnContainer.on('pointerover', () => {
                btnContainer.setScale(1.05);
                btnBg.clear();
                btnBg.fillStyle(0x000000, 0.4);
                btnBg.fillRoundedRect(-btnWidth/2 + 4, -btnHeight/2 + 4, btnWidth, btnHeight, 12);
                btnBg.fillStyle(primary ? 0xffed4e : 0x666666, 1);
                btnBg.fillRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
                btnBg.lineStyle(4, 0x000000, 1);
                btnBg.strokeRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
            });
            
            btnContainer.on('pointerout', () => {
                btnContainer.setScale(1);
                btnBg.clear();
                btnBg.fillStyle(0x000000, 0.4);
                btnBg.fillRoundedRect(-btnWidth/2 + 4, -btnHeight/2 + 4, btnWidth, btnHeight, 12);
                btnBg.fillStyle(primary ? 0xffd700 : 0x444444, 1);
                btnBg.fillRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
                btnBg.lineStyle(4, 0x000000, 1);
                btnBg.strokeRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
            });
            
            btnContainer.on('pointerdown', () => {
                import('../audio.js').then(({ audioManager }) => audioManager.playClick());
                import('../services/GameFlowManager.js').then(({ gameFlowManager }) => {
                    onClick(gameFlowManager);
                });
            });
            
            return btnContainer;
        };

        const btnY = modalY + modalHeight/2 - 100;
        
        // Start Level 1 Button (renamed from "Replay Level 12")
        const replayBtn = createButton(modalX - 160, btnY, 'START LEVEL 1', true, async (gameFlowManager) => {
            // ✅ CLEANUP popup before transition
            this.destroyGameWonPopup();
            
            // Get the CURRENT balance from GameScene (includes Level 12 earnings)
            const gameScene = this.scene.get('GameScene');
            const finalBalance = gameScene ? gameScene.woolBalance : authService.loadBalance();
            console.log(`[GameWon] 🎮 Starting Level 1 with final balance: ${finalBalance}W (includes Level 12 earnings)`);
            console.log(`[GameWon] 💰 HUDScene balance: ${this.balance}W`);

            // Save as Level 1 start balance so retry logic is also clean
            localStorage.setItem('sheepMarket_level1StartBalance', finalBalance.toString());

            // Transition to Level 1 — free, preserving progression
            // IMPORTANT: Do NOT set isReplay flag - we want to keep the earned wool
            gameFlowManager._internalChangeLevelTransition(1, finalBalance, {
                fromMenu: false,
                isRetrying: false,
                isReplay: false, // ✅ CRITICAL: Disable replay mode to keep Level 12 earnings
                goldenKeyActivated: localStorage.getItem('sheepMarket_goldenKeyActivated') === 'true',
                allLevelsUnlocked: localStorage.getItem('sheepMarket_allLevelsUnlocked') === 'true'
            });
        });

        // Main Menu Button
        const restartBtn = createButton(modalX + 160, btnY, 'MAIN MENU', false, async (gameFlowManager) => {
            // ✅ CLEANUP popup before transition
            this.destroyGameWonPopup();
            
            const gameScene = this.scene.get('GameScene');

            // 🔴 Stop GameScene completely
            if (gameScene) {
                gameScene.scene.stop();
            }

            // 🔴 Stop HUDScene and transition to BootScene
            // Note: scene.start() will automatically call shutdown() which handles cleanup
            this.scene.start('BootScene', { isRetry: false });
        });
        
        // Subtle confetti in background
        const confettiEmitter = this.add.particles(modalX, modalY - modalHeight/2, 'sparkle_particle', {
            x: { min: -modalWidth/2, max: modalWidth/2 },
            y: 0,
            speedY: { min: 50, max: 150 },
            speedX: { min: -30, max: 30 },
            scale: { start: 0.4, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 3000,
            frequency: 100,
            quantity: 1,
            tint: [0xffd700, 0xffed4e, 0xffffff],
            blendMode: 'ADD'
        });
        confettiEmitter.setDepth(15001);
        confettiEmitter.setScrollFactor(0);
        
        // ✅ TRACK confetti emitter separately (can't be added to container)
        this.gameWonConfetti = confettiEmitter;
        
        // ✅ ADD ALL ELEMENTS TO CONTAINER for lifecycle management
        this.gameWonContainer.add([
            overlay,
            modalBg,
            titleGlow,
            title,
            sheepGlow,
            sheepIcon,
            replayBtn,
            restartBtn
        ]);
        
        console.log('[HUDScene] ✅ Game Won popup created with container tracking');
        
        // Entrance animation
        modalBg.setAlpha(0);
        title.setAlpha(0);
        titleGlow.setAlpha(0);
        sheepIcon.setAlpha(0);
        sheepGlow.setAlpha(0);
        replayBtn.setAlpha(0);
        restartBtn.setAlpha(0);
        overlay.setAlpha(0);
        
        this.tweens.add({
            targets: overlay,
            alpha: 0.85,
            duration: 300,
            ease: 'Power2'
        });
        
        this.tweens.add({
            targets: [modalBg, title, titleGlow, sheepIcon, sheepGlow],
            alpha: 1,
            duration: 500,
            delay: 200,
            ease: 'Power2'
        });
        
        this.tweens.add({
            targets: [replayBtn, restartBtn],
            alpha: 1,
            y: btnY + 20, // Slide up slightly
            duration: 400,
            delay: 700,
            ease: 'Back.easeOut'
        });
    }
    
    showNewGameWarning() {
        console.log('⚠️ NEW GAME WARNING - Checking if confirmation needed');
        
        // If forced restart (0W + no gains), skip confirmation and execute immediately
        if (this.isForcedRestartModal) {
            console.log('🚫 FORCED RESTART - Skipping confirmation, executing immediate reset');
            this.executeLevel1Reset();
            return;
        }
        
        console.log('⚠️ Showing confirmation popup (voluntary restart)');
        
        // CRITICAL FIX: Hide the Wool Wallet container entirely before showing the confirmation
        // This prevents DOM elements and high-depth text from bleeding through
        if (this.statsContainer) {
            this.statsContainer.setVisible(false);
            // Specifically hide the DOM element as well to ensure zero bleed-through
            if (this.levelCallBreakdownDOM) {
                this.levelCallBreakdownDOM.setVisible(false);
            }
        }
        
        const width = CONFIG.width;
        const height = CONFIG.height;
        
        // Darken overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.85);
        overlay.fillRect(0, 0, width, height);
        overlay.setDepth(20000); // Higher than wool wallet
        overlay.setScrollFactor(0);
        
        // Modal container - increased height for better spacing
        const modalWidth = 800;
        const modalHeight = 650;
        const modalX = width / 2;
        const modalY = height / 2;
        
        // Background
        const modalBg = this.add.graphics();
        
        // Shadow
        modalBg.fillStyle(0x000000, 0.4);
        modalBg.fillRoundedRect(modalX - modalWidth/2 + 8, modalY - modalHeight/2 + 8, modalWidth, modalHeight, 20);
        
        // Main background - dark brown (wood theme)
        modalBg.fillStyle(0x3E2723, 1);
        modalBg.fillRoundedRect(modalX - modalWidth/2, modalY - modalHeight/2, modalWidth, modalHeight, 20);
        
        // Warning border (red/orange)
        modalBg.lineStyle(6, 0xFF6B35, 1);
        modalBg.strokeRoundedRect(modalX - modalWidth/2, modalY - modalHeight/2, modalWidth, modalHeight, 20);
        
        // Inner accent border
        modalBg.lineStyle(2, 0xFFA500, 0.6);
        modalBg.strokeRoundedRect(modalX - modalWidth/2 + 12, modalY - modalHeight/2 + 12, modalWidth - 24, modalHeight - 24, 16);
        
        modalBg.setDepth(20001);
        modalBg.setScrollFactor(0);
        
        // Title: ARE YOU SURE?
        const title = this.add.text(modalX, modalY - modalHeight/2 + 80, 'ARE YOU SURE?', {
            font: '900 64px Inter',
            fill: '#FF6B35',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);
        title.setDepth(20002);
        title.setScrollFactor(0);
        
        // Warning message text - moved down for better spacing
        const messageText = [
            'STARTING A NEW GAME WILL:',
            '',
            '• RESET YOUR PROGRESS TO LEVEL 1',
            '• RESET YOUR WOOL BALANCE TO 50W',
            '• LOCK ALL LEVELS EXCEPT LEVEL 1',
            '• CLEAR YOUR CURRENT GAME STATE',
            '',
            'THIS ACTION CANNOT BE UNDONE.'
        ].join('\n');
        
        const message = this.add.text(modalX, modalY + 10, messageText, {
            font: 'bold 28px Inter',
            fill: '#FFF8DC',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);
        message.setDepth(20002);
        message.setScrollFactor(0);
        
        // YES button (red/warning theme) - moved down slightly
        const btnYesY = modalY + modalHeight/2 - 80;
        const btnNoY = btnYesY;
        const btnWidth = 280;
        const btnHeight = 80;
        const btnGap = 50;
        
        // YES Button Container
        const yesBtnContainer = this.add.container(modalX - btnWidth/2 - btnGap/2, btnYesY);
        yesBtnContainer.setDepth(20002);
        yesBtnContainer.setScrollFactor(0);
        
        const yesBtnBg = this.add.graphics();
        // Shadow
        yesBtnBg.fillStyle(0x000000, 0.4);
        yesBtnBg.fillRoundedRect(-btnWidth/2 + 4, -btnHeight/2 + 4, btnWidth, btnHeight, 12);
        // Main button - warning red
        yesBtnBg.fillStyle(0xD32F2F, 1);
        yesBtnBg.fillRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
        // Dark border
        yesBtnBg.lineStyle(4, 0x000000, 1);
        yesBtnBg.strokeRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
        
        const yesBtnText = this.add.text(0, 0, 'YES', {
            font: '900 48px Inter',
            fill: '#FFFFFF',
            align: 'center'
        }).setOrigin(0.5);
        
        yesBtnContainer.add([yesBtnBg, yesBtnText]);
        
        // Make YES button interactive
        const yesHitArea = new Phaser.Geom.Rectangle(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight);
        yesBtnContainer.setInteractive(yesHitArea, Phaser.Geom.Rectangle.Contains);
        
        yesBtnContainer.on('pointerover', () => {
            yesBtnContainer.setScale(1.05);
            yesBtnBg.clear();
            // Lighter red on hover
            yesBtnBg.fillStyle(0x000000, 0.4);
            yesBtnBg.fillRoundedRect(-btnWidth/2 + 4, -btnHeight/2 + 4, btnWidth, btnHeight, 12);
            yesBtnBg.fillStyle(0xF44336, 1);
            yesBtnBg.fillRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
            yesBtnBg.lineStyle(4, 0x000000, 1);
            yesBtnBg.strokeRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
        });
        
        yesBtnContainer.on('pointerout', () => {
            yesBtnContainer.setScale(1);
            yesBtnBg.clear();
            // Reset to normal red
            yesBtnBg.fillStyle(0x000000, 0.4);
            yesBtnBg.fillRoundedRect(-btnWidth/2 + 4, -btnHeight/2 + 4, btnWidth, btnHeight, 12);
            yesBtnBg.fillStyle(0xD32F2F, 1);
            yesBtnBg.fillRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
            yesBtnBg.lineStyle(4, 0x000000, 1);
            yesBtnBg.strokeRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
        });
        
        yesBtnContainer.on('pointerdown', () => {
            console.log('✅ NEW GAME CONFIRMED - Resetting to Level 1');
            audioManager.playClick();
            
            // CRITICAL FIX: Restore visibility before closing so state is clean for next use
            if (this.statsContainer) {
                this.statsContainer.setVisible(true);
                if (this.levelCallBreakdownDOM) {
                    this.levelCallBreakdownDOM.setVisible(true);
                }
            }
            
            // Destroy warning popup
            overlay.destroy();
            modalBg.destroy();
            title.destroy();
            message.destroy();
            yesBtnContainer.destroy();
            noBtnContainer.destroy();
            
            // Close wool wallet modal
            this.toggleStatsModal();
            
            // Execute Level 1 reset
            this.executeLevel1Reset();
        });
        
        // NO Button Container
        const noBtnContainer = this.add.container(modalX + btnWidth/2 + btnGap/2, btnNoY);
        noBtnContainer.setDepth(20002);
        noBtnContainer.setScrollFactor(0);
        
        const noBtnBg = this.add.graphics();
        // Shadow
        noBtnBg.fillStyle(0x000000, 0.4);
        noBtnBg.fillRoundedRect(-btnWidth/2 + 4, -btnHeight/2 + 4, btnWidth, btnHeight, 12);
        // Main button - safe green
        noBtnBg.fillStyle(0x388E3C, 1);
        noBtnBg.fillRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
        // Dark border
        noBtnBg.lineStyle(4, 0x000000, 1);
        noBtnBg.strokeRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
        
        const noBtnText = this.add.text(0, 0, 'NO', {
            font: '900 48px Inter',
            fill: '#FFFFFF',
            align: 'center'
        }).setOrigin(0.5);
        
        noBtnContainer.add([noBtnBg, noBtnText]);
        
        // Make NO button interactive
        const noHitArea = new Phaser.Geom.Rectangle(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight);
        noBtnContainer.setInteractive(noHitArea, Phaser.Geom.Rectangle.Contains);
        
        noBtnContainer.on('pointerover', () => {
            noBtnContainer.setScale(1.05);
            noBtnBg.clear();
            // Lighter green on hover
            noBtnBg.fillStyle(0x000000, 0.4);
            noBtnBg.fillRoundedRect(-btnWidth/2 + 4, -btnHeight/2 + 4, btnWidth, btnHeight, 12);
            noBtnBg.fillStyle(0x4CAF50, 1);
            noBtnBg.fillRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
            noBtnBg.lineStyle(4, 0x000000, 1);
            noBtnBg.strokeRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
        });
        
        noBtnContainer.on('pointerout', () => {
            noBtnContainer.setScale(1);
            noBtnBg.clear();
            // Reset to normal green
            noBtnBg.fillStyle(0x000000, 0.4);
            noBtnBg.fillRoundedRect(-btnWidth/2 + 4, -btnHeight/2 + 4, btnWidth, btnHeight, 12);
            noBtnBg.fillStyle(0x388E3C, 1);
            noBtnBg.fillRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
            noBtnBg.lineStyle(4, 0x000000, 1);
            noBtnBg.strokeRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
        });
        
        noBtnContainer.on('pointerdown', () => {
            console.log('❌ NEW GAME CANCELLED - Returning to Wool Wallet');
            audioManager.playClick();
            
            // CRITICAL FIX: Restore Wool Wallet visibility before destroying popup
            if (this.statsContainer) {
                this.statsContainer.setVisible(true);
                if (this.levelCallBreakdownDOM) {
                    this.levelCallBreakdownDOM.setVisible(true);
                }
            }
            
            // Destroy warning popup
            overlay.destroy();
            modalBg.destroy();
            title.destroy();
            message.destroy();
            yesBtnContainer.destroy();
            noBtnContainer.destroy();
            
            // Wool wallet remains open - player can continue or choose next level
        });
        
        // Entrance animation
        modalBg.setAlpha(0);
        title.setAlpha(0);
        message.setAlpha(0);
        yesBtnContainer.setAlpha(0);
        noBtnContainer.setAlpha(0);
        overlay.setAlpha(0);
        
        this.tweens.add({
            targets: overlay,
            alpha: 0.85,
            duration: 300,
            ease: 'Power2'
        });
        
        this.tweens.add({
            targets: [modalBg, title],
            alpha: 1,
            duration: 400,
            delay: 200,
            ease: 'Power2'
        });
        
        this.tweens.add({
            targets: message,
            alpha: 1,
            duration: 400,
            delay: 400,
            ease: 'Power2'
        });
        
        this.tweens.add({
            targets: [yesBtnContainer, noBtnContainer],
            alpha: 1,
            duration: 400,
            delay: 600,
            ease: 'Back.easeOut'
        });
        
        // Pulse animation for title
        this.tweens.add({
            targets: title,
            scale: 1.05,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    unlockGoldenSheepButton(index, flyingGoldenSheepSprite) {
        const btn = this.abilityButtons[index];
        if (!btn) return;
        
        // Skip if already fully unlocked
        if (!btn.locked && btn.goldenSheepImage && btn.goldenSheepImage.visible) return;
        
        // Mark as unlocked
        btn.locked = false;
        
        // PERSISTENCE: Save golden sheep collection status
        localStorage.setItem('sheepMarket_goldenSheepCollected', 'true');
        
        // Update visual style to unlocked with yellow border
        btn.bg.clear();
        btn.bg.fillStyle(0x1a1a1a, 1);
        btn.bg.lineStyle(3, 0xfcd535, 1); // Yellow border
        btn.bg.fillCircle(0, 0, 56);
        btn.bg.strokeCircle(0, 0, 56);
        
        // Remove lock icon
        if (btn.icon) {
            btn.icon.setVisible(false);
        }
        
        // Show golden sheep image
        if (btn.goldenSheepImage) {
            btn.goldenSheepImage.setVisible(true);
            btn.goldenSheepImage.setScale(0.10);
        } else {
            // Create golden sheep image (using unique golden_sheep asset with key)
            const goldenSheepImage = this.add.image(0, 0, 'golden_sheep')
                .setOrigin(0.5)
                .setScale(0.10);
            btn.container.add(goldenSheepImage);
            btn.goldenSheepImage = goldenSheepImage;
        }
        
        // Destroy flying sprite
        if (flyingGoldenSheepSprite) {
            flyingGoldenSheepSprite.destroy();
        }
        
        // Force visibility
        if (btn.goldenSheepImage) {
            btn.goldenSheepImage.setVisible(true);
            btn.goldenSheepImage.setScale(0.10);
            btn.goldenSheepImage.setAlpha(1);
        }
        
        // STANDARDIZED IMPACT ANIMATION
        this.cameras.main.shake(150, 0.003);
        
        // Button impact animation
        this.tweens.add({
            targets: btn.container,
            scale: 1.3,
            duration: 100,
            yoyo: true,
            ease: 'Quad.easeOut'
        });
        
        // Particle burst (golden)
        const particles = this.add.particles(btn.container.x, btn.container.y, 'dust_particle', {
            speed: { min: 100, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 600,
            quantity: 20,
            blendMode: 'ADD',
            tint: 0xffd700 // Gold tint
        });
        particles.setDepth(10001);
        particles.explode();
        
        this.time.delayedCall(800, () => {
            particles.destroy();
        });
        
        // Play unlock sound
        audioManager.playCoin();
    }

    startGrassButtonThrob() {
        // Start continuous throb animation for grass button in Level 6
        if (this.activeLevel !== 6) return;
        
        const btn = this.abilityButtons[3]; // Grass tuft button
        if (!btn || btn.locked) return;
        
        // Stop any existing throb animations
        if (this.grassButtonThrobTween) {
            this.grassButtonThrobTween.stop();
            this.grassButtonThrobTween = null;
        }
        
        // Reset scale
        btn.container.setScale(1);
        
        // Continuous throb animation (matches lawn mower button style)
        this.grassButtonThrobTween = this.tweens.add({
            targets: btn.container,
            scale: 1.15,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    // ============================================================================
    // STANDARDIZED BUTTON ANIMATIONS (ALL 8 BUTTONS)
    // ============================================================================
    
    /**
     * Standard locked shake animation when player clicks locked/unavailable button
     * Used by ALL buttons when locked or unavailable
     */
    standardLockedShake(btn) {
        if (!btn || !btn.container) return;
        
        audioManager.playLockedThud();
        this.tweens.add({
            targets: btn.container,
            scale: 1.15,
            duration: 100,
            yoyo: true,
            ease: 'Back.easeOut'
        });
    }
    
    /**
     * Standard bounce/prompt animation to indicate button is ready to use
     * Used by ALL buttons to prompt player interaction
     */
    standardBouncePrompt(btn) {
        if (!btn || !btn.container || btn.locked || btn.onCooldown) return;
        
        // Stop any existing animations
        this.tweens.killTweensOf(btn.container);
        this.tweens.killTweensOf(btn.bg);
        
        // Reset scale first
        btn.container.setScale(1);
        
        // Subtle throb animation - gentle in and out
        this.tweens.add({
            targets: btn.container,
            scale: 1.15, // Gentle scale increase
            duration: 600,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: 2, // Throb 3 times
            onComplete: () => {
                btn.container.setScale(1);
            }
        });
        
        // Subtle glow effect on border
        const originalStroke = 0xfcd535;
        const glowStroke = 0xffeb3b; // Softer yellow-green glow
        
        // Gentle color pulse
        this.tweens.addCounter({
            from: 0,
            to: 1,
            duration: 600,
            yoyo: true,
            repeat: 2,
            ease: 'Sine.easeInOut',
            onUpdate: (tween) => {
                const progress = tween.getValue();
                const color = Phaser.Display.Color.Interpolate.ColorWithColor(
                    Phaser.Display.Color.ValueToColor(originalStroke),
                    Phaser.Display.Color.ValueToColor(glowStroke),
                    1,
                    progress
                );
                
                // Redraw button border with interpolated color
                btn.bg.clear();
                btn.bg.fillStyle(0x1a1a1a, 1);
                btn.bg.lineStyle(3, Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1);
                btn.bg.fillCircle(0, 0, 56);
                btn.bg.strokeCircle(0, 0, 56);
            },
            onComplete: () => {
                // Reset to original color
                btn.bg.clear();
                btn.bg.fillStyle(0x1a1a1a, 1);
                btn.bg.lineStyle(3, originalStroke, 1);
                btn.bg.fillCircle(0, 0, 56);
                btn.bg.strokeCircle(0, 0, 56);
            }
        });
    }
    
    /**
     * Standard impact animation when asset lands on button
     * Used by ALL buttons when assets fly in and impact
     */
    standardButtonImpact(btn) {
        if (!btn || !btn.container) return;
        
        // Camera shake
        this.cameras.main.shake(150, 0.003);
        
        // Button impact animation
        this.tweens.add({
            targets: btn.container,
            scale: 1.3,
            duration: 100,
            yoyo: true,
            ease: 'Back.easeOut'
        });
    }
    
    // ============================================================================
    // BUTTON-SPECIFIC BOUNCE FUNCTIONS (Use standardBouncePrompt internally)
    // ============================================================================
    
    bounceLawnMowerButton() {
        // Only bounce if we're in Level 5 and the button exists and is unlocked
        if (this.activeLevel !== 5) return;
        const btn = this.abilityButtons[4]; // Lawn mower button
        this.standardBouncePrompt(btn);
    }

    bounceBoneButton() {
        // Only bounce if we're in Level 8+ and the button exists and is unlocked
        if (this.activeLevel < 8) return;
        const btn = this.abilityButtons[5]; // Bone button
        this.standardBouncePrompt(btn);
    }

    bounceGoldenSheepButton() {
        const btn = this.abilityButtons[0]; // Golden Sheep button (Button 0)
        this.standardBouncePrompt(btn);
    }

    bounceGoldenKeyButton() {
        // Obsolete - Golden Key is now automated
    }

    // OLD IMPLEMENTATION CONTINUES BELOW (TO BE REMOVED)
    _oldBounceBoneButton() {
        // Only bounce if we're in Level 8+ and the button exists and is unlocked
        if (this.activeLevel < 8) return;
        
        const btn = this.abilityButtons[5]; // Bone button
        if (!btn || btn.locked || btn.onCooldown) return;
        
        // Stop any existing animations
        this.tweens.killTweensOf(btn.container);
        this.tweens.killTweensOf(btn.bg);
        
        // Reset scale first
        btn.container.setScale(1);
        
        // Subtle throb animation - gentle in and out (matching lawn mower)
        this.tweens.add({
            targets: btn.container,
            scale: 1.15, // Gentle scale increase
            duration: 600,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: 2, // Throb 3 times
            onComplete: () => {
                btn.container.setScale(1);
            }
        });
        
        // Subtle glow effect on border
        const originalStroke = 0xfcd535;
        const glowStroke = 0xffeb3b; // Softer yellow-green glow
        
        // Gentle color pulse
        this.tweens.addCounter({
            from: 0,
            to: 1,
            duration: 600,
            yoyo: true,
            repeat: 2,
            ease: 'Sine.easeInOut',
            onUpdate: (tween) => {
                const progress = tween.getValue();
                const color = Phaser.Display.Color.Interpolate.ColorWithColor(
                    Phaser.Display.Color.ValueToColor(originalStroke),
                    Phaser.Display.Color.ValueToColor(glowStroke),
                    1,
                    progress
                );
                
                // Redraw button border with interpolated color
                btn.bg.clear();
                btn.bg.fillStyle(0x1a1a1a, 1);
                btn.bg.lineStyle(3, Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1);
                btn.bg.fillCircle(0, 0, 56);
                btn.bg.strokeCircle(0, 0, 56);
            },
            onComplete: () => {
                // Reset to original color
                btn.bg.clear();
                btn.bg.fillStyle(0x1a1a1a, 1);
                btn.bg.lineStyle(3, originalStroke, 1);
                btn.bg.fillCircle(0, 0, 56);
                btn.bg.strokeCircle(0, 0, 56);
            }
        });
    }

    startGrassTuftCooldown() {
        const btn = this.abilityButtons[3]; // Grass tuft button
        if (!btn) return;
        
        // Stop throb animation when cooldown starts
        if (this.grassButtonThrobTween) {
            this.grassButtonThrobTween.stop();
            this.grassButtonThrobTween = null;
            btn.container.setScale(1); // Reset scale
        }
        
        // Start Cooldown Visuals
        btn.onCooldown = true;
        btn.cooldownTimer = btn.maxCooldown;
        btn.icon.setVisible(false);
        if (btn.grassTuftImage) btn.grassTuftImage.setVisible(false);
        if (btn.cdText) btn.cdText.setVisible(true);
        
        // Redraw greyed out
        const radius = 56;
        btn.bg.clear();
        btn.bg.fillStyle(0x1a1a1a, 1);
        btn.bg.lineStyle(2, 0x555555, 1); // Grey border
        btn.bg.fillCircle(0, 0, radius);
        btn.bg.strokeCircle(0, 0, radius);
    }

    startBoneCooldown() {
        const btn = this.abilityButtons[5]; // Bone button
        if (!btn) return;

        btn.onCooldown = true;
        btn.cooldownTimer = btn.maxCooldown;
        if (btn.icon) btn.icon.setVisible(false);
        if (btn.boneIcon) btn.boneIcon.setVisible(false);
        if (btn.cdText) btn.cdText.setVisible(true);

        const radius = 56;
        btn.bg.clear();
        btn.bg.fillStyle(0x1a1a1a, 1);
        btn.bg.lineStyle(2, 0x555555, 1);
        btn.bg.fillCircle(0, 0, radius);
        btn.bg.strokeCircle(0, 0, radius);

        console.log('[HUDScene] Bone button cooldown started');
    }

    startLawnMowerCooldown() {
        const btn = this.abilityButtons[4]; // Lawn mower button
        if (!btn) return;
        
        // Start Cooldown Visuals
        btn.onCooldown = true;
        btn.cooldownTimer = btn.maxCooldown;
        btn.icon.setVisible(false);
        if (btn.lawnMowerImage) btn.lawnMowerImage.setVisible(false);
        if (btn.cdText) btn.cdText.setVisible(true);
        
        // Redraw greyed out
        const radius = 56;
        btn.bg.clear();
        btn.bg.fillStyle(0x111111, 0.8);
        btn.bg.lineStyle(2, 0x555555);
        btn.bg.fillCircle(0, 0, radius);
        btn.bg.strokeCircle(0, 0, radius);

        // Safe audio call with try-catch to avoid Tone.js timing errors
        try {
            audioManager.playClick();
        } catch (e) {
            console.warn('Audio playback error:', e);
        }
        
        // Pulse effect
        this.tweens.add({
            targets: btn.container,
            scale: 0.9,
            duration: 100,
            yoyo: true
        });
    }

    animateLawnMowerToButton(data) {
        // Calculate target position (5th locked button - index 4)
        const spacing = 145;
        const totalWidth = (7 * spacing);
        const buttonRelativeX = -totalWidth / 2 + (4 * spacing);
        const buttonLocalY = 125; // Local Y within control panel container
        
        // Get the control panel container's world position
        const controlsY = CONFIG.height - 200; // Same as in create()
        const panelWorldX = CONFIG.width / 2;
        const panelWorldY = controlsY;
        
        // Calculate button's world position
        const targetX = panelWorldX + buttonRelativeX;
        const targetY = panelWorldY + buttonLocalY;
        
        // Create lawn mower in HUDScene at the exact position from GameScene
        const lawnMower = this.add.image(data.startX, data.startY, 'lawn_mower');
        lawnMower.setScale(data.startScale);
        lawnMower.setRotation(data.startRotation);
        lawnMower.setAlpha(1); // Full visibility during flight
        lawnMower.setDepth(10000); // Very high to be above all HUD elements (call buttons are lower)
        
        // Create wind trail particles following the mower
        const gameScene = this.scene.get('GameScene');
        const windTrail = this.add.particles(data.startX, data.startY, 'dust_particle', {
            speed: { min: 50, max: 100 },
            angle: { min: 160, max: 200 }, // Trail behind
            scale: { start: 0.4, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 800,
            frequency: 40,
            quantity: 2,
            blendMode: 'ADD',
            tint: 0xaaaaaa
        });
        windTrail.setDepth(9999);
        
        // Calculate final rotation to ensure it lands upright (0 or multiple of 2π)
        // Find how many full rotations to make, then land at 0
        const currentRotation = lawnMower.rotation;
        const spins = 2; // Number of full spins during flight
        const targetRotation = Math.floor(currentRotation / (Math.PI * 2)) * (Math.PI * 2) + (spins * Math.PI * 2);
        
        // Fly with dramatic tumbling motion
        this.tweens.add({
            targets: lawnMower,
            x: targetX,
            y: targetY,
            scale: 0.12,
            rotation: targetRotation, // Spin 2 full times and land upright
            duration: 1500,
            ease: 'Cubic.easeOut', // Dramatic deceleration
            onUpdate: () => {
                // Keep wind trail following
                windTrail.setPosition(lawnMower.x - 20, lawnMower.y);
            },
            onComplete: () => {
                // Stop wind trail
                windTrail.stop();
                
                // Play wind gust sound on impact (check mute state)
                if (gameScene.sound.get('wind_gust')) {
                    gameScene.playSound('wind_gust', { volume: 0.2 });
                }
                
                // Impact shake on button
                const btn = this.abilityButtons[4];
                if (btn) {
                    this.cameras.main.shake(150, 0.003);
                    
                    // Button impact animation
                    this.tweens.add({
                        targets: btn.container,
                        scale: 1.3,
                        duration: 100,
                        yoyo: true,
                        ease: 'Quad.easeOut'
                    });
                }
                
                // Unlock the button
                this.unlockAbilityButton(4);
                
                // Create impact dust burst
                const impactDust = this.add.particles(targetX, targetY, 'dust_particle', {
                    speed: { min: 100, max: 200 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 0.6, end: 0 },
                    alpha: { start: 0.8, end: 0 },
                    lifespan: 600,
                    quantity: 15,
                    blendMode: 'ADD',
                    tint: 0xcccccc
                });
                impactDust.setDepth(10001);
                impactDust.explode();
                
                // Mower settles into button with bounce
                this.tweens.add({
                    targets: lawnMower,
                    alpha: 0,
                    scale: 0.18,
                    y: targetY - 10,
                    duration: 400,
                    ease: 'Bounce.easeOut',
                    onComplete: () => {
                        lawnMower.destroy();
                        windTrail.destroy();
                        this.time.delayedCall(800, () => impactDust.destroy());
                    }
                });
            }
        });
    }

    shakeButton(btn) {
        // STANDARD SHAKE ANIMATION for locked/unavailable buttons
        // Used for: locked buttons, count=0 grass, count=0 bones, etc.
        
        if (!btn || !btn.container) return;
        
        // Pop Out (Scale Up)
        this.tweens.add({
            targets: btn.container,
            scale: 1.15,
            duration: 100,
            yoyo: true,
            ease: 'Back.easeOut'
        });

        // Shake (X movement)
        const startX = btn.container.x;
        this.tweens.add({
            targets: btn.container,
            x: startX + 10,
            duration: 50,
            yoyo: true,
            repeat: 3,
            ease: 'Sine.easeInOut',
            onComplete: () => { 
                btn.container.x = startX;
            }
        });
    }

    handleAbilityClick(index) {
        console.log(`🎯 handleAbilityClick called with index: ${index}`);
        
        // ===== DEBOUNCE GUARD: Prevent multiple triggers from single click =====
        const now = this.time.now;
        const debounceKey = `ability_${index}`;
        
        if (!this.abilityClickDebounce) this.abilityClickDebounce = {};
        
        // If clicked within 200ms of last click, ignore
        if (this.abilityClickDebounce[debounceKey] && (now - this.abilityClickDebounce[debounceKey]) < 200) {
            console.log(`🚫 Debounced duplicate click on ability ${index}`);
            return;
        }
        
        // Record this click time
        this.abilityClickDebounce[debounceKey] = now;
        
        const btn = this.abilityButtons[index];
        if (!btn) {
            console.log(`❌ Button ${index} not found`);
            audioManager.playDud();
            return;
        }
        
        console.log(`✅ Button ${index} found, checking special handlers...`);
        
        // SPECIAL HANDLER: Button 7 - Golden Key (Global Unlock)
        if (index === 7) {
            console.log('🔑 GOLDEN KEY BUTTON (INDEX 7) CLICKED!');
            
            // Check if locked
            if (btn.locked) {
                this.standardLockedShake(btn);
                return;
            }
            
            // Check if already unlocked
            if (localStorage.getItem('sheepMarket_globalUnlock') === 'true') {
                console.log('🔑 All levels already unlocked!');
                audioManager.playClick();
                return;
            }
            
            console.log('🔑 UNLOCKING ALL LEVELS 1-12!');
            
            // Set global unlock flag
            localStorage.setItem('sheepMarket_globalUnlock', 'true');
            
            // Play celebratory sound
            audioManager.playCoin();
            
            // Flash button golden
            this.tweens.add({
                targets: btn.container,
                scale: 1.4,
                duration: 150,
                yoyo: true,
                repeat: 3,
                ease: 'Sine.easeInOut'
            });
            
            // Show unlock notification
            const unlockText = this.add.text(CONFIG.width / 2, CONFIG.height / 2 - 100, 'ALL LEVELS UNLOCKED!\nFREE PLAY MODE', {
                font: 'bold 48px Inter',
                fill: '#ffd700',
                align: 'center',
                stroke: '#000000',
                strokeThickness: 8
            }).setOrigin(0.5).setDepth(10002);
            
            this.tweens.add({
                targets: unlockText,
                scale: 1.2,
                alpha: 0,
                y: CONFIG.height / 2 - 200,
                duration: 2000,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    unlockText.destroy();
                }
            });
            
            // Particle celebration
            const celebrationParticles = this.add.particles(CONFIG.width / 2, CONFIG.height / 2, 'sparkle_particle', {
                speed: { min: 200, max: 400 },
                angle: { min: 0, max: 360 },
                scale: { start: 1.0, end: 0 },
                alpha: { start: 1, end: 0 },
                lifespan: 1500,
                quantity: 50,
                blendMode: 'ADD',
                tint: [0xffd700, 0xffed4e, 0xffffff]
            });
            celebrationParticles.setDepth(10003);
            celebrationParticles.explode();
            
            this.time.delayedCall(2000, () => {
                celebrationParticles.destroy();
            });
            
            return; // Exit early - handled
        }
        
        // SPECIAL HANDLER: Button 1 - Golden Clover (Level 10+)
        if (index === 1) {
            console.log('🍀 GOLDEN CLOVER BUTTON (INDEX 1) CLICKED!');
            
            const gameScene = this.scene.get('GameScene');
            
            // Check if locked
            if (btn.locked) {
                this.standardLockedShake(btn);
                return;
            }
            
            // Check if already used this level
            if (btn.usedThisLevel || btn.countdownActive) {
                console.log(`❌ Golden clover already used this level`);
                audioManager.playDud();
                return;
            }
            
            // Check if we're in Level 10+
            if (gameScene.activeLevel < 10 && !this.isEndlessMode) {
                console.log('🍀 Golden clover failed: wrong level');
                audioManager.playDud();
                return;
            }
            
            // Check if market is active
            if (!gameScene.roundActive) {
                console.log('🍀 Golden clover failed: round not active');
                audioManager.playDud();
                return;
            }
            
            // ═══════════════════════════════════════════════════════════════════
            // GOLDEN CLOVER SINGLE-USE CHECK (MAIN GAME vs FREE-PLAY)
            // ═══════════════════════════════════════════════════════════════════
            // Main Game (before Golden Key unlock): Single-use FOREVER
            // Free-Play (after Golden Key unlock): Reusable per level
            // ═══════════════════════════════════════════════════════════════════
            
            const inFreePlayMode = this.goldenKeyActivated && this.allLevelsUnlockedByGoldenKey;
            
            if (!inFreePlayMode) {
                // MAIN GAME MODE: Check if Golden Clover was EVER used
                const goldenCloverUsedMainGame = localStorage.getItem('sheepMarket_goldenCloverUsed') === 'true';
                
                if (goldenCloverUsedMainGame) {
                    console.log('🍀 Golden Clover BLOCKED: Already used in main game (single-use only until Level 12 win)');
                    audioManager.playDud();
                    
                    // Show error message
                    const errorText = this.add.text(CONFIG.width / 2, CONFIG.height / 2, 
                        'GOLDEN CLOVER CONSUMED\n(Unlock all levels to reuse)', {
                        font: 'bold 32px Inter',
                        fill: '#ff6666',
                        stroke: '#000000',
                        strokeThickness: 6,
                        align: 'center'
                    }).setOrigin(0.5).setDepth(10000);
                    
                    this.tweens.add({
                        targets: errorText,
                        alpha: 0,
                        y: CONFIG.height / 2 - 50,
                        duration: 2000,
                        delay: 1000,
                        ease: 'Power2.easeOut',
                        onComplete: () => errorText.destroy()
                    });
                    
                    return; // Block activation
                }
            } else {
                // FREE-PLAY MODE: Check if used this level (reusable per level)
                if (btn.usedThisLevel) {
                    console.log('🍀 Golden Clover BLOCKED: Already used this level (free-play mode: one per level)');
                    audioManager.playDud();
                    return; // Block activation
                }
            }
            
            console.log(`🍀 Golden clover activated! (Mode: ${inFreePlayMode ? 'FREE-PLAY' : 'MAIN GAME'})`);
            
            // Check affordability - cost from config
            const cost = ABILITY_CONFIG.goldenClover.cost;
            if (this.balance < cost) {
                console.log(`❌ Golden clover failed: insufficient wool (need ${cost}W, have ${this.balance}W)`);
                audioManager.playDud();
                this.showBurstText(CONFIG.width / 2, CONFIG.height - 200, "NOT ENOUGH WOOL", "#ff4444");
                return;
            }
            
            // Deduct cost immediately
            this.balance -= cost;
            gameScene.woolBalance -= cost;
            
            // Play satisfying coin sound
            gameScene.playWoolSpendSound(cost);
            
            gameScene.saveBalance();
            
            // Update balance text directly
            if (this.balanceText) {
                this.displayBalance = this.balance;
                this.balanceText.setText(`${this.formatWool(this.balance)}W`);
            }
            
            // Update wool wallet UI directly
            if (this.woolWalletPlaceholders && this.woolWalletPlaceholders.totalBalance) {
                this.woolWalletPlaceholders.totalBalance.setText(`${this.formatWool(this.balance)}W`);
            }
            
            gameScene.events.emit('balance-updated', this.balance);
            
            // Track call spending in lifetime stats
            this.trackCallSpending(cost);
            
            // Mark as used this level
            btn.usedThisLevel = true;
            
            // MAIN GAME MODE: Mark as permanently used (until Golden Key unlock)
            if (!inFreePlayMode) {
                localStorage.setItem('sheepMarket_goldenCloverUsed', 'true');
                console.log('💾 Golden Clover marked as permanently used in main game');
            }
            
            // Activate golden clover percentage bonus in GameScene
            gameScene.events.emit('ability-goldenclover', { cost: cost });
            audioManager.playClick();
            
            // Start countdown overlay (matches level timer)
            btn.countdownActive = true;
            btn.countdownStartTime = gameScene.timeLeft; // Start countdown from current level timer
            
            // Visually gray out button and hide icon
            if (btn.goldenCloverImage) btn.goldenCloverImage.setAlpha(0.3); // Dim the icon
            if (btn.cdText) {
                btn.cdText.setVisible(true);
                btn.cdText.setText(Math.ceil(gameScene.timeLeft).toString()); // Show current time
            }
            
            // Gray out button background
            btn.bg.clear();
            btn.bg.fillStyle(0x2a2a2a, 0.7); // Gray fill
            btn.bg.lineStyle(3, 0xfcd535, 1); // Keep yellow border (unlocked state)
            btn.bg.fillCircle(0, 0, 56);
            btn.bg.strokeCircle(0, 0, 56);
            
            // Button pulse effect
            this.tweens.add({
                targets: btn.container,
                scale: 0.9,
                duration: 100,
                yoyo: true
            });
            
            return; // Exit early - handled
        }
        
        // SPECIAL HANDLERS THAT BYPASS MARKET ACTIVE CHECK (Button 2 - Dog Herding)
        // These need to run even during pre-round or when market is paused
        if (index === 2) {
            console.log('🐕🐕🐕 DOG BUTTON (INDEX 2) CLICKED! 🐕🐕🐕');
            
            // Dog herding ability (Level 7+)
            const gameScene = this.scene.get('GameScene');
            
            console.log('🐕 Dog herding button clicked', { 
                roundActive: gameScene.roundActive, 
                level: gameScene.activeLevel,
                finalCallSide: gameScene.finalCallSide,
                locked: btn.locked,
                onCooldown: btn.onCooldown
            });
            
            // Check cooldown first
            if (btn.onCooldown) {
                console.log(`❌ Dog button on cooldown: ${Math.ceil(btn.cooldownTimer / 1000)}s remaining`);
                audioManager.playDud();
                return;
            }
            
            // Check if locked
            if (btn.locked) {
                this.standardLockedShake(btn);
                return;
            }
            
            // Check if we're in Level 7+ (ALWAYS ALLOW in levels 7-12) OR endless mode
            if (gameScene.activeLevel < 7 && !this.isEndlessMode) {
                console.log('🐕 Dog herding failed: wrong level');
                audioManager.playDud();
                return;
            }
            
            console.log('🐕 Dog herding activated!');
            
            // Check affordability - cost from config
            const cost = ABILITY_CONFIG.herdDog.cost;
            if (this.balance < cost) {
                console.log(`❌ Dog herding failed: insufficient wool (need ${cost}W, have ${this.balance}W)`);
                audioManager.playDud();
                this.showBurstText(CONFIG.width / 2, CONFIG.height - 200, "NOT ENOUGH WOOL", "#ff4444");
                return;
            }
            
            // Deduct cost immediately
            this.balance -= cost;
            gameScene.woolBalance -= cost;
            
            // Play satisfying coin sound
            gameScene.playWoolSpendSound(cost);
            
            gameScene.saveBalance();
            
            // Update balance text directly
            if (this.balanceText) {
                this.displayBalance = this.balance;
                this.balanceText.setText(`${this.formatWool(this.balance)}W`);
            }
            
            // Update wool wallet UI directly
            if (this.woolWalletPlaceholders && this.woolWalletPlaceholders.totalBalance) {
                this.woolWalletPlaceholders.totalBalance.setText(`${this.formatWool(this.balance)}W`);
            }
            
            gameScene.events.emit('balance-updated', this.balance);
            
            // Track call spending in lifetime stats
            this.trackCallSpending(cost);
            
            // Emit the herding event
            gameScene.events.emit('ability-herd-dog', { cost: cost });
            audioManager.playClick();
            
            // Cooldown will start AFTER dog returns (handled in GameScene stopHerding)
            
            return; // Exit early - handled
        }
        
        // ═══════════════════════════════════════════════════════════════════
        // ═══════════════════════════════════════════════════════════════════
        // SPECIAL HANDLER: Button 6 - Black Sheep (Level 10+)
        // PLAYER-PLACED with 15-second effect + countdown display
        // ═══════════════════════════════════════════════════════════════════
        if (index === 6) {
            console.log('🐑 BLACK SHEEP BUTTON (INDEX 6) CLICKED - PLACEMENT MODE!');
            
            const gameScene = this.scene.get('GameScene');
            
            console.log('🐑 Black Sheep Button State:', {
                locked: btn.locked,
                usedThisLevel: btn.usedThisLevel,
                roundActive: gameScene?.roundActive,
                level: gameScene?.activeLevel
            });
            
            // Check if locked
            if (btn.locked) {
                this.standardLockedShake(btn);
                return;
            }
            
            // Check if already used this level (once-per-level limit)
            if (btn.usedThisLevel) {
                console.log(`❌ Black sheep already used this level`);
                audioManager.playDud();
                this.shakeButton(btn);
                return;
            }
            
            // Check if round is active (must be during active gameplay)
            if (!gameScene.roundActive) {
                console.log('🐑 Black sheep failed: round not active');
                audioManager.playDud();
                return;
            }
            
            // Check if player is in free play mode (won Level 12)
            const inFreePlayMode = this.goldenKeyActivated && this.allLevelsUnlockedByGoldenKey;
            
            // Check if we're in Level 10+ OR free play mode (Black sheep available from Level 10 onward)
            if (gameScene.activeLevel < 10 && !inFreePlayMode && !this.isEndlessMode) {
                console.log('🐑 Black sheep failed: requires Level 10+ or free play mode');
                audioManager.playDud();
                return;
            }
            
            console.log('🐑✅ BLACK SHEEP PLACEMENT MODE ACTIVATED!');
            
            // Enter placement mode in GameScene
            gameScene.enterBlackSheepPlacementMode();
            audioManager.playClick();
            
            // Mark as used this level immediately (prevents double-click)
            btn.usedThisLevel = true;
            
            // Start countdown overlay (15 seconds from placement, synced to level timer)
            btn.countdownActive = true;
            btn.countdownStartTime = gameScene.timeLeft; // Will start counting when placed
            
            // Keep button interactive during placement, dim slightly
            if (btn.blackSheepImage) btn.blackSheepImage.setAlpha(0.6); // Dim during placement
            if (btn.blackSheepBorder) btn.blackSheepBorder.setAlpha(0.6);
            
            // Visual feedback - button dimmed but not fully grayed
            btn.bg.clear();
            btn.bg.fillStyle(0x3a3a3a, 0.9); // Slightly dim
            btn.bg.lineStyle(3, 0xfcd535, 1); // Keep yellow border
            btn.bg.fillCircle(0, 0, 56);
            btn.bg.strokeCircle(0, 0, 56);
            
            console.log('🐑 Waiting for player to place Black Sheep in pasture...');
            
            return; // Exit early - handled
        }
        
        // STANDARD MARKET ACTIVE CHECK (for all other buttons)
        if (this.isPaused || !this.isMarketActive) {
            audioManager.playDud();
            return;
        }
        
        if (btn.onCooldown) {
            console.log(`❌ Button ${index} on cooldown: ${Math.ceil(btn.cooldownTimer / 1000)}s remaining`);
            audioManager.playDud();
            return;
        }

        // LOCKED BUTTON LOGIC
        if (btn.locked) {
            audioManager.playLockedThud();
            
            // Shake the button to indicate locked (STANDARD SHAKE)
            this.shakeButton(btn);
            
            return;
        }

        // Trigger Ability
        let eventName, cost;
        
        if (index === 0) {
            eventName = 'ability-whistle';
            cost = 50;
        } else if (index === 1) {
            eventName = 'ability-dog';
            cost = 75;
        } else if (index === 3) {
            // Grass tuft ability
            const gameScene = this.scene.get('GameScene');
            
            // Check if player is in free play mode (won Level 12)
            const inFreePlayMode = this.goldenKeyActivated && this.allLevelsUnlockedByGoldenKey;
            
            // Check if in Level 5-12 (grazing levels) OR free play mode
            if (!inFreePlayMode && (gameScene.activeLevel < 5 || gameScene.activeLevel > 12)) {
                audioManager.playDud();
                return;
            }
            
            // LEVEL 6-12 OR FREE PLAY: Place grass to lure sheep
            if (gameScene.activeLevel >= 6 || inFreePlayMode) {
                // Stop throb animation on first click
                if (this.grassButtonThrobTween) {
                    this.grassButtonThrobTween.stop();
                    this.grassButtonThrobTween = null;
                    btn.container.setScale(1); // Reset scale
                }
                
                // Check if player has any grass (grassCount must be > 0)
                const grassCount = gameScene.collectedGrassCount || 0;
                if (grassCount <= 0) {
                    console.log('🌱 No grass available to place');
                    audioManager.playDud();
                    
                    // Shake the button to indicate can't use (STANDARD SHAKE)
                    this.shakeButton(btn);
                    
                    return;
                }
                
                // Check affordability - cost from config
                cost = ABILITY_CONFIG.grass.cost;
                if (this.balance < cost) {
                    console.log(`❌ Grass placement failed: insufficient wool (need ${cost}W, have ${this.balance}W)`);
                    audioManager.playDud();
                    this.showBurstText(CONFIG.width / 2, CONFIG.height - 200, "NOT ENOUGH WOOL", "#ff4444");
                    return;
                }
                
                // Enable grass placement mode (cost will be deducted when grass is placed)
                gameScene.events.emit('enable-grass-placement');
                audioManager.playClick();
                
                return; // Don't process cost/cooldown yet - wait for placement
            }
            
            // LEVEL 5: Remove one random grass tuft instantly for 15 wool
            // Check if there are any grass tufts
            if (!gameScene.grassTufts || gameScene.grassTufts.length === 0) {
                audioManager.playDud();
                return;
            }
            
            // Check affordability
            cost = 15;
            if (this.balance < cost) {
                audioManager.playDud();
                return;
            }
            
            // Deduct cost immediately
            this.balance -= cost;
            gameScene.woolBalance -= cost;
            
            // Play satisfying coin sound
            gameScene.playWoolSpendSound(cost);
            
            gameScene.saveBalance();
            this.events.emit('balance-updated', this.balance);
            
            // Track call spending in lifetime stats
            this.trackCallSpending(cost);
            
            // Remove one random grass tuft
            const randomTuft = Phaser.Utils.Array.GetRandom(gameScene.grassTufts);
            if (randomTuft && randomTuft.sprite && randomTuft.sprite.active) {
                // Animate grass disappearing
                this.tweens.add({
                    targets: randomTuft.sprite,
                    scale: 0,
                    alpha: 0,
                    duration: 300,
                    ease: 'Back.easeIn',
                    onComplete: () => {
                        randomTuft.sprite.destroy();
                        randomTuft.eaten = true;
                        
                        // Remove from array
                        const index = gameScene.grassTufts.indexOf(randomTuft);
                        if (index > -1) {
                            gameScene.grassTufts.splice(index, 1);
                        }
                    }
                });
                
                // Play sound
                audioManager.playClick();
                
                // Show success message
                this.showBurstText(CONFIG.width / 2, CONFIG.height / 2 - 100, "Grass removed!", "#44ff44");
            }
            
            // Start cooldown
            btn.onCooldown = true;
            btn.cooldownTimer = btn.maxCooldown;
            btn.icon.setVisible(false);
            if (btn.grassTuftImage) btn.grassTuftImage.setVisible(false);
            if (btn.cdText) btn.cdText.setVisible(true);
            btn.bg.lineStyle(2, 0x555555, 1); // Grey out border
            btn.bg.strokeCircle(0, 0, 56);
            
            return;
        } else if (index === 4) {
            // Lawn mower ability - Enable grass selection mode
            const gameScene = this.scene.get('GameScene');
            
            // Mark that lawn mower has been clicked (prevents "CLICK ME!" from showing again)
            this.lawnMowerHasBeenClicked = true;
            
            // Check if player is in free play mode (won Level 12)
            const inFreePlayMode = this.goldenKeyActivated && this.allLevelsUnlockedByGoldenKey;
            
            // Check if in Level 5-12 (grazing levels) OR free play mode
            if (!inFreePlayMode && (gameScene.activeLevel < 5 || gameScene.activeLevel > 12)) {
                audioManager.playDud();
                return;
            }
            
            // Check if there are any grass tufts
            if (!gameScene.grassTufts || gameScene.grassTufts.length === 0) {
                audioManager.playDud();
                return;
            }
            
            // Enable grass selection mode
            gameScene.events.emit('enable-grass-selection');
            audioManager.playClick();
            
            return; // Don't process cost/cooldown yet - wait for grass selection
        } else if (index === 5) {
            // Bone placement ability (Level 7+) - Place bone to distract wolves
            const gameScene = this.scene.get('GameScene');
            
            // Check if in Level 7-12 OR endless mode
            if (!this.isEndlessMode && (gameScene.activeLevel < 7 || gameScene.activeLevel > 12)) {
                audioManager.playDud();
                return;
            }
            
            // Check if player has any bones (boneCount must be > 0)
            const boneCount = gameScene.collectedBonesCount || 0;
            if (boneCount <= 0) {
                console.log('🦴 No bones available to place');
                audioManager.playDud();
                
                // Shake the button to indicate can't use (STANDARD SHAKE)
                this.shakeButton(btn);
                
                return;
            }
            
            // Check affordability - cost from config
            const boneCost = ABILITY_CONFIG.bone.cost;
            if (this.balance < boneCost) {
                console.log(`❌ Bone placement failed: insufficient wool (need ${boneCost}W, have ${this.balance}W)`);
                audioManager.playDud();
                this.showBurstText(CONFIG.width / 2, CONFIG.height - 200, "NOT ENOUGH WOOL", "#ff4444");
                return;
            }
            
            // Enable bone placement mode (similar to grass placement)
            gameScene.events.emit('enable-bone-placement');
            audioManager.playClick();
            
            return; // Don't process cost/cooldown yet - wait for bone placement
        } else {
            // Unknown button
            audioManager.playDud();
            return;
        }

        // Affordability Check (for non-lawn mower abilities)
        if (this.balance < cost) {
            audioManager.playDud();
            this.showBurstText(CONFIG.width / 2, CONFIG.height - 200, "NOT ENOUGH WOOL", "#ff4444");
            return;
        }
        
        // ===== REGISTER WHISTLE CALL (Global System) =====
        // If this is the whistle ability (index 0), register the call
        if (index === 0) {
            const callRegistered = whistleCallSystem.registerCall();
            if (callRegistered) {
                console.log('✅ Whistle call registered successfully');
            }
        }
        
        this.scene.get('GameScene').events.emit(eventName, { cost });

        // Start Cooldown Visuals
        btn.onCooldown = true;
        btn.cooldownTimer = btn.maxCooldown;
        btn.icon.setVisible(false);
        if (btn.lawnMowerImage) btn.lawnMowerImage.setVisible(false);
        if (btn.cdText) btn.cdText.setVisible(true);
        btn.bg.lineStyle(2, 0x555555, 1); // Grey out border
        btn.bg.fillStyle(0x333333, 1); // Grey out fill
        
        // Redraw greyed out
        const radius = 56; // Reduced size
        btn.bg.clear();
        btn.bg.fillStyle(0x111111, 0.8);
        btn.bg.lineStyle(2, 0x555555);
        btn.bg.fillCircle(0, 0, radius);
        btn.bg.strokeCircle(0, 0, radius);

        audioManager.playClick();
        
        // Pulse effect
        this.tweens.add({
            targets: btn.container,
            scale: 0.9,
            duration: 100,
            yoyo: true
        });
    }

    handleBetInteraction(btn, container, side, x) {
        // ===== HARD DEBOUNCE GUARD: Prevent duplicate triggers =====
        const now = this.time.now;
        const debounceKey = `bet_${side}`;
        
        if (!this.betClickDebounce) this.betClickDebounce = {};
        
        // If clicked within 300ms of last click on this side, ignore
        if (this.betClickDebounce[debounceKey] && (now - this.betClickDebounce[debounceKey]) < 300) {
            console.log(`🚫 DEBOUNCED: Duplicate bet click on ${side} prevented`);
            return;
        }
        
        // Record this click time
        this.betClickDebounce[debounceKey] = now;
        console.log(`✅ BET ACCEPTED: ${side} at ${now}`);
        
        if (this.isPaused || this.isControlsLocked) return;
        
        // ===== TUTORIAL STEP 2 =====
        if (this.isTutorialActive && this.tutorialWaitingForBet) {
            if (side === 'RIGHT') {
                audioManager.playDud();
                return; // block wrong input
            }
            if (side === 'LEFT') {
                this.tutorialWaitingForBet = false;
                this.time.delayedCall(800, () => {
                    this.advanceTutorialStep(4);
                });
                // IMPORTANT: DO NOT RETURN
                // allow normal flow → buy-order must fire
            }
        }
        
        // ===== SPAM PREVENTION CHECK =====
        // Clean up old timestamps outside the window
        this.recentCallTimestamps = this.recentCallTimestamps.filter(timestamp => 
            (now - timestamp) < this.callSpamWindow
        );
        
        // Check if player has exceeded the limit
        if (this.recentCallTimestamps.length >= this.callSpamLimit) {
            // Player is spamming - block the call
            console.log(`🚫 SPAM BLOCKED: ${this.recentCallTimestamps.length} calls in last ${this.callSpamWindow}ms`);
            
            // Play dud sound
            audioManager.playDud();
            
            // Show random witty message - only if no spam message is currently active
            if (!this.activeSpamMessage) {
                this.activeSpamMessage = true;
                const randomMessage = this.spamMessages[Math.floor(Math.random() * this.spamMessages.length)];
                this.showSpamWarningMessage(CONFIG.width / 2, CONFIG.height / 2 - 100, randomMessage, "#ff4444");
                
                // Clear the flag after message completes (3.5 seconds total)
                this.time.delayedCall(3500, () => {
                    this.activeSpamMessage = false;
                });
            }
            
            // Shake the button
            this.tweens.add({
                targets: btn,
                x: x + 10,
                duration: 50,
                yoyo: true,
                repeat: 3,
                onComplete: () => { btn.x = x; }
            });
            
            return; // Block the call
        }
        
        // Record this call timestamp
        this.recentCallTimestamps.push(now);
        console.log(`✅ CALL RECORDED: ${this.recentCallTimestamps.length}/${this.callSpamLimit} in window`);
        
        // Get current entry price for this side (0-10W scale)
        // CRITICAL: Use the DISPLAYED rounded price (1 decimal) to match what player sees
        const rawPrice = side === 'LEFT' ? this.currentLeftPrice : this.currentRightPrice;
        const entryPrice = Math.round(rawPrice * 10) / 10; // Round to 1 decimal place
        console.log(`💰 ${side} Call - Raw Price: ${rawPrice.toFixed(4)}W → Charged: ${entryPrice.toFixed(1)}W`);
        
        // ZERO PRICE CHECK - Prevent calls when price is at 0
        if (entryPrice < 0.01) {
            audioManager.playDud();
            this.showReactionText(CONFIG.width / 2, CONFIG.height / 2 - 100, "No sheep on this side!", "#ff4444");
            this.tweens.add({
                targets: btn,
                x: x + 10,
                duration: 50,
                yoyo: true,
                repeat: 3,
                onComplete: () => { btn.x = x; }
            });
            return;
        }
        
        // COOLDOWN CHECK
        console.log('🔒 Cooldown check - Active:', this.callCooldownActive);
        if (this.callCooldownActive) {
            // Show feedback message
            const messages = [
                "Easy there, Shepherd…",
                "The flock needs a moment.",
                "You're rattling the sheep."
            ];
            const msg = messages[Math.floor(Math.random() * messages.length)];
            this.showReactionText(CONFIG.width / 2, CONFIG.height / 2 - 100, msg, "#ff8844");
            audioManager.playDud();
            console.log('❌ Call blocked by cooldown');
            return;
        }
        
        // FINAL CALL LOCK (5 seconds remaining)
        if (this.timeLeft <= 5) {
            if (!this.finalCallLockShown) {
                this.showReactionText(CONFIG.width / 2, CONFIG.height / 2 - 100, "Final call locked.", "#fcd535");
                this.finalCallLockShown = true;
            }
            audioManager.playDud();
            return;
        } 

        // Extraneous tutorial logic removed

        const isDisabled = (side === 'LEFT' ? this.isLeftDisabled : this.isRightDisabled);
        
        const availableBalance = this.balance;
        let wagerAmount = this.orderAmount;
        
        // CRITICAL: Block all calls when balance is 0W
        if (availableBalance <= 0) {
            console.log('🚫 CALL BLOCKED: Balance is 0W - insufficient funds');
            audioManager.playDud();
            this.showReactionText(CONFIG.width / 2, CONFIG.height / 2 - 100, "INSUFFICIENT WOOL!", "#ff4444");
            this.tweens.add({
                targets: btn,
                x: x + 10,
                duration: 50,
                yoyo: true,
                repeat: 3,
                onComplete: () => { btn.x = x; }
            });
            return;
        }
        
        // Check affordability
        if (availableBalance < entryPrice - 0.001) {
            audioManager.playDud();
            this.tweens.add({
                targets: btn,
                x: x + 10,
                duration: 50,
                yoyo: true,
                repeat: 3,
                onComplete: () => { btn.x = x; }
            });
            return;
        }

        // Haptic Feedback
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }

        console.log('📞 Call placed:', side, 'Entry Price:', entryPrice.toFixed(2) + 'W');

        // === EMERGENCY WOOL SYSTEM ===
        // Player has successfully placed a call and is no longer stuck
        // Emergency wool will trigger again if balance reaches 0 with no calls

        // Emit buy order with new call format
        this.scene.get('GameScene').events.emit('buy-order', {
            side,
            entryPrice: entryPrice
        });
        
        // ===== INCREMENT CALL COUNTER (CENTRALIZED) =====
        // This is the ONLY place the counter increments
        // One click = one call = +1 to counter
        this.incrementCallCounter(side);
        
        this.orderAmount = null;
        this.updateAmountButtons();
        this.updateAmountLabel();

        audioManager.playTrade();
        audioManager.playCall(); 
        this.tweens.add({ targets: btn, scale: 0.94, duration: 50, yoyo: true });
        
        const woolIcon = this.add.image(btn.x + container.x, btn.y + container.y, 'wool')
            .setScale(0.1)
            .setDepth(200);
        this.tweens.add({
            targets: woolIcon,
            y: woolIcon.y - 150,
            alpha: 0,
            scale: 0.2,
            duration: 600,
            onComplete: () => woolIcon.destroy()
        });
    }
    
    dimCallButtons() {
        // Dim both CALL buttons visually during cooldown
        if (this.leftBtnContainer) {
            this.tweens.add({
                targets: this.leftBtnContainer,
                alpha: 0.4,
                duration: 200,
                ease: 'Power2'
            });
        }
        if (this.rightBtnContainer) {
            this.tweens.add({
                targets: this.rightBtnContainer,
                alpha: 0.4,
                duration: 200,
                ease: 'Power2'
            });
        }
    }
    
    restoreCallButtons() {
        // Restore normal appearance after cooldown
        if (this.leftBtnContainer) {
            this.tweens.add({
                targets: this.leftBtnContainer,
                alpha: 1,
                duration: 200,
                ease: 'Power2'
            });
        }
        if (this.rightBtnContainer) {
            this.tweens.add({
                targets: this.rightBtnContainer,
                alpha: 1,
                duration: 200,
                ease: 'Power2'
            });
        }
    }
    
    showPriceMultiplierIndicator(side, multiplier) {
        // Show a brief visual indicator that the price is increased due to rapid calling
        const btnContainer = side === 'LEFT' ? this.leftBtnContainer : this.rightBtnContainer;
        if (!btnContainer) return;
        
        // Calculate percentage increase
        const percentIncrease = Math.round((multiplier - 1.0) * 100);
        
        // Create indicator text above the button
        const indicator = this.add.text(
            btnContainer.x, 
            btnContainer.y - 100, 
            `+${percentIncrease}% COST`,
            {
                font: '900 32px Inter',
                fill: '#ff4444',
                stroke: '#000000',
                strokeThickness: 6
            }
        ).setOrigin(0.5).setDepth(250);
        
        // Animate in and out
        indicator.setScale(0.5);
        indicator.setAlpha(0);
        
        this.tweens.add({
            targets: indicator,
            scale: 1.2,
            alpha: 1,
            y: btnContainer.y - 120,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Hold briefly, then fade out
                this.tweens.add({
                    targets: indicator,
                    alpha: 0,
                    y: btnContainer.y - 140,
                    delay: 600,
                    duration: 400,
                    onComplete: () => indicator.destroy()
                });
            }
        });
        
        // Also flash the button with red tint
        this.tweens.add({
            targets: btnContainer,
            alpha: 0.6,
            duration: 100,
            yoyo: true,
            repeat: 2
        });
    }
    
    createToolkitButton() {
        // Create toolkit button in top right (replaces reset button, left of leaderboard)
        // Matches style of other top-right buttons (pause, leaderboard, mute)
        const toolkitBtn = this.add.image(CONFIG.width - 420, 70, 'toolkit_icon')
            .setOrigin(0.5)
            .setScale(0.5)
            .setInteractive({ useHandCursor: true });
        
        // Click handler
        toolkitBtn.on('pointerdown', () => {
            audioManager.playClick();
            this.showToolkitModal();
            this.tweens.add({ targets: toolkitBtn, scale: 0.45, duration: 50, yoyo: true, onComplete: () => {
                toolkitBtn.setScale(0.5);
            }});
        });
        
        this.toolkitBtn = toolkitBtn;
    }
    
    showToolkitModal() {
        // Set overlay guard
        this.uiOverlayOpen = true;

        // Pause the game and freeze sheep movement
        const gameScene = this.scene.get('GameScene');
        if (gameScene) {
            if (gameScene.timerEvent) {
                gameScene.timerEvent.paused = true;
                gameScene.roundActive = false;
            }
            // Pause the entire GameScene to freeze sheep movement
            gameScene.scene.pause();
        }
        
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.8);
        overlay.fillRect(0, 0, width, height);
        overlay.setDepth(10000);
        overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
        
        // Modal Background - Wooden Style
        const modalWidth = 900;
        const modalHeight = 700;
        const modalX = width / 2;
        const modalY = height / 2;
        
        const modalBg = this.add.graphics();
        
        // Outer shadow for depth
        modalBg.fillStyle(0x3E2723, 0.8);
        modalBg.fillRoundedRect(modalX - modalWidth/2 + 8, modalY - modalHeight/2 + 8, modalWidth, modalHeight, 15);
        
        // Main wooden board - medium brown
        modalBg.fillStyle(0x6D4C41, 1);
        modalBg.fillRoundedRect(modalX - modalWidth/2, modalY - modalHeight/2, modalWidth, modalHeight, 15);
        
        // Wood grain effect - darker brown horizontal lines
        modalBg.lineStyle(2, 0x5D4037, 0.4);
        for (let i = 0; i < 15; i++) {
            const yPos = modalY - modalHeight/2 + (i * 50);
            modalBg.lineBetween(modalX - modalWidth/2 + 20, yPos, modalX + modalWidth/2 - 20, yPos);
        }
        
        // Darker wooden frame border
        modalBg.lineStyle(8, 0x4E342E, 1);
        modalBg.strokeRoundedRect(modalX - modalWidth/2, modalY - modalHeight/2, modalWidth, modalHeight, 15);
        
        // Inner lighter wood trim
        modalBg.lineStyle(3, 0x8D6E63, 1);
        modalBg.strokeRoundedRect(modalX - modalWidth/2 + 12, modalY - modalHeight/2 + 12, modalWidth - 24, modalHeight - 24, 12);
        
        // Corner "nails" - metallic rivets
        const nailPositions = [
            [modalX - modalWidth/2 + 30, modalY - modalHeight/2 + 30],
            [modalX + modalWidth/2 - 30, modalY - modalHeight/2 + 30],
            [modalX - modalWidth/2 + 30, modalY + modalHeight/2 - 30],
            [modalX + modalWidth/2 - 30, modalY + modalHeight/2 - 30]
        ];
        
        nailPositions.forEach(([x, y]) => {
            // Nail head - dark metal
            modalBg.fillStyle(0x424242, 1);
            modalBg.fillCircle(x, y, 6);
            // Nail shine
            modalBg.fillStyle(0x757575, 1);
            modalBg.fillCircle(x - 2, y - 2, 2);
        });
        
        modalBg.setDepth(10001);
        
        // Title on wooden sign plaque
        const titleBg = this.add.graphics();
        titleBg.fillStyle(0x8D6E63, 1);
        titleBg.lineStyle(3, 0x5D4037, 1);
        titleBg.fillRoundedRect(modalX - 300, modalY - modalHeight/2 + 20, 600, 70, 10);
        titleBg.strokeRoundedRect(modalX - 300, modalY - modalHeight/2 + 20, 600, 70, 10);
        titleBg.setDepth(10002);
        
        const title = this.add.text(modalX, modalY - modalHeight/2 + 55, "SHEPHERD'S TOOLKIT", {
            font: '900 42px Inter',
            fill: '#FFF8DC', // Cornsilk - light wood color
            stroke: '#3E2723',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(10003);
        
        // Toolkit Content with Images
        const toolkitAssets = [
            {
                name: 'LAWN MOWER',
                image: 'assets/lawn-mower.webp.webp',
                description: 'Keep the pasture neat. Cut the grass so your sheep don\'t get distracted by a tasty snack.'
            },
            {
                name: 'GRASS TUFT',
                image: 'assets/grass-tuft-particle.webp',
                description: 'A little temptation goes a long way. Place this to guide sheep exactly where you want them.'
            },
            {
                name: 'BONE',
                emoji: '🦴',
                description: 'Wolves love it, sheep ignore it. Drop a bone to keep predators busy and your flock safe.'
            },
            {
                name: 'DOG',
                image: 'assets/sheepdog_running_fixed.webp.webp',
                description: 'Your loyal herder. Follows your call, chases wolves when danger strikes, then gets back to business.'
            },
            {
                name: 'BLACK SHEEP',
                image: CONFIG.assets.sheep, // Uses sheep image with black tint
                tint: '#0a0a0a',
                description: 'The rebel of the flock. Freeze nearby sheep for 15 seconds to lock them safely on your chosen side.'
            },
            {
                name: 'GOLDEN CLOVER',
                image: 'assets/golden-clover.webp.webp',
                description: 'A lucky surprise. Gives the player a random WOOL boost, could be small or HUGE.'
            },
            {
                name: 'GOLDEN SHEEP',
                image: 'assets/golden-sheep-with-key.webp.webp',
                description: 'A shining savior. Wipes out wolves, clears bad weather, and brings fallen sheep back to life.'
            },
            {
                name: 'GOLDEN KEY',
                image: 'assets/golden-key-icon.webp.webp',
                description: 'The ultimate prize. Unlocks all levels for replay and declares you the undisputed Ruler of the Patsure.'
            }
        ];
        
        // Create scrollable text area using DOM element - parchment style
        const scrollDiv = document.createElement('div');
        scrollDiv.style.width = '820px';
        scrollDiv.style.height = '450px';
        scrollDiv.style.overflowY = 'scroll';
        scrollDiv.style.padding = '25px';
        scrollDiv.style.backgroundColor = '#F5E6D3'; // Parchment/old paper color
        scrollDiv.style.border = '4px solid #8D6E63'; // Medium wood border
        scrollDiv.style.borderRadius = '8px';
        scrollDiv.style.boxShadow = 'inset 0 0 20px rgba(139, 69, 19, 0.2)'; // Inner shadow for aged paper look
        scrollDiv.style.color = '#3E2723'; // Dark brown text
        scrollDiv.style.fontSize = '32px';
        scrollDiv.style.fontFamily = 'Inter, sans-serif';
        scrollDiv.style.fontWeight = '900'; // Bold
        scrollDiv.style.lineHeight = '1.6';
        scrollDiv.style.textAlign = 'left';
        
        // Build HTML content with images
        let htmlContent = '';
        toolkitAssets.forEach((asset, index) => {
            // Determine icon content (image or emoji)
            let iconContent = '';
            if (asset.emoji) {
                iconContent = `<div style="font-size: 80px;">${asset.emoji}</div>`;
            } else if (asset.image) {
                const imgFilter = asset.tint ? `filter: brightness(0.3);` : ''; // Darken for black sheep
                iconContent = `<img src="${asset.image}" style="width: 120px; height: 120px; object-fit: contain; ${imgFilter}" />`;
            }
            
            htmlContent += `
                <div style="display: flex; align-items: flex-start; margin-bottom: 30px; background: rgba(255, 248, 220, 0.5); padding: 15px; border-radius: 10px; border: 2px solid #8D6E63;">
                    <div style="flex-shrink: 0; width: 140px; height: 140px; display: flex; align-items: center; justify-content: center; background: rgba(141, 110, 99, 0.2); border-radius: 10px; margin-right: 20px;">
                        ${iconContent}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 36px; font-weight: 900; color: #8B0000; margin-bottom: 8px;">${asset.name}</div>
                        <div style="font-size: 28px; font-weight: 700; color: #3E2723; line-height: 1.4;">${asset.description}</div>
                    </div>
                </div>
            `;
        });
        
        scrollDiv.innerHTML = htmlContent;
        
        const scrollElement = this.add.dom(modalX, modalY + 20, scrollDiv);
        scrollElement.setDepth(10002);
        
        // Close button - positioned at bottom of modal (wooden style matching landing page)
        const closeBtnContainer = this.add.container(modalX, modalY + modalHeight/2 - 50).setDepth(10004);
        
        const closeBtnBg = this.add.graphics();
        // Shadow
        closeBtnBg.fillStyle(0x3E2723, 0.6);
        closeBtnBg.fillRoundedRect(-98, -28, 200, 60, 12);
        // Main wood
        closeBtnBg.fillStyle(0x8D6E63, 1);
        closeBtnBg.fillRoundedRect(-100, -30, 200, 60, 12);
        // Dark border
        closeBtnBg.lineStyle(4, 0x5D4037, 1);
        closeBtnBg.strokeRoundedRect(-100, -30, 200, 60, 12);
        
        const closeBtnText = this.add.text(0, 0, 'CLOSE', {
            font: '900 32px Inter',
            fill: '#FFF8DC',
            stroke: '#3E2723',
            strokeThickness: 5
        }).setOrigin(0.5);
        
        closeBtnContainer.add([closeBtnBg, closeBtnText]);
        
        // Make close button interactive
        const closeBtnHitArea = new Phaser.Geom.Rectangle(-100, -30, 200, 60);
        closeBtnContainer.setInteractive(closeBtnHitArea, Phaser.Geom.Rectangle.Contains);
        
        closeBtnContainer.on('pointerover', () => {
            closeBtnContainer.setScale(1.08);
            closeBtnBg.clear();
            // Lighter wood on hover
            closeBtnBg.fillStyle(0x3E2723, 0.6);
            closeBtnBg.fillRoundedRect(-98, -28, 200, 60, 12);
            closeBtnBg.fillStyle(0xA1887F, 1);
            closeBtnBg.fillRoundedRect(-100, -30, 200, 60, 12);
            closeBtnBg.lineStyle(4, 0x5D4037, 1);
            closeBtnBg.strokeRoundedRect(-100, -30, 200, 60, 12);
        });
        
        closeBtnContainer.on('pointerout', () => {
            closeBtnContainer.setScale(1);
            closeBtnBg.clear();
            // Reset to normal wood
            closeBtnBg.fillStyle(0x3E2723, 0.6);
            closeBtnBg.fillRoundedRect(-98, -28, 200, 60, 12);
            closeBtnBg.fillStyle(0x8D6E63, 1);
            closeBtnBg.fillRoundedRect(-100, -30, 200, 60, 12);
            closeBtnBg.lineStyle(4, 0x5D4037, 1);
            closeBtnBg.strokeRoundedRect(-100, -30, 200, 60, 12);
        });
        
        closeBtnContainer.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
            audioManager.playClick();
            
            // Resume game and unfreeze sheep movement
            if (gameScene) {
                if (gameScene.timerEvent) {
                    gameScene.timerEvent.paused = false;
                    gameScene.roundActive = true;
                }
                // Resume the GameScene to unfreeze sheep movement
                gameScene.scene.resume();
            }
            
            // Destroy all modal elements
            overlay.destroy();
            modalBg.destroy();
            titleBg.destroy();
            title.destroy();
            scrollElement.destroy();
            closeBtnContainer.destroy();

            // Clear overlay guard after small delay to prevent ghost clicks
            this.time.delayedCall(150, () => {
                this.uiOverlayOpen = false;
            });
        });
    }

    /**
     * Helper to ensure audio is unlocked on first user gesture
     */
    ensureAudioUnlocked() {
        if (this._audioUnlocked) return;
        this._audioUnlocked = true;
        audioManager.unlockAudio();
    }

    createImmersiveBetBtn(container, side, x, y, w, h, color) {
        const btn = this.add.container(x, y);
        const colorNum = parseInt(color.replace('#', '0x'));
        
        // Store container reference for visual disabling
        if (side === 'LEFT') {
            this.leftBtnContainer = btn;
        } else {
            this.rightBtnContainer = btn;
        }
        
        // Button Base
        const bg = this.add.graphics();
        bg.fillStyle(0x23272c, 1);
        bg.lineStyle(4, 0x3d4148);
        bg.fillRoundedRect(-w/2, -h/2, w, h, 25);
        bg.strokeRoundedRect(-w/2, -h/2, w, h, 25);

        // Store references for dynamic updates
        if (side === 'LEFT') {
            this.leftBtnBg = bg;
            this.btnDims = { w, h }; // Store dimensions for redrawing
        } else {
            this.rightBtnBg = bg;
        }

        // Hover/Active Glow (Inner)
        const glow = this.add.graphics();
        glow.fillStyle(colorNum, 0.15);
        glow.fillRoundedRect(-w/2, -h/2, w, h, 25);
        glow.setAlpha(0); // Hidden by default, activated by PnL logic

        if (side === 'LEFT') {
            this.leftBtnGlow = glow;
        } else {
            this.rightBtnGlow = glow;
        }

        // Icon (Shepherd's Whistle) - moved closer to CALL text, rotated for slant
        const whistleIcon = this.add.image(side === 'LEFT' ? -w/2 + 110 : w/2 - 110, -15, 'shepherds_whistle')
            .setScale(0.20)
            .setAlpha(0.95)
            .setRotation(side === 'LEFT' ? -0.15 : 0.15) // Slight rotation, mirrored for right
            .setFlipX(side === 'RIGHT'); // Mirror the right whistle horizontally

        // Price Arrow (Thick Arrow)
        const arrowX = side === 'LEFT' ? w/2 - 70 : -w/2 + 70;
        const arrowIcon = this.add.image(arrowX, 0, 'thick_arrow')
            .setScale(0.5);
        
        if (side === 'LEFT') this.leftPriceArrow = arrowIcon;
        else this.rightPriceArrow = arrowIcon;

        const titleText = `CALL ${side}`;
        const title = this.add.text(0, -42, titleText, { 
            font: '900 48px Inter', 
            fill: '#fcd535', // Yellow branding
            fontStyle: 'italic'
        }).setOrigin(0.5);

        // Price Display (0.0W - 10.0W)
        const priceText = this.add.text(0, 10, 'PAY 5.0W', { 
            font: 'bold 56px Inter', 
            fill: '#ffffff' 
        }).setOrigin(0.5);

        const sharesText = this.add.text(0, 52, '', { 
            font: 'bold 24px Inter', 
            fill: '#888' 
        }).setOrigin(0.5);

        if (side === 'LEFT') {
            this.leftPriceText = priceText;
            this.leftSharesText = sharesText;
        } else {
            this.rightPriceText = priceText;
            this.rightSharesText = sharesText;
        }

        btn.add([bg, glow, whistleIcon, arrowIcon, title, priceText, sharesText]);
        
        btn.setInteractive(new Phaser.Geom.Rectangle(-w/2, -h/2, w, h), Phaser.Geom.Rectangle.Contains);

        // Initial Alpha (Active by default, but check market status)
        // If Market Closed, set dimmed (0.5)
        btn.setAlpha(this.isMarketActive ? 1 : 0.5);

        // --- LOCK OVERLAY (Added here to be on top) ---
        const lockContainer = this.add.container(0, 0);
        // Default to Visible if Market is Closed
        lockContainer.setAlpha(this.isMarketActive ? 0 : 1); 

        // Semi-transparent dark overlay
        const lockBg = this.add.graphics();
        lockBg.fillStyle(0x000000, 0.75);
        lockBg.fillRoundedRect(-w/2, -h/2, w, h, 25);
        
        // Lock Icon ONLY (no text)
        const lockIcon = this.add.text(0, 0, '🔒', { 
            font: '48px Inter' 
        }).setOrigin(0.5);

        lockContainer.add([lockBg, lockIcon]);
        btn.add(lockContainer);

        // Store reference
        if (side === 'LEFT') this.leftBtnLock = lockContainer;
        else this.rightBtnLock = lockContainer;
        
        // ===== RED COUNTER TEXT (VISIBLE) =====
        // Keep the red counter text visible next to the wooden whistle
        // Position it to the right of the whistle for LEFT, left of whistle for RIGHT
        const fontSize = 42;
        
        // Calculate text dimensions for positioning
        // Approximate width for "x0" text: ~40-50px, use 45px as estimate
        const textWidth = 45;
        const textHeight = fontSize;
        
        // Position at same height as wooden whistle (Y=0)
        // LEFT: Move left (negative X) by 4x text width (1x + 3x)
        // RIGHT: Move right (positive X) by 4x text width (1x + 3x)
        const counterX = side === 'LEFT' ? -(4 * textWidth) : (4 * textWidth);
        const counterY = 0; // Same height as whistle
        
        const counterText = this.add.text(counterX, counterY, 'x0', {
            font: `bold ${fontSize}px Inter`,
            fill: '#f64e60', // RED
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(160).setAlpha(0); // Start hidden until first call
        
        btn.add(counterText);
        
        // Store reference for counter system
        if (side === 'LEFT') this.leftCallCounter = counterText;
        else this.rightCallCounter = counterText;
        
        // Interaction Logic
        btn.on('pointerover', () => {
            if (this.isPaused || this.isControlsLocked) return; 
            if (!this.isMarketActive) return;
            
            // CRITICAL: Block hover when balance is 0W
            if (this.balance <= 0) return;
            
            // Allow hover if not visually disabled
            if (btn.alpha < 0.8) return; 

            const isDisabled = (side === 'LEFT' ? this.isLeftDisabled : this.isRightDisabled);
            if (isDisabled) return;

            bg.lineStyle(4, colorNum);
            bg.strokeRoundedRect(-w/2, -h/2, w, h, 25);
            
            if (glow.alpha === 0) {
                this.tweens.add({ targets: glow, alpha: 0.3, duration: 200 });
            }
            this.tweens.add({ targets: btn, scale: 1.02, duration: 200 });
        });

        btn.on('pointerout', () => {
            if (this.isPaused) return;

            bg.lineStyle(4, 0x3d4148);
            bg.strokeRoundedRect(-w/2, -h/2, w, h, 25);
            
            const hasPosition = this.calls.some(c => c.side === side);
            if (!hasPosition) {
                this.tweens.add({ targets: glow, alpha: 0, duration: 200 });
            }
            this.tweens.add({ targets: btn, scale: 1, duration: 200 });
        });

        // --- NEW INSTANT CLICK LOGIC ---
        btn.on('pointerdown', () => {
            if (this.uiOverlayOpen) return;
            this.ensureAudioUnlocked();
            if (this.isPaused || this.isControlsLocked) return;
            if (!this.isMarketActive) return;
            
            // CRITICAL: Block interaction when balance is 0W
            if (this.balance <= 0) return;

            const isDisabled = (side === 'LEFT' ? this.isLeftDisabled : this.isRightDisabled);
            if (isDisabled) return;

            // Visual Press
            this.tweens.add({ targets: btn, scale: 0.95, duration: 50 });
        });

        btn.on('pointerup', () => {
            if (this.uiOverlayOpen) return;
            // Reset Visuals
            this.tweens.add({ targets: btn, scale: 1, duration: 100 });

            if (this.isPaused || this.isControlsLocked) return;
            
            // CRITICAL: Block ALL clicks when balance is 0W
            if (this.balance <= 0) {
                console.log('🚫 BUTTON CLICK BLOCKED: Balance is 0W');
                audioManager.playDud();
                return;
            }
            
            // Extraneous tutorial logic removed

            if (!this.isMarketActive) {
                audioManager.playDud();
                return;
            }
            
            // Re-check disable state
            const isDisabled = (side === 'LEFT' ? this.isLeftDisabled : this.isRightDisabled);
            if (isDisabled) {
                audioManager.playDud();
                return;
            }

            // Call the bet interaction handler (counter logic removed)
            this.handleBetInteraction(btn, container, side, x);
        });

        container.add(btn);
    }







    updateAmountLabel() {
        if (!this.lblPrefix) return;

        let prefixStr = '';
        let amountStr = '';
        let suffixStr = '';

        if (this.orderAmount === null) {
            prefixStr = 'WAGER WOOL TO CALL SHEEP';
            // Hide others
            this.lblPrefix.setText(prefixStr);
            this.lblAmount.setText('');
            this.lblSuffix.setText('');
            
            // Center simple label
            this.lblPrefix.setOrigin(0.5);
            this.lblPrefix.x = 0;
            return;
        } 
        
        // Active Selection State
        this.lblPrefix.setOrigin(0, 0.5); // Reset origin for layout
        prefixStr = 'CALL LEFT OR RIGHT WAGER ';
        
        if (this.orderAmount === 'MAX') {
            const available = Math.max(0, this.balance - this.spentThisRound);
            amountStr = `${Math.floor(available)}`;
            suffixStr = ' WOOL (MAX)';
        } else {
            amountStr = `${this.orderAmount}`;
            suffixStr = ' WOOL';
        }

        // Set Texts
        this.lblPrefix.setText(prefixStr);
        this.lblAmount.setText(amountStr);
        this.lblSuffix.setText(suffixStr);

        // Layout Calculation
        const pW = this.lblPrefix.width;
        const aW = this.lblAmount.width;
        const sW = this.lblSuffix.width;
        const spacing = 10;
        const totalW = pW + spacing + aW + spacing + sW;

        // Position starting from left-most point centered at 0
        const startX = -totalW / 2;

        this.lblPrefix.x = startX;
        this.lblAmount.x = startX + pW + spacing;
        this.lblSuffix.x = startX + pW + spacing + aW + spacing;

        // Bounce Animation on the Number
        this.tweens.add({
            targets: this.lblAmount,
            scale: 1.5,
            duration: 100,
            yoyo: true,
            ease: 'Back.easeOut'
        });
        
        // Color flash
        this.lblAmount.setTint(0x44ff44);
        this.time.delayedCall(200, () => this.lblAmount.clearTint());
    }

    updateAmountButtons() {
        if (!this.amountBtns) return;

        this.amountBtns.forEach(btn => {
            const bg = btn.list[0];
            const txt = btn.list[1];
            
            if (btn.isLocked) {
                bg.fillStyle(0x111111, 1);
                bg.lineStyle(2, 0x333333);
                txt.setAlpha(0.3);
            } else {
                bg.fillStyle(0x333333, 1);
                bg.lineStyle(2, 0x555555);
                txt.setAlpha(1);
            }
        });
        
        this.updateBetButtonInteractability();
    }

    old_updateAmountButtons() {
        this.amountBtns.forEach(item => {
            if (item.isLocked) {
                labelText = val > 0 ? `+${val}W` : `${val}W`;
            }
            item.txt.setText(labelText);

            const isSelected = (item.amt === this.orderAmount) || (item.amt === 'MAX' && this.orderAmount === 'MAX');
            
            if (isSelected) {
                // Active scale and color preservation for selection
                item.coinImg.clearTint();
                item.coinImg.setAlpha(1);
                item.container.setScale(1.2);
                
                // Keep color coding even when selected
                if (item.amt === 'MAX' || item.amt === 'CLEAR') {
                    item.txt.setColor('#fcd535');
                } else if (item.isNegative) {
                    item.txt.setColor('#ff4444');
                } else if (item.isPositive) {
                    item.txt.setColor('#44ff44');
                } else {
                    item.txt.setColor('#ffffff');
                }
            } else {
                // Normal coins are bright and clear
                item.coinImg.clearTint();
                item.coinImg.setAlpha(1);
                item.container.setScale(1);
                
                let color = '#888888';
                if (item.amt === 'MAX' || item.amt === 'CLEAR') color = '#fcd535';
                else if (item.isNegative) color = '#ff4444';
                else if (item.isPositive) color = '#44ff44';
                
                item.txt.setColor(color);
            }
        });

        this.updateBetButtonInteractability();
    }

    updateBetButtonInteractability() {
        // Use this.balance directly because it's now updated in real-time by GameScene
        const availableBalance = this.balance; 

        const updateBtn = (container, isDisabled, side) => {
            if (!container) return;
            
            // 0. GLOBAL LOCK (Highest Priority) - Includes Paused state for text popups
            if (this.isControlsLocked || this.isPaused) {
                if (Math.abs(container.alpha - 0.3) > 0.05) {
                    this.tweens.add({
                        targets: container,
                        alpha: 0.3, // Dim significantly
                        duration: 300,
                        ease: 'Power2'
                    });
                }
                return;
            }
            
            // 1. ZERO BALANCE LOCK (Second Priority) - Lock when player has 0W
            if (availableBalance <= 0) {
                if (Math.abs(container.alpha - 0.3) > 0.05) {
                    this.tweens.add({
                        targets: container,
                        alpha: 0.3, // Dim significantly (same as global lock)
                        duration: 300,
                        ease: 'Power2'
                    });
                }
                return;
            }
            
            // 2. If visually disabled by Saturation Lock (99% / 10%) or Affordability, keep it dimmed
            if (isDisabled) {
                // Ensure it stays at the disabled alpha (0.5) if it drifted
                if (Math.abs(container.alpha - 0.5) > 0.05) {
                    this.tweens.add({
                        targets: container,
                        alpha: 0.5,
                        duration: 200,
                        ease: 'Power2'
                    });
                }
                return;
            }

            // Otherwise, fully active (Default to 1.0)
            let targetAlpha = 1;
            
            // Only tween if significant difference to prevent spam
            if (Math.abs(container.alpha - targetAlpha) > 0.05) {
                this.tweens.add({
                    targets: container,
                    alpha: targetAlpha,
                    duration: 200,
                    ease: 'Quad.easeOut'
                });
            }
        };

        updateBtn(this.leftBtnContainer, this.isLeftDisabled, 'LEFT');
        updateBtn(this.rightBtnContainer, this.isRightDisabled, 'RIGHT');
    }

    getSnapPrice(prob) {
        if (prob >= 99) return 1.00;
        if (prob <= 10) return 0.00;
        return prob / 100;
    }

    isPriceLocked(prob) {
        return prob <= 10;
    }

    getArrowColor(prob) {
        // Red (0xff0000) -> Yellow (0xffff00) -> Green (0x00ff00)
        let r, g, b;
        
        if (prob < 50) {
            // 0 -> 50: Red -> Yellow
            // R: 255, G: 0->255, B: 0
            const ratio = prob / 50;
            r = 255;
            g = Math.floor(255 * ratio);
            b = 0;
        } else {
            // 50 -> 100: Yellow -> Green
            // R: 255->0, G: 255, B: 0
            const ratio = (prob - 50) / 50;
            r = Math.floor(255 * (1 - ratio));
            g = 255;
            b = 0;
        }
        
        return (r << 16) | (g << 8) | b;
    }

    updatePrices() {
        // Display prices directly (0W - 10W)
        // Keep full precision internally, round to 1 decimal for display only
        let leftDisplay = this.currentLeftPrice;
        let rightDisplay = this.currentRightPrice;
        
        // Check for Final Call Lock (Last 5 seconds)
        const isLockedPeriod = (this.timeLeft !== undefined && this.timeLeft <= 5 && this.isMarketActive);
        
        // CRITICAL: Check for 0W balance lock (highest priority after market inactive)
        const isZeroBalanceLock = (this.balance <= 0 && this.isMarketActive);

        // Override if market is not active (e.g. Pre-round)
        if (!this.isMarketActive) {
            leftDisplay = 0;
            rightDisplay = 0;
            
            // Show Locks (Standard) - LOCK ICON ONLY, NO TEXT
            if (this.leftBtnLock) {
                this.leftBtnLock.setAlpha(1);
            }
            if (this.rightBtnLock) {
                this.rightBtnLock.setAlpha(1);
            }
            
            // Dim counters when locked (only if visible)
            if (this.leftCallCounter && this.leftCallCount > 0) {
                this.leftCallCounter.setAlpha(0.3);
            }
            if (this.rightCallCounter && this.rightCallCount > 0) {
                this.rightCallCounter.setAlpha(0.3);
            }
        } else if (isZeroBalanceLock) {
            // ZERO BALANCE LOCK - Show lock overlays when balance is 0W
            if (this.leftBtnLock) {
                this.leftBtnLock.setAlpha(1);
            }
            if (this.rightBtnLock) {
                this.rightBtnLock.setAlpha(1);
            }
            
            // Dim counters when locked (only if visible)
            if (this.leftCallCounter && this.leftCallCount > 0) {
                this.leftCallCounter.setAlpha(0.3);
            }
            if (this.rightCallCounter && this.rightCallCount > 0) {
                this.rightCallCounter.setAlpha(0.3);
            }
        } else if (isLockedPeriod) {
            // Show Locks (BETS LOCKED)
            if (this.leftBtnLock) {
                this.leftBtnLock.setAlpha(1);
                if (this.leftBtnLock.list[2]) this.leftBtnLock.list[2].setText("BETS LOCKED");
            }
            if (this.rightBtnLock) {
                this.rightBtnLock.setAlpha(1);
                if (this.rightBtnLock.list[2]) this.rightBtnLock.list[2].setText("BETS LOCKED");
            }
            
            // Dim counters when locked (only if visible)
            if (this.leftCallCounter && this.leftCallCount > 0) {
                this.leftCallCounter.setAlpha(0.3);
            }
            if (this.rightCallCounter && this.rightCallCount > 0) {
                this.rightCallCounter.setAlpha(0.3);
            }
        } else {
            // Hide Locks (balance > 0, market active, not in final 5 seconds)
            if (this.leftBtnLock) this.leftBtnLock.setAlpha(0);
            if (this.rightBtnLock) this.rightBtnLock.setAlpha(0);
            
            // Restore counters when unlocked (only if they've been used)
            if (this.leftCallCounter && this.leftCallCount > 0) {
                this.leftCallCounter.setAlpha(1);
            }
            if (this.rightCallCounter && this.rightCallCount > 0) {
                this.rightCallCounter.setAlpha(1);
            }
        }

        // Round to 1 decimal place for display using formatPrice helper
        // Only update text if the rounded value has changed (prevents unnecessary updates)
        if (this.leftPriceText) {
            const roundedLeft = Math.round(leftDisplay * 10) / 10;
            if (this.lastDisplayedLeftPrice !== roundedLeft) {
                this.leftPriceText.setText(`PAY ${this.formatPrice(leftDisplay)}W`);
                this.lastDisplayedLeftPrice = roundedLeft;
            }
        }
        if (this.rightPriceText) {
            const roundedRight = Math.round(rightDisplay * 10) / 10;
            if (this.lastDisplayedRightPrice !== roundedRight) {
                this.rightPriceText.setText(`PAY ${this.formatPrice(rightDisplay)}W`);
                this.lastDisplayedRightPrice = roundedRight;
            }
        }

        // Update Arrow Colors and Rotation
        // Convert price (0-10) to percentage (0-100) for color calculation
        if (this.leftPriceArrow) {
             const pricePercent = (this.currentLeftPrice / 10) * 100;
             const col = this.getArrowColor(pricePercent);
             this.leftPriceArrow.setTint(col);
             // Rotate arrow based on price: < 5W = down (red), >= 5W = up (green)
             if (this.currentLeftPrice < 5) {
                 this.leftPriceArrow.setRotation(Math.PI); // Point down
             } else {
                 this.leftPriceArrow.setRotation(0); // Point up
             }
        }
        if (this.rightPriceArrow) {
             const pricePercent = (this.currentRightPrice / 10) * 100;
             const col = this.getArrowColor(pricePercent);
             this.rightPriceArrow.setTint(col);
             // Rotate arrow based on price: < 5W = down (red), >= 5W = up (green)
             if (this.currentRightPrice < 5) {
                 this.rightPriceArrow.setRotation(Math.PI); // Point down
             } else {
                 this.rightPriceArrow.setRotation(0); // Point up
             }
        }

        // Check for Visual Disabling (Affordability)
        // User Requirement: "Dont allow player to click CALL LEFT or CALL RIGHT if it's price exceeds the wool balance"
        const currentBalance = this.balance;

        // Strict Affordability Check (Price vs Balance)
        const leftTooExpensive = (leftDisplay > currentBalance + 0.001); // Float safety
        const rightTooExpensive = (rightDisplay > currentBalance + 0.001);

        // Check for zero price (no sheep on that side)
        const leftPriceZero = (leftDisplay < 0.01);
        const rightPriceZero = (rightDisplay < 0.01);

        let leftDisabled = leftTooExpensive || leftPriceZero;
        let rightDisabled = rightTooExpensive || rightPriceZero;

        // FORCE DISABLE IF MARKET IS CLOSED OR FINAL CALL LOCKED
        if (!this.isMarketActive || isLockedPeriod) {
            leftDisabled = true;
            rightDisabled = true;
        }

        this.updateButtonVisualState('LEFT', leftDisabled);
        this.updateButtonVisualState('RIGHT', rightDisabled);
        
        // Calculate deviation from 50% for "Tug of War" visualization
        // Bars grow from center based on how far the price is from 50.
        // We use scaleX because the bars are initialized with full half-width and anchored at center.
        const leftDeviation = Math.abs(this.currentLeftPrice - 50) / 50;
        const rightDeviation = Math.abs(this.currentRightPrice - 50) / 50;

        // Clamp just in case, though math shouldn't exceed 1
        this.probBarLeft.scaleX = Math.max(0, Math.min(1, leftDeviation));
        this.probBarRight.scaleX = Math.max(0, Math.min(1, rightDeviation));

        // Dynamic Market Coloring (Winning = Green, Losing = Red)
        const isLeftWinning = this.currentLeftPrice > this.currentRightPrice;
        const isNeutral = this.currentLeftPrice === this.currentRightPrice;

        if (isNeutral) {
            this.probBarLeft.setFillStyle(0xffffff);
            this.probBarRight.setFillStyle(0xffffff);
            
            // Neutral Glows & Outlines
            if (this.leftBtnGlow) this.leftBtnGlow.setAlpha(0);
            if (this.rightBtnGlow) this.rightBtnGlow.setAlpha(0);
            
            const w = this.btnDims ? this.btnDims.w : 530;
            const h = this.btnDims ? this.btnDims.h : 145;

            if (this.leftBtnBg) {
                this.leftBtnBg.clear();
                this.leftBtnBg.fillStyle(0x23272c, 1);
                this.leftBtnBg.lineStyle(4, 0x3d4148);
                this.leftBtnBg.fillRoundedRect(-w/2, -h/2, w, h, 25);
                this.leftBtnBg.strokeRoundedRect(-w/2, -h/2, w, h, 25);
            }
            if (this.rightBtnBg) {
                this.rightBtnBg.clear();
                this.rightBtnBg.fillStyle(0x23272c, 1);
                this.rightBtnBg.lineStyle(4, 0x3d4148);
                this.rightBtnBg.fillRoundedRect(-w/2, -h/2, w, h, 25);
                this.rightBtnBg.strokeRoundedRect(-w/2, -h/2, w, h, 25);
            }

        } else if (isLeftWinning) {
            this.probBarLeft.setFillStyle(0x44ff44); // Winning Green
            this.probBarRight.setFillStyle(0xff4444); // Losing Red

            const w = this.btnDims ? this.btnDims.w : 530;
            const h = this.btnDims ? this.btnDims.h : 145;

            // Left Green, Right Red
            if (this.leftBtnGlow) {
                this.leftBtnGlow.clear();
                this.leftBtnGlow.fillStyle(0x44ff44, 0.15);
                this.leftBtnGlow.fillRoundedRect(-w/2, -h/2, w, h, 25);
                this.leftBtnGlow.setAlpha(0.6);
            }
            if (this.leftBtnBg) {
                this.leftBtnBg.clear();
                this.leftBtnBg.fillStyle(0x23272c, 1);
                this.leftBtnBg.lineStyle(6, 0x44ff44); // Green Outline
                this.leftBtnBg.fillRoundedRect(-w/2, -h/2, w, h, 25);
                this.leftBtnBg.strokeRoundedRect(-w/2, -h/2, w, h, 25);
            }

            if (this.rightBtnGlow) {
                this.rightBtnGlow.clear();
                this.rightBtnGlow.fillStyle(0xff4444, 0.15);
                this.rightBtnGlow.fillRoundedRect(-w/2, -h/2, w, h, 25);
                this.rightBtnGlow.setAlpha(0.6);
            }
            if (this.rightBtnBg) {
                this.rightBtnBg.clear();
                this.rightBtnBg.fillStyle(0x23272c, 1);
                this.rightBtnBg.lineStyle(6, 0xff4444); // Red Outline
                this.rightBtnBg.fillRoundedRect(-w/2, -h/2, w, h, 25);
                this.rightBtnBg.strokeRoundedRect(-w/2, -h/2, w, h, 25);
            }

        } else {
            this.probBarLeft.setFillStyle(0xff4444); // Losing Red
            this.probBarRight.setFillStyle(0x44ff44); // Winning Green

            const w = this.btnDims ? this.btnDims.w : 530;
            const h = this.btnDims ? this.btnDims.h : 145;

            // Left Red, Right Green
            if (this.leftBtnGlow) {
                this.leftBtnGlow.clear();
                this.leftBtnGlow.fillStyle(0xff4444, 0.15);
                this.leftBtnGlow.fillRoundedRect(-w/2, -h/2, w, h, 25);
                this.leftBtnGlow.setAlpha(0.6);
            }
            if (this.leftBtnBg) {
                this.leftBtnBg.clear();
                this.leftBtnBg.fillStyle(0x23272c, 1);
                this.leftBtnBg.lineStyle(6, 0xff4444); // Red Outline
                this.leftBtnBg.fillRoundedRect(-w/2, -h/2, w, h, 25);
                this.leftBtnBg.strokeRoundedRect(-w/2, -h/2, w, h, 25);
            }

            if (this.rightBtnGlow) {
                this.rightBtnGlow.clear();
                this.rightBtnGlow.fillStyle(0x44ff44, 0.15);
                this.rightBtnGlow.fillRoundedRect(-w/2, -h/2, w, h, 25);
                this.rightBtnGlow.setAlpha(0.6);
            }
            if (this.rightBtnBg) {
                this.rightBtnBg.clear();
                this.rightBtnBg.fillStyle(0x23272c, 1);
                this.rightBtnBg.lineStyle(6, 0x44ff44); // Green Outline
                this.rightBtnBg.fillRoundedRect(-w/2, -h/2, w, h, 25);
                this.rightBtnBg.strokeRoundedRect(-w/2, -h/2, w, h, 25);
            }
        }
        
        // Update Interactivity based on new prices (for Low Balance Mode) - REMOVED
        // this.updateBetButtonInteractability();
    }

    updateButtonVisualState(side, isDisabled) {
        const container = side === 'LEFT' ? this.leftBtnContainer : this.rightBtnContainer;
        if (!container) return;

        const wasDisabled = side === 'LEFT' ? this.isLeftDisabled : this.isRightDisabled;
        
        if (isDisabled !== wasDisabled) {
            // State changed
            if (side === 'LEFT') this.isLeftDisabled = isDisabled;
            else this.isRightDisabled = isDisabled;
            
            if (isDisabled) {
                // Animate OUT (Disable - Shrink & Dim)
                this.tweens.add({
                    targets: container,
                    alpha: 0.5,
                    scale: 0.9,
                    duration: 300,
                    ease: 'Power2'
                });
            } else {
                // Animate IN (Enable - Elastic Bounce)
                this.tweens.add({
                    targets: container,
                    alpha: 1,
                    scale: 1,
                    duration: 500,
                    ease: 'Elastic.easeOut',
                    easeParams: [1.2, 0.8]
                });
            }
        }
    }

    updatePortfolioDisplay() {
        // Use stored values if round ended but next round hasn't started yet
        // This preserves the display during wool wallet viewing
        const callsToDisplay = (this.calls.length === 0 && this.lastRoundCalls) ? this.lastRoundCalls : this.calls;
        
        // Calculate total wool spent this round (sum of all call entry prices)
        let totalCostBasis = 0;
        callsToDisplay.forEach(call => {
            totalCostBasis += call.entryPrice;
        });
        this.totalWoolSpent = totalCostBasis;
        
        // Sync wool spent for efficiency tracking
        this.woolSpentThisRound = totalCostBasis;

        // Calculate current total value (sum of all call current prices)
        let currentTotalVal = 0;
        
        // Calculate unrealized PnL for each side
        let leftUnrealized = 0;
        let rightUnrealized = 0;
        
        callsToDisplay.forEach(call => {
            const currentPrice = call.side === 'LEFT' ? this.currentLeftPrice : this.currentRightPrice;
            const pnl = currentPrice - call.entryPrice;
            
            currentTotalVal += currentPrice;
            
            if (call.side === 'LEFT') {
                leftUnrealized += pnl;
            } else {
                rightUnrealized += pnl;
            }
        });

        // Hide individual button labels (no longer showing per-side unrealized)
        if (this.leftSharesText) {
            this.leftSharesText.setText('');
        }
        
        if (this.rightSharesText) {
            this.rightSharesText.setText('');
        }

        // Calculate total unrealized PnL
        const totalUnrealized = leftUnrealized + rightUnrealized;
        
        // Counter update removed - no logic

        if (this.livePnlText) {
            const levelLabel = this.isEndlessMode ? '' : `LEVEL ${this.activeLevel}`;
            this.livePnlText.setText(levelLabel);
            this.livePnlText.setColor('#888888');

            // DYNAMIC SIZING logic
            // We want the box to be "shorter" (tighter) to the text.
            // Calculate required width based on the widest text element + padding.
            // Text starts at x=175.
            const paddingRight = 40;
            const startX = 175;
            
            // Measure widths (using displayWidth for safety with scaling)
            const statusWidth = this.livePnlText.displayWidth;
            const balanceWidth = this.balanceText ? this.balanceText.displayWidth : 0;
            
            // Determine widest content
            const maxWidth = Math.max(statusWidth, balanceWidth);
            
            // Calculate final target width: Offset + Text Width + Padding
            // We clamp it to a minimum (e.g. 380) so it doesn't get too small if text is tiny
            const targetWidth = Math.max(380, startX + maxWidth + paddingRight);

            // Animate width change smoothly
            if (this.walletBg) {
                 // Check if we need to animate (compare roughly to avoid constant redraws)
                 const currentW = this.currentWalletBgWidth || this.defaultWalletBgWidth;
                 if (Math.abs(currentW - targetWidth) > 2) { // 2px threshold
                    this.tweens.addCounter({
                        from: currentW,
                        to: targetWidth,
                        duration: 300,
                        ease: 'Quad.easeOut',
                        onUpdate: (tween) => {
                            const w = tween.getValue();
                            this.currentWalletBgWidth = w;
                            this.walletBg.clear();
                            this.walletBg.fillStyle(0x000000, 0.5);
                            this.walletBg.fillRoundedRect(20, 30, w, 125, 22);
                            
                            // Update hit area for interaction
                            if (this.walletBg.input) {
                                this.walletBg.input.hitArea.width = w;
                            }
                        }
                    });
                 }
            }
        }

        // Calculate unrealized PnL (sum of current PnL for all calls)
        const unrealizedPnL = totalUnrealized;

        // Line 1: WOOL SPENT (static display)
        if (totalCostBasis === 0) {
            this.woolSpentText.setText('NO ACTIVE CALLS');
            this.woolSpentText.setColor('#ffffff');
            this.woolSpentText.setFont('900 28px Inter');
        } else {
            this.woolSpentText.setText(`WOOL SPENT: ${this.formatWool(totalCostBasis)}W`);
            this.woolSpentText.setColor('#ffffff');
            this.woolSpentText.setFont('bold 24px Inter');
        }

        // Line 2: UNREALIZED WOOL (dynamic real-time PnL)
        if (this.unrealizedWoolText) {
            if (totalCostBasis === 0) {
                // IDLE STATE
                this.unrealizedWoolText.setText("");
            } else {
                const sign = unrealizedPnL >= 0 ? '+' : '';
                const pnlStr = this.formatWoolDecimal(unrealizedPnL);
                const pnlColor = unrealizedPnL > 0 ? '#44ff44' : (unrealizedPnL < 0 ? '#ff4444' : '#888888');

                this.unrealizedWoolText.setText(`UNREALIZED WOOL: ${sign}${pnlStr}W`);
                this.unrealizedWoolText.setColor(pnlColor);

                // Particle effect for significant PnL swings
                if (this.prevUnrealizedPnL !== undefined) {
                    const pnlChange = Math.abs(unrealizedPnL - this.prevUnrealizedPnL);
                    if (pnlChange > 2) {
                        if (this.pnlEmitter) {
                            const count = Math.min(15, Math.max(5, Math.floor(pnlChange)));
                            const tintColor = unrealizedPnL > 0 ? 0x44ff44 : 0xff4444;
                            // Explode with tint - use emitParticleAt for colored particles
                            this.pnlEmitter.setConfig({ tint: tintColor });
                            this.pnlEmitter.explode(count, CONFIG.width / 2, 95);
                        }
                    }
                }
                this.prevUnrealizedPnL = unrealizedPnL;
            }
        }
        
        // NEW: Update PnL sparkline with current unrealized PnL
        this.updatePnLSparkline(unrealizedPnL);

        /* Legacy Wager Text Removed */
        if (this.wagerText) this.wagerText.setText('');
        
        return;
    }

    lockInFinalCallProjections() {
        // Called when timer hits 5 seconds - simplified for new system
        // No need to lock projections anymore, unrealized wool updates in real-time
        this.finalCallLocked = true;
        
        // Flash the unrealized wool display
        if (this.unrealizedWoolText) {
            this.tweens.add({
                targets: this.unrealizedWoolText,
                scale: 1.3,
                duration: 150,
                yoyo: true,
                repeat: 3,
                ease: 'Sine.easeInOut'
            });
        }
        
        // Audio feedback
        audioManager.playClick();
        
        // Show "LOCKED IN!" message briefly
        const lockMsg = this.add.text(CONFIG.width / 2, 340, 'LOCKED IN!', {
            font: '900 32px Inter',
            fill: '#fcd535',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setAlpha(0).setDepth(150);
        
        this.tweens.add({
            targets: lockMsg,
            alpha: 1,
            duration: 200,
            yoyo: true,
            hold: 400,
            onComplete: () => lockMsg.destroy()
        });
    }

    createProbBar() {
        const height = 16;
        const centerX = CONFIG.width / 2;
        const halfWidth = CONFIG.width / 2;
        
        // Background track
        this.add.rectangle(0, 0, CONFIG.width, height, 0x000000, 0.5).setOrigin(0, 0);
        
        // Origins set to center so they grow outwards. 
        // Initial width is full half-screen, but scaled to 0 start.
        this.probBarLeft = this.add.rectangle(centerX, 0, halfWidth, height, 0xffffff).setOrigin(1, 0);
        this.probBarLeft.scaleX = 0;

        this.probBarRight = this.add.rectangle(centerX, 0, halfWidth, height, 0xf64e60).setOrigin(0, 0);
        this.probBarRight.scaleX = 0;
        
        // Add a glow/flash overlay
        this.probFlashOverlay = this.add.rectangle(0, 0, CONFIG.width, height, 0xffffff, 0).setOrigin(0, 0);
        this.probFlashOverlay.setBlendMode(Phaser.BlendModes.ADD);

        // Center Marker
        this.add.rectangle(centerX, 0, 4, height + 6, 0xffffff, 1).setOrigin(0.5, 0);
    }

    triggerGameOverSequence(type = 'LOSS', customMessage = null) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        // Fade out music
        audioManager.fadeOut(2);

        // Black Overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 1);
        overlay.fillRect(0, 0, CONFIG.width, CONFIG.height);
        overlay.setDepth(10000);
        overlay.setAlpha(0);

        // Quote
        const phrases = [
            "The flock rebels. No wool for you!",
            "Sheep won this round… better luck next time.",
            "Your wool slipped through their hooves.",
            "The herd had other plans.",
            "Rebellious fluff strikes again."
        ];
        const textToDisplay = customMessage || phrases[Math.floor(Math.random() * phrases.length)];

        const quoteText = this.add.text(CONFIG.width / 2, CONFIG.height / 2, textToDisplay, {
            font: 'bold 42px Inter',
            fill: '#ffffff',
            align: 'center',
            wordWrap: { width: CONFIG.width - 200 }
        }).setOrigin(0.5).setDepth(10001).setAlpha(0);

        // Sequence
        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                this.tweens.add({
                    targets: quoteText,
                    alpha: 1,
                    duration: 1000,
                    yoyo: true,
                    hold: 2000, 
                    onComplete: () => {
                        // RESTART LOGIC
                        if (this.playerLevel > 1) {
                            // LEVEL 2+ AUTO-SAVE & RESTART
                            // If player is broke, refill wallet to allow gameplay
                            if (this.balance < 5) {
                                authService.saveBalance(100); // Junior Shepherd Bailout
                            } else {
                                authService.saveBalance(this.balance);
                            }
                            
                            this.scene.stop('GameScene');
                            // Direct restart of level, skipping instructions
                            this.scene.start('GameScene', { balance: authService.loadBalance() });
                            
                        } else {
                            // LEVEL 1 RESTART (Back to Instructions)
                            if (type === 'INACTIVITY') {
                                // Reset to 0 so they get the Claim Popup again
                                authService.saveBalance(0);
                            } else {
                                // Loss/Defeat: Reset to 0 to trigger Free Wool again
                                // Previously gave +100, but that skips the bailout prompt.
                                authService.saveBalance(0);
                            }
                            
                            this.scene.stop('GameScene');
                            this.scene.start('BootScene', { retry: true });
                        }
                    }
                });
            }
        });
    }

    showBrokeAlert() {
        if (this.isShowingBrokeAlert) return;
        this.isShowingBrokeAlert = true;
        
        // STOP GAME
        const gameScene = this.scene.get('GameScene');
        if (gameScene) gameScene.roundActive = false; // Freeze round

        // Prepare Stats for "Game Over" Modal
        this.recentLevelResult = {
            profit: 0,
            winner: 'NONE',
            balance: 0,
            nextAction: 'RETRY'
        };
        
        // Estimate losses for the view
        this.recentLevelStats = {
            gains: 0,
            losses: this.sessionStartWool 
        };

        // Show Dramatic Status Text
        // Fix: Destroy and recreate status text to avoid Phaser style/texture update race conditions (TypeError: cut)
        if (this.statusText) {
            this.statusText.destroy();
        }
        
        this.statusText = this.add.text(CONFIG.width / 2, 400, "BANKRUPT!\nTHE FLOCK REBELS", {
            font: 'bold 64px Inter',
            fill: '#ff4444',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 10
        }).setOrigin(0.5).setDepth(100);
        
        audioManager.playDud();

        // Open Modal to Retry
        this.time.delayedCall(2000, () => {
            if (this.statusText) this.statusText.setAlpha(0);
            this.isLossModal = true; // Flag to show "TRY AGAIN" button
            this.isWinModal = false; // Not a win
            this.populateStatsModalForLevelEnd();
            this.toggleStatsModal();
        });
    }

    createStatsModal() {
        // FULL-SCREEN WOOL WALLET - Primary overlay, not compact modal
        this.statsContainer = this.add.container(CONFIG.width / 2, CONFIG.height / 2); 
        this.statsContainer.setAlpha(0);
        this.statsContainer.setScale(0.5);
        this.statsContainer.setDepth(15000); // HIGHEST DEPTH - Above all game elements (10002 max)

        // Large readable modal size - increased height to fit BEST CALL section
        const modalWidth = 1800;
        const modalHeight = 1650; // Increased from 1550 to 1650 to fit BEST CALL inside
        
        // ============================================
        // READABLE FUNCTIONAL WOOL WALLET - Landing Page Style
        // ============================================
        
        // Background - Leather wallet style
        const modalBg = this.add.graphics();
        // Outer shadow for depth
        modalBg.fillStyle(0x3E2723, 0.8);
        modalBg.fillRoundedRect(-modalWidth/2 + 8, -modalHeight/2 + 8, modalWidth, modalHeight, 20);
        
        // Main leather base - Custom brown color #7f4d32
        modalBg.fillStyle(0x7f4d32, 1);
        modalBg.fillRoundedRect(-modalWidth/2, -modalHeight/2, modalWidth, modalHeight, 20);
        
        // Leather edge highlight (top and left edges - where light hits)
        modalBg.fillStyle(0x9a6040, 0.3); // Slightly lighter than base
        modalBg.fillRoundedRect(-modalWidth/2, -modalHeight/2, modalWidth, 15, 20); // Top edge
        modalBg.fillRoundedRect(-modalWidth/2, -modalHeight/2, 15, modalHeight, 20); // Left edge
        
        // Darker worn edges (bottom and right - shadow areas)
        modalBg.fillStyle(0x5D4037, 0.4);
        modalBg.fillRoundedRect(-modalWidth/2, modalHeight/2 - 15, modalWidth, 15, 20); // Bottom edge
        modalBg.fillRoundedRect(modalWidth/2 - 15, -modalHeight/2, 15, modalHeight, 20); // Right edge
        
        // Leather border with embossed effect
        modalBg.lineStyle(8, 0x5D4037, 1);
        modalBg.strokeRoundedRect(-modalWidth/2, -modalHeight/2, modalWidth, modalHeight, 20);
        
        // Inner border for embossed look
        modalBg.lineStyle(3, 0x9a6040, 0.5); // Adjusted to match new color scheme
        modalBg.strokeRoundedRect(-modalWidth/2 + 5, -modalHeight/2 + 5, modalWidth - 10, modalHeight - 10, 18);
        
        this.statsContainer.add(modalBg);
        
        // Title - Landing page style with gradient
        const title = this.add.text(0, -modalHeight/2 + 80, 'WOOL WALLET', {
            font: '900 96px Inter',
            fill: '#efcf7a', // Cream color
            stroke: '#000000',
            strokeThickness: 12,
            align: 'center',
            shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 0, fill: true }
        }).setOrigin(0.5);
        
        this.statsContainer.add(title);
        
        // Divider line under title - Gold color matching landing page (thicker)
        const divider1 = this.add.graphics();
        divider1.lineStyle(8, 0xefcf7a, 0.8); // Changed from 0xFFD700 to #efcf7a
        divider1.lineBetween(-modalWidth/2 + 80, -modalHeight/2 + 160, modalWidth/2 - 80, -modalHeight/2 + 160);
        this.statsContainer.add(divider1);
        
        // Initialize statLabels object
        this.statLabels = {};
        
        // Large readable layout
        const leftX = -modalWidth/2 + 140;
        const rightX = modalWidth/2 - 140;
        let currentY = -modalHeight/2 + 280; // Moved down from 212 to center content better
        const lineHeight = 100; // Increased from 85 for bigger spacing
        
        // WOOL BALANCE - Top position, highlighted
        const balanceLabel = this.add.text(leftX, currentY, 'WOOL BALANCE', {
            font: '900 80px Inter', // Increased from 68px
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0, 0.5);
        this.statLabels.totalBalance = this.add.text(rightX, currentY, '0W', {
            font: '900 88px Inter', // Increased from 76px
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(1, 0.5);
        this.statsContainer.add([balanceLabel, this.statLabels.totalBalance]);
        
        // Next divider position - centered gap of 104px (52px above and below text)
        const divider1aY = -modalHeight/2 + 380; // Adjusted from 264
        
        // Divider line - Gold, thicker
        const divider1a = this.add.graphics();
        divider1a.lineStyle(8, 0xefcf7a, 0.8); // Changed from 0xFFD700 to #efcf7a
        divider1a.lineBetween(-modalWidth/2 + 80, divider1aY, modalWidth/2 - 80, divider1aY);
        this.statsContainer.add(divider1a);
        
        currentY = divider1aY + 60; // Increased spacing from 50
        
        // LEVEL indicator
        const levelLabel = this.isEndlessMode ? `ROUND ${this.endlessRound}` : `LEVEL ${this.activeLevel || 1}`;
        this.sectionLabel1 = this.add.text(0, currentY, levelLabel, {
            font: '900 76px Inter', // Increased from 64px
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5);
        this.statsContainer.add(this.sectionLabel1);
        currentY += 80; // Increased from 70
        
        // Wool Spent
        const woolSpentLabel = this.add.text(leftX, currentY, 'WOOL SPENT', {font: '900 68px Inter', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 5}).setOrigin(0, 0.5); // Increased from 56px
        this.statLabels.woolSpent = this.add.text(rightX, currentY, '0W', {font: '900 68px Inter', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 5}).setOrigin(1, 0.5);
        this.statsContainer.add([woolSpentLabel, this.statLabels.woolSpent]);
        currentY += lineHeight;
        
        // Wool Gains (from current level)
        const levelGainsLabel = this.add.text(leftX, currentY, 'WOOL GAINS', {font: '900 68px Inter', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 5}).setOrigin(0, 0.5);
        this.statLabels.levelGains = this.add.text(rightX, currentY, '+0W', {font: '900 68px Inter', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 5}).setOrigin(1, 0.5);
        this.statsContainer.add([levelGainsLabel, this.statLabels.levelGains]);
        currentY += lineHeight;
        
        // Wool Losses (from current level)
        const levelLossesLabel = this.add.text(leftX, currentY, 'WOOL LOSSES', {font: '900 68px Inter', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 5}).setOrigin(0, 0.5);
        this.statLabels.levelLosses = this.add.text(rightX, currentY, '-0W', {font: '900 68px Inter', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 5}).setOrigin(1, 0.5);
        this.statsContainer.add([levelLossesLabel, this.statLabels.levelLosses]);
        currentY += lineHeight;
        
        // Outcome (always white text)
        const outcomeLabel = this.add.text(leftX, currentY, 'OUTCOME', {font: '900 68px Inter', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 5}).setOrigin(0, 0.5);
        this.statLabels.levelOutcome = this.add.text(rightX, currentY, 'PENDING', {font: '900 64px Inter', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 5}).setOrigin(1, 0.5); // Increased from 50px
        this.statsContainer.add([outcomeLabel, this.statLabels.levelOutcome]);
        currentY += lineHeight;
        
        // Bonuses (always white text)
        const bonusesLabel = this.add.text(leftX, currentY, 'BONUSES', {font: '900 68px Inter', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 5}).setOrigin(0, 0.5);
        this.statLabels.levelBonuses = this.add.text(rightX, currentY, '0W', {font: '900 68px Inter', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 5}).setOrigin(1, 0.5);
        this.statsContainer.add([bonusesLabel, this.statLabels.levelBonuses]);
        currentY += lineHeight - 30; // Closer to breakdown section

        // --- NEW: CALL BREAKDOWN LIST (SCROLLABLE DOM VERSION) ---
        const breakdownTitle = this.add.text(0, currentY, 'CALL BREAKDOWN', {
            font: '900 60px Inter', // Increased from 48px
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5);
        this.statsContainer.add(breakdownTitle);
        currentY += 45;

        // Create scrollable container for breakdown using DOM element
        // Fixed height to fit exactly 5 rows
        const breakdownDiv = document.createElement('div');
        breakdownDiv.id = 'breakdown-scroll-area';
        breakdownDiv.style.width = '1200px';
        breakdownDiv.style.height = '258px';
        breakdownDiv.style.overflowY = 'auto';
        breakdownDiv.style.overflowX = 'hidden';
        breakdownDiv.style.color = '#ffffff';
        breakdownDiv.style.fontFamily = 'Inter, sans-serif';
        breakdownDiv.style.fontWeight = '700';
        breakdownDiv.style.fontSize = '38px';
        breakdownDiv.style.textAlign = 'center';
        breakdownDiv.style.lineHeight = '1.3';
        breakdownDiv.style.padding = '10px 0';
        breakdownDiv.style.textShadow = '3px 3px 0px #000000';
        breakdownDiv.style.scrollbarWidth = 'thin';
        breakdownDiv.style.scrollbarColor = '#8D6E63 #5D4037';
        
        // Custom scrollbar styling for the breakdown area
        const breakdownStyle = document.createElement('style');
        breakdownStyle.innerHTML = `
            #breakdown-scroll-area::-webkit-scrollbar {
                width: 10px;
            }
            #breakdown-scroll-area::-webkit-scrollbar-track {
                background: rgba(93, 64, 55, 0.4);
                border-radius: 5px;
            }
            #breakdown-scroll-area::-webkit-scrollbar-thumb {
                background: #8D6E63;
                border-radius: 5px;
                border: 1px solid #4E342E;
            }
        `;
        document.head.appendChild(breakdownStyle);

        this.levelCallBreakdownDOM = this.add.dom(0, currentY, breakdownDiv).setOrigin(0.5, 0);
        this.statsContainer.add(this.levelCallBreakdownDOM);
        
        // Maintain fixed spacing for the next section regardless of content
        currentY += 278; 
        
        // ============================================
        // BUTTONS ROW - RECREATED FROM SCRATCH
        // TRUE MATHEMATICAL CENTERING IMPLEMENTATION
        // ============================================
        
        // Button dimensions
        const btnWidth = 380;
        const btnHeight = 85;
        const halfWidth = btnWidth / 2;
        const halfHeight = btnHeight / 2;
        const buttonGap = 16; // Gap between buttons
        
        // CORRECT MATH FOR CENTERING:
        // We want: [LEFT BUTTON] [16px GAP] [RIGHT BUTTON]
        // With the PAIR centered at x=0
        // 
        // Total width = 380 + 16 + 380 = 776
        // Half of total = 388
        // 
        // Left button: center at -388 + 190 = -198... NO THAT'S WRONG
        // 
        // THINK DIFFERENTLY:
        // If gap center is at x=0, then:
        // - Gap spans from -8 to +8
        // - Left button RIGHT EDGE touches -8
        // - Right button LEFT EDGE touches +8
        // - Left button center: -8 - 190 = -198
        // - Right button center: +8 + 190 = +198
        //
        // But -198 to +198 is 396 pixels apart, and button width is 380
        // That means right edge of left button is at -198+190 = -8 ✓
        // And left edge of right button is at +198-190 = +8 ✓
        // Gap = 8 - (-8) = 16 ✓
        //
        // SO THE MATH IS: -(buttonGap/2 + btnWidth/2) and +(buttonGap/2 + btnWidth/2)
        // WHICH EQUALS: -198 and +198
        
        // Y position: bottom of modal
        const btnY = modalHeight/2; // 825 (updated from 775 to match new height)
        
        // Create NEW flex-like container at (0, btnY) - centered horizontally
        const buttonsFlexContainer = this.add.container(0, btnY);
        
        // CONTINUE/Action Button (LEFT)
        // Position with gap from NEW GAME button
        const leftBtnX = -160;
        
        const actionBtnContainer = this.add.container(leftBtnX, 0);
        const actionBtnBg = this.add.graphics();
        
        // Draw button background
        actionBtnBg.fillStyle(0x3E2723, 0.6);
        actionBtnBg.fillRoundedRect(-halfWidth + 2, -halfHeight + 2, btnWidth, btnHeight, 15);
        actionBtnBg.fillStyle(0x8D6E63, 1);
        actionBtnBg.fillRoundedRect(-halfWidth, -halfHeight, btnWidth, btnHeight, 15);
        actionBtnBg.lineStyle(4, 0x5D4037, 1);
        actionBtnBg.strokeRoundedRect(-halfWidth, -halfHeight, btnWidth, btnHeight, 15);
        
        const actionBtnText = this.add.text(0, 0, 'CLOSE', {
            font: '900 56px Inter',
            fill: '#FFF8DC',
            stroke: '#3E2723',
            strokeThickness: 5
        }).setOrigin(0.5);
        
        actionBtnContainer.add([actionBtnBg, actionBtnText]);
        
        const actionHitArea = new Phaser.Geom.Rectangle(-halfWidth, -halfHeight, btnWidth, btnHeight);
        actionBtnContainer.setInteractive(actionHitArea, Phaser.Geom.Rectangle.Contains);
        
        actionBtnContainer.on('pointerover', () => {
            actionBtnContainer.setScale(1.05);
            actionBtnBg.clear();
            actionBtnBg.fillStyle(0x3E2723, 0.6);
            actionBtnBg.fillRoundedRect(-halfWidth + 2, -halfHeight + 2, btnWidth, btnHeight, 15);
            actionBtnBg.fillStyle(0xA1887F, 1);
            actionBtnBg.fillRoundedRect(-halfWidth, -halfHeight, btnWidth, btnHeight, 15);
            actionBtnBg.lineStyle(4, 0x5D4037, 1);
            actionBtnBg.strokeRoundedRect(-halfWidth, -halfHeight, btnWidth, btnHeight, 15);
        });
        
        actionBtnContainer.on('pointerout', () => {
            actionBtnContainer.setScale(1);
            actionBtnBg.clear();
            actionBtnBg.fillStyle(0x3E2723, 0.6);
            actionBtnBg.fillRoundedRect(-halfWidth + 2, -halfHeight + 2, btnWidth, btnHeight, 15);
            actionBtnBg.fillStyle(0x8D6E63, 1);
            actionBtnBg.fillRoundedRect(-halfWidth, -halfHeight, btnWidth, btnHeight, 15);
            actionBtnBg.lineStyle(4, 0x5D4037, 1);
            actionBtnBg.strokeRoundedRect(-halfWidth, -halfHeight, btnWidth, btnHeight, 15);
        });
        
        // NEW GAME Button (RIGHT)
        // Moving left together with CONTINUE button
        const rightBtnX = 398 - 140;
        
        const newGameBtnContainer = this.add.container(rightBtnX, 0);
        const newGameBtnBg = this.add.graphics();
        
        // Draw button background
        newGameBtnBg.fillStyle(0x3E2723, 0.6);
        newGameBtnBg.fillRoundedRect(-halfWidth + 2, -halfHeight + 2, btnWidth, btnHeight, 15);
        newGameBtnBg.fillStyle(0x8D6E63, 1);
        newGameBtnBg.fillRoundedRect(-halfWidth, -halfHeight, btnWidth, btnHeight, 15);
        newGameBtnBg.lineStyle(4, 0x5D4037, 1);
        newGameBtnBg.strokeRoundedRect(-halfWidth, -halfHeight, btnWidth, btnHeight, 15);
        
        const newGameBtnText = this.add.text(0, 0, 'NEW GAME', {
            font: '900 56px Inter',
            fill: '#FFF8DC',
            stroke: '#3E2723',
            strokeThickness: 5
        }).setOrigin(0.5);
        
        newGameBtnContainer.add([newGameBtnBg, newGameBtnText]);
        
        const newGameHitArea = new Phaser.Geom.Rectangle(-halfWidth, -halfHeight, btnWidth, btnHeight);
        newGameBtnContainer.setInteractive(newGameHitArea, Phaser.Geom.Rectangle.Contains);
        
        newGameBtnContainer.on('pointerover', () => {
            newGameBtnContainer.setScale(1.05);
            newGameBtnBg.clear();
            newGameBtnBg.fillStyle(0x3E2723, 0.6);
            newGameBtnBg.fillRoundedRect(-halfWidth + 2, -halfHeight + 2, btnWidth, btnHeight, 15);
            newGameBtnBg.fillStyle(0xA1887F, 1);
            newGameBtnBg.fillRoundedRect(-halfWidth, -halfHeight, btnWidth, btnHeight, 15);
            newGameBtnBg.lineStyle(4, 0x5D4037, 1);
            newGameBtnBg.strokeRoundedRect(-halfWidth, -halfHeight, btnWidth, btnHeight, 15);
        });
        
        newGameBtnContainer.on('pointerout', () => {
            newGameBtnContainer.setScale(1);
            newGameBtnBg.clear();
            newGameBtnBg.fillStyle(0x3E2723, 0.6);
            newGameBtnBg.fillRoundedRect(-halfWidth + 2, -halfHeight + 2, btnWidth, btnHeight, 15);
            newGameBtnBg.fillStyle(0x8D6E63, 1);
            newGameBtnBg.fillRoundedRect(-halfWidth, -halfHeight, btnWidth, btnHeight, 15);
            newGameBtnBg.lineStyle(4, 0x5D4037, 1);
            newGameBtnBg.strokeRoundedRect(-halfWidth, -halfHeight, btnWidth, btnHeight, 15);
        });
        
        newGameBtnContainer.on('pointerdown', () => {
            audioManager.playClick();
            this.showNewGameWarning();
        });
        
        // Add both buttons to the flex container
        buttonsFlexContainer.add(actionBtnContainer);
        buttonsFlexContainer.add(newGameBtnContainer);
        
        // Add flex container to stats modal
        this.statsContainer.add(buttonsFlexContainer);
        
        // Store references for button manager
        this.statsActionBtn = actionBtnText;
        this.statsActionBtnContainer = actionBtnContainer;
        this.statsActionBtnBg = actionBtnBg;
        
        // Register with button manager
        this.buttonManager.setButtons(null, actionBtnContainer);
        
        console.log('🔘 BUTTON LAYOUT (PERFECTLY CENTERED):', {
            gap: buttonGap,
            leftBtnX: leftBtnX,
            rightBtnX: rightBtnX,
            buttonWidth: btnWidth,
            leftEdge: leftBtnX - halfWidth,
            rightEdge: rightBtnX + halfWidth
        });
    }

    shareStats() {
        audioManager.playClick();
        
        const balance = this.formatWool(this.balance);
        let text = `I'm a Level ${this.playerLevel} Shepherd in Sheep Market! 🐑\nNet Worth: ${balance}W`;

        // Customize message based on context
        if (this.recentLevelResult) {
            if (this.recentLevelResult.profit > 0) {
                text = `Just bagged ${this.formatWool(this.recentLevelResult.profit)}W in the Sheep Market! 🐑📈\nNet Worth: ${balance}W`;
            }
            if (this.recentLevelResult.nextAction && this.recentLevelResult.nextAction.includes('LEVEL')) {
                text = `I just passed the Exam and unlocked Level ${this.playerLevel} in Sheep Market! 🎓🐑\nNet Worth: ${balance}W`;
            }
        }
        
        const shareData = {
            title: 'Sheep Market',
            text: text,
            url: window.location.href
        };

        if (navigator.share) {
            navigator.share(shareData).catch(() => {});
        } else {
            // Fallback to clipboard
            navigator.clipboard.writeText(`${text} ${window.location.href}`).then(() => {
                this.showToast("COPIED TO CLIPBOARD!");
            }).catch(() => {
                this.showToast("COPY FAILED");
            });
        }
    }

    showToast(msg) {
        const toast = this.add.text(0, 420, msg, {
            font: 'bold 20px Inter',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);
        this.statsContainer.add(toast);
        
        this.tweens.add({
            targets: toast,
            y: 380,
            alpha: 0,
            duration: 1000,
            delay: 1000,
            onComplete: () => toast.destroy()
        });
    }

    updateBalanceGraph() {
        if (this.graphContainer) {
            this.graphContainer.removeAll(true);
        } else {
            return;
        }

        // 1. Reconstruct Balance History
        // Start from current balance and work backwards using trade history
        let currentBal = this.balance;
        
        // Points: { x (index), y (value) }
        // We want roughly 10-20 points max for the graph.
        // tradeHistory has all trades in 24h.
        
        // Clone and reverse to go Newest -> Oldest
        const historyRev = this.tradeHistory.slice().reverse();
        
        // Build array of balances: [Current, Prev1, Prev2, ...]
        const balances = [currentBal];
        
        // Limit to last 20 trades for the graph to keep it readable
        const limit = Math.min(historyRev.length, 20);
        
        for (let i = 0; i < limit; i++) {
            const trade = historyRev[i];
            // Previous balance = Current - Profit (Profit can be negative)
            const prevBal = currentBal - trade.profit;
            balances.push(prevBal);
            currentBal = prevBal;
        }
        
        // Now reverse back to get Oldest -> Newest for plotting
        // balances is now [Current, ..., Oldest]
        // We want [Oldest, ..., Current]
        const plotData = balances.reverse();
        
        // 2. Draw Graph
        const width = 500;
        const height = 100;
        const startX = -width / 2;
        const startY = 0; // Center Y of the container is 90 relative to stats
        
        // Background for graph
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.3);
        bg.fillRoundedRect(startX - 10, -height/2 - 10, width + 20, height + 20, 10);
        this.graphContainer.add(bg);

        if (plotData.length < 2) {
            const noData = this.add.text(0, 0, "PLAY MORE TO SEE TRENDS", {
                font: 'bold 16px Inter',
                fill: '#666'
            }).setOrigin(0.5);
            this.graphContainer.add(noData);
            return;
        }

        // Calculate Min/Max for scaling
        let minVal = Math.min(...plotData);
        let maxVal = Math.max(...plotData);
        
        // Add some padding to min/max so lines don't touch edges
        const range = maxVal - minVal;
        const padding = range === 0 ? 10 : range * 0.2;
        minVal -= padding;
        maxVal += padding;
        
        const safeRange = maxVal - minVal || 1; // Prevent divide by zero

        const gfx = this.add.graphics();
        gfx.lineStyle(3, 0xfcd535, 1); // Gold Line
        
        const stepX = width / (plotData.length - 1);
        
        const points = [];

        plotData.forEach((val, i) => {
            const x = startX + (i * stepX);
            // Normalize Y: 0 at bottom (height/2), 1 at top (-height/2)
            // Value ratio: (val - min) / range
            // Y Pixel: (height/2) - (ratio * height)
            const ratio = (val - minVal) / safeRange;
            const y = (height / 2) - (ratio * height);
            
            points.push({ x, y, val });
            
            if (i === 0) {
                gfx.moveTo(x, y);
            } else {
                gfx.lineTo(x, y);
            }
        });
        
        gfx.strokePath();
        
        // Add Area Fill (Gradient-ish using multiple lines or just fill)
        // Simple fill: Close path to bottom
        const fillGfx = this.add.graphics();
        fillGfx.fillStyle(0xfcd535, 0.1);
        fillGfx.beginPath();
        fillGfx.moveTo(points[0].x, height/2); // Start Bottom Left
        points.forEach(p => fillGfx.lineTo(p.x, p.y));
        fillGfx.lineTo(points[points.length-1].x, height/2); // End Bottom Right
        fillGfx.closePath();
        fillGfx.fillPath();

        this.graphContainer.add([fillGfx, gfx]);

        // Add dots for data points
        points.forEach((p, i) => {
            // Determine if this is a "major" point (start, end, or significant peak/valley)
            // We use this to decide default visibility, but ALL points are interactive.
            const isExtremum = (i > 0 && i < points.length - 1) && 
                ((p.val > points[i-1].val && p.val > points[i+1].val) || 
                 (p.val < points[i-1].val && p.val < points[i+1].val));
            
            const isVisible = (i === 0 || i === points.length - 1 || isExtremum);
            
            // Visual Dot
            const dot = this.add.circle(p.x, p.y, 4, 0xfcd535);
            dot.setAlpha(isVisible ? 1 : 0); // Hidden unless important
            this.graphContainer.add(dot);
            
            // Interactive Hit Zone (Larger and always active)
            const hitZone = this.add.circle(p.x, p.y, 15, 0xffffff, 0); // Transparent
            hitZone.setInteractive({ useHandCursor: true });
            this.graphContainer.add(hitZone);
            
            hitZone.on('pointerover', () => {
                // Highlight Dot
                dot.setAlpha(1);
                dot.setScale(1.5);
                this.showGraphTooltip(p.x, p.y - 15, p.val);
                audioManager.playTyping(); // Subtle feedback
            });
            
            hitZone.on('pointerout', () => {
                // Restore Dot
                if (!isVisible) dot.setAlpha(0);
                dot.setScale(1);
                this.hideGraphTooltip();
            });
        });
    }

    showGraphTooltip(x, y, val) {
        if (this.graphTooltip) {
            this.graphTooltip.destroy();
        }
        
        this.graphTooltip = this.add.container(x, y - 10);
        this.graphTooltip.setDepth(3100); // Above modal contents

        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.9);
        bg.lineStyle(1, 0xfcd535);
        bg.fillRoundedRect(-40, -35, 80, 30, 8);
        bg.strokeRoundedRect(-40, -35, 80, 30, 8);
        
        // Triangle pointer
        bg.beginPath();
        bg.moveTo(-6, -5);
        bg.lineTo(6, -5);
        bg.lineTo(0, 2);
        bg.closePath();
        bg.fillPath();
        bg.strokePath();

        const text = this.add.text(0, -20, `${this.formatWool(val)}W`, {
            font: 'bold 16px Inter',
            fill: '#ffffff'
        }).setOrigin(0.5);

        this.graphTooltip.add([bg, text]);
        
        // Add to graph container so it moves with it
        this.graphContainer.add(this.graphTooltip);
        
        // Animate in
        this.graphTooltip.setScale(0);
        this.tweens.add({
            targets: this.graphTooltip,
            scale: 1,
            y: y, // Move down slightly to final pos
            duration: 200,
            ease: 'Back.out'
        });
    }

    hideGraphTooltip() {
        if (this.graphTooltip) {
            this.tweens.add({
                targets: this.graphTooltip,
                scale: 0,
                alpha: 0,
                duration: 150,
                onComplete: () => {
                    if (this.graphTooltip) this.graphTooltip.destroy();
                    this.graphTooltip = null;
                }
            });
        }
    }

    updateHistoryLog() {
        // Clear previous history rows if any
        if (this.historyContainer) {
            this.historyContainer.destroy();
        }
        this.historyContainer = this.add.container(0, 0);
        this.statsContainer.add(this.historyContainer);

        // Get last 3 transactions (Reduced from 4 to fit graph)
        const recent = this.tradeHistory.slice().reverse().slice(0, 3);
        
        if (recent.length === 0) {
            const noData = this.add.text(0, 85, "NO TRADES YET", { 
                font: 'bold 20px Inter', 
                fill: '#555' 
            }).setOrigin(0.5);
            this.historyContainer.add(noData);
            return;
        }

        let yPos = 85; // Start below RECENT ACTIVITY header at Y:50
        recent.forEach(t => {
            const isWin = t.profit > 0;
            const sign = isWin ? '+' : '';
            const color = isWin ? '#44ff44' : '#ff4444';
            const text = `${isWin ? 'WIN' : 'LOSS'}   ${sign}${this.formatWool(t.profit)}W`;
            
            // Time (e.g., "2m ago")
            const secondsAgo = Math.floor((Date.now() - t.time) / 1000);
            let timeStr = 'Just now';
            if (secondsAgo > 60) timeStr = `${Math.floor(secondsAgo/60)}m ago`;
            else if (secondsAgo > 0) timeStr = `${secondsAgo}s ago`;

            const rowBg = this.add.graphics();
            rowBg.fillStyle(isWin ? 0x44ff44 : 0xff4444, 0.05);
            rowBg.fillRoundedRect(-250, yPos - 18, 500, 36, 8);

            const resultText = this.add.text(-230, yPos, text, {
                font: 'bold 22px Inter',
                fill: color
            }).setOrigin(0, 0.5);

            const timeText = this.add.text(230, yPos, timeStr, {
                font: '16px Inter',
                fill: '#888'
            }).setOrigin(1, 0.5);

            this.historyContainer.add([rowBg, resultText, timeText]);
            yPos += 42;
        });
    }

    createStatRow(y, labelText, valueText, color = '#fff', isBig = false) {
        const row = this.add.container(0, y);
        const label = this.add.text(-280, 0, labelText, { font: '900 20px Inter', fill: '#888' }).setOrigin(0, 0.5);
        
        // Small wool coin next to the value
        const coin = this.add.image(260, 0, 'wool').setScale(0.08);
        const value = this.add.text(230, 0, valueText, { 
            font: isBig ? '900 36px Inter' : 'bold 28px Inter', 
            fill: color 
        }).setOrigin(1, 0.5);
        
        row.add([label, coin, value]);
        this.statsContainer.add(row);
        return value;
    }
    
    createCompactStatRow(y, labelText, valueText, color = '#ffffff') {
        // Compact two-column layout for the new wallet design
        const row = this.add.container(0, y);
        const label = this.add.text(-580, 0, labelText, { 
            font: 'bold 22px Inter', 
            fill: '#888888' 
        }).setOrigin(0, 0.5);
        
        const value = this.add.text(580, 0, valueText, { 
            font: 'bold 28px Inter', 
            fill: color 
        }).setOrigin(1, 0.5);
        
        row.add([label, value]);
        this.statsContainer.add(row);
        return value;
    }

    handleStatsClose() {
        // DEPRECATED - This function is now handled by WoolWalletButtonManager
        // Keeping this stub for backwards compatibility with any old references
        console.warn('handleStatsClose() called but is deprecated. Use WoolWalletButtonManager instead.');
        
        // Route to button manager based on current state
        if (this.isPauseMode) {
            this.buttonManager.handleContinue();
        } else if (this.isWinModal) {
            this.buttonManager.handleNextLevel();
        } else if (this.isLossModal) {
            this.buttonManager.handleTryAgain();
        }
    }
    
    // OLD CODE - Flying animation and executeNextLevelAction removed
    // This is now dead code, keeping for reference in case needed
    handleStatsClose_OLD() {
        const flyCoin = this.add.image(CONFIG.width / 2, CONFIG.height / 2, 'wool').setScale(1.2).setDepth(5000);
        
        audioManager.playCoin();
        
        this.tweens.add({
            targets: flyCoin,
            x: 90, // Wallet Coin X
            y: 87, // Wallet Coin Y
            scale: 0.2,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                flyCoin.destroy();
                // Visual bounce on wallet
                if (this.walletCoin) {
                     this.walletCoin.clearTint();
                     this.walletCoin.setAlpha(1);
                     this.tweens.add({ targets: this.walletCoin, scale: 0.4, duration: 100, yoyo: true });
                     audioManager.playWalletImpact();
                }

                // --- DELAYED WIN CELEBRATION LOGIC ---
                // If the display balance is lagging behind the actual balance (because we suppressed the update)
                // Trigger the spin and celebration NOW.
                const diff = this.balance - this.displayBalance;
                
                // Check if player actually earned wool (had a bet and won)
                const hasWoolGains = diff > 0.01 && 
                                     this.recentLevelResult && 
                                     !this.recentLevelResult.noBet && // Don't celebrate if no bet was placed
                                     this.recentLevelResult.profit > 0; // Only celebrate actual gains
                
                if (hasWoolGains) {
                    // 1. Play Large Gain Sound
                    audioManager.playWalletGainLarge();

                    // 2. Confetti removed per user request

                    // 3. Spin the Balance Text
                    // Use the same logic as balance-updated event but manually triggered
                    const duration = Math.min(2000, Math.max(1000, Math.abs(diff) * 15));
                    
                    // Kill previous tween
                    if (this.balanceTween) this.balanceTween.stop();
                    
                    this.balanceTween = this.tweens.add({
                        targets: this,
                        displayBalance: this.balance,
                        duration: duration,
                        ease: 'Cubic.easeOut', 
                        onUpdate: () => {
                            const val = Math.floor(this.displayBalance);
                            this.balanceText.setText(`${this.formatWool(val)}W`);
                        },
                        onComplete: () => {
                            // Only AFTER the spin is done do we proceed to next level logic
                        }
                    });

                } else {
                    // No significant change (Loss or neutral or no bet), proceed immediately
                }
            }
        });
    }

    playLevelAdvancementCelebration(onComplete) {
        // 1. SCREEN FLASH (Gold)
        const flash = this.add.rectangle(CONFIG.width / 2, CONFIG.height / 2, CONFIG.width, CONFIG.height, 0xfcd535, 0);
        flash.setDepth(6000);
        this.tweens.add({
            targets: flash,
            alpha: 0.6,
            duration: 150,
            yoyo: true,
            repeat: 2,
            onComplete: () => flash.destroy()
        });

        // 2. MASSIVE CONFETTI BURST
        this.showMassiveConfetti();

        // 3. CELEBRATION TEXT
        const celebText = this.add.text(CONFIG.width / 2, CONFIG.height / 2 - 100, '🎉 LEVEL UP! 🎉', {
            font: '900 80px Inter',
            fill: '#fcd535',
            stroke: '#000000',
            strokeThickness: 12
        }).setOrigin(0.5).setDepth(6001).setAlpha(0).setScale(0.5);

        this.tweens.add({
            targets: celebText,
            alpha: 1,
            scale: 1.3,
            duration: 600,
            ease: 'Elastic.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: celebText,
                    alpha: 0,
                    y: celebText.y - 100,
                    duration: 800,
                    delay: 1000,
                    onComplete: () => celebText.destroy()
                });
            }
        });

        // 4. WOOL COINS EXPLOSION from wallet
        this.createWoolCoinExplosion();

        // 5. SCREEN SHAKE
        this.cameras.main.shake(400, 0.008);

        // 6. AUDIO
        audioManager.playCoin();
        this.time.delayedCall(200, () => audioManager.playWalletGainLarge());
        this.time.delayedCall(400, () => audioManager.playFlock());

        // Wait for celebration to finish before transitioning
        this.time.delayedCall(2500, onComplete);
    }

    showMassiveConfetti() {
        // Create 3 waves of confetti
        for (let wave = 0; wave < 3; wave++) {
            this.time.delayedCall(wave * 300, () => {
                const emitter = this.add.particles(0, 0, 'wool', {
                    x: { min: 0, max: CONFIG.width },
                    y: -100,
                    scale: { start: 0.15, end: 0 },
                    speedY: { min: 300, max: 600 },
                    speedX: { min: -150, max: 150 },
                    rotate: { min: 0, max: 360 },
                    lifespan: 4000,
                    quantity: 8,
                    gravityY: 200,
                    tint: [0xfcd535, 0xffffff, 0x44ff44, 0xff4444]
                });
                emitter.setDepth(5999);

                this.time.delayedCall(3000, () => {
                    emitter.stop();
                    this.time.delayedCall(4000, () => emitter.destroy());
                });
            });
        }
    }

    createWoolCoinExplosion() {
        // Explode wool coins from the wallet position
        const walletX = 90;
        const walletY = 87;

        for (let i = 0; i < 20; i++) {
            this.time.delayedCall(i * 50, () => {
                const coin = this.add.image(walletX, walletY, 'wool').setScale(0.2).setDepth(6000);
                const angle = (Math.PI * 2 / 20) * i;
                const distance = 200 + Math.random() * 100;
                const targetX = walletX + Math.cos(angle) * distance;
                const targetY = walletY + Math.sin(angle) * distance;

                this.tweens.add({
                    targets: coin,
                    x: targetX,
                    y: targetY,
                    scale: 0.3,
                    alpha: 0,
                    rotation: Math.PI * 4,
                    duration: 1000 + Math.random() * 500,
                    ease: 'Cubic.easeOut',
                    onComplete: () => coin.destroy()
                });
            });
        }
    }


    populateStatsModalForLevelEnd() {
        // Populate comprehensive wallet with current round + all-time stats
        if (!this.statLabels) return;
        
        // ENDLESS MODE: Customize display for endless mode
        if (this.isEndlessMode) {
            // Update round display instead of level
            if (this.currentLevelValue) {
                this.currentLevelValue.setText(`${this.endlessRound}`);
            }
            
            // Update header for endless mode
            if (this.sectionLabel1) {
                const resultText = this.recentLevelResult?.nextAction === 'ENDLESS_NEXT_ROUND' ? 'COMPLETE' : 'GAME OVER';
                // Show the completed round number (current round - 1 since we already advanced)
                const displayRound = resultText === 'COMPLETE' ? this.endlessRound - 1 : this.endlessRound;
                this.sectionLabel1.setText(`ROUND ${displayRound}: ${resultText}`);
            }
            
            // Track and display endless mode high scores
            const currentHighestRound = parseInt(localStorage.getItem('endless_highScore') || '0');
            const currentBestBalance = parseFloat(localStorage.getItem('endless_bestBalance') || '0');
            
            // Update high scores if current round/balance is better
            if (this.endlessRound > currentHighestRound) {
                localStorage.setItem('endless_highScore', this.endlessRound.toString());
                console.log(`🏆 NEW ENDLESS HIGH SCORE: Round ${this.endlessRound}`);
            }
            
            if (this.balance > currentBestBalance) {
                localStorage.setItem('endless_bestBalance', this.balance.toFixed(2));
                console.log(`💰 NEW ENDLESS BEST BALANCE: ${this.balance}W`);
            }
            
            // Display high scores (if stat labels exist for them)
            // Note: These labels may not exist in current modal, would need to be added
        } else {
            // Normal mode: Update Current Level Display
            if (this.currentLevelValue) {
                this.currentLevelValue.setText(`${this.activeLevel}`);
            }
            
            // 1️⃣ UPDATE HEADER: WON or LOST
            if (this.sectionLabel1) {
                const resultText = this.recentLevelResult?.nextAction !== 'RETRY' ? 'WON' : 'LOST';
                this.sectionLabel1.setText(`LEVEL ${this.activeLevel}: ${resultText}`);
            }
        }
        
        // SECTION A: CURRENT LEVEL STATS
        // Final Call Display - removed from UI in reorganization
        // Information now shown in OUTCOME field instead
        
        // Pull all values from recentLevelResult (single source of truth from GameScene)
        const result = this.recentLevelResult;
        const woolSpent   = (result && result.woolSpent   !== undefined) ? result.woolSpent   : 0;
        const woolEarned  = (result && result.woolEarned  !== undefined) ? result.woolEarned  : 0;
        const startingBal = (result && result.startingBalance !== undefined) ? result.startingBalance : this.sessionStartWool;
        const finalBal    = (result && result.balance     !== undefined) ? result.balance     : this.balance;

        // Verify: finalBal should equal startingBal + woolEarned - woolSpent
        const expectedFinal = startingBal + woolEarned - woolSpent;
        if (Math.abs(finalBal - expectedFinal) > 0.05) {
            console.warn(`⚠️ Wallet mismatch: startingBal(${startingBal}) + earned(${woolEarned}) - spent(${woolSpent}) = ${expectedFinal}, but balance is ${finalBal}`);
        }

        // Wool Spent This Round
        if (this.statLabels.woolSpent) {
            this.statLabels.woolSpent.setText(`-${this.formatWool(woolSpent)}W`);
        }

        // Starting balance display
        if (this.statLabels.startingBalance) {
            this.statLabels.startingBalance.setText(`${this.formatWool(startingBal)}W`);
        }

        // Wool earned (gross payout from winning calls)
        if (this.statLabels.woolEarned) {
            this.statLabels.woolEarned.setText(`+${this.formatWool(woolEarned)}W`);
        }

        // Final total
        if (this.statLabels.totalBalance) {
            this.statLabels.totalBalance.setText(`${this.formatWool(finalBal)}W`);
        }
        
        // Level Gains and Losses (from current level only)
        if (result) {
            const levelGains = result.levelGains || 0;
            const levelLosses = result.levelLosses || 0;
            
            // Level Gains - show actual gains from winning calls
            if (this.statLabels.levelGains) this.statLabels.levelGains.setText(`+${this.formatWool(levelGains)}W`);
            
            // Level Losses - show actual wool lost from losing calls
            if (this.statLabels.levelLosses) this.statLabels.levelLosses.setText(`-${this.formatWool(levelLosses)}W`);
        } else {
            if (this.statLabels.levelGains) this.statLabels.levelGains.setText(`+${this.formatWool(0)}W`);
            if (this.statLabels.levelLosses) this.statLabels.levelLosses.setText(`-${this.formatWool(0)}W`);
        }
        
        // Level Outcome (always white text)
        if (this.recentLevelResult) {
            // Stop any existing blink animation when outcome is finalized
            this.stopInProgressBlink();
            
            // Check if this is a forced restart (0W + no gains)
            if (this.isForcedRestartModal) {
                // Special message for forced restart
                this.statLabels.levelOutcome.setText('NO MORE WOOL TO PLAY WITH!');
                this.statLabels.levelOutcome.setColor('#FF4444'); // Red color for emphasis
                // Use 85% of screen width to ensure padding, with max of 800px for large screens
                const maxTextWidth = Math.min(CONFIG.width * 0.85, 800);
                this.fitTextToWidth(this.statLabels.levelOutcome, maxTextWidth, 50, 32);
            } else if (this.recentLevelResult.noBet) {
                // No calls made
                this.statLabels.levelOutcome.setText('NO CALLS MADE');
                this.statLabels.levelOutcome.setColor('#ffffff'); // Always white
                const maxTextWidth = Math.min(CONFIG.width * 0.85, 800);
                this.fitTextToWidth(this.statLabels.levelOutcome, maxTextWidth, 50, 32);
            } else if (this.recentLevelResult.finalCallCorrect !== undefined) {
                // Calls were made, show result
                const outcome = this.recentLevelResult.finalCallCorrect ? 'YOU READ THE HERD.' : 'YOU MISREAD THE HERD.';
                this.statLabels.levelOutcome.setText(outcome);
                this.statLabels.levelOutcome.setColor('#ffffff'); // Always white
                const maxTextWidth = Math.min(CONFIG.width * 0.85, 800);
                this.fitTextToWidth(this.statLabels.levelOutcome, maxTextWidth, 50, 32);
            }
        }
        
        // Level Bonuses (reset each level)
        const currentLevelBonusTotal = this.levelBonuses ? this.levelBonuses.reduce((sum, bonus) => sum + bonus.amount, 0) : 0;
        
        // Display bonuses in the white value field
        let bonusDisplay = '0W';
        
        // Show starting bonus only in Level 1
        if (this.activeLevel === 1) {
            bonusDisplay = `STARTING BONUS +${this.formatWool(this.startingBonus)}W`;
        }
        
        // Add additional bonuses if any
        if (currentLevelBonusTotal > 0) {
            const lastBonus = this.levelBonuses[this.levelBonuses.length - 1];
            if (this.activeLevel === 1) {
                bonusDisplay += ` | (${lastBonus.type}) +${this.formatWool(currentLevelBonusTotal)}W`;
            } else {
                bonusDisplay = `(${lastBonus.type}) +${this.formatWool(currentLevelBonusTotal)}W`;
            }
        }
        
        this.statLabels.levelBonuses.setText(bonusDisplay);
        this.statLabels.levelBonuses.setColor('#ffffff');
        this.fitTextToWidth(this.statLabels.levelBonuses, 800, 50, 24);
        
        // SECTION B: ALL-TIME STATS (LEFT COLUMN) - REMOVED
        // All-time stats section was removed from the modal
        // this.statLabels.allTimeGains.setText(`+${this.formatWool(this.lifetimeGains)}W`);
        // this.statLabels.allTimeLosses.setText(`-${this.formatWool(this.lifetimeLosses)}W`);
        // this.statLabels.totalSpentCalls.setText(`-${this.formatWool(this.lifetimeSpentCalls)}W`);
        
        // Net Profit = Gains - Losses (does NOT include spending)
        const netProfit = this.lifetimeGains - this.lifetimeLosses;
        const netSign = netProfit >= 0 ? '+' : '';
        // this.statLabels.netWool.setText(`${netSign}${this.formatWool(Math.abs(netProfit))}W`);
        // this.statLabels.netWool.setColor(netProfit >= 0 ? '#44ff44' : '#ff4444');
        
        // this.statLabels.bestCall.setText(`+${this.formatWool(this.lifetimeBestCall)}W`);
        
        // totalBalance already set above from recentLevelResult — no duplicate set needed
        
        // SECTION C: GRAPHS
        this.updateBalanceHistoryGraph();
        this.updateLevelPerformanceChart();
        this.updateModalPnLSparkline(); // Update PnL trend graph
        
        // SECTION A2: LEVEL CALL BREAKDOWN
        if (this.levelCallBreakdownDOM) {
            this.updateLevelCallBreakdownDisplay();
        }
        
        // SECTION D: FINAL CALL HISTORY
        this.updateFinalCallHistoryDisplay();
        
        // SECTION E: PERFORMANCE INDICATORS
        this.updatePerformanceIndicators();
        
        // Button Configuration - Now handled by WoolWalletButtonManager
        // Determine state based on result
        
        // 1. FORCED RESTART (0W balance) always takes absolute priority
        if (this.isForcedRestartModal) {
            this.isWinModal = false;
            this.isLossModal = false;
            this.buttonManager.setState('FORCED_RESTART');
            console.log('🚫 Wool Wallet: FORCED_RESTART state activated');
            return; // Exit early, do not set WIN/LOSS
        }

        // Determine state based on result
        const action = this.recentLevelResult ? this.recentLevelResult.nextAction : 'RETRY';
        const isWin = action !== 'RETRY';
        
        // Set appropriate state
        if (isWin) {
            this.isWinModal = true;
            this.isLossModal = false;
            this.buttonManager.setState('WIN');
        } else {
            this.isWinModal = false;
            this.isLossModal = true;
            this.buttonManager.setState('LOSS');
        }
    }

    updateFinalCallDisplayInModal() {
        // Real-time update of Final Call display in Wool Wallet
        // Called when finalCallSide changes during active gameplay
        // Note: Final Call field removed from UI in reorganization
        // Information now integrated into OUTCOME field
        return;
    }

    handleEscapeKey() {
        // ESC key handler - Close Wool Wallet if open
        // Only works on desktop/keyboard platforms
        
        // Check if modal is currently open
        if (!this.statsContainer || this.statsContainer.alpha === 0) {
            return; // Modal not open, do nothing
        }
        
        // Determine which state we're in and call appropriate handler
        if (this.isPauseMode) {
            // PAUSED state - Continue gameplay
            this.buttonManager.handleContinue();
        } else if (this.isLossModal) {
            // LOSS state - Try Again (restart level)
            this.buttonManager.handleTryAgain();
        } else if (this.isWinModal) {
            // WIN state - Next Level
            this.buttonManager.handleNextLevel();
        } else {
            // Fallback - just toggle modal closed
            this.toggleStatsModal();
        }
    }

    handleEnterKey() {
        // ENTER key handler - Activate visible Wool Wallet button
        // Only works on desktop/keyboard platforms
        
        // Check if modal is currently open
        if (!this.statsContainer || this.statsContainer.alpha === 0) {
            return; // Modal not open, do nothing
        }
        
        // Determine which state we're in and call appropriate handler
        // ENTER key activates the currently visible button
        if (this.isPauseMode) {
            // PAUSED state - CONTINUE button is visible
            this.buttonManager.handleContinue();
        } else if (this.isLossModal) {
            // LOSS state - TRY AGAIN button is visible
            this.buttonManager.handleTryAgain();
        } else if (this.isWinModal) {
            // WIN state - NEXT LEVEL button is visible
            this.buttonManager.handleNextLevel();
        }
        // No fallback needed - ENTER only works when a specific button is visible
    }

    createEndlessModeGameOverPopup() {
        // ENDLESS MODE GAME OVER POPUP - Similar style to Level 12 victory
        this.endlessGameOverContainer = this.add.container(CONFIG.width / 2, CONFIG.height / 2);
        this.endlessGameOverContainer.setAlpha(0);
        this.endlessGameOverContainer.setScale(0.5);
        this.endlessGameOverContainer.setDepth(15000);

        const modalWidth = 1000;  // Reduced from 1400
        const modalHeight = 900;  // Reduced from 1400

        // Background - Dark leather wallet style
        const modalBg = this.add.graphics();
        modalBg.fillStyle(0x3E2723, 0.9);
        modalBg.fillRoundedRect(-modalWidth/2 + 8, -modalHeight/2 + 8, modalWidth, modalHeight, 20);
        modalBg.fillStyle(0x7f4d32, 1);
        modalBg.fillRoundedRect(-modalWidth/2, -modalHeight/2, modalWidth, modalHeight, 20);
        modalBg.fillStyle(0x9a6040, 0.3);
        modalBg.fillRoundedRect(-modalWidth/2, -modalHeight/2, modalWidth, 15, 20);
        modalBg.fillRoundedRect(-modalWidth/2, -modalHeight/2, 15, modalHeight, 20);
        modalBg.fillStyle(0x5D4037, 0.4);
        modalBg.fillRoundedRect(-modalWidth/2, modalHeight/2 - 15, modalWidth, 15, 20);
        modalBg.fillRoundedRect(modalWidth/2 - 15, -modalHeight/2, 15, modalHeight, 20);
        modalBg.lineStyle(8, 0x5D4037, 1);
        modalBg.strokeRoundedRect(-modalWidth/2, -modalHeight/2, modalWidth, modalHeight, 20);
        modalBg.lineStyle(3, 0x9a6040, 0.5);
        modalBg.strokeRoundedRect(-modalWidth/2 + 5, -modalHeight/2 + 5, modalWidth - 10, modalHeight - 10, 18);
        this.endlessGameOverContainer.add(modalBg);

        // Title
        const title = this.add.text(0, -modalHeight/2 + 70, 'ENDLESS MODE', {
            font: '900 56px Inter',  // Reduced from 80px
            fill: '#efcf7a',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);
        this.endlessGameOverContainer.add(title);

        // Game Over subtitle
        const subtitle = this.add.text(0, -modalHeight/2 + 140, 'GAME OVER', {
            font: '900 48px Inter',  // Reduced from 64px
            fill: '#ff6666',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5);
        this.endlessGameOverContainer.add(subtitle);

        // Divider
        const divider1 = this.add.graphics();
        divider1.lineStyle(4, 0xefcf7a, 0.8);
        divider1.lineBetween(-modalWidth/2 + 60, -modalHeight/2 + 180, modalWidth/2 - 60, -modalHeight/2 + 180);
        this.endlessGameOverContainer.add(divider1);

        // Stats labels
        this.endlessStatsLabels = {};
        let currentY = -modalHeight/2 + 240;
        const lineHeight = 70;  // Reduced from 90

        // Rounds Played
        const roundsLabel = this.add.text(0, currentY, 'ROUNDS PLAYED', {
            font: '700 32px Inter',  // Reduced from 48px
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);
        this.endlessGameOverContainer.add(roundsLabel);
        
        currentY += 50;  // Reduced from 70
        this.endlessStatsLabels.roundsSurvived = this.add.text(0, currentY, '0', {
            font: '900 52px Inter',  // Reduced from 72px
            fill: '#efcf7a',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5);
        this.endlessGameOverContainer.add(this.endlessStatsLabels.roundsSurvived);

        currentY += lineHeight;

        // Final Balance
        const balanceLabel = this.add.text(0, currentY, 'FINAL BALANCE', {
            font: '700 32px Inter',
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);
        this.endlessGameOverContainer.add(balanceLabel);
        
        currentY += 50;
        this.endlessStatsLabels.finalBalance = this.add.text(0, currentY, '0W', {
            font: '900 52px Inter',
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5);
        this.endlessGameOverContainer.add(this.endlessStatsLabels.finalBalance);

        currentY += lineHeight;

        // Final Bids Won/Lost
        const bidsLabel = this.add.text(0, currentY, 'FINAL BIDS WON / LOST', {
            font: '700 32px Inter',
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);
        this.endlessGameOverContainer.add(bidsLabel);
        
        currentY += 50;
        this.endlessStatsLabels.bidsWonLost = this.add.text(0, currentY, '0 / 0', {
            font: '900 52px Inter',
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5);
        this.endlessGameOverContainer.add(this.endlessStatsLabels.bidsWonLost);

        currentY += lineHeight;

        // Highest Wool
        const highestLabel = this.add.text(0, currentY, 'HIGHEST WOOL', {
            font: '700 32px Inter',
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);
        this.endlessGameOverContainer.add(highestLabel);
        
        currentY += 50;
        this.endlessStatsLabels.highestWool = this.add.text(0, currentY, '0W', {
            font: '900 52px Inter',
            fill: '#efcf7a',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5);
        this.endlessGameOverContainer.add(this.endlessStatsLabels.highestWool);

        // Main Menu Button
        const buttonY = modalHeight/2 - 80;  // Adjusted for smaller modal
        const buttonWidth = 400;  // Reduced from 500
        const buttonHeight = 80;  // Reduced from 100

        const buttonBg = this.add.graphics();
        buttonBg.fillStyle(0x4a4a4a, 1);
        buttonBg.fillRoundedRect(-buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight, 15);
        buttonBg.lineStyle(4, 0xefcf7a, 1);
        buttonBg.strokeRoundedRect(-buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight, 15);
        this.endlessGameOverContainer.add(buttonBg);

        const buttonText = this.add.text(0, buttonY, 'MAIN MENU', {
            font: '900 40px Inter',  // Reduced from 48px
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5);
        this.endlessGameOverContainer.add(buttonText);

        // Make button interactive
        const buttonHitArea = this.add.rectangle(0, buttonY, buttonWidth, buttonHeight);
        buttonHitArea.setInteractive({ useHandCursor: true });
        buttonHitArea.on('pointerdown', () => {
            audioManager.playClick();
            this.handleEndlessModeMainMenu();
        });
        buttonHitArea.on('pointerover', () => {
            buttonBg.clear();
            buttonBg.fillStyle(0x6a6a6a, 1);
            buttonBg.fillRoundedRect(-buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight, 15);
            buttonBg.lineStyle(4, 0xefcf7a, 1);
            buttonBg.strokeRoundedRect(-buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight, 15);
        });
        buttonHitArea.on('pointerout', () => {
            buttonBg.clear();
            buttonBg.fillStyle(0x4a4a4a, 1);
            buttonBg.fillRoundedRect(-buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight, 15);
            buttonBg.lineStyle(4, 0xefcf7a, 1);
            buttonBg.strokeRoundedRect(-buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight, 15);
        });
        this.endlessGameOverContainer.add(buttonHitArea);

        // Hide by default
        this.endlessGameOverContainer.setVisible(false);
    }

    showEndlessModeGameOver(stats) {
        if (!this.endlessGameOverContainer) {
            this.createEndlessModeGameOverPopup();
        }

        // Populate stats
        this.endlessStatsLabels.roundsSurvived.setText(stats.roundsSurvived.toString());
        this.endlessStatsLabels.finalBalance.setText(`${this.formatWool(stats.finalBalance)}W`);
        this.endlessStatsLabels.bidsWonLost.setText(`${stats.bidsWon} / ${stats.bidsLost}`);
        this.endlessStatsLabels.highestWool.setText(`${this.formatWool(stats.highestWool)}W`);

        // Show with animation
        this.endlessGameOverContainer.setVisible(true);
        this.tweens.add({
            targets: this.endlessGameOverContainer,
            alpha: 1,
            scale: 1,
            duration: 400,
            ease: 'Back.easeOut'
        });

        // Particle celebration
        const celebrationParticles = this.add.particles(CONFIG.width / 2, CONFIG.height / 2 - 200, 'sparkle_particle', {
            speed: { min: 200, max: 400 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.0, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 1500,
            quantity: 30,
            blendMode: 'ADD',
            tint: [0xffd700, 0xffed4e, 0xffffff]
        });
        celebrationParticles.setDepth(15001);
        celebrationParticles.explode();

        this.time.delayedCall(2000, () => {
            celebrationParticles.destroy();
        });
    }

    handleEndlessModeMainMenu() {
        // Reset endless mode data
        localStorage.setItem('sheepMarket_endlessMode', 'false');
        localStorage.setItem('sheepMarket_endlessRound', '1');
        localStorage.setItem('sheepMarket_endlessBalance', '100');
        
        console.log('🏠 Returning to main menu - Endless mode reset');

        // Stop music and sounds
        audioManager.stopMusic();
        
        // Stop all scenes and return to boot scene (main menu)
        this.scene.stop('GameScene');
        this.scene.stop('HUDScene');
        this.scene.start('BootScene');
    }

    toggleStatsModal() {
        const show = this.statsContainer.alpha === 0;

        // Update Level Title
        if (this.statsLevelTitle) {
            this.statsLevelTitle.setText(`LEVEL ${this.activeLevel} PERFORMANCE`);
        }
        
        // Toggle Controls Lock
        this.setControlsLocked(show);
        
        const gameScene = this.scene.get('GameScene');

        if (show) {
            // Emergency wool system removed - no forced restart logic
            
            if (this.isTutorialActive && this.tutorialStep === 4) {
                this.advanceTutorialToStep(5);
            }
            
            // Ensure statsContainer is visible (needed if it was hidden by warning popup)
            this.statsContainer.setVisible(true);
            
            // === USE BUTTON MANAGER FOR CLEAN STATE-BASED BUTTON CONTROL ===
            
            // Determine game state
            let gameState = 'PAUSED'; // Default
            
            // 🛡️ CRITICAL BANKRUPTCY GUARD (REFINED):
            // 1. If we are in PAUSE MODE (manual open mid-game), we ALWAYS show CONTINUE, even with 0 balance.
            // 2. Otherwise (end of level), if balance is < 1W, force FORCED_RESTART (only NEW GAME button).
            
            if (this.isPauseMode) {
                gameState = 'PAUSED';
                console.log('🛡️ HUD: PAUSED state enforced (Manual open)');
            } else if (this.balance < 1 || this.isForcedRestartModal) {
                gameState = 'FORCED_RESTART';
                this.isForcedRestartModal = true; // Ensure flag is set for other logic
                this.isLossModal = false;
                this.isWinModal = false;
                console.log('🛡️ HUD: FORCED_RESTART state enforced (End of Level + Balance < 1W)');
            } else if (this.isLossModal) {
                gameState = 'LOSS';
            } else if (this.isWinModal) {
                gameState = 'WIN';
            }
            
            // Configure buttons based on state
            this.buttonManager.setState(gameState);
            
            // PAUSE MODE: Show only CONTINUE button + populate live round stats
            if (this.isPauseMode) {
                // Populate LIVE ROUND STATS
                // Final Call (current selection) - only show if player has made a call
                this.updateFinalCallDisplayInModal();
                
                // Safety check: Only update if statLabels exists
                if (!this.statLabels) {
                    console.warn('⚠️ statLabels not initialized - skipping live stats update');
                    return;
                }
                
                // Wool Spent (current total) - use woolSpentThisRound which is synced from updatePortfolioDisplay
                if (this.statLabels.woolSpent) {
                    this.statLabels.woolSpent.setText(`-${this.formatWool(this.woolSpentThisRound)}W`);
                }
                // Starting balance for this round
                if (this.statLabels.startingBalance) {
                    this.statLabels.startingBalance.setText(`${this.formatWool(this.sessionStartWool)}W`);
                }
                // Earned (live unrealized payout if all current calls won)
                if (this.statLabels.woolEarned) {
                    this.statLabels.woolEarned.setText('--');
                }
                
                // Live PnL - show in gains or losses
                let unrealizedPnL = 0;
                this.calls.forEach(call => {
                    const currentPrice = call.side === 'LEFT' ? this.currentLeftPrice : this.currentRightPrice;
                    unrealizedPnL += (currentPrice - call.entryPrice);
                });
                
                // Level Gains/Losses (live)
                if (unrealizedPnL >= 0) {
                    this.statLabels.levelGains.setText(`+${this.formatWoolDecimal(unrealizedPnL)}W`);
                    this.statLabels.levelLosses.setText('-0W');
                } else {
                    this.statLabels.levelGains.setText('+0W');
                    this.statLabels.levelLosses.setText(`${this.formatWoolDecimal(unrealizedPnL)}W`);
                }
                
                // Outcome (pending during live round, always white with blink animation)
                this.statLabels.levelOutcome.setText('IN PROGRESS');
                this.statLabels.levelOutcome.setColor('#ffffff'); // Always white
                
                // Add blinking animation for IN PROGRESS
                this.startInProgressBlink();
                
                this.statLabels.totalBalance.setText(`${this.formatWool(this.balance)}W`);
                
                // CRITICAL: Also update wool wallet placeholders (Phase 1 design)
                if (this.woolWalletPlaceholders && this.woolWalletPlaceholders.totalBalance) {
                    this.woolWalletPlaceholders.totalBalance.setText(`${this.formatWool(this.balance)}W`);
                    console.log('✅ Updated wool wallet placeholders on modal toggle:', this.balance);
                }
                
                // Update graphs and history
                this.updateBalanceHistoryGraph();
                this.updateLevelPerformanceChart();
                this.updateModalPnLSparkline(); // Update PnL trend graph
                if (this.levelCallBreakdownDOM) {
                    this.updateLevelCallBreakdownDisplay();
                }
                this.updateFinalCallHistoryDisplay();
                this.updatePerformanceIndicators();
                
                // Button configuration is handled by buttonManager.setState() above
            }
            
            // Pause Game when opening modal during active gameplay (isPauseMode)
            // Do NOT pause for end-of-level wallet (isWinModal or isLossModal)
            // This allows music to continue playing during the celebration
            if (this.isPauseMode && gameScene && !gameScene.scene.isPaused()) {
                console.log('🎮 PAUSING GameScene (isPauseMode=true) - Music will pause');
                gameScene.scene.pause();
            } else if ((this.isWinModal || this.isLossModal) && gameScene) {
                console.log('🎵 NOT PAUSING GameScene (end-of-level wallet) - Music continues playing');
            }
            
            // No sound on wallet open
            
            // --- UPDATE STATS LOGIC (New Comprehensive Wallet) ---
            
            // If opening during pause mode (active round), show live stats
            if (this.isPauseMode) {
                // SECTION A: Current Round - Show live PnL
                this.statLabels.woolSpent.setText(`${this.formatWool(this.woolSpentThisRound)}W`);
                
                // Calculate live unrealized wool
                let liveUnrealizedWool = 0;
                this.calls.forEach(call => {
                    const currentPrice = call.side === 'LEFT' ? this.currentLeftPrice : this.currentRightPrice;
                    liveUnrealizedWool += (currentPrice - call.entryPrice);
                });
                
                // Level Gains/Losses (live)
                if (liveUnrealizedWool >= 0) {
                    this.statLabels.levelGains.setText(`+${this.formatWool(liveUnrealizedWool)}W`);
                    this.statLabels.levelLosses.setText('-0W');
                } else {
                    this.statLabels.levelGains.setText('+0W');
                    this.statLabels.levelLosses.setText(`${this.formatWool(liveUnrealizedWool)}W`);
                }
                
                this.statLabels.levelOutcome.setText('IN PROGRESS');
                this.statLabels.levelOutcome.setColor('#ffffff'); // Always white
                
                // Add blinking animation for IN PROGRESS
                this.startInProgressBlink();
                
                // Show current final call - only if player has made a call
                this.updateFinalCallDisplayInModal();
            }
            
            // Update Current Level Display
            if (this.currentLevelValue) {
                this.currentLevelValue.setText(`${this.activeLevel}`);
            }
            
            // SECTION C & D & E: Update charts, history, and performance indicators
            this.updateBalanceHistoryGraph();
            this.updateLevelPerformanceChart();
            this.updateModalPnLSparkline(); // Update PnL trend graph
            if (this.levelCallBreakdownDOM) {
                this.updateLevelCallBreakdownDisplay();
            }
            this.updateFinalCallHistoryDisplay();
            this.updatePerformanceIndicators();

            // Reset state for "Pop" entrance
            this.statsContainer.setScale(0.2);
            this.statsContainer.setAlpha(0);
            this.statsContainer.setAngle(-5); // Slight tilt for character
            
            // RESET BUTTONS TO DEFAULT (If opening via Wallet click)
            // SKIP THIS IF IN PAUSE MODE, LOSS MODE, OR WIN MODE - buttons already configured above
            if (this.isMarketActive && !this.isPauseMode && !this.isLossModal && !this.isWinModal) {
                 if (this.statsCloseBtn) {
                     this.statsCloseBtn.setVisible(true);
                     this.statsCloseBtn.setText('CLOSE');
                     this.statsCloseBtn.x = 140;
                 }
                 if (this.statsShareBtn) {
                     this.statsShareBtn.setVisible(true);
                     this.statsShareBtn.setText('SHARE');
                     this.statsShareBtn.setStyle({ color: '#ffffff', backgroundColor: '#333333' });
                     this.statsShareBtn.x = -140;
                 }
            }
        }

        if (show) {
            // Play coin sound on wallet open
            audioManager.playCoin();
            
            // Explicitly show DOM elements
            if (this.levelCallBreakdownDOM) {
                this.levelCallBreakdownDOM.setVisible(true);
            }
            
            this.tweens.add({
                targets: this.statsContainer,
                alpha: 1,
                scale: 0.5, // Full-screen scale (3200 * 0.5 = 1600px, 1900 * 0.5 = 950px)
                angle: 0,
                duration: 800,
                ease: 'Elastic.easeOut',
                easeParams: [1.2, 0.6], // Extra springy
                onComplete: () => {
                    // Snappy Pop for BEST CALL record (triggered AFTER entrance animation)
                    if (this.newBestCallRecordSet && this.bestCallRow) {
                        console.log('🌟 CELEBRATING NEW BEST CALL RECORD!');
                        
                        // Play specialized record-breaking chime
                        audioManager.playRecordSet();
                        
                        this.bestCallRow.forEach(obj => {
                            // Stage 1: The Snappy Pop + White Flash
                            this.tweens.add({
                                targets: obj,
                                scale: 1.2,
                                duration: 300,
                                yoyo: true,
                                ease: 'Quad.easeOut',
                                onStart: () => {
                                    obj.setTint(0xffffff); // Flash white
                                },
                                onComplete: () => {
                                    obj.clearTint();
                                    obj.setScale(1);
                                    
                                    // Stage 2: The Golden Shimmer (starts after pop)
                                    this.tweens.add({
                                        targets: obj,
                                        alpha: 0.5,
                                        duration: 250,
                                        yoyo: true,
                                        repeat: 3,
                                        onStart: () => obj.setTint(0xffd700),
                                        onComplete: () => {
                                            obj.clearTint();
                                            obj.setAlpha(1);
                                        }
                                    });
                                }
                            });
                        });
                        
                        // Reset flag so it only animates once per record
                        this.newBestCallRecordSet = false;
                    }
                }
            });

            // Fade out Wallet Coin (Gray & Dim) while modal is open
            if (this.walletCoin) {
                this.walletCoin.setTint(0x555555);
                this.tweens.add({ targets: this.walletCoin, alpha: 0.3, duration: 200 });
            }

        } else {
            // Play coin sound on wallet close
            audioManager.playCoin();
            
            // Stop IN PROGRESS blink animation when closing modal
            this.stopInProgressBlink();
            
            // Explicitly hide DOM elements immediately on close
            if (this.levelCallBreakdownDOM) {
                this.levelCallBreakdownDOM.setVisible(false);
            }
            
            // Resume Game when closing modal (if not manually paused)
            if (gameScene && !this.isPaused) gameScene.scene.resume();

            // Snappy exit
            this.tweens.add({
                targets: this.statsContainer,
                alpha: 0,
                scale: 0.5,
                angle: 5,
                duration: 250,
                ease: 'Back.easeIn',
                onComplete: () => {
                    this.statsContainer.setVisible(false);
                }
            });

            // Note: Wallet Coin restore is handled by handleStatsClose on impact
        }
    }

    showConfetti(side = null) {
        audioManager.playFlock();
        
        let xConfig = { min: 0, max: CONFIG.width };
        let speedXConfig = { min: -100, max: 100 };
        
        if (side === 'LEFT') {
            xConfig = { min: 0, max: CONFIG.width / 2 };
            speedXConfig = { min: 0, max: 200 }; // Drift Right
        } else if (side === 'RIGHT') {
            xConfig = { min: CONFIG.width / 2, max: CONFIG.width };
            speedXConfig = { min: -200, max: 0 }; // Drift Left
        }

        const emitter = this.add.particles(0, 0, 'wool', {
            x: xConfig,
            y: -50,
            scale: { start: 0.1, end: 0 },
            speedY: { min: 200, max: 400 },
            speedX: speedXConfig,
            rotate: { min: 0, max: 360 },
            lifespan: 3000,
            quantity: 3,
            gravityY: 100
        });

        this.time.delayedCall(2000, () => {
            emitter.stop();
            this.time.delayedCall(3000, () => emitter.destroy());
        });
    }

    showBurstText(x, y, text, color) {
        // Unified font size and style to match showReactionText
        // All popups now use 54px Inter Black with 10px stroke
        
        const burstText = this.add.text(x, y, text, {
            font: '900 54px Inter',
            fill: color,
            stroke: '#000000',
            strokeThickness: 10,
            align: 'center'
        }).setOrigin(0.5).setDepth(2000);

        // Burst animation
        this.tweens.add({
            targets: burstText,
            scale: { from: 0.2, to: 1.4 },
            alpha: { from: 1, to: 0 },
            y: y - 180,
            angle: Phaser.Math.Between(-5, 5), // Consistent reduced rotation
            duration: 1500, // Consistent longer duration for readability
            ease: 'Back.easeOut',
            onComplete: () => burstText.destroy()
        });
        
        // Small secondary "sparks" for firework effect - kept for flair on burst text
        // (Reaction text doesn't have sparks, but "Burst" text does)
        for (let i = 0; i < 6; i++) {
            const spark = this.add.circle(x, y, 6, parseInt(color.replace('#', '0x'))).setDepth(1999);
            const angle = (Math.PI * 2 / 6) * i;
            const dist = 100;
            
            this.tweens.add({
                targets: spark,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                alpha: 0,
                scale: 0,
                duration: 600,
                ease: 'Power2',
                onComplete: () => spark.destroy()
            });
        }
    }

    showSlowBurstText(x, y, text, color) {
        // Slower version of burst text for important error messages
        // Gives player more time to read the message
        
        const burstText = this.add.text(x, y, text, {
            font: '900 54px Inter',
            fill: color,
            stroke: '#000000',
            strokeThickness: 10,
            align: 'center'
        }).setOrigin(0.5).setDepth(2000);

        // Slower burst animation with longer hold time
        this.tweens.add({
            targets: burstText,
            scale: { from: 0.2, to: 1.4 },
            alpha: { from: 1, to: 1 }, // Hold at full opacity
            y: y - 60, // Less movement upward
            angle: Phaser.Math.Between(-5, 5),
            duration: 400, // Quick scale up
            ease: 'Back.easeOut',
            onComplete: () => {
                // Hold visible for 1.5 seconds
                this.time.delayedCall(1500, () => {
                    // Then fade out slowly
                    this.tweens.add({
                        targets: burstText,
                        alpha: 0,
                        y: burstText.y - 120, // Continue moving up
                        duration: 800,
                        ease: 'Power2.easeIn',
                        onComplete: () => burstText.destroy()
                    });
                });
            }
        });
        
        // Smaller spark burst for error messages
        for (let i = 0; i < 6; i++) {
            const spark = this.add.circle(x, y, 6, parseInt(color.replace('#', '0x'))).setDepth(1999);
            const angle = (Math.PI * 2 / 6) * i;
            const dist = 80;
            
            this.tweens.add({
                targets: spark,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                alpha: 0,
                scale: 0,
                duration: 500,
                ease: 'Power2',
                onComplete: () => spark.destroy()
            });
        }
    }

    showSpamWarningMessage(x, y, text, color) {
        // Special version for spam warning messages
        // Displays for 3+ seconds with smooth fade for readability
        
        const warningText = this.add.text(x, y, text, {
            font: '900 54px Inter',
            fill: color,
            stroke: '#000000',
            strokeThickness: 10,
            align: 'center'
        }).setOrigin(0.5).setDepth(2000);

        // Quick scale up animation
        this.tweens.add({
            targets: warningText,
            scale: { from: 0.2, to: 1.4 },
            alpha: { from: 1, to: 1 }, // Hold at full opacity
            y: y - 60, // Less movement upward
            angle: Phaser.Math.Between(-5, 5),
            duration: 400, // Quick scale up
            ease: 'Back.easeOut',
            onComplete: () => {
                // Hold visible for 2.2 seconds (longer than slowBurstText)
                this.time.delayedCall(2200, () => {
                    // Then fade out slowly
                    this.tweens.add({
                        targets: warningText,
                        alpha: 0,
                        y: warningText.y - 100, // Continue moving up
                        duration: 900, // Smooth fade out
                        ease: 'Power2.easeIn',
                        onComplete: () => warningText.destroy()
                    });
                });
            }
        });
        
        // Smaller spark burst for warning messages
        for (let i = 0; i < 6; i++) {
            const spark = this.add.circle(x, y, 6, parseInt(color.replace('#', '0x'))).setDepth(1999);
            const angle = (Math.PI * 2 / 6) * i;
            const dist = 80;
            
            this.tweens.add({
                targets: spark,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                alpha: 0,
                scale: 0,
                duration: 500,
                ease: 'Power2',
                onComplete: () => spark.destroy()
            });
        }
    }

    animateValueUpdate(textObj) {
        if (!textObj) return;
        
        // "Pop" animation
        this.tweens.add({
            targets: textObj,
            scale: 1.4,
            duration: 100,
            yoyo: true,
            ease: 'Quad.easeOut',
            onStart: () => {
                textObj.setTint(0xfcd535); // Flash yellow
            },
            onComplete: () => {
                textObj.clearTint();
                textObj.setScale(1); // Reset scale safely
            }
        });
    }

    checkDailyLogin() {
        const today = new Date().toDateString();
        
        if (this.lastLoginDate === today) {
            return;
        }
        
        let streak = this.loginStreak;
        
        if (this.lastLoginDate) {
            const d1 = new Date(this.lastLoginDate); d1.setHours(0,0,0,0);
            const d2 = new Date(); d2.setHours(0,0,0,0);
            const diffTime = Math.abs(d2 - d1);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            
            if (diffDays === 1) {
                streak++;
            } else if (diffDays > 1) {
                streak = 1;
            }
        } else {
            streak = 1;
        }
        
        const effectiveStreak = Math.min(streak, 7);
        let reward = 0;
        
        // Tiered Rewards
        if (effectiveStreak === 1) reward = 10;
        else if (effectiveStreak === 2) reward = 25;
        else if (effectiveStreak === 3) reward = 50;
        else if (effectiveStreak === 4) reward = 100;
        else if (effectiveStreak >= 5) reward = 150;
        
        this.showDailyRewardPopup(streak, reward);
        
        localStorage.setItem('sheepMarket_lastLoginDate', today);
        localStorage.setItem('sheepMarket_loginStreak', streak.toString());
        this.loginStreak = streak;
        this.lastLoginDate = today;
    }

    showDailyRewardPopup(streak, reward) {
        // Lock controls
        this.setControlsLocked(true);
        
        const cx = CONFIG.width / 2;
        const cy = CONFIG.height / 2;
        
        const container = this.add.container(cx, cy);
        container.setDepth(5000);
        container.setScale(0);

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0x161a1e, 0.98);
        bg.lineStyle(4, 0xfcd535);
        bg.fillRoundedRect(-300, -200, 600, 400, 25);
        bg.strokeRoundedRect(-300, -200, 600, 400, 25);

        // Title
        const title = this.add.text(0, -140, "DAILY LOGIN BONUS", {
            font: '900 42px Inter',
            fill: '#fcd535',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Streak Text
        const streakText = this.add.text(0, -60, `${streak} DAY STREAK!`, {
            font: 'bold 32px Inter',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        // Reward Coin
        const coin = this.add.image(0, 30, 'wool').setScale(0.6);
        
        // Reward Text
        const rewardText = this.add.text(0, 30, `+${reward}W`, {
            font: '900 64px Inter',
            fill: '#44ff44',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5);
        
        // Button
        const btn = this.add.container(0, 130);
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0xfcd535, 1);
        btnBg.fillRoundedRect(-100, -30, 200, 60, 15);
        
        const btnLabel = this.add.text(0, 0, "CLAIM", {
            font: '900 28px Inter',
            fill: '#000000'
        }).setOrigin(0.5);
        
        btn.add([btnBg, btnLabel]);
        const hitArea = new Phaser.Geom.Rectangle(-100, -30, 200, 60);
        btn.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
        
        btn.on('pointerover', () => btn.setScale(1.05));
        btn.on('pointerout', () => btn.setScale(1));
        btn.on('pointerdown', () => {
            audioManager.playCoin();
            
            // Grant Reward
            this.balance += reward;
            this.displayBalance = this.balance;
            this.balanceText.setText(`${this.formatWool(this.balance)}W`);
            
            // Sync with GameScene/Auth
            const gameScene = this.scene.get('GameScene');
            gameScene.woolBalance = this.balance;
            authService.saveBalance(this.balance);
            
            // Close
            this.tweens.add({
                targets: container,
                scale: 0,
                alpha: 0,
                duration: 300,
                ease: 'Back.in',
                onComplete: () => {
                    container.destroy();
                    this.setControlsLocked(false);
                }
            });
            
            // Confetti
            this.showConfetti();
        });

        container.add([bg, title, streakText, coin, rewardText, btn]);
        
        this.tweens.add({
            targets: container,
            scale: 1,
            duration: 500,
            ease: 'Elastic.out'
        });
        
        audioManager.playCoin(); 
    }

    // NEW: Apply a subtle shimmer effect to level buttons unlocked by Golden Key
    applyShimmerEffect(container) {
        // Create a white rectangle that will act as the shimmer mask/overlay
        const shimmer = this.add.graphics();
        shimmer.fillStyle(0xffffff, 0.4);
        
        // Draw a slanted rectangle
        const width = 40;
        const height = 100;
        shimmer.fillRect(-width/2, -height/2, width, height);
        shimmer.setAngle(25);
        shimmer.setAlpha(0);
        
        container.add(shimmer);
        
        // Send to back so it's behind the badge but over the icon
        container.sendToBack(shimmer);
        
        // Loop the shimmer animation
        this.tweens.add({
            targets: shimmer,
            x: { from: -40, to: 40 },
            alpha: { from: 0, to: 0.6, yoyo: true },
            duration: 1000,
            repeat: -1,
            repeatDelay: 2000 + Math.random() * 2000,
            ease: 'Sine.easeInOut'
        });
    }

    createLevelIndicators() {
        // ENDLESS MODE: Hide level selector completely
        if (this.isEndlessMode) {
            return; // Don't create level buttons in endless mode
        }
        
        if (this.levelIndicatorsContainer) {
            this.levelIndicatorsContainer.destroy();
        }
        
        // Position: Bottom Right (for levels 1-6)
        this.levelIndicatorsContainer = this.add.container(CONFIG.width - 60, CONFIG.height - 60);
        this.levelIndicatorsContainer.setDepth(90);

        // Render buttons for Levels 1-6 in bottom right
        // ALWAYS show levels 1-6 (locked if not reached yet)
        const maxVisibleLevel = 6; // Always show 1-6
        
        // Check if Golden Key has been activated
        const goldenKeyActivated = localStorage.getItem('sheepMarket_goldenKeyActivated') === 'true' || this.goldenKeyActivated;

        for (let i = 1; i <= maxVisibleLevel; i++) {
            const spacing = 55;
            const xOffset = -(i - 1) * spacing; 
            
            const btnContainer = this.add.container(xOffset, 0);
            
            // LEVEL LOCKING LOGIC:
            const allUnlocked = this.allLevelsUnlockedByGoldenKey || goldenKeyActivated;
            
            let isUnlocked;
            if (allUnlocked) {
                // unlock ALL levels regardless of playerLevel
                isUnlocked = true;
                btnContainer.setInteractive();
                btnContainer.alpha = 1;
            } else {
                // normal progression lock logic
                // - If DEV MODE: ALL levels accessible (testing only, no progression changes)
                // - Otherwise: ONLY active level is unlocked (completed levels are locked)
                isUnlocked = this.devModeActive || (i === this.activeLevel);
            }
            const isActive = (i === this.activeLevel);

            // Interaction
            const hitArea = new Phaser.Geom.Circle(0, 0, 25);
            btnContainer.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
            
            // Hover
            btnContainer.on('pointerover', () => {
                if (isUnlocked) {
                    this.tweens.add({ targets: btnContainer, scale: 1.2, duration: 100 });
                }
            });
            btnContainer.on('pointerout', () => {
                this.tweens.add({ targets: btnContainer, scale: 1, duration: 100 });
            });
            
            // Click -> Change Level
            btnContainer.on('pointerdown', () => {
                if (!isUnlocked) {
                    audioManager.playDud();
                    // Shake
                    this.tweens.add({
                        targets: btnContainer,
                        x: xOffset + 5,
                        duration: 50,
                        yoyo: true,
                        repeat: 3,
                        onComplete: () => { btnContainer.x = xOffset; }
                    });
                    return;
                }

                if (i === this.activeLevel) return; // Already here
                
                audioManager.playClick();
                
                // Log DEV MODE access (does not affect progression)
                if (this.devModeActive && !goldenKeyActivated && i !== this.activeLevel) {
                    console.log(`🔧 DEV MODE: Accessing Level ${i} (testing only - no progression change)`);
                }
                
                // Animate press
                this.tweens.add({
                    targets: btnContainer,
                    scale: 0.8,
                    duration: 50,
                    yoyo: true,
                    onComplete: () => {
                        // Request level change in GameScene
                        // Pass isReplay flag to preserve current WOOL balance
                        this.scene.get('GameScene').changeLevel(i, { isReplay: true });
                    }
                });
            });

            // Visuals
            
            // Glow for active
            if (isActive) {
                const glow = this.add.graphics();
                glow.fillStyle(0xfcd535, 0.4);
                glow.fillCircle(0, 0, 30);
                
                this.tweens.add({
                    targets: glow,
                    alpha: 0.1,
                    scale: 1.1,
                    duration: 800,
                    yoyo: true,
                    repeat: -1
                });
                btnContainer.add(glow);
            }

            // Shepherd Icon
            const icon = this.add.image(0, 0, 'shepherd_icon')
                .setScale(0.09) 
                .setOrigin(0.5); 
            
            // Dim inactive/locked icons
            if (!isActive) {
                icon.setAlpha(0.6);
                icon.setTint(0x888888);
            }
            
            if (!isUnlocked) {
                icon.setTint(0x000000); // Silhouette
                icon.setAlpha(0.3);
            }

            // Badge (Number or Lock)
            const badgeBg = this.add.graphics();
            let badgeColor = isActive ? 0xfcd535 : 0xcccccc;
            if (!isUnlocked) badgeColor = 0x666666;
            
            badgeBg.fillStyle(badgeColor, 1);
            badgeBg.lineStyle(2, 0x000000);
            badgeBg.fillCircle(18, 18, 10);
            badgeBg.strokeCircle(18, 18, 10);
            
            const badgeLabel = isUnlocked ? i.toString() : '🔒';
            const badgeText = this.add.text(18, 18, badgeLabel, {
                font: '900 12px Inter',
                fill: '#000000'
            }).setOrigin(0.5);
            
            if (!isUnlocked) badgeText.setFontSize(10); // Smaller lock

            btnContainer.add([icon, badgeBg, badgeText]);
            
            // NEW: Add shimmer if unlocked by Golden Key
            if (goldenKeyActivated) {
                this.applyShimmerEffect(btnContainer);
            }
            
            this.levelIndicatorsContainer.add(btnContainer);
            
            // Anim
            btnContainer.y = 20;
            btnContainer.alpha = 0;
            
            this.tweens.add({
                targets: btnContainer,
                y: 0,
                alpha: 1,
                duration: 400,
                delay: (i-1) * 100,
                ease: 'Back.out'
            });
        }
        
        // LEVEL 7+ INDICATORS - Bottom Left (to the left of the locked button)
        // ALWAYS show levels 7-12 (just like 1-6 are always visible)
        if (this.levelIndicatorsLeftContainer) {
            this.levelIndicatorsLeftContainer.destroy();
        }
        
        // Position: Bottom Left (to the left of the locked button on far left)
        this.levelIndicatorsLeftContainer = this.add.container(60, CONFIG.height - 60);
        this.levelIndicatorsLeftContainer.setDepth(90);
        
        // Show ALL levels 7-12 (locked if not reached yet)
        // Display all 6 levels to the right from bottom left position
        // Order: 7, 8, 9, 10, 11, 12 from RIGHT to LEFT (reversed display)
        const maxLevel = 12; // Always show all 6 levels (7-12)
            for (let i = 7; i <= maxLevel; i++) {
                const spacing = 55;
                const xOffset = (maxLevel - i) * spacing; // Level 12 at 0, 11 at +55, 10 at +110... 7 at +275
                
                const btnContainer = this.add.container(xOffset, 0);
                
                // LEVEL LOCKING LOGIC:
                const allUnlocked = this.allLevelsUnlockedByGoldenKey || goldenKeyActivated;
                
                let isUnlocked;
                if (allUnlocked) {
                    // unlock ALL levels regardless of playerLevel
                    isUnlocked = true;
                    btnContainer.setInteractive();
                    btnContainer.alpha = 1;
                } else {
                    // normal progression lock logic
                    // - If DEV MODE: ALL levels accessible (testing only, no progression changes)
                    // - Otherwise: ONLY active level is unlocked (completed levels are locked)
                    isUnlocked = this.devModeActive || (i === this.activeLevel);
                }
                const isActive = (i === this.activeLevel);

                // Interaction
                const hitArea = new Phaser.Geom.Circle(0, 0, 25);
                btnContainer.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
                
                // Hover
                btnContainer.on('pointerover', () => {
                    if (isUnlocked) {
                        this.tweens.add({ targets: btnContainer, scale: 1.2, duration: 100 });
                    }
                });
                btnContainer.on('pointerout', () => {
                    this.tweens.add({ targets: btnContainer, scale: 1, duration: 100 });
                });
                
                // Click -> Change Level
                btnContainer.on('pointerdown', () => {
                    if (!isUnlocked) {
                        audioManager.playDud();
                        this.tweens.add({
                            targets: btnContainer,
                            x: xOffset + 5,
                            duration: 50,
                            yoyo: true,
                            repeat: 3,
                            onComplete: () => { btnContainer.x = xOffset; }
                        });
                        return;
                    }

                    if (i === this.activeLevel) return;
                    
                    audioManager.playClick();
                    
                    // Log DEV MODE access (does not affect progression)
                    if (this.devModeActive && !goldenKeyActivated && i !== this.activeLevel) {
                        console.log(`🔧 DEV MODE: Accessing Level ${i} (testing only - no progression change)`);
                    }
                    
                    this.tweens.add({
                        targets: btnContainer,
                        scale: 0.8,
                        duration: 50,
                        yoyo: true,
                        onComplete: () => {
                            this.scene.get('GameScene').changeLevel(i, { isReplay: true });
                        }
                    });
                });

                // Glow for active
                if (isActive) {
                    const glow = this.add.graphics();
                    glow.fillStyle(0xfcd535, 0.4);
                    glow.fillCircle(0, 0, 30);
                    
                    this.tweens.add({
                        targets: glow,
                        alpha: 0.1,
                        scale: 1.1,
                        duration: 800,
                        yoyo: true,
                        repeat: -1
                    });
                    btnContainer.add(glow);
                }

                // Shepherd Icon
                const icon = this.add.image(0, 0, 'shepherd_icon')
                    .setScale(0.09) 
                    .setOrigin(0.5); 
                
                if (!isActive) {
                    icon.setAlpha(0.6);
                    icon.setTint(0x888888);
                }
                
                if (!isUnlocked) {
                    icon.setTint(0x444444);
                    icon.setAlpha(0.4);
                }

                // Badge (Number or Lock) - Match style of levels 1-6
                const badgeBg = this.add.graphics();
                let badgeColor = isActive ? 0xfcd535 : 0xcccccc;
                if (!isUnlocked) badgeColor = 0x666666;
                
                badgeBg.fillStyle(badgeColor, 1);
                badgeBg.lineStyle(2, 0x000000);
                badgeBg.fillCircle(18, 18, 10);
                badgeBg.strokeCircle(18, 18, 10);
                
                const badgeLabel = isUnlocked ? i.toString() : '🔒';
                const badgeText = this.add.text(18, 18, badgeLabel, {
                    font: '900 12px Inter',
                    fill: '#000000'
                }).setOrigin(0.5);
                
                if (!isUnlocked) badgeText.setFontSize(10); // Smaller lock

                btnContainer.add([icon, badgeBg, badgeText]);
                
                // NEW: Add shimmer if unlocked by Golden Key
                if (goldenKeyActivated) {
                    this.applyShimmerEffect(btnContainer);
                }
                
                this.levelIndicatorsLeftContainer.add(btnContainer);
                
                // Animation
                btnContainer.y = 20;
                btnContainer.alpha = 0;
                
                this.tweens.add({
                    targets: btnContainer,
                    y: 0,
                    alpha: 1,
                    duration: 400,
                    delay: (i-7) * 100,
                    ease: 'Back.out'
                });
            }
    }


    // ========================================================================
    // COMPREHENSIVE WALLET GRAPH FUNCTIONS
    // ========================================================================
    
    updateBalanceHistoryGraph() {
        if (!this.balanceGraphContainer) return;
        this.balanceGraphContainer.removeAll(true);
        
        // Use level performance history to show balance over time
        const history = this.levelPerformanceHistory.slice(-10); // Last 10 levels
        
        if (history.length < 2) {
            const noData = this.add.text(0, 0, "PLAY MORE ROUNDS", {
                font: 'bold 14px Inter',
                fill: '#666'
            }).setOrigin(0.5);
            this.balanceGraphContainer.add(noData);
            return;
        }
        
        const width = 650;
        const height = 100;
        const startX = -width / 2;
        
        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.4);
        bg.fillRoundedRect(startX - 5, -height/2 - 5, width + 10, height + 10, 6);
        this.balanceGraphContainer.add(bg);
        
        // Extract balances
        const balances = history.map(h => h.balance);
        const minVal = Math.min(...balances) * 0.9;
        const maxVal = Math.max(...balances) * 1.1;
        const range = maxVal - minVal || 1;
        
        // Draw line
        const gfx = this.add.graphics();
        gfx.lineStyle(3, 0xfcd535, 1);
        
        const stepX = width / (balances.length - 1);
        
        gfx.beginPath();
        balances.forEach((val, i) => {
            const x = startX + (i * stepX);
            const ratio = (val - minVal) / range;
            const y = (height/2) - (ratio * height);
            
            if (i === 0) {
                gfx.moveTo(x, y);
            } else {
                gfx.lineTo(x, y);
            }
        });
        gfx.strokePath();
        this.balanceGraphContainer.add(gfx);
        
        // Add markers for correct/incorrect predictions
        history.forEach((h, i) => {
            const x = startX + (i * stepX);
            const val = h.balance;
            const ratio = (val - minVal) / range;
            const y = (height/2) - (ratio * height);
            
            const markerColor = h.finalCallCorrect ? 0x44ff44 : 0xff4444;
            const marker = this.add.circle(x, y, 4, markerColor);
            this.balanceGraphContainer.add(marker);
        });
    }
    
    updateLevelPerformanceChart() {
        if (!this.levelPerfContainer) return;
        this.levelPerfContainer.removeAll(true);
        
        // LARGE Bar chart showing net wool per level
        const history = this.levelPerformanceHistory.slice(-8); // Last 8 levels
        
        if (history.length === 0) {
            const noData = this.add.text(0, 0, "NO LEVELS COMPLETED", {
                font: 'bold 32px Inter',
                fill: '#D4AF37' // Gold color for labels
            }).setOrigin(0.5);
            this.levelPerfContainer.add(noData);
            return;
        }
        
        const barWidth = 100;   // Doubled for visibility
        const maxHeight = 140;  // Much taller bars
        const spacing = 20;     // More spacing
        const totalWidth = (barWidth + spacing) * history.length - spacing;
        const startX = -totalWidth / 2;
        
        // Find max absolute value for scaling
        const maxAbsVal = Math.max(...history.map(h => Math.abs(h.netWool)));
        
        history.forEach((h, i) => {
            const x = startX + i * (barWidth + spacing);
            const netWool = h.netWool || 0;
            const ratio = maxAbsVal > 0 ? Math.abs(netWool) / maxAbsVal : 0;
            const barHeight = ratio * maxHeight;
            
            const barColor = netWool >= 0 ? 0x44ff44 : 0xff4444;
            const bar = this.add.rectangle(
                x + barWidth/2, 
                netWool >= 0 ? -barHeight/2 : barHeight/2, 
                barWidth, 
                barHeight, 
                barColor,
                0.8
            );
            this.levelPerfContainer.add(bar);
            
            // Level label (larger font)
            const label = this.add.text(x + barWidth/2, maxHeight + 20, `L${h.level}`, {
                font: 'bold 28px Inter',
                fill: '#D4AF37' // Gold color for labels
            }).setOrigin(0.5);
            this.levelPerfContainer.add(label);
        });
        
        // Zero baseline
        const baseline = this.add.line(0, 0, startX, 0, startX + totalWidth, 0, 0xffffff, 0.4);
        baseline.setLineWidth(2);
        this.levelPerfContainer.add(baseline);
    }
    
    updateFinalCallHistoryDisplay() {
        if (!this.finalCallHistoryText) return;
        
        // Build per-level call history display
        // Format: "L1  LEFT ✔" or "L1  RIGHT ✖" or "L1  NO CALL"
        // Display player's final call (LEFT/RIGHT) followed by win/loss indicator
        const maxLevels = 12;
        const historyLines = [];
        
        for (let level = 1; level <= maxLevels; level++) {
            const levelHistory = this.finalCallHistory.filter(entry => entry.level === level);
            
            if (levelHistory.length === 0) {
                // No calls made for this level yet
                if (level === this.activeLevel && this.isMarketActive) {
                    historyLines.push(`L${level}  IN PROGRESS...`);
                } else {
                    historyLines.push(`L${level}  NO CALL`);
                }
            } else {
                // Get most recent call for this level
                const recentCall = levelHistory[levelHistory.length - 1];
                
                // Use player's actual final call side (LEFT or RIGHT)
                if (recentCall.side) {
                    const playerCall = recentCall.side.toUpperCase();
                    const result = recentCall.correct ? '✔' : '✖';
                    historyLines.push(`L${level}  ${playerCall}  ${result}`);
                } else {
                    // No call was placed - don't show entry for this level
                    historyLines.push(`L${level}  NO CALL`);
                }
            }
        }
        
        // Update grid-based history display (if containers exist from redesign)
        if (this.finalCallHistoryContainers) {
            for (let level = 1; level <= maxLevels; level++) {
                const container = this.finalCallHistoryContainers[level];
                if (!container) continue;
                
                const levelHistory = this.finalCallHistory.filter(entry => entry.level === level);
                
                if (levelHistory.length === 0) {
                    if (level === this.activeLevel && this.isMarketActive) {
                        container.setText('...');
                        container.setColor('#888888');
                    } else {
                        container.setText('--');
                        container.setColor('#888888');
                    }
                } else {
                    const recentCall = levelHistory[levelHistory.length - 1];
                    
                    if (recentCall.side) {
                        // Show first letter + W/L (e.g., "LW" for Left Win, "RW" for Right Win)
                        const sideLetter = recentCall.side.toUpperCase().charAt(0);
                        const resultLetter = recentCall.correct ? 'W' : 'L';
                        container.setText(`${sideLetter}${resultLetter}`);
                        container.setColor(recentCall.correct ? '#2E7D32' : '#C62828');
                    } else {
                        container.setText('--');
                        container.setColor('#888888');
                    }
                }
            }
        }
        
        // Also update old text elements for compatibility (hidden off-screen)
        const leftStr = historyLines.slice(0, 6).join('\n');
        const rightStr = historyLines.slice(6).join('\n');
        
        if (this.finalCallHistoryLeftText && this.finalCallHistoryRightText) {
            this.finalCallHistoryLeftText.setText(leftStr);
            this.finalCallHistoryRightText.setText(rightStr);
        }
        
        this.finalCallHistoryText.setText(leftStr);
    }
    
    updateLevelCallBreakdownDisplay() {
        if (!this.levelCallBreakdownDOM || !this.levelCallBreakdownDOM.node) return;
        const scrollDiv = this.levelCallBreakdownDOM.node;
        
        let displayLines = [];
        let statusColor = '#ffffff';

        // 1. Grouping Logic
        const groupCalls = (callList) => {
            const groups = {};
            callList.forEach(call => {
                const price = call.entryPrice;
                const side = call.side.toUpperCase();
                const key = `${side}_${price.toFixed(2)}`;
                
                if (!groups[key]) {
                    groups[key] = { side, price, count: 0, totalDelta: 0, settled: false };
                }
                groups[key].count++;
                if (call.delta !== undefined) {
                    groups[key].totalDelta += call.delta;
                    groups[key].settled = true;
                }
            });
            return Object.values(groups);
        };

        // MODEL A DATA SWITCHING LOGIC:
        // Prioritize showing finalized settlement results if they exist (Level End state)
        // Fall back to showing in-progress pending calls if wallet is opened mid-game
        if (this.recentLevelResult && this.recentLevelResult.settledCalls) {
            const grouped = groupCalls(this.recentLevelResult.settledCalls);
            if (grouped.length === 0) {
                displayLines = ['NO CALLS MADE THIS LEVEL'];
                statusColor = '#ffffff';
            } else {
                displayLines = grouped.map(g => {
                    const priceStr = this.formatPrice(g.price);
                    const deltaStr = this.formatWoolDecimal(Math.abs(g.totalDelta));
                    const sign = g.totalDelta >= 0 ? '+' : '-';
                    const colorClass = g.totalDelta >= 0 ? '#44ff44' : '#ff4444';
                    const countStr = g.count > 1 ? ` x${g.count}` : '';
                    // MODEL A COMPLIANT: SIDE @ ENTRY_PRICEW xCOUNT → TOTAL_DELTAW
                    return `<span>${g.side} @ ${priceStr}W${countStr}</span> → <span style="color: ${colorClass};">${sign}${deltaStr}W</span>`;
                });
                statusColor = '#ffffff';
            }
        } else if (this.isPauseMode) {
            if (this.calls.length === 0) {
                displayLines = ['WAITING FOR SHEPHERD CALLS...'];
                statusColor = '#ffffff';
            } else {
                const grouped = groupCalls(this.calls);
                displayLines = grouped.map(g => {
                    const priceStr = this.formatPrice(g.price);
                    const countStr = g.count > 1 ? ` x${g.count}` : '';
                    return `${g.side} @ ${priceStr}W${countStr} → PENDING`;
                });
                statusColor = '#FFF8DC';
            }
        } else {
            displayLines = ['NO DATA AVAILABLE'];
            statusColor = '#888888';
        }

        // Update DOM content
        scrollDiv.style.color = statusColor;
        scrollDiv.innerHTML = displayLines.map(line => `<div style="margin-bottom: 8px;">${line}</div>`).join('');
    }
    
    // ========================================================================
    // WIN STREAK & CALL EFFICIENCY SYSTEM
    // ========================================================================
    
    createEfficiencyBar() {
        // LARGE Visual bar to show efficiency (green = efficient, red = inefficient)
        const barWidth = 800;  // Much wider for full-screen layout
        const barHeight = 50;  // Taller for visibility
        
        // Background (dark gray)
        const bg = this.add.rectangle(0, 0, barWidth, barHeight, 0x333333, 1);
        bg.setStrokeStyle(5, 0x666666);
        
        // Fill bar (will be updated based on efficiency)
        this.efficiencyBarFill = this.add.rectangle(-barWidth/2, 0, 0, barHeight, 0x44ff44, 1);
        this.efficiencyBarFill.setOrigin(0, 0.5);
        
        this.efficiencyBarContainer.add([bg, this.efficiencyBarFill]);
    }
    
    updatePerformanceIndicators() {
        // Update Win Streak Display (now shows streak boxes format)
        // Format: "O / O / X / O" for recent 4 calls
        const history = this.finalCallHistory || [];
        const recent4 = history.slice(-4);
        const streakBoxes = [];
        for (let i = 0; i < 4; i++) {
            if (i < recent4.length) {
                const entry = recent4[i];
                streakBoxes.push(entry.correct ? 'O' : 'X');
            } else {
                streakBoxes.push('O'); // Empty/future slots
            }
        }
        const streakText = streakBoxes.join(' / ');
        
        // Update correct/incorrect call progress bars (if they exist from redesign)
        if (this.correctCallsBarFill && this.incorrectCallsBarFill) {
            const totalCalls = history.length;
            const correctCount = history.filter(e => e.correct).length;
            const incorrectCount = totalCalls - correctCount;
            
            const maxBarWidth = 200; // Max bar width in pixels
            
            if (totalCalls > 0) {
                const correctWidth = (correctCount / totalCalls) * maxBarWidth;
                const incorrectWidth = (incorrectCount / totalCalls) * maxBarWidth;
                
                this.correctCallsBarFill.clear();
                this.correctCallsBarFill.fillStyle(0x66BB6A, 1);
                this.correctCallsBarFill.fillRoundedRect(920 - 220, -340 + 25, correctWidth, 30, 5);
                
                this.incorrectCallsBarFill.clear();
                this.incorrectCallsBarFill.fillStyle(0xEF5350, 1);
                this.incorrectCallsBarFill.fillRoundedRect(920 - 220, -255 + 25, incorrectWidth, 30, 5);
            }
            
            // Update incorrect calls value
            if (this.incorrectCallsValue) {
                this.incorrectCallsValue.setText(incorrectCount.toString());
            }
        }
        
        if (this.winStreakValue) {
            this.winStreakValue.setText(streakText);
            this.winStreakValue.setColor('#ffffff');
        }
        
        // Update Correct Calls Count (total correct across all history)
        const correctCount = history.filter(entry => entry.correct).length;
        if (this.correctCallsValue) {
            this.correctCallsValue.setText(`${correctCount}`);
            // Color based on count
            if (correctCount >= 5) {
                this.correctCallsValue.setColor('#ffd700'); // Gold for 5+
            } else if (correctCount >= 3) {
                this.correctCallsValue.setColor('#44ff44'); // Green for 3-4
            } else if (correctCount >= 1) {
                this.correctCallsValue.setColor('#fcd535'); // Yellow for 1-2
            } else {
                this.correctCallsValue.setColor('#888888'); // Gray for 0
            }
        }
        
        // Update Bonus Wool Display
        const bonusWool = this.lastStreakBonus || 0;
        if (this.bonusWoolValue) {
            this.bonusWoolValue.setText(bonusWool > 0 ? `+${bonusWool}W` : '+0W');
            this.bonusWoolValue.setColor(bonusWool > 0 ? '#44ff44' : '#888888');
        }
        
        // Update Call Efficiency Display
        // Get most recent efficiency for current level
        const levelEfficiency = this.callEfficiencyHistory[this.activeLevel];
        let efficiency = 0;
        if (levelEfficiency && levelEfficiency.length > 0) {
            // Get the most recent efficiency entry
            const recent = levelEfficiency[levelEfficiency.length - 1];
            efficiency = recent.efficiency;
        }
        
        const efficiencyPercent = Math.round(efficiency * 100);
        if (this.efficiencyValue) {
            this.efficiencyValue.setText(`${efficiencyPercent}%`);
            // Color based on efficiency
            if (efficiency >= 1.5) {
                this.efficiencyValue.setColor('#ffd700'); // Gold for 150%+
            } else if (efficiency >= 1.0) {
                this.efficiencyValue.setColor('#44ff44'); // Green for 100%+
            } else if (efficiency >= 0.5) {
                this.efficiencyValue.setColor('#fcd535'); // Yellow for 50-100%
            } else {
                this.efficiencyValue.setColor('#ff4444'); // Red for <50%
            }
        }
        
        // Update Efficiency Bar
        if (this.efficiencyBarFill) {
            const barWidth = 800;  // Match createEfficiencyBar width
            const fillWidth = Math.min(efficiency * barWidth, barWidth); // Cap at 100% width
            this.efficiencyBarFill.width = fillWidth;
            
            // Color based on efficiency
            let barColor = 0xff4444; // Red (inefficient)
            if (efficiency >= 1.5) {
                barColor = 0xffd700; // Gold (excellent)
            } else if (efficiency >= 1.0) {
                barColor = 0x44ff44; // Green (profitable)
            } else if (efficiency >= 0.5) {
                barColor = 0xfcd535; // Yellow (break-even)
            }
            this.efficiencyBarFill.setFillStyle(barColor, 1);
        }
    }
    
    // ========================================================================
    // NEW FARM-THEMED INDICATORS
    // ========================================================================
    
    createSheepDistributionBar() {
        // Positioned right on top of the CALL buttons
        const barWidth = 700;
        const barHeight = 40; // Increased height for more decorative space
        const barX = CONFIG.width / 2;
        const barY = CONFIG.height - 350;
        
        const container = this.add.container(barX, barY);
        container.setDepth(50);
        this.distributionBarContainer = container;
        
        // ===== BARN-STYLE FRAME =====
        // Outer wooden fence frame with rounded corners
        const outerFrame = this.add.graphics();
        outerFrame.lineStyle(6, 0x8b5a3c, 1); // Dark brown wood
        outerFrame.strokeRoundedRect(-barWidth/2 - 4, -barHeight/2 - 4, barWidth + 8, barHeight + 8, 12);
        
        // Inner shadow for depth
        const innerShadow = this.add.graphics();
        innerShadow.fillStyle(0x000000, 0.4);
        innerShadow.fillRoundedRect(-barWidth/2, -barHeight/2, barWidth, barHeight, 10);
        
        // Grass texture background (light green with pattern)
        const grassBg = this.add.graphics();
        grassBg.fillStyle(0xb8d4a0, 1); // Light pasture green
        grassBg.fillRoundedRect(-barWidth/2 + 2, -barHeight/2 + 2, barWidth - 4, barHeight - 4, 8);
        
        // Add subtle grass pattern (small vertical lines)
        for (let i = 0; i < 50; i++) {
            const x = -barWidth/2 + (i * (barWidth / 50));
            const grassHeight = Phaser.Math.Between(3, 6);
            grassBg.fillStyle(0xa0c488, 0.3);
            grassBg.fillRect(x, barHeight/2 - grassHeight, 2, grassHeight);
        }
        
        // Create two bar segments (animated sheep groups)
        // Left segment (LEFT side - green pasture)
        this.distBarLeft = this.add.graphics();
        
        // Right segment (RIGHT side - brown pasture)
        this.distBarRight = this.add.graphics();
        
        // ===== CENTER FENCE POST DIVIDER =====
        const fencePost = this.add.graphics();
        // Vertical wooden post
        fencePost.fillStyle(0x6b4423, 1);
        fencePost.fillRoundedRect(-4, -barHeight/2 - 8, 8, barHeight + 16, 2);
        // Post cap (lighter wood)
        fencePost.fillStyle(0x8b5a3c, 1);
        fencePost.fillRoundedRect(-5, -barHeight/2 - 10, 10, 6, 1);
        
        // ===== DECORATIVE SHEEP ICONS AT ENDS =====
        // Left sheep sprite (same as in-game sheep)
        const leftSheepIcon = this.add.image(-barWidth/2 - 35, 0, 'sheep')
            .setOrigin(0.5)
            .setScale(0.08); // Small decorative size
        
        // Right sheep sprite (same as in-game sheep)
        const rightSheepIcon = this.add.image(barWidth/2 + 35, 0, 'sheep')
            .setOrigin(0.5)
            .setScale(0.08); // Small decorative size
        
        // ===== COUNT DISPLAYS WITH WOOL CLOUD BACKGROUNDS =====
        // Left count - wool cloud background
        const leftCloud = this.add.graphics();
        leftCloud.fillStyle(0xffffff, 0.9);
        leftCloud.fillEllipse(-barWidth/2 + 50, -2, 50, 28);
        leftCloud.lineStyle(2, 0xcccccc, 1);
        leftCloud.strokeEllipse(-barWidth/2 + 50, -2, 50, 28);
        
        this.distBarLeftText = this.add.text(-barWidth/2 + 50, 0, '0', {
            font: 'bold 22px Arial',
            fill: '#4a8f3c',
            stroke: '#ffffff',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        // Right count - wool cloud background
        const rightCloud = this.add.graphics();
        rightCloud.fillStyle(0xffffff, 0.9);
        rightCloud.fillEllipse(barWidth/2 - 50, -2, 50, 28);
        rightCloud.lineStyle(2, 0xcccccc, 1);
        rightCloud.strokeEllipse(barWidth/2 - 50, -2, 50, 28);
        
        this.distBarRightText = this.add.text(barWidth/2 - 50, 0, '0', {
            font: 'bold 22px Arial',
            fill: '#8b5a3c',
            stroke: '#ffffff',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        // ===== PLAYFUL LABEL =====
        container.add([
            outerFrame,
            innerShadow,
            grassBg,
            this.distBarLeft,
            this.distBarRight,
            fencePost,
            leftCloud,
            rightCloud,
            leftSheepIcon,
            rightSheepIcon,
            this.distBarLeftText,
            this.distBarRightText
        ]);
        
        // Store bar dimensions for updates
        this.distBarMaxWidth = barWidth;
        this.distBarHeight = barHeight;
        
        // Store decorative elements for animations
        this.leftSheepIcon = leftSheepIcon;
        this.rightSheepIcon = rightSheepIcon;
    }
    
    updateSheepDistributionBar() {
        if (!this.distributionBarContainer || !this.distBarLeft || !this.distBarRight) return;
        
        const totalSheep = this.currentSheepLeft + this.currentSheepRight;
        if (totalSheep === 0) return;
        
        const leftRatio = this.currentSheepLeft / totalSheep;
        const rightRatio = this.currentSheepRight / totalSheep;
        
        // Calculate widths (each segment goes from center outward)
        const leftWidth = leftRatio * (this.distBarMaxWidth / 2);
        const rightWidth = rightRatio * (this.distBarMaxWidth / 2);
        
        // Store previous values to detect changes
        const prevLeftCount = parseInt(this.distBarLeftText.text) || 0;
        const prevRightCount = parseInt(this.distBarRightText.text) || 0;
        
        // ===== DRAW LEFT SEGMENT (Green wool texture) =====
        this.distBarLeft.clear();
        if (leftWidth > 0) {
            // Wool-like fluffy fill with gradient effect
            this.distBarLeft.fillStyle(0x7cb342, 1); // Green base
            this.distBarLeft.fillRoundedRect(
                -leftWidth,
                -this.distBarHeight/2 + 2,
                leftWidth,
                this.distBarHeight - 4,
                8
            );
            
            // Add lighter wool highlights (fluffy texture)
            this.distBarLeft.fillStyle(0x9ccc65, 0.5);
            for (let i = 0; i < 8; i++) {
                const x = -leftWidth + (i * leftWidth / 8);
                const radius = 4 + Math.sin(Date.now() / 500 + i) * 2; // Gentle pulse
                this.distBarLeft.fillCircle(x + radius, -4, radius);
                this.distBarLeft.fillCircle(x + radius, 4, radius);
            }
        }
        
        // ===== DRAW RIGHT SEGMENT (Brown wool texture) =====
        this.distBarRight.clear();
        if (rightWidth > 0) {
            // Wool-like fluffy fill with gradient effect
            this.distBarRight.fillStyle(0x8d6e63, 1); // Brown base
            this.distBarRight.fillRoundedRect(
                0,
                -this.distBarHeight/2 + 2,
                rightWidth,
                this.distBarHeight - 4,
                8
            );
            
            // Add lighter wool highlights (fluffy texture)
            this.distBarRight.fillStyle(0xa1887f, 0.5);
            for (let i = 0; i < 8; i++) {
                const x = i * rightWidth / 8;
                const radius = 4 + Math.sin(Date.now() / 500 + i) * 2; // Gentle pulse
                this.distBarRight.fillCircle(x + radius, -4, radius);
                this.distBarRight.fillCircle(x + radius, 4, radius);
            }
        }
        
        // ===== UPDATE COUNT TEXT WITH BOUNCE ANIMATION =====
        if (this.currentSheepLeft !== prevLeftCount) {
            this.distBarLeftText.setText(`${this.currentSheepLeft}`);
            
            // Bounce animation when count changes
            this.tweens.add({
                targets: this.distBarLeftText,
                scale: 1.3,
                duration: 100,
                yoyo: true,
                ease: 'Back.easeOut'
            });
        }
        
        if (this.currentSheepRight !== prevRightCount) {
            this.distBarRightText.setText(`${this.currentSheepRight}`);
            
            // Bounce animation when count changes
            this.tweens.add({
                targets: this.distBarRightText,
                scale: 1.3,
                duration: 100,
                yoyo: true,
                ease: 'Back.easeOut'
            });
        }
        
        // ===== SHEEP ICON ANIMATIONS =====
        // Left sheep bounces when its count increases
        if (this.currentSheepLeft > prevLeftCount && this.leftSheepIcon) {
            this.tweens.add({
                targets: this.leftSheepIcon,
                y: -8,
                duration: 150,
                yoyo: true,
                ease: 'Quad.easeOut'
            });
        }
        
        // Right sheep bounces when its count increases
        if (this.currentSheepRight > prevRightCount && this.rightSheepIcon) {
            this.tweens.add({
                targets: this.rightSheepIcon,
                y: -8,
                duration: 150,
                yoyo: true,
                ease: 'Quad.easeOut'
            });
        }
        
        // Reset sheep icon positions if count decreased
        if (this.currentSheepLeft < prevLeftCount && this.leftSheepIcon) {
            this.leftSheepIcon.y = 0;
        }
        if (this.currentSheepRight < prevRightCount && this.rightSheepIcon) {
            this.rightSheepIcon.y = 0;
        }
    }
    
    createPnLSparkline() {
        // Compact sparkline chart - positioned below UNREALIZED WOOL display
        const chartWidth = 360;
        const chartHeight = 45;
        const chartX = CONFIG.width / 2; // Centered below UNREALIZED WOOL text
        const chartY = 130; // Positioned below UNREALIZED WOOL (which is at y=95)
        
        const container = this.add.container(chartX, chartY);
        container.setDepth(55);
        container.setAlpha(0); // Start hidden, show when player has active calls
        this.sparklineContainer = container;
        
        // Background - compact and subtle for top display box
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.6);
        bg.lineStyle(1, 0x444444, 0.6);
        bg.fillRoundedRect(-chartWidth/2, -chartHeight/2, chartWidth, chartHeight, 6);
        bg.strokeRoundedRect(-chartWidth/2, -chartHeight/2, chartWidth, chartHeight, 6);
        
        // Graphics for drawing the line
        this.sparklineGraphics = this.add.graphics();
        this.sparklineGraphics.setPosition(-chartWidth/2, 0);
        
        // Zero baseline (subtle)
        const baseline = this.add.line(0, 0, -chartWidth/2, 0, chartWidth/2, 0, 0xffffff, 0.2);
        
        container.add([bg, baseline, this.sparklineGraphics]);
        
        // Store dimensions
        this.sparklineWidth = chartWidth;
        this.sparklineHeight = chartHeight;
    }
    
    updatePnLSparkline(currentPnL) {
        if (!this.sparklineGraphics || !this.sparklineContainer) return;
        
        // Show sparkline only when player has active calls
        if (this.calls.length === 0) {
            this.sparklineContainer.setAlpha(0);
            return;
        } else {
            this.sparklineContainer.setAlpha(0.9);
        }
        
        // Add current PnL to history
        this.pnlHistory.push(currentPnL);
        
        // Limit history length
        if (this.pnlHistory.length > this.pnlHistoryMaxLength) {
            this.pnlHistory.shift();
        }
        
        // Need at least 2 points to draw
        if (this.pnlHistory.length < 2) return;
        
        // Find min/max for scaling
        const minPnL = Math.min(...this.pnlHistory, 0);
        const maxPnL = Math.max(...this.pnlHistory, 0);
        const range = maxPnL - minPnL;
        
        if (range === 0) return; // All flat
        
        // Clear previous drawing
        this.sparklineGraphics.clear();
        
        // Determine color based on trend (last value)
        const trendColor = currentPnL >= 0 ? 0x44ff44 : 0xff4444;
        
        // Draw line with smooth curves
        this.sparklineGraphics.lineStyle(2, trendColor, 0.9);
        
        const stepX = this.sparklineWidth / (this.pnlHistoryMaxLength - 1);
        
        this.sparklineGraphics.beginPath();
        
        for (let i = 0; i < this.pnlHistory.length; i++) {
            const pnl = this.pnlHistory[i];
            const normalizedY = (pnl - minPnL) / range; // 0 to 1
            const y = (0.5 - normalizedY) * (this.sparklineHeight - 10); // Invert Y, center around 0
            const x = i * stepX;
            
            if (i === 0) {
                this.sparklineGraphics.moveTo(x, y);
            } else {
                this.sparklineGraphics.lineTo(x, y);
            }
        }
        
        this.sparklineGraphics.strokePath();
    }
    
    createModalPnLSparkline(yPosition) {
        // Create PnL sparkline graph for the stats modal
        const chartWidth = 400;
        const chartHeight = 60;
        
        const container = this.add.container(0, yPosition);
        container.setAlpha(1); // Always visible in modal
        
        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.5);
        bg.lineStyle(2, 0x444444, 0.6);
        bg.fillRoundedRect(-chartWidth/2, 0, chartWidth, chartHeight, 8);
        bg.strokeRoundedRect(-chartWidth/2, 0, chartWidth, chartHeight, 8);
        
        // Graphics for drawing the line
        this.modalSparklineGraphics = this.add.graphics();
        this.modalSparklineGraphics.setPosition(-chartWidth/2, chartHeight/2);
        
        // Zero baseline
        const baseline = this.add.line(0, chartHeight/2, -chartWidth/2, 0, chartWidth/2, 0, 0xffffff, 0.15);
        
        container.add([bg, baseline, this.modalSparklineGraphics]);
        this.statsContainer.add(container);
        
        // Store dimensions
        this.modalSparklineWidth = chartWidth;
        this.modalSparklineHeight = chartHeight;
        this.modalSparklineContainer = container;
    }
    
    updateModalPnLSparkline() {
        if (!this.modalSparklineGraphics || !this.pnlHistory || this.pnlHistory.length < 2) {
            return;
        }
        
        // Find min/max for scaling
        const minPnL = Math.min(...this.pnlHistory, 0);
        const maxPnL = Math.max(...this.pnlHistory, 0);
        const range = maxPnL - minPnL;
        
        if (range === 0) return; // All flat
        
        // Clear previous drawing
        this.modalSparklineGraphics.clear();
        
        // Determine color based on trend (last value)
        const currentPnL = this.pnlHistory[this.pnlHistory.length - 1];
        const trendColor = currentPnL >= 0 ? 0x44ff44 : 0xff4444;
        
        // Draw line with smooth curves
        this.modalSparklineGraphics.lineStyle(3, trendColor, 0.9);
        
        const stepX = this.modalSparklineWidth / (this.pnlHistoryMaxLength - 1);
        
        this.modalSparklineGraphics.beginPath();
        
        for (let i = 0; i < this.pnlHistory.length; i++) {
            const pnl = this.pnlHistory[i];
            const normalizedY = (pnl - minPnL) / range; // 0 to 1
            const y = (0.5 - normalizedY) * (this.modalSparklineHeight - 16); // Invert Y, center around 0
            const x = i * stepX;
            
            if (i === 0) {
                this.modalSparklineGraphics.moveTo(x, y);
            } else {
                this.modalSparklineGraphics.lineTo(x, y);
            }
        }
        
        this.modalSparklineGraphics.strokePath();
        
        // Add subtle glow effect
        this.modalSparklineGraphics.lineStyle(6, trendColor, 0.15);
        this.modalSparklineGraphics.beginPath();
        for (let i = 0; i < this.pnlHistory.length; i++) {
            const pnl = this.pnlHistory[i];
            const normalizedY = (pnl - minPnL) / range;
            const y = (0.5 - normalizedY) * (this.modalSparklineHeight - 16);
            const x = i * stepX;
            
            if (i === 0) {
                this.modalSparklineGraphics.moveTo(x, y);
            } else {
                this.modalSparklineGraphics.lineTo(x, y);
            }
        }
        this.modalSparklineGraphics.strokePath();
    }
    
    // ===== PER-LEVEL CALL HISTORY RECORDING =====
    /**
     * Record a final call attempt for the current level
     * @param {string|null} side - 'LEFT', 'RIGHT', or null (no call)
     * @param {boolean} correct - Whether the call was correct
     */
    recordFinalCallAttempt(side, correct) {
        // Ensure level entry exists
        if (!this.perLevelCallHistory[this.activeLevel]) {
            this.perLevelCallHistory[this.activeLevel] = [];
        }
        
        // Add attempt to level history
        this.perLevelCallHistory[this.activeLevel].push({
            side: side, // 'LEFT', 'RIGHT', or null
            correct: correct
        });
        
        // Save to localStorage
        localStorage.setItem(this.getStorageKey('perLevelCallHistory'), JSON.stringify(this.perLevelCallHistory));
        
        console.log(`📝 Recorded final call attempt for Level ${this.activeLevel}:`, side || 'No Call', correct ? '✓' : 'X');
    }
    
    /**
     * Get formatted call history for a specific level
     * @param {number} level - Level number
     * @returns {string} Formatted history string
     */
    getFormattedCallHistory(level) {
        const attempts = this.perLevelCallHistory[level];
        
        if (!attempts || attempts.length === 0) {
            return 'undefined';
        }
        
        return attempts.map(attempt => {
            if (attempt.side === null) {
                return 'No Call';
            }
            const mark = attempt.correct ? '✓' : 'X';
            return `${attempt.side} ${mark}`;
        }).join(', ');
    }
    
    // ===== CALL BUTTON COUNTER SYSTEM (REBUILT FROM SCRATCH) =====
    // Centralized counter system - single source of truth
    
    /**
     * Increment call counter for a specific side
     * Called ONLY when a call button is clicked
     * Single-fire guard prevents multiple increments from one click
     */
    incrementCallCounter(side) {
        // Single-fire guard using timestamp
        const now = Date.now();
        const guardKey = `counter_${side}`;
        
        if (!this._counterGuard) this._counterGuard = {};
        
        // If called within 150ms of last call on this side, ignore (debounce)
        if (this._counterGuard[guardKey] && (now - this._counterGuard[guardKey]) < 150) {
            console.log(`🚫 Counter increment blocked (debounce): ${side}`);
            return;
        }
        
        // Record this increment time
        this._counterGuard[guardKey] = now;
        
        // Increment the counter (ONLY PLACE THIS HAPPENS)
        if (side === 'LEFT') {
            this.leftCallCount++;
            console.log(`✅ LEFT counter incremented: x${this.leftCallCount}`);
        } else if (side === 'RIGHT') {
            this.rightCallCount++;
            console.log(`✅ RIGHT counter incremented: x${this.rightCallCount}`);
        }
        
        // Update the visible red counter text immediately
        this.updateCallCounterDisplay(side);
    }
    
    /**
     * Update the visible red counter text
     * Connects to existing text elements created in createImmersiveBetBtn
     */
    updateCallCounterDisplay(side) {
        if (side === 'LEFT' && this.leftCallCounter) {
            const count = this.leftCallCount;
            this.leftCallCounter.setText(`x${count}`);
            
            // Show counter on first call
            if (count === 1) {
                this.leftCallCounter.setAlpha(1);
            }
            
            // Pulse animation on increment
            if (this.tweens) {
                this.tweens.add({
                    targets: this.leftCallCounter,
                    scale: 1.3,
                    duration: 150,
                    yoyo: true,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                        this.leftCallCounter.setScale(1);
                    }
                });
            }
        } else if (side === 'RIGHT' && this.rightCallCounter) {
            const count = this.rightCallCount;
            this.rightCallCounter.setText(`x${count}`);
            
            // Show counter on first call
            if (count === 1) {
                this.rightCallCounter.setAlpha(1);
            }
            
            // Pulse animation on increment
            if (this.tweens) {
                this.tweens.add({
                    targets: this.rightCallCounter,
                    scale: 1.3,
                    duration: 150,
                    yoyo: true,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                        this.rightCallCounter.setScale(1);
                    }
                });
            }
        }
    }
    
    // Placeholder functions (not used in new system)
    createCallVolumeIndicators() {
        // New counter system uses existing text created in createImmersiveBetBtn
    }
    
    updateCallVolumeIndicators() {
        // New counter system updates via incrementCallCounter
    }
    
    createGoldenSheepTracker() {
        // Small compact indicator - bottom interface area
        // HIDDEN until Level 4+ and only shows when golden sheep active
        const x = CONFIG.width / 2;
        const y = CONFIG.height - 150; // Bottom interface area
        
        const container = this.add.container(x, y);
        container.setDepth(65);
        container.setAlpha(0); // Hidden by default
        this.goldenSheepTrackerContainer = container;
        
        // Background badge (smaller, more compact)
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.8);
        bg.lineStyle(2, 0xfcd535, 1);
        bg.fillRoundedRect(-55, -28, 110, 56, 10);
        bg.strokeRoundedRect(-55, -28, 110, 56, 10);
        
        // Golden sheep icon (smaller)
        const icon = this.add.image(-25, 0, 'golden-sheep-icon.webp.webp')
            .setScale(0.09);
        
        // Count text
        this.goldenSheepCountText = this.add.text(18, 0, 'x0', {
            font: 'bold 26px Inter',
            fill: '#fcd535',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0, 0.5);
        
        container.add([bg, icon, this.goldenSheepCountText]);
        
        // Glow effect (subtle pulse)
        this.tweens.add({
            targets: icon,
            scale: 0.10,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    updateGoldenSheepTracker(count) {
        if (!this.goldenSheepCountText || !this.goldenSheepTrackerContainer) return;
        
        // Show tracker if Level 4+ and count > 0
        if (this.activeLevel >= 4 && count > 0) {
            this.goldenSheepTrackerContainer.setAlpha(1);
            this.goldenSheepCountText.setText(`x${count}`);
            
            // Celebrate animation on count increase
            this.tweens.add({
                targets: this.goldenSheepTrackerContainer,
                scale: 1.2,
                duration: 200,
                yoyo: true,
                ease: 'Back.easeOut'
            });
        } else if (this.activeLevel < 4) {
            // Keep hidden for early levels
            this.goldenSheepTrackerContainer.setAlpha(0);
        }
    }
    
    createDevModeIndicator() {
        // Small unobtrusive label in top-left corner
        this.devModeIndicator = this.add.text(20, 20, '🔧 DEV MODE', {
            font: 'bold 18px Inter',
            fill: '#ff0000',
            stroke: '#000000',
            strokeThickness: 3,
            backgroundColor: '#000000',
            padding: { x: 8, y: 4 }
        });
        this.devModeIndicator.setDepth(99999);
        this.devModeIndicator.setScrollFactor(0);
        this.devModeIndicator.setAlpha(0.7);
        
        console.log('🔧 DEV MODE INDICATOR: Active (visible in top-left corner)');
    }
    
    shutdown() {
        console.log('[HUDScene] shutdown – cleaning up timers and listeners');

        // ── Global GameFlowManager listeners ─────────────────────────────────
        this.game.events.off('flow:show-warning');
        this.game.events.off('flow:blocked-advance');
        this.game.events.off('flow:blocked-retry');
        this.game.events.off('flow:retry-cost-deducted');

        // ── Music stop interval (Level 9) ────────────────────────────────────
        if (this.musicStopInterval) {
            clearInterval(this.musicStopInterval);
            this.musicStopInterval = null;
        }

        // ── Round timer (if HUD owns one) ────────────────────────────────────
        if (this.hudTimerEvent) {
            this.hudTimerEvent.remove(false);
            this.hudTimerEvent = null;
        }

        // ── In-progress blink tween ──────────────────────────────────────────
        this.stopInProgressBlink();

        // ── Remove all listeners registered on GameScene events ─────────────
        // HUDScene registers listeners on gameScene.events inside create().
        // Those are NOT automatically removed when HUDScene stops because they
        // live on GameScene's emitter.  We must remove them explicitly.
        const gameScene = this.scene.get('GameScene');
        if (gameScene) {
            const gsEvents = [
                'update-market', 'balance-updated', 'calls-updated',
                'round-settled', 'round-started',
                'unlock-ability-button', 'unlock-dog-herding-button',
                'unlock-bone-button', 'unlock-grass-button',
                'unlock-dog-button', 'unlock-golden-clover-button',
                'unlock-black-sheep-button', 'unlock-golden-key-button',
                'unlock-golden-sheep-button', 'place-golden-sheep-on-button',
                'bones-collected', 'grass-spawned', 'grass-count-updated',
                'bone-count-updated', 'bounce-bone-button', 'bounce-grass-button',
                'bounce-lawn-mower-button', 'bounce-golden-sheep-button',
                'bounce-golden-key-button',
                'market-event', 'global-bleat',
                'golden-key-sequence-complete',
                'animate-lawn-mower-to-button',
                'wolf-warning', 'wolf-spawned',
                'show-wolf-warning-eyes', 'hide-wolf-warning-eyes',
                'show-wolf-warning-border', 'hide-wolf-warning-border',
                'placement-complete', 'placement-cancelled',
                'level12-complete' // ✅ FIX: Added to prevent listener stacking
            ];
            gsEvents.forEach(ev => gameScene.events.off(ev));
            
            if (this._tutorialRoundHandler) {
                gameScene.events.off('round-settled', this._tutorialRoundHandler);
            }
            console.log('[HUDScene] ✅ Removed GameScene event listeners');
        }

        // ── Clear button manager state ───────────────────────────────────────
        if (this.buttonManager) {
            this.buttonManager.clearAllListeners();
        }

        // ✅ SAFETY CLEANUP: Destroy Game Won popup if it exists
        this.destroyGameWonPopup();
        
        // ✅ SAFETY CLEANUP: Destroy Retry Confirmation popup if it exists
        this.destroyRetryConfirmationPopup();

        console.log('[HUDScene] ✅ Shutdown complete');
    }

    // ====================================================================================
    // ===== TUTORIAL MODE SYSTEM =====
    // ====================================================================================
    startTutorial() {
        if (!this.isTutorialActive) return;
        console.log('[HUDScene] Starting Tutorial Mode');
        
        this.isTutorialActive = true;
        this.tutorialStep = 1;
        this.tutorialWaitingForBet = false;
        this.currentTutorialPopup = null;
        this.tutorialHighlightTween = null;
        
        const gameScene = this.scene.get('GameScene');
        
        this._tutorialRoundHandler = (data) => {
            if (!this.isTutorialActive) return;
            if (this.tutorialStep === 9) {
                this.advanceTutorialStep(10);
            }
        };
        gameScene.events.on('round-settled', this._tutorialRoundHandler);
        
        this.advanceTutorialStep(1);
    }
    
    advanceTutorialStep(step) {
        if (!this.isTutorialActive) return;
        this.tutorialStep = step;
        console.log(`[HUDScene] Tutorial Step ${step}`);
        
        if (this.tutorialHighlightTween) {
            this.tutorialHighlightTween.stop();
            this.tutorialHighlightTween = null;
            if (this.buttonManager && this.buttonManager.leftButton) {
                this.buttonManager.leftButton.container.setScale(1);
            }
            if (this.buttonManager && this.buttonManager.rightButton) {
                this.buttonManager.rightButton.container.setScale(1);
            }
            if (this.statLabels && this.statLabels.totalBalance) {
                this.statLabels.totalBalance.setScale(1);
            }
        }
        
        switch (step) {
            case 1:
                this.setControlsLocked(true);
                this.showTutorialPopup(
                    "Welcome to the pasture. You are not controlling sheep — you are betting on them.",
                    () => this.advanceTutorialStep(2)
                );
                break;
                
            case 2:
                this.showTutorialPopup(
                    "Each CALL is a bet using your wool. Try calling LEFT.",
                    () => {
                        this.setControlsLocked(false);
                        this.tutorialWaitingForBet = true;
                        if (this.buttonManager && this.buttonManager.leftButton && this.buttonManager.rightButton) {
                            this.tutorialHighlightTween = this.tweens.add({
                                targets: [this.buttonManager.leftButton.container, this.buttonManager.rightButton.container],
                                scale: 1.1,
                                yoyo: true,
                                repeat: -1,
                                duration: 500
                            });
                        }
                    }
                );
                break;
                
            case 4:
                this.setControlsLocked(true);
                this.showTutorialPopup(
                    "Good. You placed a bet using wool.",
                    () => this.advanceTutorialStep(5)
                );
                break;
                
            case 5:
                this.setControlsLocked(false);
                this.showTutorialPopup(
                    "Now watch. Sheep will move on their own.",
                    () => {
                        this.time.delayedCall(3000, () => this.advanceTutorialStep(6));
                    }
                );
                break;
                
            case 6:
                this.showTutorialPopup(
                    "Each CALL you make is its own bet.",
                    () => this.advanceTutorialStep(7)
                );
                break;
                
            case 7:
                this.showTutorialPopup(
                    "Every bet uses wool. A standard call costs 10 wool, adjusted slightly by price.",
                    () => this.advanceTutorialStep(8)
                );
                break;
                
            case 8:
                this.showTutorialPopup(
                    "Wool is your currency. You earn it by making correct calls.",
                    () => {
                        if (this.statLabels && this.statLabels.totalBalance) {
                            this.tutorialHighlightTween = this.tweens.add({
                                targets: this.statLabels.totalBalance,
                                scale: 1.3,
                                yoyo: true,
                                repeat: -1,
                                duration: 500
                            });
                        }
                        this.time.delayedCall(3000, () => this.advanceTutorialStep(9));
                    }
                );
                break;
                
            case 9:
                this.showTutorialPopup(
                    "The FINAL CALL is the side with more sheep at the end.",
                    () => {
                        if (this.buttonManager && this.buttonManager.leftButton && this.buttonManager.rightButton) {
                            this.tutorialHighlightTween = this.tweens.add({
                                targets: [this.buttonManager.leftButton.container, this.buttonManager.rightButton.container],
                                scale: 1.1,
                                yoyo: true,
                                repeat: -1,
                                duration: 500
                            });
                        }
                    }
                );
                break;
                
            case 10:
                this.setControlsLocked(true);
                this.showTutorialPopup(
                    "If your call matches the final side, you earn wool. Otherwise, you lose it.",
                    () => this.advanceTutorialStep(11)
                );
                break;
                
            case 11:
                this.setControlsLocked(false);
                this.isTutorialActive = false;
                this.scene.get('GameScene').events.emit('set-tutorial-mode', false);
                if (this.currentTutorialPopup) {
                    this.currentTutorialPopup.destroy();
                    this.currentTutorialPopup = null;
                }
                break;
        }
    }
    
    showTutorialPopup(text, onContinue) {
        if (this.currentTutorialPopup) {
            this.currentTutorialPopup.destroy();
        }
        
        const uiContainer = this.add.container(CONFIG.width / 2, CONFIG.height / 2);
        
        // Modal Bg
        const modalBg = this.add.graphics();
        modalBg.fillStyle(0x3E2723, 1);
        modalBg.fillRoundedRect(-300, -150, 600, 300, 16);
        modalBg.lineStyle(4, 0x8D6E63, 1);
        modalBg.strokeRoundedRect(-300, -150, 600, 300, 16);
        
        const popupText = this.add.text(0, -30, text, {
            font: 'bold 28px Inter',
            fill: '#ffffff',
            align: 'center',
            wordWrap: { width: 500 }
        }).setOrigin(0.5);
        
        // Button
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x228B22, 1);
        btnBg.fillRoundedRect(-80, 50, 160, 60, 12);
        btnBg.lineStyle(2, 0xFFD700, 1);
        btnBg.strokeRoundedRect(-80, 50, 160, 60, 12);
        
        const btnText = this.add.text(0, 80, "Continue", {
            font: 'bold 22px Inter',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        uiContainer.add([modalBg, popupText, btnBg, btnText]);
        
        uiContainer.setDepth(15000);
        
        // Click interaction
        const hitArea = new Phaser.Geom.Rectangle(-80, 50, 160, 60);
        uiContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
        
        uiContainer.on('pointerdown', () => {
            audioManager.playClick();
            uiContainer.destroy();
            this.currentTutorialPopup = null;
            if (onContinue) onContinue();
        });
        
        this.currentTutorialPopup = uiContainer;
    }
}

