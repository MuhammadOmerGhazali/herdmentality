# Golden Clover Particle Effect Fix

## Issue
The golden clover ability particle effects were missing or not displaying correctly.

## Root Cause
The golden clover particle effects were using `'dust_particle'` texture, which is a gray dust particle intended for ground effects. This texture doesn't provide the golden, sparkly visual effect expected for the golden clover ability.

## Solution
Changed the particle texture from `'dust_particle'` to `'sparkle_particle'` in two locations:

### 1. Sparkle Particles Around Clover
The continuous sparkle effect around the clover during the percentage spin animation:
```javascript
// Before:
const sparkleParticles = hudScene.add.particles(targetX, targetY, 'dust_particle', {

// After:
const sparkleParticles = hudScene.add.particles(targetX, targetY, 'sparkle_particle', {
```

### 2. Particle Trail to Wallet
The dramatic particle trail that follows the bonus text from the clover to the wallet:
```javascript
// Before:
const particleTrail = hudScene.add.particles(targetX, targetY, 'dust_particle', {

// After:
const particleTrail = hudScene.add.particles(targetX, targetY, 'sparkle_particle', {
```

## About Sparkle Particle
The `sparkle_particle` texture is a high-resolution soft particle (64x64) with a radial gradient glow effect, generated in GameScene.create(). It's specifically designed for golden/sparkly effects and is used throughout the game for:
- Golden sheep effects
- Victory fireworks
- Confetti
- Golden key trails
- Other celebratory effects

With the golden tint (`tint: 0xffd700`) and ADD blend mode, it creates the perfect golden sparkle effect for the golden clover ability.

## Files Modified
- `scenes/GameScene.js` - Changed particle texture in `handleGoldenClover()` method (2 locations)

## Testing
Test the golden clover ability:
- Activate golden clover in Level 10+ or free play mode
- Verify golden sparkle particles appear around the clover during spin
- Verify golden particle trail follows the bonus text to the wallet
- Verify particles are visible and have a golden sparkly appearance
