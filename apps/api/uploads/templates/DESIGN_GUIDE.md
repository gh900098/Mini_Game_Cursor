# Spin Wheel Game - Asset Design Guide

**Purpose:** Complete asset specifications for creating custom spin wheel game themes  
**Format:** Generic template applicable to all themes  
**Created:** 2026-02-07

---

## 📐 Asset Specifications

### 1. Main Background
**File:** `bgImage.png` / `bgImage.webp`  
**Size:** 1080 x 1920 px (Portrait, Mobile-First)  
**Format:** WebP/PNG  
**Max Size:** 150KB

**Requirements:**
- Mobile portrait orientation (9:16 aspect ratio)
- High contrast for readability
- Atmospheric depth (foreground, midground, background)
- Theme-appropriate color palette
- Optimized for mobile devices

**Design Tips:**
- Use WebP format for 30% smaller file size
- Ensure text/UI elements remain visible over background
- Consider dark vignette edges to focus attention center
- Test on actual mobile devices for color accuracy

---

### 2. Brand Logo
**File:** `titleImage.svg` / `titleImage.png`  
**Size:** 600 x 300 px  
**Format:** SVG (preferred) / PNG  
**Background:** Transparent

**Requirements:**
- Clear, readable typography
- Works at small sizes (mobile)
- Transparent background
- Theme-consistent styling
- Optional: Animated glow effects

**Typography Guidelines:**
- Font: Bold, impactful (Impact, Arial Black, custom)
- Size: 80-120px for main text
- Effects: Gradients, shadows, glows
- Spacing: Wide letter spacing for premium feel

---

### 3. Wheel Border
**File:** `wheelBorderImage.svg` / `wheelBorderImage.png`  
**Size:** 1024 x 1024 px  
**Format:** SVG (preferred) / PNG  
**Background:** Transparent center

**Requirements:**
- Circular frame (transparent center for wheel)
- Ornate decorative elements
- Theme-consistent styling
- Optional: Animated glow nodes
- 3D depth with shadows

**Design Elements:**
- Triple-layer ring structure
- Decorative patterns (theme-specific)
- 8 cardinal point accents (optional)
- Metallic or textured finish
- Subtle rotation animation support

---

### 4. Center Hub
**File:** `centerImage.svg` / `centerImage.png`  
**Size:** 256 x 256 px  
**Format:** SVG (preferred) / PNG  
**Background:** Transparent

**Requirements:**
- Centered medallion/icon
- High contrast against wheel
- Theme icon/symbol
- Optional: Pulsing animation
- Clear focal point

**Design Tips:**
- Use bold, simple shapes for clarity
- High contrast colors
- Glow effects for depth
- Keep details visible at small size

---

### 5. Pointer
**File:** `pointerImage.svg` / `pointerImage.png`  
**Size:** 128 x 256 px (Vertical)  
**Format:** SVG (preferred) / PNG  
**Background:** Transparent

**Requirements:**
- **Direction:** Points downward (top to bottom)
- Clear, visible indicator
- High contrast against wheel
- Theme-consistent styling
- Optional: Animated effects

**Design Elements:**
- Arrow, triangle, or theme-specific shape
- Bright, attention-grabbing color
- Glow or shadow for depth
- Animated particles (optional)

---

### 6. Slider Divider
**File:** `dividerImage.svg` / `dividerImage.png`  
**Size:** 64 x 512 px (Vertical)  
**Format:** SVG (preferred) / PNG  
**Background:** Transparent

**Requirements:**
- Vertical separator between wheel slices
- Thin, elegant design
- Theme-consistent decoration
- Optional: Animated glow line

**Design Tips:**
- Keep width narrow (32-48px actual width)
- Use vertical symmetry
- Subtle decorative elements
- Contrasting color against wheel

---

### 7. Token Bar
**File:** `tokenBarImage.svg` / `tokenBarImage.png`  
**Size:** 600 x 120 px (Horizontal)  
**Format:** SVG (preferred) / PNG  
**Background:** Transparent or themed

**Requirements:**
- Horizontal display panel
- Clear text area for balance/tokens
- Decorative frame
- Theme-consistent styling
- Optional: Pulsing glow

**Design Elements:**
- Ornate border frame
- Center content area
- Corner decorations
- Subtle background texture

---

### 8. Spin Button
**File:** `spinBtnImage.svg` / `spinBtnImage.png`  
**Size:** 600 x 160 px  
**Format:** SVG (preferred) / PNG  
**Background:** Transparent or themed

