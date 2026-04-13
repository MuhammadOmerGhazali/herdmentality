# Wool Wallet Visual Cleanup

## Changes Made

### 1. Removed Decorative Arrows
- Removed red down arrow (left side of title)
- Removed green up arrow (right side of title)
- Removed associated animations (bouncing tweens)

### 2. Removed All Weathering/Texture Effects
Removed the following decorative elements that created a worn leather look:

#### Leather Grain Texture
- 200 tiny irregular lines for realistic surface texture

#### Deep Leather Creases
- 50 major fold lines (darker lines)

#### Fine Scratches and Wear Marks
- 100 random scratches across the surface

#### Vertical Crease Lines
- 20 wallet fold lines

#### Horizontal Stress Lines
- 35 age lines

#### Worn Spots (Circles)
- 25 darker areas from handling (ellipses)
- 20 lighter worn areas (polished by use)

#### Wood Grain Details
- 20 horizontal lines on left and right edges

#### Leather Stitching Pattern
- Top edge stitching (diagonal marks)
- Bottom edge stitching
- Left edge stitching
- Right edge stitching

### 3. Made Yellow/Gold Lines Thicker
Updated all three divider lines in the wool wallet:

#### Title Divider (divider1)
- **Before**: `lineStyle(4, 0xFFD700, 0.6)`
- **After**: `lineStyle(8, 0xFFD700, 0.8)`
- Thickness: 4px → 8px (2x thicker)
- Opacity: 0.6 → 0.8 (more visible)

#### Section 1 Divider (divider1a)
- **Before**: `lineStyle(5, 0xFFD700, 0.8)`
- **After**: `lineStyle(8, 0xFFD700, 0.8)`
- Thickness: 5px → 8px

#### Section 2 Divider (divider2)
- **Before**: `lineStyle(4, 0xFFD700, 0.6)`
- **After**: `lineStyle(8, 0xFFD700, 0.8)`
- Thickness: 4px → 8px (2x thicker)
- Opacity: 0.6 → 0.8 (more visible)

## Visual Result

The wool wallet now has:
- ✅ Clean leather background without scratches or circles
- ✅ No decorative arrows beside the title
- ✅ Thicker, more prominent gold divider lines
- ✅ Simpler, more modern appearance
- ✅ Maintained leather color and embossed border effect

## Files Modified

1. **scenes/HUDScene.js**
   - Removed arrows and animations (~70 lines removed around line 10167)
   - Removed weathering texture code (~150 lines removed around line 10020)
   - Removed stitching pattern code (~50 lines removed around line 10120)
   - Updated 3 divider line styles (lines 10034, 10067, 10170)

## Performance Impact

Positive performance improvements:
- Removed ~400 random line/ellipse draws per wallet open
- Removed 2 continuous tween animations
- Faster wallet rendering
- Cleaner visual hierarchy

## Preserved Elements

The following elements were kept intact:
- Leather background color (#8B4513)
- Edge highlights and shadows
- Embossed border effect (dark outer, lighter inner)
- Title gradient (orange to gold)
- All text and stats content
- Button functionality
