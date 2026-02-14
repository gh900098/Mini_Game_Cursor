# MiniGame UI/UX Standards and Component Specifications

**Principle: Unified, Consistent, Predictable**

All new features must adhere to these standards; do not create new patterns.

---

## 📋 Configuration Component Types (`seed.service.ts`)

### 1. Switch (Toggle Button)

**Purpose:** Boolean state switching (Yes/No, On/Off).

**⚠️ IMPORTANT: Switch components MUST be nested within a `collapse-group` or another group; they cannot be placed directly at the top level!**

**Standard Format:**
```typescript
// ❌ Incorrect - Switch is not supported at the top level
{ key: 'showButton', type: 'switch', label: 'Show Button', default: true, span: 12 }

// ✅ Correct - Nested within a collapse-group
{
  key: 'feature_section',
  type: 'collapse-group',
  label: '🔧 Feature Settings',
  span: 24,
  items: [
    { key: 'showButton', type: 'switch', label: 'Show Button', default: true, span: 12 }
  ]
}
```

**Example:**
```typescript
{
  key: 'sound_button_section',
  type: 'collapse-group',
  label: '🔊 Sound Button',
  span: 24,
  items: [
    { key: 'showSoundButton', type: 'switch', label: 'Show Sound Button', default: true, span: 12 },
    { key: 'soundButtonOpacity', type: 'slider', label: 'Opacity', min: 0, max: 100, step: 5, suffix: '%', default: 80, span: 12 }
  ]
}
```

**Do not use:** Input boxes or other controls to replace a switch, and do not place a switch at the top level.

---

### 2. Slider

**Purpose:** Selection within a numerical range.

**Standard Format:**
```typescript
{
  key: 'propertyName',
  type: 'slider',
  label: 'Display Label',
  min: number,
  max: number,
  step: number,
  suffix: 'unit',  // Unit
  default: number,
  span: number
}
```

#### 2.1 Opacity

**Always use percentages (0-100%):**
```typescript
{
  key: 'someOpacity',
  type: 'slider',
  label: 'Opacity',
  min: 0,
  max: 100,
  step: 5,
  suffix: '%',
  default: 80,  // e.g., 100, 60, etc.
  span: 12
}
```

**Example:**
```typescript
{ key: 'bgOpacity', type: 'slider', label: 'Background Opacity', min: 0, max: 100, step: 5, suffix: '%', default: 100, span: 12 }
{ key: 'logoOpacity', type: 'slider', label: 'Opacity', min: 0, max: 100, step: 5, suffix: '%', default: 100, span: 12 }
{ key: 'soundButtonOpacity', type: 'slider', label: 'Sound Button Opacity', min: 0, max: 100, step: 5, suffix: '%', default: 80, span: 12 }
```

**Conversion when used in the frontend:**
```typescript
// Conversion in Vue computed properties
const opacity = computed(() => {
  const value = config.someOpacity ?? 100; // Default 100%
  return value / 100; // Convert to CSS 0-1
});
```

#### 2.2 Volume

**Always use percentages (0-100%):**
```typescript
{
  key: 'someVolume',
  type: 'slider',
  label: 'Volume',
  min: 0,
  max: 100,
  step: 5,
  suffix: '%',
  default: 40,  // or other values
  span: 12
}
```

**Example:**
```typescript
{ key: 'bgmVolume', type: 'slider', label: 'BGM Volume', min: 0, max: 100, step: 5, suffix: '%', default: 40, span: 12 }
{ key: 'tickVolume', type: 'slider', label: 'Tick Volume', min: 0, max: 100, step: 5, suffix: '%', default: 30, span: 12 }
```

#### 2.3 Size

**Pixels (px):**
```typescript
{ key: 'logoTopMargin', type: 'slider', label: 'Top Margin', min: 0, max: 60, step: 2, suffix: 'px', default: 10, span: 12 }
{ key: 'spinBtnWidth', type: 'slider', label: 'Width', min: 200, max: 400, step: 10, suffix: 'px', default: 320, span: 12 }
```

**Percentages (%):**
```typescript
{ key: 'logoWidth', type: 'slider', label: 'Logo Width', min: 20, max: 100, step: 5, suffix: '%', default: 80, span: 12 }
{ key: 'wheelBorderSize', type: 'slider', label: 'Size', min: 100, max: 150, step: 1, suffix: '%', default: 110, span: 12 }
```

#### 2.4 Time (Duration)

