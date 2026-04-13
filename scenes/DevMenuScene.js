import Phaser from 'phaser';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEVELOPER MENU - HERD MENTALITY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Simple, accessible menu for accessing sandbox mode and developer tools.
 * Designed to be beginner-friendly with clear labels and instructions.
 * 
 * Features:
 * - Sandbox Mode access
 * - Event/Effect System viewer
 * - Help & Tutorials
 * - Audio System tools
 */

export class DevMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'DevMenuScene', active: false });
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Semi-transparent background overlay
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.85);
        overlay.setOrigin(0);
        overlay.setInteractive();
        overlay.setDepth(1000);

        // Main container
        const container = this.add.container(width / 2, height / 2);
        container.setDepth(1001);

        // Title
        const title = this.add.text(0, -300, '🛠️ DEVELOPER TOOLS', {
            font: 'bold 48px Inter',
            fill: '#fcd535',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        const subtitle = this.add.text(0, -240, 'Test, Create & Experiment Safely', {
            font: '24px Inter',
            fill: '#ffffff',
            alpha: 0.8
        }).setOrigin(0.5);

        container.add([title, subtitle]);

        // Button configuration
        const buttons = [
            {
                label: '🎮 SANDBOX MODE',
                description: 'Test levels, adjust sheep behavior, preview pricing',
                action: () => this.openSandbox(),
                color: '#44ff44'
            },
            {
                label: '⚡ EVENT / EFFECT SYSTEM',
                description: 'View and test environmental effects & behaviors',
                action: () => this.openEventSystem(),
                color: '#44aaff'
            },
            {
                label: '🎵 AUDIO SYSTEM',
                description: 'Test audio balancing and sound effects',
                action: () => this.openAudioTools(),
                color: '#ff44ff'
            },
            {
                label: '📖 HELP & GUIDE',
                description: 'Learn how to use these tools (recommended first!)',
                action: () => this.openHelpGuide(),
                color: '#ffaa44'
            },
            {
                label: '← BACK TO GAME',
                description: 'Return to normal gameplay',
                action: () => this.closeMenu(),
                color: '#888888'
            }
        ];

        // Create buttons
        let yPos = -120;
        buttons.forEach((btn, index) => {
            const button = this.createMenuButton(0, yPos, btn.label, btn.description, btn.color, btn.action);
            container.add(button);
            yPos += 120;
        });

        // Info footer
        const footer = this.add.text(0, 380, 'All changes in Sandbox Mode are temporary unless saved\nLive gameplay is never affected', {
            font: '16px Inter',
            fill: '#aaaaaa',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);
        container.add(footer);

        // Close on ESC key
        this.input.keyboard.on('keydown-ESC', () => this.closeMenu());

        // Fade in animation
        container.setAlpha(0);
        container.setScale(0.8);
        this.tweens.add({
            targets: container,
            alpha: 1,
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });
    }

    createMenuButton(x, y, label, description, color, onClick) {
        const container = this.add.container(x, y);

        // Background
        const bg = this.add.rectangle(0, 0, 700, 100, 0x222222, 1);
        bg.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(color).color, 1);
        bg.setInteractive({ useHandCursor: true });

        // Label
        const labelText = this.add.text(-320, -20, label, {
            font: 'bold 28px Inter',
            fill: color
        });

        // Description
        const descText = this.add.text(-320, 15, description, {
            font: '18px Inter',
            fill: '#cccccc'
        });

        // Tooltip (appears on hover)
        let tooltip = null;

        container.add([bg, labelText, descText]);

        // Hover effects
        bg.on('pointerover', () => {
            this.tweens.add({
                targets: container,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 150,
                ease: 'Quad.easeOut'
            });
            bg.setFillStyle(0x333333);
        });

        bg.on('pointerout', () => {
            this.tweens.add({
                targets: container,
                scaleX: 1,
                scaleY: 1,
                duration: 150,
                ease: 'Quad.easeOut'
            });
            bg.setFillStyle(0x222222);
        });

        bg.on('pointerdown', () => {
            this.tweens.add({
                targets: container,
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 100,
                yoyo: true,
                onComplete: onClick
            });
        });

        return container;
    }

    openSandbox() {
        console.log('🎮 Opening Sandbox Mode...');
        this.scene.stop('DevMenuScene');
        this.scene.launch('SandboxScene');
    }

    openEventSystem() {
        console.log('⚡ Opening Event/Effect System...');
        this.scene.stop('DevMenuScene');
        this.scene.launch('EventSystemScene');
    }

    openAudioTools() {
        console.log('🎵 Opening Audio Tools...');
        // Show audio system panel
        if (window.audioManager) {
            window.audioManager.help();
            console.log('\n💡 TIP: Use these commands in the console:');
            console.log('   audioManager.testAudioBalancing()');
            console.log('   audioManager.debugAudioState()');
        }
        this.scene.pause('DevMenuScene');
        this.showAudioPanel();
    }

    showAudioPanel() {
        // Simple audio test panel
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const panel = this.add.container(width / 2, height / 2);
        panel.setDepth(2000);

        const bg = this.add.rectangle(0, 0, 600, 400, 0x000000, 0.95);
        bg.setStrokeStyle(3, 0xfcd535);

        const title = this.add.text(0, -160, '🎵 AUDIO SYSTEM TOOLS', {
            font: 'bold 32px Inter',
            fill: '#fcd535'
        }).setOrigin(0.5);

        const info = this.add.text(0, -100, 'Open browser console (F12) for full control\n\nQuick Commands:', {
            font: '20px Inter',
            fill: '#ffffff',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);

        const commands = this.add.text(0, 0, 'audioManager.help()\naudioManager.testAudioBalancing()\naudioManager.debugAudioState()', {
            font: 'bold 18px Courier',
            fill: '#44ff44',
            align: 'center',
            lineSpacing: 12
        }).setOrigin(0.5);

        const testBtn = this.add.text(0, 120, '▶ TEST AUDIO BALANCING', {
            font: 'bold 24px Inter',
            fill: '#000000',
            backgroundColor: '#fcd535',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        testBtn.on('pointerdown', () => {
            if (window.audioManager) {
                window.audioManager.testAudioBalancing();
            }
        });

        const closeBtn = this.add.text(0, 170, 'CLOSE', {
            font: 'bold 20px Inter',
            fill: '#ffffff',
            backgroundColor: '#666666',
            padding: { x: 20, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerdown', () => {
            panel.destroy();
            this.scene.resume('DevMenuScene');
        });

        panel.add([bg, title, info, commands, testBtn, closeBtn]);
    }

    openHelpGuide() {
        console.log('📖 Opening Help Guide...');
        this.scene.stop('DevMenuScene');
        this.scene.launch('HelpGuideScene');
    }

    closeMenu() {
        console.log('← Returning to game...');
        this.scene.stop('DevMenuScene');
    }
}
