import Phaser from 'phaser';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HELP & GUIDE - HERD MENTALITY DEVELOPER TOOLS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Beginner-friendly tutorial and reference for using the developer tools.
 * Clear explanations without technical jargon.
 */

export class HelpGuideScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HelpGuideScene' });
        this.currentPage = 0;
        this.pages = this.createPages();
    }

    createPages() {
        return [
            // Page 0: Welcome
            {
                title: 'Welcome to Developer Tools! 👋',
                content: [
                    '🎮 WHAT ARE THESE TOOLS?',
                    '',
                    'These are safe, easy-to-use tools that let you:',
                    '  • Test how the game works',
                    '  • Create and test new levels',
                    '  • Adjust sheep behavior and environment',
                    '  • See how pricing and audio work',
                    '',
                    '✅ KEY RULE:',
                    'Nothing you do here affects the real game',
                    'unless you click SAVE. You can experiment freely!',
                    '',
                    '→ Use arrow keys or buttons to navigate'
                ],
                color: '#fcd535'
            },
            // Page 1: Sandbox Mode
            {
                title: '🎮 Sandbox Mode',
                content: [
                    'WHAT IS IT?',
                    'A testing playground where you can:',
                    '',
                    '📊 Adjust Sheep Settings:',
                    '  • How many sheep appear',
                    '  • How fast they move',
                    '  • How stubborn they are',
                    '  • How much they follow each other',
                    '',
                    '🌍 Control the Environment:',
                    '  • Turn wind on/off',
                    '  • Add or remove wolves',
                    '  • Place obstacles',
                    '',
                    '📈 See Live Updates:',
                    '  • Watch prices change in real-time',
                    '  • See how many sheep are on each side',
                    '  • Preview your wool earnings',
                    '',
                    'TIP: Start by tweaking one thing at a time!'
                ],
                color: '#44ff44'
            },
            // Page 2: Using Sandbox
            {
                title: '🎮 How to Use Sandbox Mode',
                content: [
                    'STEP-BY-STEP GUIDE:',
                    '',
                    '1️⃣ Open Sandbox from the Dev Menu',
                    '',
                    '2️⃣ Look at the RIGHT SIDE PANEL',
                    '   • Move sliders to change sheep settings',
                    '   • Click toggles to turn things on/off',
                    '',
                    '3️⃣ Watch the PREVIEW BOX (top left)',
                    '   • See your changes update live',
                    '   • Check pricing and balance',
                    '',
                    '4️⃣ Use TOOLS (left side) to place things',
                    '   • Click a tool, then click on the field',
                    '',
                    '5️⃣ Use TOP BUTTONS to control:',
                    '   • PAUSE: Stop time to think',
                    '   • RESET: Start over',
                    '   • SAVE: Keep your changes',
                    '   • EXIT: Return to main menu'
                ],
                color: '#44ff44'
            },
            // Page 3: Event/Effect System
            {
                title: '⚡ Event / Effect System',
                content: [
                    'WHAT IS IT?',
                    'A library of all special events in the game:',
                    '',
                    '🌍 Environmental Effects:',
                    '  • Wind gusts',
                    '  • Rain',
                    '  • Sunshine',
                    '',
                    '🐑 Animal Behaviors:',
                    '  • Wolves scaring sheep',
                    '  • Golden sheep (special wool)',
                    '  • Shepherd guiding the flock',
                    '',
                    '🎵 Audio & Visual:',
                    '  • Sound effects',
                    '  • Particle effects',
                    '  • Alerts and announcements',
                    '',
                    'WHAT CAN YOU DO?',
                    '  • Browse all events by category',
                    '  • Test each event individually',
                    '  • See how they work and what they do',
                    '  • Check the activity log for details'
                ],
                color: '#44aaff'
            },
            // Page 4: Audio System
            {
                title: '🎵 Audio System',
                content: [
                    'WHAT IS IT?',
                    'A smart system that automatically balances all sounds:',
                    '',
                    '🔊 SOUND PRIORITIES:',
                    '  1. Critical Alerts (wolves, final call)',
                    '  2. Important Sounds (sheep bleats, calls)',
                    '  3. Standard Sounds (coins, clicks)',
                    '  4. Background (ambience, rain)',
                    '  5. Music (lowest priority)',
                    '',
                    'HOW IT WORKS:',
                    '  • When important sounds play, music gets quieter',
                    '  • Everything balances automatically',
                    '  • You can test it with one click',
                    '',
                    'HOW TO USE:',
                    '  • Open browser console (Press F12)',
                    '  • Type: audioManager.help()',
                    '  • Or click Test in the Audio Tools menu',
                    '',
                    'TIP: Listen for music volume changing when',
                    'you test different sounds!'
                ],
                color: '#ff44ff'
            },
            // Page 5: Tips & Tricks
            {
                title: '💡 Tips & Tricks',
                content: [
                    'HELPFUL ADVICE:',
                    '',
                    '✅ DO:',
                    '  • Start with the Help Guide (you\'re here!)',
                    '  • Experiment freely - nothing breaks!',
                    '  • Test one change at a time',
                    '  • Use PAUSE when you need to think',
                    '  • Save configs you like',
                    '',
                    '❌ DON\'T:',
                    '  • Worry about breaking the game',
                    '  • Try to change everything at once',
                    '  • Forget to save if you want to keep changes',
                    '',
                    '🎓 LEARNING PATH:',
                    '  1. Read this guide (almost done!)',
                    '  2. Try Sandbox Mode',
                    '  3. Explore Event/Effect System',
                    '  4. Test Audio System',
                    '  5. Have fun creating!',
                    '',
                    '❓ Need Help? Check console logs!'
                ],
                color: '#ffaa44'
            },
            // Page 6: Quick Reference
            {
                title: '📚 Quick Reference',
                content: [
                    'KEYBOARD SHORTCUTS:',
                    '  • ESC - Close menus / Go back',
                    '  • H - Toggle help (in Sandbox)',
                    '  • F12 - Open browser console',
                    '',
                    'CONSOLE COMMANDS:',
                    '  • audioManager.help()',
                    '  • audioManager.testAudioBalancing()',
                    '  • audioManager.debugAudioState()',
                    '',
                    'WHERE THINGS ARE SAVED:',
                    '  • Sandbox configs → localStorage',
                    '  • Audio settings → automatic',
                    '  • Event tests → temporary only',
                    '',
                    'DOCUMENTATION FILES:',
                    '  • AUDIO_README.md',
                    '  • AUDIO_BALANCING_GUIDE.md',
                    '  • AUDIO_SYSTEM_SUMMARY.md',
                    '',
                    'Ready to start? Go back to the menu',
                    'and choose a tool to explore! 🚀'
                ],
                color: '#ffffff'
            }
        ];
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Background
        this.add.rectangle(0, 0, width, height, 0x1a1a1a).setOrigin(0);

        // Title bar
        this.createTitleBar();

        // Page content container
        this.contentContainer = this.add.container(width / 2, height / 2);
        this.contentContainer.setDepth(10);

        // Navigation
        this.createNavigation();

        // Render first page
        this.renderPage();

        console.log('📖 Help Guide loaded!');
        console.log(`   → ${this.pages.length} pages available`);
    }

    createTitleBar() {
        const width = this.cameras.main.width;

        const bar = this.add.rectangle(0, 0, width, 60, 0x000000, 0.9).setOrigin(0);

        this.add.text(20, 30, '📖 HELP & GUIDE', {
            font: 'bold 28px Inter',
            fill: '#ffaa44'
        }).setOrigin(0, 0.5);

        // Page indicator
        this.pageIndicator = this.add.text(width / 2, 30, '', {
            font: 'bold 18px Inter',
            fill: '#ffffff'
        }).setOrigin(0.5);

        const backBtn = this.add.text(width - 120, 30, '← BACK', {
            font: 'bold 18px Inter',
            fill: '#000000',
            backgroundColor: '#888888',
            padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        backBtn.on('pointerdown', () => {
            this.scene.stop('HelpGuideScene');
            this.scene.launch('DevMenuScene');
        });
    }

    createNavigation() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Previous button
        this.prevBtn = this.add.text(40, height - 40, '◀ PREVIOUS', {
            font: 'bold 20px Inter',
            fill: '#000000',
            backgroundColor: '#666666',
            padding: { x: 20, y: 10 }
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

        this.prevBtn.on('pointerdown', () => this.previousPage());

        // Next button
        this.nextBtn = this.add.text(width - 40, height - 40, 'NEXT ▶', {
            font: 'bold 20px Inter',
            fill: '#000000',
            backgroundColor: '#44ff44',
            padding: { x: 20, y: 10 }
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });

        this.nextBtn.on('pointerdown', () => this.nextPage());

        // Keyboard navigation
        this.input.keyboard.on('keydown-LEFT', () => this.previousPage());
        this.input.keyboard.on('keydown-RIGHT', () => this.nextPage());

        this.updateNavigationButtons();
    }

    renderPage() {
        // Clear previous content
        this.contentContainer.removeAll(true);

        const page = this.pages[this.currentPage];

        // Background
        const bg = this.add.rectangle(0, 0, 1000, 600, 0x222222, 1);
        bg.setStrokeStyle(4, Phaser.Display.Color.HexStringToColor(page.color).color);

        // Title
        const title = this.add.text(0, -260, page.title, {
            font: 'bold 40px Inter',
            fill: page.color,
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center',
            wordWrap: { width: 900 }
        }).setOrigin(0.5);

        // Content
        const contentText = page.content.join('\n');
        const content = this.add.text(0, 20, contentText, {
            font: '18px Inter',
            fill: '#ffffff',
            align: 'left',
            lineSpacing: 6,
            wordWrap: { width: 900 }
        }).setOrigin(0.5);

        this.contentContainer.add([bg, title, content]);

        // Update page indicator
        this.pageIndicator.setText(`Page ${this.currentPage + 1} / ${this.pages.length}`);

        // Update navigation
        this.updateNavigationButtons();

        // Animate in
        this.contentContainer.setAlpha(0);
        this.contentContainer.setScale(0.95);
        this.tweens.add({
            targets: this.contentContainer,
            alpha: 1,
            scale: 1,
            duration: 300,
            ease: 'Quad.easeOut'
        });
    }

    previousPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.renderPage();
        }
    }

    nextPage() {
        if (this.currentPage < this.pages.length - 1) {
            this.currentPage++;
            this.renderPage();
        }
    }

    updateNavigationButtons() {
        // Update button visibility and text
        this.prevBtn.setAlpha(this.currentPage === 0 ? 0.3 : 1);
        
        if (this.currentPage === this.pages.length - 1) {
            this.nextBtn.setText('FINISH ✓');
            this.nextBtn.setStyle({ backgroundColor: '#44ff44' });
            this.nextBtn.removeAllListeners('pointerdown');
            this.nextBtn.on('pointerdown', () => {
                this.scene.stop('HelpGuideScene');
                this.scene.launch('DevMenuScene');
            });
        } else {
            this.nextBtn.setText('NEXT ▶');
            this.nextBtn.setStyle({ backgroundColor: '#44ff44' });
            this.nextBtn.removeAllListeners('pointerdown');
            this.nextBtn.on('pointerdown', () => this.nextPage());
        }
    }
}