**Seconds (s):**
```typescript
{ key: 'spinDuration', type: 'slider', label: 'Spin Duration', min: 1, max: 10, step: 0.5, suffix: 's', default: 4, span: 12 }
```

#### 2.5 Count

**No unit:**
```typescript
{ key: 'spinTurns', type: 'slider', label: 'Spin Turns', min: 1, max: 20, step: 1, default: 5, span: 12 }
```

---

### 3. Color Picker

**Standard Format:**
```typescript
{
  key: 'colorName',
  type: 'color',
  label: 'Color Label',
  default: '#hexcode',
  span: 12
}
```

**Example:**
```typescript
{ key: 'primaryColor', type: 'color', label: 'Primary Color', default: '#3b82f6', span: 12 }
{ key: 'backgroundColor', type: 'color', label: 'Background Color', default: '#1e293b', span: 12 }
```

---

### 4. Select (Dropdown)

**Standard Format:**
```typescript
{
  key: 'optionName',
  type: 'select',
  label: 'Select Label',
  options: ['option1', 'option2', 'option3'],
  default: 'option1',
  span: 12
}
```

**Example:**
```typescript
{ key: 'bgType', type: 'select', label: 'Background Type', options: ['color', 'gradient', 'image'], default: 'color', span: 12 }
```

---

### 5. Image Upload

**Standard Format:**
```typescript
{
  key: 'imageName',
  type: 'image',
  label: 'Image Label',
  span: 24  // Images usually occupy the full row
}
```

**Example:**
```typescript
{ key: 'logoImage', type: 'image', label: 'Logo Image', span: 24 }
{ key: 'wheelBorderImage', type: 'image', label: 'Border Image', span: 24 }
```

---

### 6. File Upload

**Standard Format:**
```typescript
{
  key: 'fileName',
  type: 'file',
  label: 'File Label (.extension)',
  span: 24
}
```

**Example:**
```typescript
{ key: 'bgmUrl', type: 'file', label: 'BGM Audio File (.mp3)', span: 24 }
{ key: 'jackpotSound', type: 'file', label: 'Jackpot Sound (.mp3)', span: 24 }
```

---

## 📐 Layout Specifications

### Span Value Standards

**Total width: 24**

- **span: 24** → Occupies the full row (100%)
  - Used for: Titles, image uploads, file uploads, large configuration groups.
  
- **span: 12** → Occupies half a row (50%)
  - Used for: Most configuration items (appearing in pairs).
  
- **span: 8** → Occupies 1/3 of a row (33.33%)
  - Used for: Three configuration items side-by-side.
  
- **span: 6** → Occupies 1/4 of a row (25%)
  - Used for: Four configuration items side-by-side (rarely used).

### Paired Configuration Recommendations

**Good example:**
```typescript
{ key: 'showSoundButton', type: 'switch', label: 'Show Sound Button', default: true, span: 12 },
{ key: 'soundButtonOpacity', type: 'slider', label: 'Opacity', min: 0, max: 100, step: 5, suffix: '%', default: 80, span: 12 }
```

**Bad example:**
```typescript
{ key: 'showSoundButton', type: 'switch', label: 'Show Sound Button', default: true, span: 24 },  // ❌ Waste of space
{ key: 'soundButtonOpacity', type: 'slider', label: 'Opacity', min: 0, max: 100, step: 5, suffix: '%', default: 80, span: 24 }
```

---

## 🌍 Translation File Standards

### Chinese (`zh-cn.ts`)

```typescript
visuals: {
  showSoundButton: 'Show Sound Button',
  soundButtonOpacity: 'Sound Button Opacity',
}
```

### English (`en-us.ts`)

```typescript
visuals: {
  showSoundButton: 'Show Sound Button',
  soundButtonOpacity: 'Sound Button Opacity',
}
```

### TypeScript Definitions (`app.d.ts`)

```typescript
interface Visuals {
  showSoundButton: string;
  soundButtonOpacity: string;
}
```

---

## ✅ Adding New Features Checklist

### 1. Design Phase
- [ ] Check for similar configurations within the system.
- [ ] Determine the appropriate component type (switch, slider, color, etc.).
- [ ] Confirm units and ranges (%, px, s, etc.).
- [ ] Confirm default values.

### 2. Implementation Phase
- [ ] Modify `seed.service.ts` - Add the configuration item.
- [ ] Modify `zh-cn.ts` - Add Chinese translation.
- [ ] Modify `en-us.ts` - Add English translation.
- [ ] Modify `app.d.ts` - Add type definition.
- [ ] Modify frontend code - Read and apply the configuration.

