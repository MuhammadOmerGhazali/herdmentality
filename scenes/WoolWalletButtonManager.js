/**
 * WoolWalletButtonManager.js
 * 
 * Clean, state-based button management for the Wool Wallet popup.
 * Completely replaces all old button logic to fix progression bugs.
 */

import { CONFIG } from '../config.js';
import { audioManager } from '../audio.js';
import { authService } from '../services/auth.js';
import { gameFlowManager } from '../services/GameFlowManager.js';

export class WoolWalletButtonManager {
    constructor(hudScene) {
        this.hudScene = hudScene;
        this.currentState = null;

        // Button references (will be set from HUD)
        this.shareBtn = null;
        this.actionBtn = null; // The main action button container (CONTINUE/TRY AGAIN/NEXT LEVEL)
        this.actionBtnText = null; // The text child inside the container
    }

    /**
     * Set button references from HUD
     */
    setButtons(shareBtn, actionBtn) {
        this.shareBtn = shareBtn;
        this.actionBtn = actionBtn;

        // Extract the text object from the action button container
        // Container has [background, text] as children
        if (actionBtn && actionBtn.list && actionBtn.list.length > 1) {
            this.actionBtnText = actionBtn.list[1]; // Second child is the text
        }
        // Share button is now always null (removed from UI)
        this.shareBtnText = null;
    }

    /**
     * Clear all existing listeners to prevent duplicates
     */
    clearAllListeners() {
        if (this.shareBtn) {
            this.shareBtn.removeAllListeners('pointerdown');
            this.shareBtn.removeAllListeners('pointerover');
            this.shareBtn.removeAllListeners('pointerout');
        }
        if (this.actionBtn) {
            this.actionBtn.removeAllListeners('pointerdown');
            this.actionBtn.removeAllListeners('pointerover');
            this.actionBtn.removeAllListeners('pointerout');
        }
    }

    /**
     * Configure buttons based on game state
     * @param {string} state - 'PAUSED' | 'LOSS' | 'WIN' | 'INACTIVE' | 'FORCED_RESTART'
     */
    setState(state) {
        this.currentState = state;
        this.clearAllListeners();

        switch (state) {
            case 'PAUSED':
                this.configurePausedState();
                break;
            case 'LOSS':
                this.configureLossState();
                break;
            case 'WIN':
                this.configureWinState();
                break;
            case 'INACTIVE':
                this.configureLossState(); // Same as loss
                break;
            case 'FORCED_RESTART':
                this.configureForcedRestartState();
                break;
            default:
                console.error('Invalid state:', state);
        }
    }

    /**
     * PAUSED STATE: Player opened wallet during active round
     * Show only CONTINUE button (centered)
     */
    configurePausedState() {
        // Hide SHARE button
        if (this.shareBtn) {
            this.shareBtn.setVisible(false);
        }

        // Show CONTINUE button (keep its position - don't override)
        if (this.actionBtn && this.actionBtnText) {
            this.actionBtn.setVisible(true);
            this.actionBtnText.setText('CONTINUE');
            this._fitTextToButton();

            // Add hover effects
            this.actionBtn.on('pointerover', () => this.actionBtn.setScale(1.08));
            this.actionBtn.on('pointerout', () => this.actionBtn.setScale(1));

            // Add click handler
            this.actionBtn.on('pointerdown', () => {
                this.hudScene.ensureAudioUnlocked();
                this.handleContinue();
            });
        }
    }

