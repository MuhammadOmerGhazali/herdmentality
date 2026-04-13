/**
 * GameFlowManager.js
 *
 * Singleton controller for all game progression.
 *
 * RULES:
 *  - Only this module may call scene.start / scene.restart / scene.stop for
 *    GameScene and HUDScene.
 *  - Scenes communicate intent by calling GameFlowManager methods.
 *  - No scene may directly trigger another scene's lifecycle.
 *
 * GLOBAL BUS EVENTS  (game.events):
 *   'flow:level-start'        { level, balance }
 *   'flow:level-win'          { level, balance, nextLevel }
 *   'flow:level-loss'         { level, balance }
 *   'flow:retry'              { level, balance, cost }
 *   'flow:new-game'           {}
 *   'flow:blocked-advance'    { level, balance, required }   – not enough WOOL to advance
 *   'flow:blocked-retry'      { level, balance, cost }       – not enough WOOL to retry
 *   'flow:shop-open'          { level, balance }             – reserved
 *   'flow:shop-continue'      { level, balance }             – reserved
 */

import { authService } from './auth.js';
import { WOOL_CONFIG } from '../config.js';

class GameFlowManager {
    constructor() {
        /** @type {Phaser.Game|null} */
        this._game = null;

        // Transition lock – prevents duplicate progression triggers
        this._transitioning = false;

        // Shop guard – reserved for future ShopScene
        this._shopActive = false;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Bootstrap
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Call once from main.js after Phaser.Game is created.
     * @param {Phaser.Game} game
     */
    init(game) {
        this._game = game;
        console.log('[GameFlowManager] ✅ Initialized');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    get _sceneManager() {
        return this._game && this._game.scene;
    }

    _emit(event, data = {}) {
        if (this._game) this._game.events.emit(event, data);
    }

    /**
     * Acquire the transition lock.
     * @returns {boolean} false if already locked (caller should abort).
     */
    _lock(label) {
        if (this._transitioning) {
            console.warn(`[GameFlowManager] ⚠️  Already transitioning – ignoring "${label}"`);
            console.trace('[GameFlowManager] Duplicate call stack:');
            return false;
        }
        this._transitioning = true;
        console.log(`[GameFlowManager] 🔒 Lock acquired: ${label}`);
        return true;
    }

    _unlock() {
        this._transitioning = false;
        console.log('[GameFlowManager] 🔓 Lock released');
    }

    /** Persist balance to authService and optionally save a level-start snapshot. */
    _persistBalance(balance, levelForSnapshot = null) {
        authService.saveBalance(balance);
        if (levelForSnapshot) {
            localStorage.setItem(
                `sheepMarket_level${levelForSnapshot}StartBalance`,
                balance.toString()
            );
            console.log(`[GameFlowManager] 💾 Level ${levelForSnapshot} start balance saved: ${balance}W`);
        }
    }

    /** Stop HUDScene if running. */
    _stopHUD() {
        if (this._sceneManager && this._sceneManager.isActive('HUDScene')) {
            this._sceneManager.stop('HUDScene');
            console.log('[GameFlowManager] 🛑 HUDScene stopped');
        }
    }

    /**
     * Safely transition to GameScene with the given data.
     * Uses scene.start() which atomically stops any running GameScene first,
     * avoiding the stop()+start() race condition that causes black screens.
     */
    _startGameScene(data) {
        console.log('[GameFlowManager] 🎬 Starting GameScene with:', JSON.stringify(data));
        try {
            // scene.start() stops the scene if already running, then starts it fresh.
            // This is safer than stop() + start() in the same tick.
            this._sceneManager.start('GameScene', data);
        } catch (err) {
            console.error('[GameFlowManager] ❌ Failed to start GameScene:', err);
            this._unlock(); // Always release lock on error
        }
    }

    /**
     * Release the transition lock once the new GameScene has finished create().
     * Listening to the scene's 'create' event is safer than 'step' because
     * 'step' fires before create() completes, which can allow a second
     * transition to sneak in while the scene is still initializing.
     */
    _unlockNextTick() {
        if (!this._game) { this._unlock(); return; }

        // Wait for GameScene's create() to complete before releasing the lock.
        // Use a one-time listener on the SceneManager's 'create' event.
        const onSceneCreated = (scene) => {
            if (scene.sys && scene.sys.settings && scene.sys.settings.key === 'GameScene') {
                this._game.events.off('Phaser.Scenes.Events.CREATE', onSceneCreated);
                this._unlock();
            }
        };

        // Phaser emits 'create' on game.events with the scene as argument
        this._game.events.once(Phaser.Scenes.Events.CREATE, onSceneCreated);

        // Safety fallback: if the event never fires (e.g. scene key mismatch),
        // release the lock after 3 seconds so the game doesn't get permanently stuck.
        setTimeout(() => {
            if (this._transitioning) {
                console.warn('[GameFlowManager] ⚠️  Lock safety-release after 3s timeout');
                this._unlock();
            }
        }, 3000);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WOOL rule helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Minimum WOOL balance required to advance FROM a given level.
     * @param {number} level
     * @returns {number}
     */
    minWoolToAdvance(level) {
        return WOOL_CONFIG.minWoolToAdvance[level] ?? 0;
    }

    /**
     * WOOL cost deducted from the level-start balance on retry.
     * @param {number} level
     * @returns {number}
     */
    retryCost(level) {
        return WOOL_CONFIG.retryCost[level] ?? 0;
    }

    /**
     * Notify HUDScene to show a warning toast/message via the global bus.
     * HUDScene listens for 'flow:show-warning' and calls its own showToast().
     */
    _showWarning(message) {
        console.warn(`[GameFlowManager] ⚠️  ${message}`);
        this._emit('flow:show-warning', { message });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Attempt to advance to the next level after a win.
     *
     * Checks:
     *  1. Not already transitioning.
     *  2. Shop is not active.
     *  3. Player has >= minWoolToAdvance[currentLevel] WOOL.
     *
     * @param {number} currentLevel
     * @param {number} balance  – settled WOOL balance after the round
     */
    nextLevel(currentLevel, balance) {
        const label = `nextLevel from ${currentLevel}`;

        // ── Guard: shop active ───────────────────────────────────────────────
        if (this._shopActive) {
            console.warn('[GameFlowManager] nextLevel blocked – shop is active');
            return;
        }

        // ── Guard: transition lock ───────────────────────────────────────────
        if (!this._lock(label)) return;

        const required = this.minWoolToAdvance(currentLevel);
        const nextLvl  = currentLevel >= 12 ? 1 : currentLevel + 1;

        console.log(
            `[GameFlowManager] ➡️  nextLevel: ${currentLevel} → ${nextLvl}` +
            ` | balance: ${balance}W | required: ${required}W`
        );

        // ── WOOL gate ────────────────────────────────────────────────────────
        if (balance < required) {
            const msg = `NOT ENOUGH WOOL TO ADVANCE! Need ${required}W, have ${Math.floor(balance)}W.`;
            this._showWarning(msg);
            this._emit('flow:blocked-advance', { level: currentLevel, balance, required });
            console.warn(`[GameFlowManager] ❌ Advance blocked: ${balance}W < ${required}W`);
            this._unlock(); // Release immediately – no transition happened
            return;
        }

        // ── Persist & transition ─────────────────────────────────────────────
        localStorage.setItem('sheepMarket_playerLevel', nextLvl.toString());
        this._persistBalance(balance, nextLvl);

        this._emit('flow:level-win', { level: currentLevel, balance, nextLevel: nextLvl });

        this._stopHUD();
        this._startGameScene({
            balance,
            activeLevel: nextLvl,
            fromGraduation: true,
        });

        this._unlockNextTick();
    }

    /**
     * Attempt to retry the current level.
     *
     * Checks:
     *  1. Not already transitioning.
     *  2. Player has >= retryCost[level] WOOL (from the level-start balance).
     *
     * If the player cannot afford the retry cost → trigger game-over flow.
     * Otherwise deduct the cost, persist, and restart the level.
     *
     * @param {number} level
     * @param {number} levelStartBalance  – the balance at the START of this level
     * @param {object|null} sessionStats  – optional carry-over stats (Level 1)
     */
    retry(level, levelStartBalance, sessionStats = null) {
        const label = `retry level ${level}`;

        if (!this._lock(label)) return;

        let isTutorialMode = sessionStats?.tutorialMode || false;
        
        const cost           = isTutorialMode ? 0 : this.retryCost(level);
        let balanceAfterCost = Math.max(0, levelStartBalance - cost);
        
        if (isTutorialMode) {
            balanceAfterCost = 100;
            console.log(`[GameFlowManager] 🎓 Tutorial Mode detected on retry – overriding balance to ${balanceAfterCost}W`);
        }

        console.log(
            `[GameFlowManager] 🔄 retry: level ${level}` +
            ` | levelStartBalance: ${levelStartBalance}W` +
            ` | retryCost: ${cost}W` +
            ` | balanceAfterCost: ${balanceAfterCost}W`
        );

        // ── WOOL gate: can't afford retry ────────────────────────────────────
        if (cost > 0 && levelStartBalance < cost) {
            const msg = `NOT ENOUGH WOOL TO RETRY! Retry costs ${cost}W, have ${Math.floor(levelStartBalance)}W.`;
            this._showWarning(msg);
            this._emit('flow:blocked-retry', { level, balance: levelStartBalance, cost });
            console.warn(`[GameFlowManager] ❌ Retry blocked: ${levelStartBalance}W < ${cost}W cost`);
            this._unlock();

            // Trigger game-over (forced new-game) after a short delay so the
            // warning message is visible before the screen changes.
            setTimeout(() => this.newGame(), 2000);
            return;
        }

        // ── Deduct cost & persist ────────────────────────────────────────────
        // Always save balance to ensure reset to levelStartBalance happens correctly in all cases.
        authService.saveBalance(balanceAfterCost);
        localStorage.setItem(`sheepMarket_level${level}StartBalance`, balanceAfterCost.toString());
        
        if (cost > 0) {
            console.log(`[GameFlowManager] 💸 Retry cost deducted: -${cost}W → ${balanceAfterCost}W`);
            this._emit('flow:retry-cost-deducted', { level, cost, balance: balanceAfterCost });
        } else if (isTutorialMode) {
            console.log(`[GameFlowManager] 🎓 Tutorial retry free. Balance restored to ${balanceAfterCost}W`);
        } else {
            console.log(`[GameFlowManager] 🔄 Free retry for level ${level}. Balance restored to ${balanceAfterCost}W`);
        }

        this._emit('flow:retry', { level, balance: balanceAfterCost, cost });

        this._stopHUD();

        const data = {
            balance: balanceAfterCost,
            activeLevel: level,
            isRetrying: true,
            forceReset: true,
            tutorialMode: isTutorialMode
        };
        
        // Final safety override just in case
        if (isTutorialMode || data?.tutorialMode) {
            data.balance = 100;
        }
        
        if (sessionStats) data.sessionStats = sessionStats;

        console.log('[GameFlowManager] [FLOW] RETRY → GameScene', data);
        this._startGameScene(data);

        this._unlockNextTick();
    }

    /**
     * Full new-game reset – wipes all progress and starts Level 1.
     */
    newGame() {
        if (!this._lock('newGame')) return;

        console.log('[GameFlowManager] 🆕 newGame – resetting all progress');

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
            ...Array.from({ length: 12 }, (_, i) => `sheepMarket_level${i + 1}StartBalance`),
        ];
        keysToClear.forEach(k => localStorage.removeItem(k));
        authService.saveBalance(0);

        this._emit('flow:new-game', {});

        this._stopHUD();
        this._startGameScene({
            balance: 0,
            activeLevel: 1,
            isRetrying: false,
            forceReset: true,
        });

        this._unlockNextTick();
    }

    /**
     * Resume a paused round (player closed the wallet mid-round).
     * No scene transition – just resumes GameScene.
     */
    resumeRound() {
        console.log('[GameFlowManager] ▶️  resumeRound');
        const gs = this._sceneManager && this._sceneManager.getScene('GameScene');
        if (gs && gs.scene.isPaused()) {
            gs.scene.resume();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Shop hooks (reserved – no ShopScene yet)
    // ─────────────────────────────────────────────────────────────────────────

    openShop(level, balance) {
        if (this._shopActive) {
            console.warn('[GameFlowManager] Shop already active – ignoring openShop()');
            return;
        }
        this._shopActive = true;
        console.log(`[GameFlowManager] 🛒 openShop (reserved) level=${level} balance=${balance}W`);
        this._emit('flow:shop-open', { level, balance });
        // TODO: this._sceneManager.start('ShopScene', { level, balance });
    }

    shopContinue(level, balance) {
        if (!this._shopActive) return;
        this._shopActive = false;
        console.log(`[GameFlowManager] 🛒 shopContinue → level ${level}`);
        this._emit('flow:shop-continue', { level, balance });
        this.nextLevel(level - 1, balance);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Guard accessors
    // ─────────────────────────────────────────────────────────────────────────

    get isTransitioning() { return this._transitioning; }
    get isShopActive()    { return this._shopActive; }

    // ─────────────────────────────────────────────────────────────────────────
    // Internals exposed for GameScene.changeLevel() only
    // (do not call from HUDScene or button managers)
    // ─────────────────────────────────────────────────────────────────────────

    /** @internal */
    _internalChangeLevelTransition(targetLevel, balance, extraData) {
        if (!this._lock(`changeLevel → ${targetLevel}`)) return;
        localStorage.setItem('sheepMarket_playerLevel', targetLevel.toString());
        this._persistBalance(balance, targetLevel);
        this._stopHUD();
        this._startGameScene({ balance, activeLevel: targetLevel, ...extraData });
        this._unlockNextTick();
    }
}

// Singleton export
export const gameFlowManager = new GameFlowManager();
