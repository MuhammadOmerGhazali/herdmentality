import Phaser from 'phaser';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EVENT / EFFECT SYSTEM VIEWER - HERD MENTALITY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Centralized interface for viewing and testing all game events and effects.
 * Shows environmental effects, animal behaviors, audio/visual triggers.
 * 
 * Features:
 * - Browse all registered events
 * - Test individual effects
 * - View effect parameters
 * - Real-time activity monitoring
 */

export class EventSystemScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EventSystemScene' });
        
        // Centralized event registry
        this.eventRegistry = this.initializeEventRegistry();
    }

    initializeEventRegistry() {
        return {
            environmental: [
                {
                    id: 'wind_gust',
                    name: 'Wind Gust',
                    description: 'Strong wind pushes sheep in one direction',
                    category: 'Environmental',
                    icon: '🌪️',
                    parameters: {
                        strength: { min: 50, max: 200, default: 100 },
                        duration: { min: 1, max: 5, default: 2 },
                        direction: { options: ['left', 'right'], default: 'left' }
                    },
                    test: () => this.testWindGust()
                },
                {
                    id: 'rain',
                    name: 'Rain',
                    description: 'Rain slows down sheep movement',
                    category: 'Environmental',
                    icon: '🌧️',
                    parameters: {
                        intensity: { min: 0, max: 1, default: 0.5 },
                        duration: { min: 5, max: 30, default: 10 }
                    },
                    test: () => this.testRain()
                },
                {
                    id: 'sun',
                    name: 'Sunshine',
                    description: 'Bright sun increases sheep energy',
                    category: 'Environmental',
                    icon: '☀️',
                    parameters: {
                        brightness: { min: 0, max: 1, default: 0.8 }
                    },
                    test: () => this.testSun()
                }
            ],
            animals: [
                {
                    id: 'wolf_spawn',
                    name: 'Wolf Appears',
                    description: 'Wolf scares sheep away from its side',
                    category: 'Animal Behavior',
                    icon: '🐺',
                    parameters: {
                        side: { options: ['left', 'right'], default: 'left' },
                        fearRadius: { min: 50, max: 300, default: 150 },
                        duration: { min: 3, max: 10, default: 5 }
                    },
                    test: () => this.testWolf()
                },
                {
                    id: 'golden_sheep',
                    name: 'Golden Sheep',
                    description: 'Valuable sheep with higher wool value',
                    category: 'Animal Behavior',
                    icon: '✨',
                    parameters: {
                        woolMultiplier: { min: 2, max: 5, default: 3 },
                        speed: { min: 50, max: 150, default: 80 }
                    },
                    test: () => this.testGoldenSheep()
                },
                {
                    id: 'shepherd',
                    name: 'Shepherd Influence',
                    description: 'Shepherd guides sheep to one side',
                    category: 'Animal Behavior',
                    icon: '👨‍🌾',
                    parameters: {
                        side: { options: ['left', 'right'], default: 'right' },
                        influence: { min: 0, max: 1, default: 0.5 }
                    },
                    test: () => this.testShepherd()
                }
            ],
            audioVisual: [
                {
                    id: 'bleat_sound',
                    name: 'Sheep Bleat',
                    description: 'Sheep makes sound (Important SFX)',
                    category: 'Audio',
                    icon: '🔊',
                    parameters: {
                        volume: { min: 0, max: 1, default: 0.6 }
                    },
                    test: () => this.testBleat()
                },
                {
                    id: 'call_alert',
                    name: 'Call Alert',
                    description: 'Final call announcement (Critical Alert)',
                    category: 'Audio',
                    icon: '📣',
                    parameters: {
                        side: { options: ['left', 'right'], default: 'left' }
                    },
                    test: () => this.testCallAlert()
                },
                {
                    id: 'particle_effect',
                    name: 'Wool Particles',
                    description: 'Wool collection visual effect',
                    category: 'Visual',
                    icon: '✨',
                    parameters: {
                        count: { min: 5, max: 50, default: 20 },
                        spread: { min: 50, max: 300, default: 150 }
                    },
                    test: () => this.testParticles()
                }
            ]
        };
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Background
        this.add.rectangle(0, 0, width, height, 0x1a1a1a).setOrigin(0);

        // Title bar
        this.createTitleBar();

        // Category tabs
        this.currentCategory = 'environmental';
        this.createCategoryTabs();

        // Event list
        this.createEventList();

        // Detail panel
        this.createDetailPanel();

        // Activity monitor
        this.createActivityMonitor();

        console.log('⚡ Event/Effect System loaded!');
        console.log(`   → ${this.getTotalEventCount()} events registered`);
    }

    createTitleBar() {
        const width = this.cameras.main.width;

        const bar = this.add.rectangle(0, 0, width, 60, 0x000000, 0.9).setOrigin(0);

        this.add.text(20, 30, '⚡ EVENT / EFFECT SYSTEM', {
            font: 'bold 28px Inter',
            fill: '#44aaff'
        }).setOrigin(0, 0.5);

        const backBtn = this.add.text(width - 120, 30, '← BACK', {
            font: 'bold 18px Inter',
            fill: '#000000',
            backgroundColor: '#888888',
            padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        backBtn.on('pointerdown', () => {
            this.scene.stop('EventSystemScene');
            this.scene.launch('DevMenuScene');
        });
    }

    createCategoryTabs() {
        const tabY = 80;
        const tabs = [
            { key: 'environmental', label: '🌍 Environmental', color: '#44ff44' },
            { key: 'animals', label: '🐑 Animals', color: '#ffaa44' },
            { key: 'audioVisual', label: '🎵 Audio/Visual', color: '#ff44ff' }
        ];

        let tabX = 20;
        tabs.forEach((tab) => {
            const isActive = this.currentCategory === tab.key;
            
            const btn = this.add.text(tabX, tabY, tab.label, {
                font: 'bold 18px Inter',
                fill: isActive ? '#000000' : '#ffffff',
                backgroundColor: isActive ? tab.color : '#333333',
                padding: { x: 20, y: 10 }
            }).setInteractive({ useHandCursor: true });

            btn.on('pointerdown', () => {
                this.currentCategory = tab.key;
                this.scene.restart();
            });

            tabX += btn.width + 10;
        });
    }

    createEventList() {
        const listX = 20;
        const listY = 140;
        const listWidth = 400;

        this.add.text(listX, listY, 'EVENTS:', {
            font: 'bold 20px Inter',
            fill: '#ffffff'
        });

        const events = this.eventRegistry[this.currentCategory];
        let yPos = listY + 40;

        events.forEach((event, index) => {
            this.createEventItem(listX, yPos, event, index);
            yPos += 100;
        });
    }

    createEventItem(x, y, event, index) {
        const container = this.add.container(x, y);

        const bg = this.add.rectangle(0, 0, 380, 90, 0x2a2a2a, 1).setOrigin(0);
        bg.setStrokeStyle(2, 0x444444);
        bg.setInteractive({ useHandCursor: true });

        const icon = this.add.text(15, 45, event.icon, {
            font: '48px Inter'
        }).setOrigin(0, 0.5);

        const name = this.add.text(85, 25, event.name, {
            font: 'bold 18px Inter',
            fill: '#fcd535'
        });

        const desc = this.add.text(85, 50, event.description, {
            font: '14px Inter',
            fill: '#aaaaaa',
            wordWrap: { width: 280 }
        });

        const testBtn = this.add.text(300, 70, '▶ TEST', {
            font: 'bold 14px Inter',
            fill: '#000000',
            backgroundColor: '#44ff44',
            padding: { x: 12, y: 4 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        testBtn.on('pointerdown', (pointer) => {
            pointer.stopPropagation();
            this.logActivity(event.name, 'Testing...');
            event.test();
        });

        bg.on('pointerover', () => {
            bg.setFillStyle(0x333333);
            this.showDetailPanel(event);
        });

        bg.on('pointerout', () => bg.setFillStyle(0x2a2a2a));

        container.add([bg, icon, name, desc, testBtn]);
    }

    createDetailPanel() {
        const width = this.cameras.main.width;
        const panelX = 440;
        const panelY = 140;
        const panelWidth = width - panelX - 20;

        this.detailPanel = this.add.container(panelX, panelY);

        const bg = this.add.rectangle(0, 0, panelWidth, 400, 0x222222, 1).setOrigin(0);
        bg.setStrokeStyle(2, 0x444444);

        const title = this.add.text(20, 20, 'EVENT DETAILS', {
            font: 'bold 20px Inter',
            fill: '#44aaff'
        });

        const infoText = this.add.text(20, 60, 'Hover over an event to see details', {
            font: '16px Inter',
            fill: '#888888'
        });

        this.detailTitle = title;
        this.detailInfo = infoText;

        this.detailPanel.add([bg, title, infoText]);
    }

    showDetailPanel(event) {
        this.detailTitle.setText(event.name.toUpperCase());
        
        let infoText = `${event.description}\n\n`;
        infoText += `Category: ${event.category}\n`;
        infoText += `ID: ${event.id}\n\n`;
        infoText += 'Parameters:\n';

        Object.entries(event.parameters).forEach(([key, param]) => {
            if (param.options) {
                infoText += `  • ${key}: ${param.options.join(', ')}\n`;
            } else if (param.min !== undefined) {
                infoText += `  • ${key}: ${param.min} - ${param.max} (default: ${param.default})\n`;
            }
        });

        this.detailInfo.setText(infoText);
    }

    createActivityMonitor() {
        const width = this.cameras.main.width;
        const monitorY = 560;

        this.add.text(440, monitorY, '📊 ACTIVITY LOG', {
            font: 'bold 18px Inter',
            fill: '#ffffff'
        });

        this.activityLog = this.add.text(440, monitorY + 35, 
            'No activity yet. Click TEST on any event to see it here.', {
            font: '14px Courier',
            fill: '#44ff44',
            wordWrap: { width: width - 460 }
        });

        this.activityHistory = [];
    }

    logActivity(eventName, message) {
        const timestamp = new Date().toLocaleTimeString();
        const entry = `[${timestamp}] ${eventName}: ${message}`;
        
        this.activityHistory.unshift(entry);
        if (this.activityHistory.length > 10) this.activityHistory.pop();

        this.activityLog.setText(this.activityHistory.join('\n'));
    }

    getTotalEventCount() {
        return Object.values(this.eventRegistry).reduce((sum, category) => sum + category.length, 0);
    }

    // Test functions for each event
    testWindGust() {
        console.log('🌪️ Testing Wind Gust...');
        this.logActivity('Wind Gust', 'Simulated wind effect');
        if (window.audioManager) {
            window.audioManager.playClick();
        }
    }

    testRain() {
        console.log('🌧️ Testing Rain...');
        this.logActivity('Rain', 'Simulated rain effect');
        if (window.audioManager) {
            window.audioManager.playClick();
        }
    }

    testSun() {
        console.log('☀️ Testing Sunshine...');
        this.logActivity('Sunshine', 'Simulated sunshine effect');
        if (window.audioManager) {
            window.audioManager.playClick();
        }
    }

    testWolf() {
        console.log('🐺 Testing Wolf...');
        this.logActivity('Wolf', 'Played wolf howl (CRITICAL_ALERT)');
        if (window.audioManager) {
            window.audioManager.playWolfHowl();
        }
    }

    testGoldenSheep() {
        console.log('✨ Testing Golden Sheep...');
        this.logActivity('Golden Sheep', 'Spawned golden sheep');
        if (window.audioManager) {
            window.audioManager.playCoin();
        }
    }

    testShepherd() {
        console.log('👨‍🌾 Testing Shepherd...');
        this.logActivity('Shepherd', 'Activated shepherd influence');
        if (window.audioManager) {
            window.audioManager.playClick();
        }
    }

    testBleat() {
        console.log('🔊 Testing Bleat...');
        this.logActivity('Bleat', 'Played sheep bleat (IMPORTANT_SFX)');
        if (window.audioManager) {
            window.audioManager.playBaa();
        }
    }

    testCallAlert() {
        console.log('📣 Testing Call Alert...');
        this.logActivity('Call Alert', 'Played call sound (IMPORTANT_SFX)');
        if (window.audioManager) {
            window.audioManager.playCall();
        }
    }

    testParticles() {
        console.log('✨ Testing Particles...');
        this.logActivity('Particles', 'Created wool particle effect');
        if (window.audioManager) {
            window.audioManager.playCoinFly();
        }
    }
}