    /**
     * LOSS STATE: Player lost the level or was inactive
     * Show only TRY AGAIN button (centered) OR EXIT TO MENU for endless mode
     */
    configureLossState() {
        // Hide SHARE button
        if (this.shareBtn) {
            this.shareBtn.setVisible(false);
        }

        // Show TRY AGAIN button (keep its position - don't override)
        if (this.actionBtn && this.actionBtnText) {
            // ENDLESS MODE: Show "EXIT TO MENU" instead of retry
            if (this.hudScene.isEndlessMode) {
                this.actionBtn.setVisible(true);
                this.actionBtnText.setText('EXIT TO MENU');
                this._fitTextToButton();
                
                // Add hover effects
                this.actionBtn.on('pointerover', () => this.actionBtn.setScale(1.08));
                this.actionBtn.on('pointerout', () => this.actionBtn.setScale(1));
                
                // Add click handler
                this.actionBtn.on('pointerdown', () => {
                    this.hudScene.ensureAudioUnlocked();
                    this.handleExitToMenu();
                });
            } else {
                this.actionBtn.setVisible(true);

                if (this.hudScene.isTutorialActive || this.hudScene.tutorialMode) {
                    this.actionBtnText.setText('TRY AGAIN (FREE)');
                } else {
                    const retryCost = gameFlowManager.retryCost(this.hudScene.activeLevel) ?? 10;
                    this.actionBtnText.setText(`TRY AGAIN (-${retryCost}W)`);
                }
                this._fitTextToButton();

                // Add hover effects
                this.actionBtn.on('pointerover', () => this.actionBtn.setScale(1.08));
                this.actionBtn.on('pointerout', () => this.actionBtn.setScale(1));

                // Add click handler
                this.actionBtn.on('pointerdown', () => {
                    this.hudScene.ensureAudioUnlocked();
                    this.handleTryAgain();
                });
            }
        }
    }

    /**
     * WIN STATE: Player won the level
     * Show NEXT LEVEL button (centered, no share button)
     */
    configureWinState() {
        // Show NEXT LEVEL button (keep its position - don't override)
        if (this.actionBtn && this.actionBtnText) {
            this.actionBtn.setVisible(true);
            this.actionBtnText.setText('NEXT LEVEL');
            this._fitTextToButton();

            // Add hover effects
            this.actionBtn.on('pointerover', () => this.actionBtn.setScale(1.08));
            this.actionBtn.on('pointerout', () => this.actionBtn.setScale(1));

            // Add click handler
            this.actionBtn.on('pointerdown', () => {
                this.hudScene.ensureAudioUnlocked();
                this.handleNextLevel();
            });
        }
    }

    /**
     * Safely fit text inside the action button to prevent clipping
     * Used for "TRY AGAIN (-10W)", "CONTINUE", etc.
     */
    _fitTextToButton() {
        if (!this.actionBtnText) return;

        // Reset scale first to accurately measure unscaled text width
        this.actionBtnText.setScale(1);

        // Button is 380px wide in HUDScene, minus 40px for safe padding
        const BUTTON_WIDTH = 380;
        const availableWidth = BUTTON_WIDTH - 40;

        const scale = Math.min(1, availableWidth / this.actionBtnText.width);
        this.actionBtnText.setScale(scale);
    }

    /**
     * FORCED RESTART STATE: Player has 0W balance and no gains
     * Hide TRY AGAIN button - only NEW GAME button visible
     * Forces complete game reset to Level 1
     */
    configureForcedRestartState() {
        console.log('🚫 ═══ CONFIGURING FORCED RESTART STATE ═══');
        console.log('   Hiding TRY AGAIN button...');
        console.log('   Only NEW GAME button remains active');

        // Hide SHARE button
        if (this.shareBtn) {
            this.shareBtn.setVisible(false);
        }

        // ABSOLUTELY HIDE the action button (TRY AGAIN/NEXT LEVEL/etc)
        if (this.actionBtn) {
            this.actionBtn.setVisible(false);
            this.actionBtn.setAlpha(0);
            this.actionBtn.setInteractive(false);
            console.log('   ✅ Action Button hidden and deactivated');
        }

        // NEW GAME button is always visible and handles the complete reset
        // No need to configure it here - it's set up in HUDScene
    }

