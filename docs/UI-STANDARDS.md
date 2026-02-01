# MiniGame UI/UX 标准和组件规范

**原则：统一、一致、可预测**

所有新功能必须遵循这些标准，不要创造新的模式。

---

## 📋 配置组件类型（seed.service.ts）

### 1. Switch (开关按钮)

**用途：** 布尔值开关（是/否、开/关）

**⚠️ 重要：Switch 必须嵌套在 `collapse-group` 或其他 group 里，不能直接放在顶层！**

**标准格式：**
```typescript
// ❌ 错误 - 顶层不支持 switch
{ key: 'showButton', type: 'switch', label: 'Show Button', default: true, span: 12 }

// ✅ 正确 - 嵌套在 collapse-group 里
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

**示例：**
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

**不要用：** Input 框或其他控件来替代 switch，也不要把 switch 放在顶层

---

### 2. Slider (滑块)

**用途：** 数值范围选择

**标准格式：**
```typescript
{
  key: 'propertyName',
  type: 'slider',
  label: 'Display Label',
  min: number,
  max: number,
  step: number,
  suffix: 'unit',  // 单位
  default: number,
  span: number
}
```

#### 2.1 透明度 (Opacity)

**必须统一使用百分比：**
```typescript
{
  key: 'someOpacity',
  type: 'slider',
  label: 'Opacity',
  min: 0,
  max: 100,
  step: 5,
  suffix: '%',
  default: 80,  // 或 100, 60 等
  span: 12
}
```

**示例：**
```typescript
{ key: 'bgOpacity', type: 'slider', label: 'Background Opacity', min: 0, max: 100, step: 5, suffix: '%', default: 100, span: 12 }
{ key: 'logoOpacity', type: 'slider', label: 'Opacity', min: 0, max: 100, step: 5, suffix: '%', default: 100, span: 12 }
{ key: 'soundButtonOpacity', type: 'slider', label: 'Sound Button Opacity', min: 0, max: 100, step: 5, suffix: '%', default: 80, span: 12 }
```

**前端使用时转换：**
```typescript
// 在 Vue computed 中转换
const opacity = computed(() => {
  const value = config.someOpacity ?? 100; // 默认 100%
  return value / 100; // 转换成 CSS 的 0-1
});
```

#### 2.2 音量 (Volume)

**统一使用百分比：**
```typescript
{
  key: 'someVolume',
  type: 'slider',
  label: 'Volume',
  min: 0,
  max: 100,
  step: 5,
  suffix: '%',
  default: 40,  // 或其他
  span: 12
}
```

**示例：**
```typescript
{ key: 'bgmVolume', type: 'slider', label: 'BGM Volume', min: 0, max: 100, step: 5, suffix: '%', default: 40, span: 12 }
{ key: 'tickVolume', type: 'slider', label: 'Tick Volume', min: 0, max: 100, step: 5, suffix: '%', default: 30, span: 12 }
```

#### 2.3 尺寸 (Size)

**像素 (px)：**
```typescript
{ key: 'logoTopMargin', type: 'slider', label: 'Top Margin', min: 0, max: 60, step: 2, suffix: 'px', default: 10, span: 12 }
{ key: 'spinBtnWidth', type: 'slider', label: 'Width', min: 200, max: 400, step: 10, suffix: 'px', default: 320, span: 12 }
```

**百分比 (%)：**
```typescript
{ key: 'logoWidth', type: 'slider', label: 'Logo Width', min: 20, max: 100, step: 5, suffix: '%', default: 80, span: 12 }
{ key: 'wheelBorderSize', type: 'slider', label: 'Size', min: 100, max: 150, step: 1, suffix: '%', default: 110, span: 12 }
```

#### 2.4 时间 (Time)

**秒 (s)：**
```typescript
{ key: 'spinDuration', type: 'slider', label: 'Spin Duration', min: 1, max: 10, step: 0.5, suffix: 's', default: 4, span: 12 }
```

#### 2.5 数量 (Count)

**无单位：**
```typescript
{ key: 'spinTurns', type: 'slider', label: 'Spin Turns', min: 1, max: 20, step: 1, default: 5, span: 12 }
```

---

### 3. Color Picker (颜色选择器)

**标准格式：**
```typescript
{
  key: 'colorName',
  type: 'color',
  label: 'Color Label',
  default: '#hexcode',
  span: 12
}
```

**示例：**
```typescript
{ key: 'primaryColor', type: 'color', label: 'Primary Color', default: '#3b82f6', span: 12 }
{ key: 'backgroundColor', type: 'color', label: 'Background Color', default: '#1e293b', span: 12 }
```

---

### 4. Select (下拉选择)

**标准格式：**
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

**示例：**
```typescript
{ key: 'bgType', type: 'select', label: 'Background Type', options: ['color', 'gradient', 'image'], default: 'color', span: 12 }
```

---

### 5. Image Upload (图片上传)

**标准格式：**
```typescript
{
  key: 'imageName',
  type: 'image',
  label: 'Image Label',
  span: 24  // 图片通常占满整行
}
```

**示例：**
```typescript
{ key: 'logoImage', type: 'image', label: 'Logo Image', span: 24 }
{ key: 'wheelBorderImage', type: 'image', label: 'Border Image', span: 24 }
```

---

### 6. File Upload (文件上传)

**标准格式：**
```typescript
{
  key: 'fileName',
  type: 'file',
  label: 'File Label (.extension)',
  span: 24
}
```

**示例：**
```typescript
{ key: 'bgmUrl', type: 'file', label: 'BGM Audio File (.mp3)', span: 24 }
{ key: 'jackpotSound', type: 'file', label: 'Jackpot Sound (.mp3)', span: 24 }
```

---

## 📐 Layout 规范

### Span 值标准

**总宽度：24**

- **span: 24** → 占满整行（100%）
  - 用于：标题、图片上传、文件上传、大型配置组
  
- **span: 12** → 占半行（50%）
  - 用于：大多数配置项（成对出现）
  
- **span: 8** → 占 1/3 行（33.33%）
  - 用于：三个配置项并排
  
- **span: 6** → 占 1/4 行（25%）
  - 用于：四个配置项并排（少用）

### 成对配置建议

**好的例子：**
```typescript
{ key: 'showSoundButton', type: 'switch', label: 'Show Sound Button', default: true, span: 12 },
{ key: 'soundButtonOpacity', type: 'slider', label: 'Opacity', min: 0, max: 100, step: 5, suffix: '%', default: 80, span: 12 }
```

**不好的例子：**
```typescript
{ key: 'showSoundButton', type: 'switch', label: 'Show Sound Button', default: true, span: 24 },  // ❌ 浪费空间
{ key: 'soundButtonOpacity', type: 'slider', label: 'Opacity', min: 0, max: 100, step: 5, suffix: '%', default: 80, span: 24 }
```

---

## 🌍 翻译文件标准

### 中文 (zh-cn.ts)

```typescript
visuals: {
  showSoundButton: '显示音效按钮',
  soundButtonOpacity: '音效按钮透明度',
}
```

### 英文 (en-us.ts)

```typescript
visuals: {
  showSoundButton: 'Show Sound Button',
  soundButtonOpacity: 'Sound Button Opacity',
}
```

### TypeScript 定义 (app.d.ts)

```typescript
interface Visuals {
  showSoundButton: string;
  soundButtonOpacity: string;
}
```

---

## ✅ 添加新功能 Checklist

### 1. 设计阶段
- [ ] 检查系统里是否有类似的配置
- [ ] 确认使用哪种组件类型（switch, slider, color, etc.）
- [ ] 确认单位和范围（%, px, s, etc.）
- [ ] 确认默认值

### 2. 实现阶段
- [ ] 修改 `seed.service.ts` - 添加配置项
- [ ] 修改 `zh-cn.ts` - 添加中文翻译
- [ ] 修改 `en-us.ts` - 添加英文翻译
- [ ] 修改 `app.d.ts` - 添加类型定义
- [ ] 修改前端代码 - 读取和使用配置

### 3. 部署阶段
- [ ] 提交代码到 GitHub
- [ ] 构建 API + Admin（如果改了 schema）
- [ ] 重新运行 seed: `curl -X POST https://api.xseo.me/api/seed/run`
- [ ] 测试新创建的游戏实例