**Requirements:**
- Large, prominent button design
- Clear text area for "SPIN" / "TAP TO SPIN"
- 3D depth effect
- Theme-consistent styling
- Interactive feel (hover state support)

**Design Elements:**
- Gradient background
- 3D bevel and shadow
- Decorative accents (left/right)
- Glow effects
- Rounded corners (optional)
- **Note:** Text overlay is always shown unless explicitly disabled

---

### 9. Win Frame
**File:** `resultWinBackground.svg` / `resultWinBackground.png`  
**Size:** 760 x 1000 px (Portrait)  
**Format:** SVG / PNG

**Requirements:**
- Celebratory, positive atmosphere
- Bright, vibrant colors
- Ornate decorative frame
- Center content area for prize
- Optional: Animated rays/particles

**Design Elements:**
- Radiating rays from center
- Bright color palette
- Ornate border frame
- Decorative corner elements
- Animated glow effects

---

### 10. Lose Frame
**File:** `resultLoseBackground.svg` / `resultLoseBackground.png`  
**Size:** 760 x 1000 px (Portrait)  
**Format:** SVG / PNG

**Requirements:**
- Subdued, somber atmosphere
- Darker, muted colors
- Simpler decorative frame
- Encouraging "try again" feel
- Subtle effects (no intense animations)

**Design Elements:**
- Dark background
- Muted color palette
- Simpler border frame
- Subdued decorative elements
- Minimal animations

---

### 11. Win Title
**File:** `resultWinTitleImage.svg` / `resultWinTitleImage.png`  
**Size:** 600 x 160 px  
**Format:** SVG (preferred) / PNG  
**Background:** Transparent

**Text:** "VICTORY!" / "CONGRATULATIONS!" / "YOU WON!"

**Requirements:**
- Bold, impactful typography
- Bright, celebratory colors
- Intense glow effects
- Large font size (90-110px)
- Wide letter spacing

**Effects:**
- Gradient fill (bright colors)
- Intense glow/shadow
- Optional: Shine overlay
- Animated pulse (optional)

---

### 12. Lose Title
**File:** `resultLoseTitleImage.svg` / `resultLoseTitleImage.png`  
**Size:** 600 x 160 px  
**Format:** SVG (preferred) / PNG  
**Background:** Transparent

**Text:** "TRY AGAIN" / "BETTER LUCK NEXT TIME"

**Requirements:**
- Bold typography
- Muted, subdued colors
- Subtle effects
- Medium font size (80-100px)
- Medium letter spacing

**Effects:**
- Muted gradient
- Subtle shadow
- Minimal glow
- No intense animations

---

### 13. Win Button
**File:** `resultWinButtonImage.svg` / `resultWinButtonImage.png`  
**Size:** 560 x 140 px  
**Format:** SVG (preferred) / PNG  
**Background:** Transparent

**Text:** "COLLECT" / "CLAIM PRIZE"

**Requirements:**
- Bright, inviting button
- Clear call-to-action
- 3D depth effect
- Rounded corners
- High contrast text

**Design Elements:**
- Bright gradient background
- 3D bevel and shadow
- White/bright text (60-80px)
- Border highlight
- Rounded corners (12-20px)

---

### 14. Lose Button
**File:** `resultLoseButtonImage.svg` / `resultLoseButtonImage.png`  
**Size:** 560 x 140 px  
**Format:** SVG (preferred) / PNG  
**Background:** Transparent

**Text:** "TRY AGAIN" / "SPIN AGAIN"

**Requirements:**
- Subdued button design
- Clear call-to-action
- Subtle depth effect
- Rounded corners
- Readable text

**Design Elements:**
- Muted gradient background
- Subtle shadow
- Muted text color (50-70px)
- Simple border
- Rounded corners (12-20px)

---

### 15. Prize Icon
**File:** `prizeIcon.svg` / `prizeIcon.png`  
**Size:** 256 x 256 px  
**Format:** SVG (preferred) / PNG  
**Background:** Transparent

**Requirements:**
- Theme-appropriate symbol
- Clear, recognizable icon
- High contrast
- Optional: Animated glow
- Works at various sizes

**Design Tips:**
- Simple, bold shapes
- Bright, vibrant colors
- Glow effects for depth
- Centered composition
- Scalable design

---

## 🎨 General Design Principles

### Color Palette Guidelines
1. **Primary Color:** Main theme color (brand identity)
2. **Secondary Color:** Complementary accent color
3. **Accent Color:** Highlights and energy effects
4. **Background Color:** Dark or neutral base
5. **Text Color:** High contrast for readability