    /**
     * CONTINUE handler - Resume paused round
     */
    handleContinue() {
        const hud = this.hudScene;

        console.log('[WoolWalletButtonManager] ✅ CONTINUE – resuming round');

        // Close modal
        hud.toggleStatsModal();
        
        // ENDLESS MODE: Restart with next round
        if (hud.isEndlessMode && hud.recentLevelResult?.nextAction === 'ENDLESS_NEXT_ROUND') {
            console.log(`🔄 ENDLESS MODE: Starting Round ${hud.endlessRound}`);
            
            // Restart GameScene with new round
            const gameScene = hud.scene.get('GameScene');
            gameScene.scene.restart({
                balance: hud.balance,
                activeLevel: 1, // Use level 1 config as base
                isEndlessMode: true,
                endlessRound: hud.endlessRound
            });
            
            // Restart HUDScene
            hud.scene.restart({
                balance: hud.balance,
                activeLevel: 1,
                isEndlessMode: true,
                endlessRound: hud.endlessRound
            });
            
            return;
        }

        // Animate coin flying back to wallet
        const returningCoin = hud.add.image(CONFIG.width / 2, CONFIG.height / 2, 'wool');
        returningCoin.setScale(1.2);
        returningCoin.setDepth(10000);

        hud.tweens.add({
            targets: returningCoin,
            x: 90,
            y: 87,
            scale: 0.275,
            duration: 600,
            ease: 'Power2',
            onComplete: () => {
                returningCoin.destroy();
                if (hud.walletCoin) {
                    hud.walletCoin.setAlpha(1);
                    hud.walletCoin.clearTint();
                }
                if (hud.walletBg) hud.walletBg.setAlpha(1);
                hud.tweens.add({
                    targets: hud.walletCoin,
                    scale: 0.35,
                    duration: 100,
                    yoyo: true,
                    ease: 'Back.easeOut'
                });
            }
        });

        // Clear state flags before resuming
        hud.isPauseMode = false;
        hud.isLossModal = false;
        hud.isWinModal = false;
        this.currentState = null;

        // Route through GameFlowManager (no direct scene.resume here)
        gameFlowManager.resumeRound();
    }

    /**
     * TRY AGAIN handler – Restart current level via GameFlowManager
     */
    handleTryAgain() {
        const hud = this.hudScene;

        // Guard: block if transition already in progress
        if (gameFlowManager.isTransitioning) {
            console.warn('[WoolWalletButtonManager] TRY AGAIN blocked – transition in progress');
            return;
        }

        console.log('[WoolWalletButtonManager] 🔄 TRY AGAIN – level', hud.activeLevel);

        // Resolve the level-start balance (what the player had at the START of
        // this level, before any bets this round).  This is what GameFlowManager
        // uses as the base for the retry-cost deduction.
        let levelStartBalance = 0;
        const saved = localStorage.getItem(`sheepMarket_level${hud.activeLevel}StartBalance`);
        levelStartBalance = saved ? parseFloat(saved) : (hud.sessionStartWool || 0);
        
        // For Level 1, if no saved balance exists, default to 0 (new player)
        if (hud.activeLevel === 1 && !saved) {
            levelStartBalance = 0;
        }

        const retryCost = gameFlowManager.retryCost(hud.activeLevel);
        
        console.log(
            `[WoolWalletButtonManager] 💰 Level ${hud.activeLevel} start balance: ${levelStartBalance}W` +
            ` | retry cost: ${retryCost}W`
        );

        // Carry over stats for Level 1 retry
        let sessionStats = null;
        if (hud.activeLevel === 1) {
            sessionStats = {
                sessionGains: hud.sessionGains,
                sessionLosses: hud.sessionLosses,
                sessionWins: hud.sessionWins,
                sessionLossesCount: hud.sessionLossesCount,
                totalWoolLost: hud.totalWoolLost,
                tutorialMode: hud.isTutorialActive || hud.tutorialMode
            };
            console.log('[WoolWalletButtonManager] 📊 Carrying over Level 1 session stats:', sessionStats);
        }

        // Close the stats modal first
        hud.toggleStatsModal();
        this.currentState = null;
        
        // Show retry confirmation popup
        hud.showRetryConfirmationPopup(
            retryCost,
            levelStartBalance,
            // onConfirm - player confirmed retry
            () => {
                console.log('[WoolWalletButtonManager] ✅ Retry confirmed');
                gameFlowManager.retry(hud.activeLevel, levelStartBalance, sessionStats);
            },
            // onCancel - player cancelled
            () => {
                console.log('[WoolWalletButtonManager] ❌ Retry cancelled');
                // Reopen the stats modal
                hud.toggleStatsModal();
            }
        );
    }

