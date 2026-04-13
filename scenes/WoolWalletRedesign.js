/**
 * WoolWalletRedesign.js - CLEAN ORGANIZED LAYOUT
 * Visual redesign only - all logic in HUDScene.js unchanged
 */

export function createWoolWalletUI(scene) {
    const container = scene.statsContainer;
    
    // ============================================
    // BACKGROUND IMAGE
    // ============================================
    const bgImage = scene.add.image(0, 0, 'woolWalletBg');
    bgImage.setDisplaySize(3200, 1900);
    container.add(bgImage);
    
    // ============================================
    // TITLE
    // ============================================
    const title = scene.add.text(0, -820, 'WOOL WALLET', {
        font: '900 120px Inter',
        fill: '#FFFFFF',
        stroke: '#5D4037',
        strokeThickness: 10
    }).setOrigin(0.5);
    
    // ============================================
    // HERO SECTION - Total Balance
    // ============================================
    const heroY = -600;
    
    const balanceHeader = scene.add.text(0, heroY, 'TOTAL WOOL BALANCE', {
        font: 'bold 70px Inter',
        fill: '#FFFFFF',
        stroke: '#5D4037',
        strokeThickness: 6
    }).setOrigin(0.5);
    
    scene.statLabels = {};
    scene.statLabels.totalBalance = scene.add.text(0, heroY + 130, '1,050W', {
        font: '900 180px Inter',
        fill: '#FFD700',
        stroke: '#5D4037',
        strokeThickness: 8
    }).setOrigin(0.5);
    
    // Gains / Losses
    scene.statLabels.allTimeGains = scene.add.text(-300, heroY + 270, '+300W', {
        font: 'bold 70px Inter',
        fill: '#2E7D32'
    }).setOrigin(0.5);
    
    scene.statLabels.allTimeLosses = scene.add.text(300, heroY + 270, '-200W', {
        font: 'bold 70px Inter',
        fill: '#C62828'
    }).setOrigin(0.5);
    
    // ============================================
    // THREE COLUMN LAYOUT
    // ============================================
    
    // LEFT COLUMN - Current Level Info
    const leftX = -900;
    const topY = -140;
    
    scene.currentLevelValue = scene.add.text(leftX, topY, 'LEVEL 2', {
        font: 'bold 70px Inter',
        fill: '#FFD700',
        stroke: '#5D4037',
        strokeThickness: 4
    }).setOrigin(0.5);
    
    const finalCallLabel = scene.add.text(leftX, topY + 100, 'FINAL CALL', {
        font: 'bold 48px Inter',
        fill: '#8B4513'
    }).setOrigin(0.5);
    
    scene.currentFinalCallValue = scene.add.text(leftX, topY + 170, 'UNDETERMINED', {
        font: '900 64px Inter',
        fill: '#888888'
    }).setOrigin(0.5);
    
    const resultLabel = scene.add.text(leftX, topY + 270, 'RESULT', {
        font: 'bold 48px Inter',
        fill: '#8B4513'
    }).setOrigin(0.5);
    
    scene.statLabels.levelOutcome = scene.add.text(leftX, topY + 340, 'IN PROGRESS', {
        font: 'bold 54px Inter',
        fill: '#FCD535',
        wordWrap: { width: 480 }
    }).setOrigin(0.5);
    
    const correctLabel = scene.add.text(leftX, topY + 440, 'CORRECT CALLS', {
        font: 'bold 48px Inter',
        fill: '#8B4513'
    }).setOrigin(0.5);
    
    scene.correctCallsValue = scene.add.text(leftX, topY + 510, '2', {
        font: '900 70px Inter',
        fill: '#2E7D32'
    }).setOrigin(0.5);
    
    // MIDDLE COLUMN - Level Performance Chart
    const chartX = -200;
    const chartY = topY - 100;
    
    const chartHeader = scene.add.text(chartX, chartY, 'LEVEL PERFORMANCE', {
        font: 'bold 58px Inter',
        fill: '#FFFFFF',
        stroke: '#5D4037',
        strokeThickness: 5
    }).setOrigin(0.5);
    
    scene.levelPerfContainer = scene.add.container(chartX, chartY + 280);
    
    // RIGHT COLUMN - Final Call History
    const rightX = 750;
    const rightY = topY - 100;
    
    const historyHeader = scene.add.text(rightX, rightY, 'FINAL CALL HISTORY', {
        font: 'bold 58px Inter',
        fill: '#FFFFFF',
        stroke: '#5D4037',
        strokeThickness: 5
    }).setOrigin(0.5);
    
    // History Grid - 3 rows x 4 columns
    scene.finalCallHistoryContainers = [];
    const gridStartX = rightX - 270;
    const gridStartY = rightY + 100;
    const spacingX = 180;
    const spacingY = 100;
    
    const layout = [
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12]
    ];
    
    layout.forEach((row, rowIdx) => {
        row.forEach((level, colIdx) => {
            const x = gridStartX + (colIdx * spacingX);
            const y = gridStartY + (rowIdx * spacingY);
            
            const levelLabel = scene.add.text(x, y, `L${level}`, {
                font: 'bold 38px Inter',
                fill: '#8B4513'
            }).setOrigin(0.5);
            
            const callText = scene.add.text(x + 65, y, '--', {
                font: 'bold 56px Inter',
                fill: '#8B4513'
            }).setOrigin(0.5);
            
            scene.finalCallHistoryContainers[level] = callText;
            container.add([levelLabel, callText]);
        });
    });
    
    // Round Stats (below history)
    const statsX = rightX;
    const statsY = rightY + 450;
    
    const woolSpentLabel = scene.add.text(statsX, statsY, 'WOOL SPENT', {
        font: 'bold 46px Inter',
        fill: '#8B4513'
    }).setOrigin(0.5);
    
    scene.statLabels.woolSpent = scene.add.text(statsX, statsY + 65, '0W', {
        font: 'bold 64px Inter',
        fill: '#8B4513'
    }).setOrigin(0.5);
    
    const profitLabel = scene.add.text(statsX - 250, statsY + 170, 'PROFIT/LOSS', {
        font: 'bold 44px Inter',
        fill: '#8B4513'
    }).setOrigin(0.5);
    
    scene.statLabels.unrealizedWool = scene.add.text(statsX - 250, statsY + 230, '+0W', {
        font: '900 64px Inter',
        fill: '#2E7D32'
    }).setOrigin(0.5);
    
    const netLabel = scene.add.text(statsX + 250, statsY + 170, 'NET WOOL', {
        font: 'bold 44px Inter',
        fill: '#8B4513'
    }).setOrigin(0.5);
    
    scene.statLabels.netWool = scene.add.text(statsX + 250, statsY + 230, '+500W', {
        font: '900 64px Inter',
        fill: '#D4AF37'
    }).setOrigin(0.5);
    
    // ============================================
    // BOTTOM ROW - Performance Metrics
    // ============================================
    const bottomY = 650;
    
    // Left - Call Efficiency
    const effLabel = scene.add.text(-700, bottomY - 80, 'CALL EFFICIENCY', {
        font: 'bold 54px Inter',
        fill: '#FFFFFF',
        stroke: '#5D4037',
        strokeThickness: 5
    }).setOrigin(0.5);
    
    scene.efficiencyValue = scene.add.text(-700, bottomY + 30, '80%', {
        font: '900 90px Inter',
        fill: '#D4AF37'
    }).setOrigin(0.5);
    
    // Efficiency Bar
    const barWidth = 480;
    const barHeight = 28;
    const effBarBg = scene.add.graphics();
    effBarBg.fillStyle(0xD2B48C, 0.5);
    effBarBg.fillRoundedRect(-700 - barWidth/2, bottomY + 120, barWidth, barHeight, 14);
    
    scene.efficiencyBarContainer = scene.add.container(-700, bottomY + 134);
    scene.efficiencyBarFill = scene.add.rectangle(-barWidth/2, 0, 0, barHeight, 0x2E7D32, 1);
    scene.efficiencyBarFill.setOrigin(0, 0.5);
    scene.efficiencyBarContainer.add([scene.efficiencyBarFill]);
    
    // Center - Bonus Wool
    const bonusLabel = scene.add.text(-50, bottomY - 30, 'BONUS WOOL', {
        font: 'bold 48px Inter',
        fill: '#8B4513'
    }).setOrigin(0.5);
    
    scene.bonusWoolValue = scene.add.text(-50, bottomY + 40, '+0W', {
        font: 'bold 66px Inter',
        fill: '#2E7D32'
    }).setOrigin(0.5);
    
    // Right - Win Streak
    const streakLabel = scene.add.text(600, bottomY - 30, 'WIN STREAK', {
        font: 'bold 48px Inter',
        fill: '#8B4513'
    }).setOrigin(0.5);
    
    scene.winStreakValue = scene.add.text(600, bottomY + 40, 'O / O / O / O', {
        font: 'bold 52px Inter',
        fill: '#8B4513'
    }).setOrigin(0.5);
    
    const incorrectLabel = scene.add.text(600, bottomY + 130, 'INCORRECT', {
        font: 'bold 42px Inter',
        fill: '#8B4513'
    }).setOrigin(0.5);
    
    scene.incorrectCallsValue = scene.add.text(600, bottomY + 190, '0', {
        font: '900 58px Inter',
        fill: '#C62828'
    }).setOrigin(0.5);
    
    // Level Call Losses Text
    scene.levelCallLossesText = scene.add.text(0, 850, '', {
        font: 'bold 40px Inter',
        fill: '#C62828',
        wordWrap: { width: 1400 },
        align: 'center'
    }).setOrigin(0.5);
    
    // Add all to container
    container.add([
        title,
        balanceHeader, scene.statLabels.totalBalance,
        scene.statLabels.allTimeGains, scene.statLabels.allTimeLosses,
        scene.currentLevelValue,
        finalCallLabel, scene.currentFinalCallValue,
        resultLabel, scene.statLabels.levelOutcome,
        correctLabel, scene.correctCallsValue,
        chartHeader, scene.levelPerfContainer,
        historyHeader,
        woolSpentLabel, scene.statLabels.woolSpent,
        profitLabel, scene.statLabels.unrealizedWool,
        netLabel, scene.statLabels.netWool,
        effLabel, scene.efficiencyValue,
        effBarBg, scene.efficiencyBarContainer,
        bonusLabel, scene.bonusWoolValue,
        streakLabel, scene.winStreakValue,
        incorrectLabel, scene.incorrectCallsValue,
        scene.levelCallLossesText
    ]);
    
    // Compatibility references
    scene.finalCallHistoryLeftText = scene.add.text(-5000, -5000, '', { font: '1px Inter' });
    scene.finalCallHistoryRightText = scene.add.text(-5000, -5000, '', { font: '1px Inter' });
    scene.finalCallHistoryText = scene.finalCallHistoryLeftText;
    scene.statLabels.allTimeGainsRight = scene.statLabels.allTimeGains;
    scene.statLabels.allTimeLossesRight = scene.statLabels.allTimeLosses;
    scene.statLabels.netWoolRight = scene.statLabels.netWool;
}
