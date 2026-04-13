import Phaser from 'phaser';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { HUDScene } from './scenes/HUDScene.js';
import { DevMenuScene } from './scenes/DevMenuScene.js';
import { SandboxScene } from './scenes/SandboxScene.js';
import { EventSystemScene } from './scenes/EventSystemScene.js';
import { HelpGuideScene } from './scenes/HelpGuideScene.js';
import { CONFIG } from './config.js';
import AuthUI from './components/AuthUI.js';
import { gameFlowManager } from './services/GameFlowManager.js';

const config = {
    type: Phaser.AUTO,
    width: CONFIG.width,
    height: CONFIG.height,
    parent: 'game-container',
    dom: {
        createContainer: true
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false,
            fps: 60, // Lock physics to 60 FPS for consistent performance
            fixedStep: true // Use fixed timestep
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: {
        pixelArt: false,
        antialias: true,
        roundPixels: true, // Improves text rendering performance
        batchSize: 4096, // Increase batch size for better sprite rendering
        maxLights: 10 // Limit lights for better performance
    },
    fps: {
        target: 60,
        forceSetTimeOut: false,
        smoothStep: true // Smooth out frame rate variations
    },
    scene: [BootScene, GameScene, HUDScene, DevMenuScene, SandboxScene, EventSystemScene, HelpGuideScene]
};

// Initialize Phaser
const game = new Phaser.Game(config);

// Bootstrap GameFlowManager with the Phaser game instance
gameFlowManager.init(game);

// Expose for console debugging
window.gameFlowManager = gameFlowManager;

// Unlock audio on first user interaction (for autoplay restrictions)
const unlockAudio = () => {
    if (game.sound && game.sound.context) {
        game.sound.context.resume().then(() => {
            console.log('🔊 Audio context unlocked');
        });
    }
    // Remove listeners after first unlock
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
    document.removeEventListener('keydown', unlockAudio);
};

// Add listeners for first user interaction
document.addEventListener('click', unlockAudio);
document.addEventListener('touchstart', unlockAudio);
document.addEventListener('keydown', unlockAudio);

// Initialize React UI
const root = ReactDOM.createRoot(document.getElementById('ui-root'));
root.render(React.createElement(AuthUI));

// Debug function to reset progress (accessible via browser console)
window.resetGameProgress = () => {
    console.log('🔄 Resetting all game progress...');
    
    // Clear ALL localStorage (not just game keys)
    localStorage.clear();
    
    console.log('✅ All data cleared! Reloading to Level 1...');
    
    // Hard reload (bypass cache)
    window.location.reload(true);
};

// Debug function to reset black sheep and golden clover unlock
window.resetBlackSheepAndClover = () => {
    console.log('🐑 Resetting Black Sheep and Golden Clover unlock...');
    
    localStorage.removeItem('sheepMarket_blackSheepUnlocked');
    localStorage.removeItem('sheepMarket_goldenCloverUnlocked');
    
    console.log('✅ Black Sheep and Golden Clover reset!');
    console.log('   They will spawn again in Level 10');
    console.log('   Reload the page or restart the level to see changes');
};

// Developer tools helper (accessible via browser console)
window.devTools = {
    help: () => {
        console.log('\n🛠️ ═══ DEVELOPER TOOLS HELP ═══');
        console.log('\n📍 IN-GAME ACCESS:');
        console.log('   Click the 🛠️ button in the top-right corner');
        console.log('\n🎮 AVAILABLE TOOLS:');
        console.log('   • Sandbox Mode - Test and create levels');
        console.log('   • Event/Effect System - Browse and test all events');
        console.log('   • Audio System - Test sound balancing');
        console.log('   • Help & Guide - In-game tutorials');
        console.log('\n📚 DOCUMENTATION:');
        console.log('   • Quick Start: DEV_TOOLS_QUICK_START.md');
        console.log('   • User Guide: DEVELOPER_TOOLS_GUIDE.md');
        console.log('   • Full Docs: DEV_TOOLS_README.md');
        console.log('   • Index: DOCUMENTATION_INDEX.md');
        console.log('\n🎵 AUDIO COMMANDS:');
        console.log('   • audioManager.help()');
        console.log('   • audioManager.testAudioBalancing()');
        console.log('   • audioManager.debugAudioState()');
        console.log('\n💡 OTHER COMMANDS:');
        console.log('   • devTools.help() - Show this help');
        console.log('   • devTools.docs() - List all documentation');
        console.log('   • resetGameProgress() - Reset game to Level 1');
        console.log('   • resetBlackSheepAndClover() - Reset black sheep/clover unlock');
        console.log('\n═══════════════════════════════\n');
    },
    
    docs: () => {
        console.log('\n📚 ═══ DOCUMENTATION FILES ═══');
        console.log('\n🚀 GETTING STARTED:');
        console.log('   1. DEV_TOOLS_CHEAT_SHEET.txt (30 sec)');
        console.log('   2. DEV_TOOLS_QUICK_START.md (1 min)');
        console.log('   3. In-game: Click 🛠️ → Help & Guide (10 min)');
        console.log('\n📖 USER GUIDES:');
        console.log('   • DEVELOPER_TOOLS_GUIDE.md - Complete guide (20 min)');
        console.log('   • DEV_TOOLS_README.md - Full documentation (1 hour)');
        console.log('\n🔧 TECHNICAL:');
        console.log('   • DEV_TOOLS_IMPLEMENTATION_SUMMARY.md - What was built');
        console.log('   • AUDIO_README.md - Audio system overview');
        console.log('   • AUDIO_BALANCING_GUIDE.md - Audio implementation');
        console.log('   • AUDIO_SYSTEM_SUMMARY.md - Audio architecture');
        console.log('\n🗂️ REFERENCE:');
        console.log('   • DOCUMENTATION_INDEX.md - Complete index');
        console.log('\n💡 TIP: All files are in the root directory');
        console.log('═══════════════════════════════\n');
    },
    
    sandbox: () => {
        console.log('🎮 Opening Sandbox Mode...');
        console.log('   Use the right panel to adjust parameters');
        console.log('   Use the left panel to place elements');
        console.log('   Watch the Live Preview for updates');
        console.log('   Press H for help overlay');
    },
    
    events: () => {
        console.log('⚡ Event/Effect System Info:');
        console.log('\n📊 REGISTERED EVENTS:');
        console.log('   🌍 Environmental: Wind Gust, Rain, Sunshine');
        console.log('   🐑 Animals: Wolf, Golden Sheep, Shepherd');
        console.log('   🎵 Audio/Visual: Bleats, Alerts, Particles');
        console.log('\n💡 Access in-game: Click 🛠️ → Event/Effect System');
    }
};

console.log('🎮 Sheep Market loaded!');
console.log('   Type "devTools.help()" for developer tools info');
console.log('   Type "audioManager.help()" for audio commands');
console.log('   Type "resetGameProgress()" to reset to Level 1');
console.log('   Type "resetBlackSheepAndClover()" to reset black sheep/clover');
