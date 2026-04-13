const fs = require('fs');

function replaceMethod(source, methodName, newImplementation) {
    // Matches methodName() { ... } until the next method definition "    methodName() {"
    // This is safe because indentation is consistent (4 spaces for methods).
    const regex = new RegExp(`    ${methodName}\\([^{]*?\\)\\s*\\{[\\s\\S]*?(?=^    [a-zA-Z0-9_]+\\([^{]*?\\)\\s*\\{)`, 'm');
    const match = source.match(regex);
    if (match) {
        return source.replace(match[0], `    ${methodName}() {\n${newImplementation}\n    }\n\n`);
    } else {
        console.error(`Method ${methodName} not found!`);
        return source;
    }
}

function removeMethod(source, methodName) {
    const regex = new RegExp(`    ${methodName}\\([^{]*?\\)\\s*\\{[\\s\\S]*?(?=^    [a-zA-Z0-9_]+\\([^{]*?\\)\\s*\\{)`, 'm');
    const match = source.match(regex);
    if (match) {
        return source.replace(match[0], '');
    } else {
        console.error(`Method ${methodName} not found to remove!`);
        return source;
    }
}

let scene = fs.readFileSync('scenes/GameScene.js', 'utf8');

scene = replaceMethod(scene, 'celebrateLevel12Victory', `        this.level12State.isActive = true;
        this.level12State.phase = 'CELEBRATING';
        
        console.log('🎉 LEVEL 12 VICTORY CELEBRATION - STREAMLINED CINEMATIC FLOW');
        
        // 🎆 FIREWORKS
        const fireworkColors = [0xffd700, 0xffffff, 0xffed4e, 0xffc0cb, 0x87ceeb, 0xff69b4, 0x00ff00, 0xff1493];
        const numFireworks = 25; 
        
        for (let i = 0; i < numFireworks; i++) {
            this.time.delayedCall(i * 400, () => {
                if (!this.level12State.isActive) return;
                const x = Phaser.Math.Between(150, CONFIG.width - 150);
                const y = Phaser.Math.Between(80, 350);
                const color = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];
                
                const firework = this.add.particles(x, y, 'sparkle_particle', {
                    speed: { min: 150, max: 400 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 0.3, end: 0 },
                    alpha: { start: 1, end: 0 },
                    lifespan: 2000,
                    quantity: 40,
                    blendMode: 'ADD',
                    tint: color,
                    gravityY: 150
                });
                firework.setDepth(1000);
                firework.explode();
                
                // audioManager.playFirework();
                if (typeof audioManager !== 'undefined') audioManager.playFirework();
                this.time.delayedCall(2500, () => { firework.destroy(); });
            });
        }
        
        // 📸 CONFETTI LAYER
        const confetti = this.add.particles(0, -50, 'sparkle_particle', {
            x: { min: 0, max: CONFIG.width },
            speedY: { min: 50, max: 150 },
            speedX: { min: -30, max: 30 },
            scale: { start: 0.5, end: 0.3 },
            alpha: { start: 0.9, end: 0.4 },
            lifespan: 5000,
            frequency: 80,
            quantity: 2,
            blendMode: 'ADD',
            tint: [0xffd700, 0xff69b4, 0x87ceeb, 0x00ff00, 0xffffff],
            gravityY: 100
        });
        confetti.setDepth(997);
        
        this.time.delayedCall(10000, () => {
            confetti.stop();
            this.time.delayedCall(5000, () => confetti.destroy());
        });
        
        // ✨ T+2s Sheep appears
        this.time.delayedCall(2000, () => {
            console.log('🐑 Spawning Golden Sheep...');
            if (!this.goldenSheepSpawned) {
                this.spawnGoldenSheep();
                this.goldenSheepSpawned = true;
            }
            
            // ✨ T+3s Weather clears & Resurrection
            this.time.delayedCall(1000, () => {
                console.log('🌞 Automatic weather clear & resurrection...');
                this.shootGoldenRaysAndResurrect();
            });
        });`);

