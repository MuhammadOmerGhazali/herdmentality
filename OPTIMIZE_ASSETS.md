# Asset Optimization Guide

## Current Status
- **Total Size**: 68MB
- **Estimated Load Time**: 10-30 seconds on average connection
- **Problem**: Too large for quick game start

## Quick Wins (Do These First)

### 1. Remove Backup Files (~2.5MB each)
Delete all files ending in `~`:
```bash
find assets -name "*~" -delete
```
**Savings**: ~15MB

### 2. Convert Large WAV Files to MP3

Large WAV files that need conversion:
- `79270__ra_gun__ambience-summer-rain-05-090718.wav` (11MB) → MP3 (~1MB)
- `574730__crattray1997__farm-ambience-4416.wav` (3.3MB) → MP3 (~300KB)
- `lawnmower.wav` (2.1MB) → MP3 (~200KB)
- `431478__kierankeegan__mower_close_startup_idle_shutoff.wav` (2.1MB) → MP3 (~200KB)
- `800399__shiyang96__cartoon-wind-embarrassed.wav` (1.7MB) → MP3 (~170KB)

**Savings**: ~15MB

### 3. Optimize Images (if needed)
WebP images are already optimized, but check for duplicates.

## Conversion Commands

### Using FFmpeg (Recommended)
```bash
# Install ffmpeg if not installed
# Mac: brew install ffmpeg
# Ubuntu: sudo apt install ffmpeg
# Windows: Download from ffmpeg.org

# Convert rain ambience
ffmpeg -i assets/79270__ra_gun__ambience-summer-rain-05-090718.wav -b:a 128k assets/rain_ambience.mp3

# Convert farm ambience
ffmpeg -i assets/574730__crattray1997__farm-ambience-4416.wav -b:a 128k assets/farm_ambience.mp3

# Convert lawnmower
ffmpeg -i assets/lawnmower.wav -b:a 128k assets/lawnmower.mp3

# Convert wind
ffmpeg -i assets/800399__shiyang96__cartoon-wind-embarrassed.wav -b:a 128k assets/wind.mp3
```

### Using Online Tools (No Install)
1. Go to https://cloudconvert.com/wav-to-mp3
2. Upload WAV files
3. Set quality to 128kbps
4. Download MP3 files

## Expected Results After Optimization

| Before | After | Savings |
|--------|-------|---------|
| 68MB | ~35MB | 33MB (48% reduction) |
| 10-30s load | 5-15s load | 50% faster |

## Advanced Optimizations (Optional)

### 4. Lazy Load Audio
Only load audio when needed, not all at once.

### 5. Use Audio Sprites
Combine small sounds into one file.

### 6. Compress Images Further
Use tools like TinyPNG or Squoosh.

### 7. Use CDN for Large Assets
Host large files on a CDN separately.

## Implementation Priority

1. ✅ **High Priority** - Remove backup files (5 min)
2. ✅ **High Priority** - Convert large WAV to MP3 (15 min)
3. ⚠️ **Medium Priority** - Implement lazy loading (30 min)
4. ⚠️ **Low Priority** - Audio sprites (1 hour)

## Quick Fix Script

Save this as `optimize.sh` and run it:

```bash
#!/bin/bash

echo "🧹 Removing backup files..."
find assets -name "*~" -delete

echo "🎵 Converting audio files..."
# Add your ffmpeg commands here

echo "✅ Optimization complete!"
echo "Check assets folder size: du -sh assets/"
```

Run with: `bash optimize.sh`