    /**
     * EXIT TO MENU handler - Return to main menu from endless mode
     */
    handleExitToMenu() {
        console.log('[WoolWalletButtonManager] 🚪 EXIT TO MENU');
        
        // Clear endless mode flags
        localStorage.removeItem('sheepMarket_endlessMode');
        localStorage.removeItem('sheepMarket_endlessRound');
        localStorage.removeItem('sheepMarket_endlessBalance');
        
        // Return to boot scene
        this.hudScene.scene.stop('HUDScene');
        this.hudScene.scene.stop('GameScene');
        this.hudScene.scene.start('BootScene');
    }

    /**
     * RESTART GAME handler – Full reset via GameFlowManager
     */
    handleRestartGame() {
        const hud = this.hudScene;

        if (gameFlowManager.isTransitioning) {
            console.warn('[WoolWalletButtonManager] RESTART GAME blocked – transition in progress');
            return;
        }

        console.log('[WoolWalletButtonManager] 🆕 RESTART GAME');

        // Reset in-memory HUD state (mirrors executeLevel1Reset but without scene calls)
        hud.balance = 0;
        hud.sessionGains = 0;
        hud.sessionLosses = 0;
        hud.totalWoolLost = 0;
        hud.sessionWins = 0;
        hud.sessionLossesCount = 0;
        hud.lifetimeGains = 0;
        hud.lifetimeLosses = 0;
        hud.lifetimeSpentCalls = 0;
        hud.lifetimeBestCall = 0;
        hud.winStreak = 0;
        hud.gameScore = 0;
        hud.roundsPlayed = 0;
        hud.tradeHistory = [];
        hud.finalCallHistory = [];
        hud.levelPerformanceHistory = [];
        hud.perLevelCallHistory = { 1: [] };
        hud.callEfficiencyHistory = {};
        hud.perLevelCallLosses = {};
        hud.levelBonuses = [];

        this.currentState = null;
        gameFlowManager.newGame();
    }

    /**
     * NEXT LEVEL handler – Advance to next level via GameFlowManager
     */
    handleNextLevel() {
        const hud = this.hudScene;

        // Guard: block if transition already in progress or shop is active
        if (gameFlowManager.isTransitioning) {
            console.warn('[WoolWalletButtonManager] NEXT LEVEL blocked – transition in progress');
            return;
        }
        if (gameFlowManager.isShopActive) {
            console.warn('[WoolWalletButtonManager] NEXT LEVEL blocked – shop is active');
            return;
        }

        const required = gameFlowManager.minWoolToAdvance(hud.activeLevel);
        console.log(
            `[WoolWalletButtonManager] ➡️  NEXT LEVEL from ${hud.activeLevel}` +
            ` | balance: ${hud.balance}W | required: ${required}W`
        );

        // Pre-check WOOL gate here so we can keep the modal open and show the
        // warning inside it rather than closing first.
        if (hud.balance < required) {
            const msg = `NOT ENOUGH WOOL! Need ${required}W to advance. You have ${Math.floor(hud.balance)}W.`;
            console.warn(`[WoolWalletButtonManager] ❌ Advance blocked: ${hud.balance}W < ${required}W`);
            // Show warning inside the open wallet modal
            if (hud.showToast) hud.showToast(msg);
            // GameFlowManager will also emit flow:blocked-advance but we don't
            // need to call it here – just return without closing the modal.
            return;
        }

        // WOOL check passed – close modal and delegate to GameFlowManager
        hud.toggleStatsModal();
        this.currentState = null;
        gameFlowManager.nextLevel(hud.activeLevel, hud.balance);
    }

    /**
     * SHARE handler - Open share dialog
     */
    handleShare() {
        const hud = this.hudScene;

        console.log('📤 SHARE clicked');

        // Play sound
        audioManager.playClick();

        // Call existing share logic
        if (hud.shareStats) {
            hud.shareStats();
        }
    }
}