scene = replaceMethod(scene, 'spawnGoldenSheep', `        console.log('✨ Golden Sheep Pops In!');
        
        const startX = CONFIG.width / 2;
        const startY = CONFIG.height / 2 - 50;
        
        this.goldenSheepSprite = this.add.image(startX, startY, 'golden_sheep');
        this.goldenSheepSprite.setScale(0); 
        this.goldenSheepSprite.setDepth(500); 
        
        this.tweens.add({
            targets: this.goldenSheepSprite,
            scale: 0.25,
            duration: 400,
            ease: 'Back.easeOut'
        });
        
        this.goldenSheepSparkles = this.add.particles(startX, startY, 'sparkle_particle', {
            speed: { min: 20, max: 50 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 1000,
            frequency: 50,
            quantity: 2,
            blendMode: 'ADD',
            tint: [0xffd700, 0xffed4e, 0xffffff]
        });
        this.goldenSheepSparkles.setDepth(499);
        
        const lightRays = this.add.graphics();
        lightRays.setDepth(498);
        lightRays.lineStyle(3, 0xffd700, 0.6);
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            const length = 60;
            lightRays.lineBetween(
                startX, startY,
                startX + Math.cos(angle) * length,
                startY + Math.sin(angle) * length
            );
        }
        this.goldenSheepLightRays = lightRays;
        
        this.tweens.add({
            targets: lightRays,
            angle: 360,
            duration: 3000,
            repeat: -1,
            ease: 'Linear'
        });
        
        if (typeof audioManager !== 'undefined') audioManager.playCoin();
        
        this.goldenSheepActivated = true;
        this.level12CelebrationComplete = true; // Mark as complete!`);

scene = replaceMethod(scene, 'shootGoldenRaysAndResurrect', `        if (!this.level12State || !this.level12State.isActive) return;
        console.log('🌞 Weather clears automatically and resurrecting bones...');
        
        if (this.rainSound && this.rainSound.isPlaying) this.rainSound.stop();
        if (this.windSound && this.windSound.isPlaying) this.windSound.stop();
        this.lightningActive = false;
        
        if (this.rainEmitter) {
            this.rainEmitter.stop();
            this.rainEmitter.destroy();
            this.rainEmitter = null;
        }
        if (this.windEmitter) {
            this.windEmitter.stop();
            this.windEmitter.destroy();
            this.windEmitter = null;
        }
        if (this.darknessOverlay) {
            this.tweens.add({
                targets: this.darknessOverlay,
                alpha: 0,
                duration: 1000,
                onComplete: () => {
                    this.darknessOverlay.destroy();
                    this.darknessOverlay = null;
                }
            });
        }
        
        if (this.pastureImage) {
            this.pastureImage.clearTint();
            this.pastureImage.setAlpha(1.0);
        }
        
        const sheepX = this.goldenSheepSprite ? this.goldenSheepSprite.x : CONFIG.width/2;
        const sheepY = this.goldenSheepSprite ? this.goldenSheepSprite.y : CONFIG.height/2;
        
        this.createGoldenRaysFromCenter(sheepX, sheepY);
        this.resurrectAllBoneSheep();
        
        this.wetGrassApplied = false;
        if (this.sheep && this.sheep.children) {
            this.sheep.getChildren().forEach(sheep => {
                if (sheep && sheep.active && !sheep.isImmuneOutlier) {
                    this.tweens.killTweensOf(sheep);
                    this.tweens.add({
                        targets: sheep,
                        alpha: 1.0,
                        duration: 1500,
                        ease: 'Sine.easeOut'
                    });
                    sheep.clearTint();
                }
            });
        }
        
        this.removeAllWolvesLevel12();
        
        // T+5s Unlock Animation
        this.time.delayedCall(2000, () => {
            this.startLevel12ResurrectionSequence();
        });`);

scene = replaceMethod(scene, 'startLevel12ResurrectionSequence', `        if (!this.level12State || !this.level12State.isActive) return;
        console.log('🔑 Auto-unlocking levels...');
        
        const hudScene = this.scene.get('HUDScene');
        
        const startX = this.goldenSheepSprite ? this.goldenSheepSprite.x : CONFIG.width / 2;
        const startY = this.goldenSheepSprite ? this.goldenSheepSprite.y : CONFIG.height / 2;
        
        const goldenKey = hudScene.add.image(startX, startY, 'golden_key');
        goldenKey.setScale(0.15);
        goldenKey.setDepth(10000);
        
        const keyTrail = hudScene.add.particles(startX, startY, 'sparkle_particle', {
            speed: 0,
            scale: { start: 0.6, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 800,
            frequency: 20,
            quantity: 2,
            blendMode: 'ADD',
            tint: 0xffd700,
            follow: goldenKey
        });
        keyTrail.setDepth(9999);
        
        if (typeof audioManager !== 'undefined') audioManager.playCoin();
        
        hudScene.unlockAllLevelsAnimation(goldenKey, keyTrail);`);

scene = removeMethod(scene, 'offerGoldenKey');
scene = removeMethod(scene, 'takeGoldenKey');
scene = removeMethod(scene, 'completeGoldenSequence');
scene = removeMethod(scene, 'flyGoldenSheepToButton');
scene = removeMethod(scene, 'activateGoldenSheepButton');
scene = removeMethod(scene, 'activateGoldenSheep');

fs.writeFileSync('scenes/GameScene.js', scene);
console.log('GameScene update complete!');