### 3. Deployment Phase
- [ ] Commit code to GitHub.
- [ ] Build API + Admin (if the schema was modified).
- [ ] Re-run the seed: `curl -X POST https://api.xseo.me/api/seed/run`
- [ ] Test newly created game instances.

### 4. Verification Phase
- [ ] Verify the new configuration item is visible in the Admin Panel.
- [ ] Verify the item displays correctly (e.g., switches are toggles, sliders have units).
- [ ] Verify the frontend reads and applies the configuration correctly.
- [ ] Verify efficacy after clearing the browser cache.

---

## 🚫 Common Mistakes

### ❌ Error 1: Inconsistent Opacity Units
```typescript
// ❌ Incorrect - Using 0.1-1.0
{ key: 'opacity', type: 'slider', min: 0.1, max: 1, step: 0.1, default: 0.8 }

// ✅ Correct - Using 0-100%
{ key: 'opacity', type: 'slider', min: 0, max: 100, step: 5, suffix: '%', default: 80 }
```

### ❌ Error 2: Incorrect Switch Type
```typescript
// ❌ Incorrect - Using string or input
{ key: 'enabled', type: 'string', default: 'true' }

// ✅ Correct - Using switch
{ key: 'enabled', type: 'switch', default: true }
```

### ❌ Error 3: Span Value Wasting Space
```typescript
// ❌ Incorrect - Single switch occupying the full row
{ key: 'showButton', type: 'switch', label: 'Show', default: true, span: 24 }

// ✅ Correct - Paired configuration, each half a row
{ key: 'showButton', type: 'switch', label: 'Show', default: true, span: 12 },
{ key: 'buttonOpacity', type: 'slider', label: 'Opacity', min: 0, max: 100, step: 5, suffix: '%', default: 80, span: 12 }
```

### ❌ Error 4: Forgetting Translation File Updates
```typescript
// ❌ Changed seed.service.ts but forgot translations
{ key: 'newFeature', type: 'switch', label: 'page.manage.game.visuals.newFeature', default: true }

// - zh-cn.ts: newFeature: 'New Feature'
// - en-us.ts: newFeature: 'New Feature'
// - app.d.ts: newFeature: string;
```

---

## 📚 Reference Examples

### Complete Feature Addition Example

**Requirement:** Add a "Show Watermark" feature with adjustable opacity.

#### 1. seed.service.ts
```typescript
{
  key: 'watermark_group',
  type: 'collapse-group',
  label: 'Watermark Settings',
  span: 24,
  items: [
    { key: 'showWatermark', type: 'switch', label: 'page.manage.game.visuals.showWatermark', default: true, span: 12 },
    { key: 'watermarkOpacity', type: 'slider', label: 'page.manage.game.visuals.watermarkOpacity', min: 0, max: 100, step: 5, suffix: '%', default: 50, span: 12 }
  ]
}
```

#### 2. zh-cn.ts
```typescript
visuals: {
  showWatermark: 'Show Watermark',
  watermarkOpacity: 'Watermark Opacity',
}
```

#### 3. en-us.ts
```typescript
visuals: {
  showWatermark: 'Show Watermark',
  watermarkOpacity: 'Watermark Opacity',
}
```

#### 4. app.d.ts
```typescript
interface Visuals {
  showWatermark: string;
  watermarkOpacity: string;
}
```

#### 5. Frontend Code
```typescript
// Vue computed
const showWatermark = computed(() => {
  return instance.value?.config?.showWatermark !== false; // Default: show
});

const watermarkOpacity = computed(() => {
  const opacity = instance.value?.config?.watermarkOpacity ?? 50; // Default: 50%
  return opacity / 100; // Convert to CSS 0-1
});

// Template
<div v-if="showWatermark" :style="{ opacity: watermarkOpacity }">
  Watermark
</div>
```

---

## 🎯 Summary

**Core Principles:**
1. Use existing component types exclusively.
2. Uniformly use percentages (0-100%) for opacity and volume.
3. Use Switch for boolean values.
4. Sliders MUST have a unit suffix.
5. Paired configurations should each occupy half a row (span: 12).
6. Every configuration must have corresponding entries in translation files.
7. Always re-run the seed script after modifying the schema.

**Recommended Workflow:**
1. First, check how similar configurations are implemented in the system.
2. Copy-paste, then modify the key and label.
3. Do not create new patterns.

**Remember: Consistency > Innovation**