### Visual Hierarchy
1. **Primary Focus:** Wheel, spin button, results
2. **Secondary Elements:** Borders, frames, decorations
3. **Background:** Atmospheric, non-distracting
4. **UI Elements:** Clear, readable, accessible

### Animation Guidelines
- **Glow Effects:** 2-3 second pulse (subtle)
- **Particles:** 0.6-1.2 second fade
- **Energy Lines:** Continuous subtle pulse
- **Gems/Accents:** 1.5 second pulse (staggered)
- **Avoid:** Excessive, distracting animations

### Consistency Rules
- Use consistent color palette across all assets
- Maintain similar decorative style/patterns
- Keep typography consistent
- Use similar effects (glows, shadows, gradients)
- Ensure cohesive theme throughout

---

## 🛠️ Technical Requirements

### File Formats
- **SVG:** Preferred for scalability and small file size
- **PNG:** Use for complex textures/photos with transparency
- **WebP:** Best for raster images (30% smaller than PNG)
- **Avoid:** JPEG (no transparency support)

### Performance Optimization
- **Total Asset Package:** Under 500KB recommended
- **Individual SVG:** Under 10KB each
- **Individual PNG/WebP:** Under 50KB each
- **Background Image:** Under 150KB

### SVG Best Practices
- Use filters for glow effects (`feGaussianBlur`)
- Apply gradients for depth (`linearGradient`, `radialGradient`)
- Optimize paths (remove unnecessary points)
- Use `<animate>` tags for animations
- Keep filter complexity low (max 3 layers)

### Mobile Optimization
- Test on actual mobile devices
- Ensure readability at small sizes
- Use high contrast colors
- Avoid tiny details that won't be visible
- Consider touch target sizes (min 44x44px)

---

## 📋 Asset Checklist

- [ ] Main Background (1080x1920)
- [ ] Brand Logo (600x300)
- [ ] Wheel Border (1024x1024)
- [ ] Center Hub (256x256)
- [ ] Pointer (128x256)
- [ ] Slider Divider (64x512)
- [ ] Token Bar (600x120)
- [ ] Spin Button (600x160)
- [ ] Win Frame (760x1000)
- [ ] Lose Frame (760x1000)
- [ ] Win Title (600x160)
- [ ] Lose Title (600x160)
- [ ] Win Button (560x140)
- [ ] Lose Button (560x140)
- [ ] Prize Icon (256x256)

---

## 🎨 AI Image Generation Tips

### General Prompt Structure
```
[Asset type], [theme description], [style keywords],
[color palette], [specific elements], [dimensions],
[quality keywords], [format requirements]
```

### Example Prompts

**Main Background:**
```
Mobile game background, [THEME] theme, [key visual elements],
[atmospheric description], [color palette], cinematic lighting,
high detail, 1080x1920 portrait, premium digital art
```

**Wheel Border:**
```
Circular frame, [THEME] aesthetic, [texture description],
[decorative elements], [accent details], 3D depth,
1024x1024 square, transparent center, game UI element
```

**Center Icon:**
```
Circular medallion, [THEME] symbol, [main element],
[background description], [frame details], intense glow,
256x256 square, dramatic lighting, high contrast
```

---

## 💡 Design Tips for Designers

1. **Contrast is Key:** Use high contrast for visibility on mobile
2. **Layer Your Effects:** Multiple blur layers create depth
3. **Gradient Direction:** Top-to-bottom for depth, radial for energy
4. **Animation Timing:** Stagger animations for organic feel
5. **Theme Consistency:** Use authentic patterns/elements for theme
6. **Simplify Details:** Keep designs clear at small sizes
7. **Test on Mobile:** Always verify on actual devices
8. **Optimize Files:** Compress without quality loss

---

## 🔧 Common Theme Examples

### Fantasy/Magic Theme
- Colors: Purple, gold, mystical blue
- Elements: Stars, sparkles, magical runes
- Style: Ethereal, glowing, mystical

### Sci-Fi/Cyber Theme
- Colors: Neon cyan, pink, purple
- Elements: Circuit patterns, holograms, grids
- Style: Futuristic, glowing, digital

### Ancient/Historical Theme
- Colors: Bronze, gold, stone gray
- Elements: Columns, patterns, artifacts
- Style: Ornate, textured, classical

### Nature/Organic Theme
- Colors: Green, brown, earth tones
- Elements: Leaves, vines, natural textures
- Style: Organic, flowing, natural

---

**End of Design Guide**  
*This guide is applicable to all spin wheel game themes. Customize colors, elements, and styles to match your specific theme while maintaining the technical specifications.*
