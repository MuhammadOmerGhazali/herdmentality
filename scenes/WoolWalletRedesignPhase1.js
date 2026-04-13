/**
 * ========================================
 * WOOL WALLET - PHASE 1: VISUAL DESIGN ONLY
 * ========================================
 * 
 * This is a DESIGN CONCEPT with placeholder labels.
 * NO LOGIC. NO DATA BINDING. NO CALCULATIONS.
 * 
 * All existing Wool Wallet stats and systems are PRESERVED elsewhere.
 * They will be reconnected in PHASE 2.
 * 
 * This file creates the VISUAL LAYOUT only.
 */

export function createWoolWalletDesignConcept(scene) {
    const container = scene.statsContainer;
    
    // ============================================
    // BACKGROUND - Game-Ready Wooden Panel (Extended)
    // ============================================
    const bgImage = scene.add.image(0, 0, 'woolWalletGameUI');
    bgImage.setDisplaySize(3200, 2000); // Increased from 1800 to 2000
    container.add(bgImage);
    
    // ============================================
    // DECORATIVE LAYER - Warm Gradient Overlay
    // ============================================
    const overlayRect = scene.add.rectangle(0, 0, 3200, 2000, 0x000000, 0.15); // Increased from 1800 to 2000
    container.add(overlayRect);
    
    // ============================================
    // TITLE BAR - "WOOL WALLET"
    // ============================================
    const titleBanner = scene.add.graphics();
    titleBanner.fillStyle(0x8B4513, 0.6);
    titleBanner.fillRoundedRect(-800, -850, 1600, 140, 20);
    container.add(titleBanner);
    
    const title = scene.add.text(0, -780, '🐑 WOOL WALLET 🐑', {
        font: 'bold 90px Inter',
        fill: '#FFE4B5',
        stroke: '#5D4037',
        strokeThickness: 8,
        align: 'center'
    }).setOrigin(0.5);
    container.add(title);
    
    // ============================================
    // HERO SECTION - Total Balance Display
    // ============================================
    const heroPanel = scene.add.graphics();
    heroPanel.fillStyle(0xF5DEB3, 0.4);
    heroPanel.lineStyle(6, 0x8B4513, 1);
    heroPanel.fillRoundedRect(-900, -650, 1800, 280, 30);
    heroPanel.strokeRoundedRect(-900, -650, 1800, 280, 30);
    container.add(heroPanel);
    
    // Wool coin icon
    const heroIcon = scene.add.image(-700, -510, 'woolCoinIcon');
    heroIcon.setDisplaySize(180, 180);
    container.add(heroIcon);
    
    const balanceLabel = scene.add.text(0, -600, 'TOTAL WOOL BALANCE', {
        font: 'bold 58px Inter',
        fill: '#8B4513',
        align: 'center'
    }).setOrigin(0.5);
    container.add(balanceLabel);
    
    const balancePlaceholder = scene.add.text(0, -500, '### TOTAL W ###', {
        font: '900 140px Inter',
        fill: '#FFD700',
        stroke: '#8B4513',
        strokeThickness: 6
    }).setOrigin(0.5);
    container.add(balancePlaceholder);
    
    // Gains / Losses row
    const gainsPlaceholder = scene.add.text(-350, -400, '▲ +###W', {
        font: 'bold 60px Inter',
        fill: '#2E7D32'
    }).setOrigin(0.5);
    container.add(gainsPlaceholder);
    
    const lossesPlaceholder = scene.add.text(350, -400, '▼ -###W', {
        font: 'bold 60px Inter',
        fill: '#C62828'
    }).setOrigin(0.5);
    container.add(lossesPlaceholder);
    
    // ============================================
    // LEFT PANEL - Current Level Info
    // ============================================
    const leftPanel = scene.add.graphics();
    leftPanel.fillStyle(0xF5DEB3, 0.3);
    leftPanel.lineStyle(5, 0x8B4513, 1);
    leftPanel.fillRoundedRect(-1200, -240, 480, 720, 25);
    leftPanel.strokeRoundedRect(-1200, -240, 480, 720, 25);
    container.add(leftPanel);
    
    // Level badge icon
    const levelBadge = scene.add.image(-960, -160, 'levelBadgeIcon');
    levelBadge.setDisplaySize(100, 100);
    container.add(levelBadge);
    
    const currentLevelHeader = scene.add.text(-960, -60, 'CURRENT LEVEL', {
        font: 'bold 48px Inter',
        fill: '#8B4513'
    }).setOrigin(0.5);
    container.add(currentLevelHeader);
    
    const levelPlaceholder = scene.add.text(-960, 10, 'LEVEL ##', {
        font: '900 68px Inter',
        fill: '#FFD700',
        stroke: '#5D4037',
        strokeThickness: 4
    }).setOrigin(0.5);
    container.add(levelPlaceholder);
    
    // Divider
    const divider1 = scene.add.graphics();
    divider1.lineStyle(3, 0x8B4513, 0.5);
    divider1.lineBetween(-1150, 80, -770, 80);
    container.add(divider1);
    
    const finalCallLabel = scene.add.text(-960, 140, 'Final Call', {
        font: 'bold 42px Inter',
        fill: '#8B4513'
    }).setOrigin(0.5);
    container.add(finalCallLabel);
    
    const finalCallPlaceholder = scene.add.text(-960, 200, '## LEFT/RIGHT ##', {
        font: '900 54px Inter',
        fill: '#555555'
    }).setOrigin(0.5);
    container.add(finalCallPlaceholder);
    
    // Divider
    const divider2 = scene.add.graphics();
    divider2.lineStyle(3, 0x8B4513, 0.5);
    divider2.lineBetween(-1150, 260, -770, 260);
    container.add(divider2);
    
    const resultLabel = scene.add.text(-960, 310, 'Result', {
        font: 'bold 42px Inter',
        fill: '#8B4513'
    }).setOrigin(0.5);
    container.add(resultLabel);
    
    const resultPlaceholder = scene.add.text(-960, 370, '## STATUS ##', {
        font: 'bold 52px Inter',
        fill: '#FCD535'
    }).setOrigin(0.5);
    container.add(resultPlaceholder);
    
    // ============================================
    // CENTER PANELS - Performance & History
    // ============================================
    
    // TOP CENTER - Level Performance Chart
    const chartPanel = scene.add.graphics();
    chartPanel.fillStyle(0xFFFACD, 0.5);
    chartPanel.lineStyle(5, 0x8B4513, 1);
    chartPanel.fillRoundedRect(-630, -240, 600, 420, 25);
    chartPanel.strokeRoundedRect(-630, -240, 600, 420, 25);
    container.add(chartPanel);
    
    const chartHeader = scene.add.text(-330, -210, '📊 LEVEL PERFORMANCE', {
        font: 'bold 48px Inter',
        fill: '#8B4513',
        align: 'center'
    }).setOrigin(0.5);
    container.add(chartHeader);
    
    // Chart placeholder graphic
    const chartGraphic = scene.add.image(-330, -20, 'graphPaperPanel');
    chartGraphic.setDisplaySize(520, 300);
    chartGraphic.setAlpha(0.8);
    container.add(chartGraphic);
    
    const chartPlaceholder = scene.add.text(-330, -20, '[ PERFORMANCE\n    CHART\n  GOES HERE ]', {
        font: 'bold 42px Inter',
        fill: '#8B4513',
        align: 'center',
        lineSpacing: 10
    }).setOrigin(0.5);
    container.add(chartPlaceholder);
    
    // BOTTOM CENTER - Round Stats
    const statsPanel = scene.add.graphics();
    statsPanel.fillStyle(0xF5DEB3, 0.3);
    statsPanel.lineStyle(5, 0x8B4513, 1);
    statsPanel.fillRoundedRect(-630, 230, 600, 250, 25);
    statsPanel.strokeRoundedRect(-630, 230, 600, 250, 25);
    container.add(statsPanel);
    
    const statsHeader = scene.add.text(-330, 260, '📈 ROUND STATS', {
        font: 'bold 46px Inter',
        fill: '#8B4513'
    }).setOrigin(0.5);
    container.add(statsHeader);
    
    const woolSpentLabel = scene.add.text(-500, 330, 'Wool Spent:', {
        font: 'bold 38px Inter',
        fill: '#8B4513'
    }).setOrigin(0, 0.5);
    container.add(woolSpentLabel);
    
    const woolSpentPlaceholder = scene.add.text(-160, 330, '###W', {
        font: 'bold 48px Inter',
        fill: '#666666'
    }).setOrigin(0, 0.5);
    container.add(woolSpentPlaceholder);
    
    const profitLossLabel = scene.add.text(-500, 390, 'Profit/Loss:', {
        font: 'bold 38px Inter',
        fill: '#8B4513'
    }).setOrigin(0, 0.5);
    container.add(profitLossLabel);
    
    const profitPlaceholder = scene.add.text(-160, 390, '+###W', {
        font: 'bold 48px Inter',
        fill: '#2E7D32'
    }).setOrigin(0, 0.5);
    container.add(profitPlaceholder);
    
    // ============================================
    // RIGHT PANEL - Final Call History Grid (Extended)
    // ============================================
    
    // SEPARATOR LINE between level stats and call breakdown
    const sectionSeparator = scene.add.graphics();
    sectionSeparator.lineStyle(6, 0x8B4513, 0.8);
    sectionSeparator.lineBetween(50, -240, 50, 580);
    container.add(sectionSeparator);
    
    const historyPanel = scene.add.graphics();
    historyPanel.fillStyle(0xF5DEB3, 0.3);
    historyPanel.lineStyle(5, 0x8B4513, 1);
    historyPanel.fillRoundedRect(100, -240, 1020, 820, 25); // Increased from 720 to 820
    historyPanel.strokeRoundedRect(100, -240, 1020, 820, 25); // Increased from 720 to 820
    container.add(historyPanel);
    
    const historyHeader = scene.add.text(610, -200, '📜 FINAL CALL HISTORY', {
        font: 'bold 50px Inter',
        fill: '#8B4513'
    }).setOrigin(0.5);
    container.add(historyHeader);
    
    // History grid - 3 rows x 4 columns = 12 levels
    const gridStartX = 220;
    const gridStartY = -90;
    const cellWidth = 240;
    const cellHeight = 140;
    
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
            const level = (row * 4) + col + 1;
            const x = gridStartX + (col * cellWidth);
            const y = gridStartY + (row * cellHeight);
            
            // Cell background
            const cellBg = scene.add.graphics();
            cellBg.fillStyle(0xFFFACD, 0.4);
            cellBg.lineStyle(3, 0x8B4513, 0.6);
            cellBg.fillRoundedRect(x - 100, y - 50, 200, 110, 15);
            cellBg.strokeRoundedRect(x - 100, y - 50, 200, 110, 15);
            container.add(cellBg);
            
            // Level label
            const levelLabel = scene.add.text(x, y - 20, `L${level}`, {
                font: 'bold 38px Inter',
                fill: '#8B4513'
            }).setOrigin(0.5);
            container.add(levelLabel);
            
            // Call placeholder
            const callPlaceholder = scene.add.text(x, y + 25, '##', {
                font: 'bold 54px Inter',
                fill: '#666666'
            }).setOrigin(0.5);
            container.add(callPlaceholder);
        }
    }
    
    // Divider line above Net Wool
    const netWoolDivider = scene.add.graphics();
    netWoolDivider.lineStyle(4, 0x8B4513, 0.5);
    netWoolDivider.lineBetween(150, 420, 1070, 420);
    container.add(netWoolDivider);
    
    // Net Wool display below history (now inside the panel)
    const netWoolLabel = scene.add.text(380, 500, 'NET WOOL:', {
        font: 'bold 50px Inter',
        fill: '#8B4513'
    }).setOrigin(0, 0.5);
    container.add(netWoolLabel);
    
    const netWoolPlaceholder = scene.add.text(680, 500, '+###W', {
        font: '900 62px Inter',
        fill: '#D4AF37',
        stroke: '#5D4037',
        strokeThickness: 3
    }).setOrigin(0, 0.5);
    container.add(netWoolPlaceholder);
    
    // ============================================
    // BOTTOM BAR - Efficiency & Streak Metrics
    // ============================================
    const bottomBar = scene.add.graphics();
    bottomBar.fillStyle(0x8B4513, 0.4);
    bottomBar.lineStyle(5, 0x5D4037, 1);
    bottomBar.fillRoundedRect(-1200, 640, 2320, 200, 25); // Moved down from 540 to 640
    bottomBar.strokeRoundedRect(-1200, 640, 2320, 200, 25);
    container.add(bottomBar);
    
    // Left - Call Efficiency
    const effLabel = scene.add.text(-1050, 680, '🎯 CALL EFFICIENCY', {
        font: 'bold 48px Inter',
        fill: '#FFE4B5'
    }).setOrigin(0, 0.5);
    container.add(effLabel);
    
    const effPlaceholder = scene.add.text(-1050, 760, '##%', {
        font: '900 70px Inter',
        fill: '#FFD700'
    }).setOrigin(0, 0.5);
    container.add(effPlaceholder);
    
    // Progress bar
    const effBarBg = scene.add.graphics();
    effBarBg.fillStyle(0x000000, 0.3);
    effBarBg.fillRoundedRect(-700, 730, 350, 30, 15);
    container.add(effBarBg);
    
    const effBarFill = scene.add.graphics();
    effBarFill.fillStyle(0x4CAF50, 1);
    effBarFill.fillRoundedRect(-700, 730, 240, 30, 15); // 70% filled
    container.add(effBarFill);
    
    // Center - Bonus Wool
    const bonusLabel = scene.add.text(-200, 680, '⭐ BONUS WOOL', {
        font: 'bold 48px Inter',
        fill: '#FFE4B5'
    }).setOrigin(0, 0.5);
    container.add(bonusLabel);
    
    const bonusPlaceholder = scene.add.text(-200, 760, '+###W', {
        font: 'bold 64px Inter',
        fill: '#2E7D32'
    }).setOrigin(0, 0.5);
    container.add(bonusPlaceholder);
    
    // Right - Win Streak
    const streakLabel = scene.add.text(400, 680, '🔥 WIN STREAK', {
        font: 'bold 48px Inter',
        fill: '#FFE4B5'
    }).setOrigin(0, 0.5);
    container.add(streakLabel);
    
    const streakPlaceholder = scene.add.text(400, 740, '⭕ / ⭕ / ⭕ / ⭕', {
        font: 'bold 52px Inter',
        fill: '#FFD700'
    }).setOrigin(0, 0.5);
    container.add(streakPlaceholder);
    
    // ============================================
    // FOOTER NOTE
    // ============================================
    const footerNote = scene.add.text(0, 890, '[ PHASE 1: DESIGN ONLY - All stats will be connected in Phase 2 ]', {
        font: 'italic 32px Inter',
        fill: '#999999',
        align: 'center'
    }).setOrigin(0.5);
    container.add(footerNote);
    
    // ============================================
    // PLACEHOLDER REFERENCE VARIABLES
    // These will be replaced with real data in Phase 2
    // ============================================
    scene.woolWalletPlaceholders = {
        totalBalance: balancePlaceholder,
        allTimeGains: gainsPlaceholder,
        allTimeLosses: lossesPlaceholder,
        currentLevel: levelPlaceholder,
        finalCall: finalCallPlaceholder,
        result: resultPlaceholder,
        chartContainer: chartPlaceholder,
        woolSpent: woolSpentPlaceholder,
        profitLoss: profitPlaceholder,
        netWool: netWoolPlaceholder,
        efficiency: effPlaceholder,
        bonusWool: bonusPlaceholder,
        winStreak: streakPlaceholder
    };
    
    console.log('✅ Phase 1 Design Loaded - Visual concept only, no logic attached');
}