### 4. 验证阶段
- [ ] Admin Panel 能看到新配置项
- [ ] 配置项显示正确（switch 是 toggle，slider 有单位）
- [ ] 前端正确读取和应用配置
- [ ] 浏览器清除缓存后能看到效果

---

## 🚫 常见错误

### ❌ 错误 1: 透明度不统一
```typescript
// ❌ 错误 - 用 0.1-1.0
{ key: 'opacity', type: 'slider', min: 0.1, max: 1, step: 0.1, default: 0.8 }

// ✅ 正确 - 用 0-100%
{ key: 'opacity', type: 'slider', min: 0, max: 100, step: 5, suffix: '%', default: 80 }
```

### ❌ 错误 2: Switch 用错类型
```typescript
// ❌ 错误 - 用 string 或 input
{ key: 'enabled', type: 'string', default: 'true' }

// ✅ 正确 - 用 switch
{ key: 'enabled', type: 'switch', default: true }
```

### ❌ 错误 3: Span 值浪费空间
```typescript
// ❌ 错误 - 单个 switch 占满整行
{ key: 'showButton', type: 'switch', label: 'Show', default: true, span: 24 }

// ✅ 正确 - 成对配置，各占半行
{ key: 'showButton', type: 'switch', label: 'Show', default: true, span: 12 },
{ key: 'buttonOpacity', type: 'slider', label: 'Opacity', min: 0, max: 100, step: 5, suffix: '%', default: 80, span: 12 }
```

### ❌ 错误 4: 忘记更新翻译文件
```typescript
// ❌ seed.service.ts 加了配置，但忘记更新翻译
{ key: 'newFeature', type: 'switch', label: 'page.manage.game.visuals.newFeature', default: true }

// ✅ 必须同时更新：
// - zh-cn.ts: newFeature: '新功能'
// - en-us.ts: newFeature: 'New Feature'
// - app.d.ts: newFeature: string;
```

---

## 📚 参考示例

### 完整的功能添加示例

**需求：** 添加"显示水印"功能，透明度可调

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
  showWatermark: '显示水印',
  watermarkOpacity: '水印透明度',
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

#### 5. 前端代码
```typescript
// Vue computed
const showWatermark = computed(() => {
  return instance.value?.config?.showWatermark !== false; // 默认显示
});

const watermarkOpacity = computed(() => {
  const opacity = instance.value?.config?.watermarkOpacity ?? 50; // 默认 50%
  return opacity / 100; // 转换成 CSS 的 0-1
});

// Template
<div v-if="showWatermark" :style="{ opacity: watermarkOpacity }">
  Watermark
</div>
```

---

## 🎯 总结

**核心原则：**
1. 统一使用现有的组件类型
2. 透明度、音量统一用百分比（0-100%）
3. Switch 用于布尔值
4. Slider 必须有 suffix（单位）
5. 成对配置各占半行（span: 12）
6. 所有配置必须有翻译文件
7. 修改 schema 后必须重新运行 seed

**参考顺序：**
1. 先看系统里类似的配置是怎么做的
2. 复制粘贴，然后修改 key 和 label
3. 不要创造新的模式

**记住：一致性 > 创新**
