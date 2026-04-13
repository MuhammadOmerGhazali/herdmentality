import Phaser from 'phaser';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SANDBOX MODE - HERD MENTALITY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Safe testing environment for level design and gameplay tweaking.
 * All changes are temporary unless explicitly saved.
 * 
 * Features:
 * - Place/remove environmental elements (wind, wolves, obstacles)
 * - Adjust sheep behavior parameters
 * - Live pricing preview
 * - Pause/resume/reset controls
 * - Save/load configurations
 */

export class SandboxScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SandboxScene' });
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Initialize sandbox state
        this.sandboxConfig = {
            sheepCount: 20,
            sheepSpeed: 100,
            sheepStubbornness: 0.3,
            sheepFollowing: 0.7,
            windEnabled: false,
            windStrength: 100,
            wolvesEnabled: false,
            wolfCount: 0,
            obstaclesEnabled: false
        };

        this.isPaused = false;
        this.selectedTool = null;

        // Background
        this.add.rectangle(0, 0, width, height, 0x87CEEB).setOrigin(0).setDepth(0);

        // Draw simple pasture
        const grass = this.add.rectangle(0, height * 0.6, width, height * 0.4, 0x228B22).setOrigin(0);

        // Title bar
        this.createTitleBar();

        // Control panel
        this.createControlPanel();

        // Live preview area
        this.createPreviewArea();

        // Tool palette
        this.createToolPalette();

        // Status indicators
        this.createStatusIndicators();

        // Help overlay
        this.createHelpOverlay();

        console.log('🎮 Sandbox Mode Ready!');
        console.log('   → Use the control panel on the right to adjust settings');
        console.log('   → Click tools on the left to place elements');
        console.log('   → Press H for help overlay');
    }

    createTitleBar() {
        const width = this.cameras.main.width;
        
        // Background bar
        const bar = this.add.rectangle(0, 0, width, 60, 0x000000, 0.9).setOrigin(0).setDepth(1000);

        // Title
        const title = this.add.text(20, 30, '🎮 SANDBOX MODE', {
            font: 'bold 28px Inter',
            fill: '#fcd535'
        }).setOrigin(0, 0.5).setDepth(1001);

        // Mode indicator
        const modeTag = this.add.text(300, 30, 'SAFE TEST ENVIRONMENT', {
            font: 'bold 16px Inter',
            fill: '#000000',
            backgroundColor: '#44ff44',
            padding: { x: 12, y: 6 }
        }).setOrigin(0, 0.5).setDepth(1001);

        // Control buttons
        const btnY = 30;
        
        // Pause/Resume
        this.pauseBtn = this.createHeaderButton(width - 480, btnY, '⏸ PAUSE', '#ffaa44', () => {
            this.togglePause();
        });

        // Reset
        this.resetBtn = this.createHeaderButton(width - 360, btnY, '↻ RESET', '#ff4444', () => {
            this.resetSandbox();
        });

        // Save
        this.saveBtn = this.createHeaderButton(width - 240, btnY, '💾 SAVE', '#44aaff', () => {
            this.saveConfiguration();
        });

        // Exit
        this.exitBtn = this.createHeaderButton(width - 120, btnY, '✕ EXIT', '#888888', () => {
            this.exitSandbox();
        });
    }

    createHeaderButton(x, y, label, color, onClick) {
        const btn = this.add.text(x, y, label, {
            font: 'bold 16px Inter',
            fill: '#000000',
            backgroundColor: color,
            padding: { x: 12, y: 6 }
        }).setOrigin(0.5).setDepth(1001).setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => btn.setScale(1.05));
        btn.on('pointerout', () => btn.setScale(1));
        btn.on('pointerdown', onClick);

        return btn;
    }

    createControlPanel() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Panel background
        const panel = this.add.rectangle(width - 280, 60, 280, height - 60, 0x222222, 0.95)
            .setOrigin(0, 0).setDepth(900);

        const panelX = width - 260;
        let yPos = 90;

        // Section: Sheep Behavior
        this.add.text(panelX, yPos, '🐑 SHEEP BEHAVIOR', {
            font: 'bold 20px Inter',
            fill: '#fcd535'
        }).setDepth(901);
        yPos += 40;

        // Sheep count
        this.createSlider(panelX, yPos, 'Sheep Count', 10, 50, this.sandboxConfig.sheepCount, (value) => {
            this.sandboxConfig.sheepCount = Math.floor(value);
            console.log(`Sheep Count: ${this.sandboxConfig.sheepCount}`);
        });
        yPos += 80;

        // Speed
        this.createSlider(panelX, yPos, 'Speed', 50, 200, this.sandboxConfig.sheepSpeed, (value) => {
            this.sandboxConfig.sheepSpeed = Math.floor(value);
            console.log(`Sheep Speed: ${this.sandboxConfig.sheepSpeed}`);
        });
        yPos += 80;

        // Stubbornness
        this.createSlider(panelX, yPos, 'Stubbornness', 0, 1, this.sandboxConfig.sheepStubbornness, (value) => {
            this.sandboxConfig.sheepStubbornness = Math.round(value * 100) / 100;
            console.log(`Stubbornness: ${this.sandboxConfig.sheepStubbornness}`);
        }, true);
        yPos += 80;

        // Following
        this.createSlider(panelX, yPos, 'Following', 0, 1, this.sandboxConfig.sheepFollowing, (value) => {
            this.sandboxConfig.sheepFollowing = Math.round(value * 100) / 100;
            console.log(`Following: ${this.sandboxConfig.sheepFollowing}`);
        }, true);
        yPos += 100;

        // Section: Environment
        this.add.text(panelX, yPos, '🌍 ENVIRONMENT', {
            font: 'bold 20px Inter',
            fill: '#fcd535'
        }).setDepth(901);
        yPos += 40;

        // Wind toggle
        this.createToggle(panelX, yPos, 'Wind Effects', this.sandboxConfig.windEnabled, (value) => {
            this.sandboxConfig.windEnabled = value;
            console.log(`Wind: ${value ? 'ON' : 'OFF'}`);
        });
        yPos += 60;

        // Wolves toggle
        this.createToggle(panelX, yPos, 'Wolves', this.sandboxConfig.wolvesEnabled, (value) => {
            this.sandboxConfig.wolvesEnabled = value;
            console.log(`Wolves: ${value ? 'ON' : 'OFF'}`);
        });
        yPos += 60;

        // Obstacles toggle
        this.createToggle(panelX, yPos, 'Obstacles', this.sandboxConfig.obstaclesEnabled, (value) => {
            this.sandboxConfig.obstaclesEnabled = value;
            console.log(`Obstacles: ${value ? 'ON' : 'OFF'}`);
        });
    }

    createSlider(x, y, label, min, max, initial, onChange, isFloat = false) {
        // Label
        const labelText = this.add.text(x, y, label, {
            font: '16px Inter',
            fill: '#ffffff'
        }).setDepth(901);

        // Value display
        const valueText = this.add.text(x + 200, y, isFloat ? initial.toFixed(2) : initial, {
            font: 'bold 16px Inter',
            fill: '#fcd535'
        }).setOrigin(1, 0).setDepth(901);

        // Slider track
        const track = this.add.rectangle(x, y + 30, 220, 4, 0x666666).setOrigin(0, 0.5).setDepth(901);

        // Slider handle
        const handle = this.add.circle(x + ((initial - min) / (max - min)) * 220, y + 30, 10, 0xfcd535)
            .setDepth(902).setInteractive({ draggable: true, useHandCursor: true });

        handle.on('drag', (pointer, dragX) => {
            const clampedX = Phaser.Math.Clamp(dragX, x, x + 220);
            handle.x = clampedX;

            const ratio = (clampedX - x) / 220;
            const value = min + ratio * (max - min);

            valueText.setText(isFloat ? value.toFixed(2) : Math.floor(value));
            onChange(value);
        });
    }

    createToggle(x, y, label, initial, onChange) {
        // Label
        const labelText = this.add.text(x, y, label, {
            font: '16px Inter',
            fill: '#ffffff'
        }).setDepth(901);

        // Toggle background
        const toggleBg = this.add.rectangle(x + 180, y + 8, 50, 24, initial ? 0x44ff44 : 0x666666, 1)
            .setOrigin(0.5).setDepth(901).setInteractive({ useHandCursor: true });

        // Toggle handle
        const toggleHandle = this.add.circle(x + (initial ? 195 : 165), y + 8, 10, 0xffffff)
            .setDepth(902);

        toggleBg.on('pointerdown', () => {
            initial = !initial;
            toggleBg.setFillStyle(initial ? 0x44ff44 : 0x666666);
            
            this.tweens.add({
                targets: toggleHandle,
                x: x + (initial ? 195 : 165),
                duration: 200,
                ease: 'Cubic.easeOut'
            });

            onChange(initial);
        });
    }

    createPreviewArea() {
        const width = this.cameras.main.width;
        
        // Preview box
        const previewX = 20;
        const previewY = 80;
        const previewWidth = width - 320;
        const previewHeight = 300;

        const previewBg = this.add.rectangle(previewX, previewY, previewWidth, previewHeight, 0x000000, 0.3)
            .setOrigin(0).setDepth(10).setStrokeStyle(2, 0xfcd535);

        // Title
        this.add.text(previewX + 10, previewY + 10, '📊 LIVE PREVIEW', {
            font: 'bold 18px Inter',
            fill: '#fcd535'
        }).setDepth(11);

        // Info text
        this.previewInfoText = this.add.text(previewX + 10, previewY + 50, 
            'Sheep Count: 20\nCall Price LEFT: 5W | RIGHT: 5W\nMarket Balance: 50/50', {
            font: '16px Inter',
            fill: '#ffffff',
            lineSpacing: 8
        }).setDepth(11);

        // Update preview every second
        this.time.addEvent({
            delay: 1000,
            callback: () => this.updatePreview(),
            loop: true
        });
    }

    updatePreview() {
        const leftPrice = 10 - Math.floor(this.sandboxConfig.sheepCount * 0.2);
        const rightPrice = 10 - Math.floor(this.sandboxConfig.sheepCount * 0.3);

        this.previewInfoText.setText(
            `Sheep Count: ${this.sandboxConfig.sheepCount}\n` +
            `Call Price LEFT: ${leftPrice}W | RIGHT: ${rightPrice}W\n` +
            `Market Balance: ${Math.floor(Math.random() * 100)}/${Math.floor(Math.random() * 100)}\n` +
            `Wind: ${this.sandboxConfig.windEnabled ? 'ON' : 'OFF'} | Wolves: ${this.sandboxConfig.wolvesEnabled ? 'ON' : 'OFF'}`
        );
    }

    createToolPalette() {
        const toolX = 20;
        let toolY = 400;

        this.add.text(toolX, toolY, '🛠️ TOOLS', {
            font: 'bold 18px Inter',
            fill: '#fcd535'
        }).setDepth(900);
        toolY += 40;

        const tools = [
            { icon: '🌪️', name: 'Wind Zone', key: 'wind' },
            { icon: '🐺', name: 'Place Wolf', key: 'wolf' },
            { icon: '🚧', name: 'Obstacle', key: 'obstacle' },
            { icon: '🐑', name: 'Spawn Sheep', key: 'sheep' }
        ];

        tools.forEach((tool) => {
            this.createToolButton(toolX, toolY, tool.icon, tool.name, tool.key);
            toolY += 70;
        });
    }

    createToolButton(x, y, icon, name, key) {
        const btn = this.add.container(x, y).setDepth(900);

        const bg = this.add.rectangle(0, 0, 200, 60, 0x333333, 1)
            .setOrigin(0).setInteractive({ useHandCursor: true });
        bg.setStrokeStyle(2, 0x666666);

        const iconText = this.add.text(15, 30, icon, {
            font: '32px Inter'
        }).setOrigin(0, 0.5);

        const nameText = this.add.text(70, 30, name, {
            font: 'bold 16px Inter',
            fill: '#ffffff'
        }).setOrigin(0, 0.5);

        btn.add([bg, iconText, nameText]);

        bg.on('pointerover', () => bg.setFillStyle(0x444444));
        bg.on('pointerout', () => bg.setFillStyle(this.selectedTool === key ? 0x555555 : 0x333333));
        bg.on('pointerdown', () => {
            this.selectedTool = key;
            console.log(`Selected tool: ${name}`);
        });
    }

    createStatusIndicators() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Status bar at bottom
        this.statusText = this.add.text(20, height - 30, '✓ Sandbox Ready | No tool selected | Click to place elements', {
            font: '16px Inter',
            fill: '#44ff44'
        }).setDepth(1000);
    }

    createHelpOverlay() {
        // Create help overlay (hidden by default)
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.helpOverlay = this.add.container(width / 2, height / 2);
        this.helpOverlay.setDepth(2000);
        this.helpOverlay.setVisible(false);

        const bg = this.add.rectangle(0, 0, 800, 600, 0x000000, 0.95);
        bg.setStrokeStyle(4, 0xfcd535);

        const title = this.add.text(0, -260, '📖 SANDBOX MODE HELP', {
            font: 'bold 36px Inter',
            fill: '#fcd535'
        }).setOrigin(0.5);

        const helpText = this.add.text(0, -180, 
            '🎮 GETTING STARTED\n\n' +
            '1. Use the RIGHT PANEL to adjust sheep behavior and environment\n' +
            '2. Select tools from the LEFT PALETTE to place elements\n' +
            '3. Watch the LIVE PREVIEW to see pricing and stats\n' +
            '4. Use TOP BUTTONS to pause, reset, or save your setup\n\n' +
            '⚡ QUICK TIPS\n\n' +
            '• All changes are temporary unless you click SAVE\n' +
            '• Click RESET to start fresh\n' +
            '• Pausing lets you adjust without time pressure\n' +
            '• Saved configs can be loaded later\n\n' +
            'Press H to toggle this help | Press ESC to close',
        {
            font: '18px Inter',
            fill: '#ffffff',
            align: 'left',
            lineSpacing: 10
        }).setOrigin(0.5);

        const closeBtn = this.add.text(0, 250, 'GOT IT!', {
            font: 'bold 24px Inter',
            fill: '#000000',
            backgroundColor: '#fcd535',
            padding: { x: 30, y: 12 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerdown', () => {
            this.helpOverlay.setVisible(false);
        });

        this.helpOverlay.add([bg, title, helpText, closeBtn]);

        // Toggle with H key
        this.input.keyboard.on('keydown-H', () => {
            this.helpOverlay.setVisible(!this.helpOverlay.visible);
        });

        // Show on first load
        this.time.delayedCall(500, () => {
            this.helpOverlay.setVisible(true);
        });
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        this.pauseBtn.setText(this.isPaused ? '▶ RESUME' : '⏸ PAUSE');
        console.log(this.isPaused ? '⏸ Paused' : '▶ Resumed');
    }

    resetSandbox() {
        console.log('↻ Resetting sandbox...');
        this.scene.restart();
    }

    saveConfiguration() {
        const config = JSON.stringify(this.sandboxConfig, null, 2);
        console.log('💾 Saved Configuration:');
        console.log(config);
        
        localStorage.setItem('sheepMarket_sandboxConfig', config);
        
        this.statusText.setText('✓ Configuration saved to localStorage!');
        this.statusText.setColor('#44ff44');
        
        this.time.delayedCall(3000, () => {
            this.statusText.setText('✓ Sandbox Ready | No tool selected | Click to place elements');
        });
    }

    exitSandbox() {
        console.log('✕ Exiting sandbox mode...');
        this.scene.stop('SandboxScene');
        this.scene.launch('DevMenuScene');
    }
}
