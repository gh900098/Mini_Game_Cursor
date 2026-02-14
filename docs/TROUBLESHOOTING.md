# MiniGame 故障排查和常见问题

**原则：用最少的 token 做最多的事情**

---

## 🚀 标准部署流程（SOP）

### 当修改了前端代码（web-app 或 admin）：

```bash
# Step 1: 本地提交并推送
cd ~/Documents/MiniGame
git add -A
git commit -m "描述改动"
git push origin main

# Step 2: 服务器拉取并重新构建
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "cd /opt/minigame && git pull origin main && \
   docker compose -f docker-compose.prod.yml build --no-cache web-app admin && \
   docker compose -f docker-compose.prod.yml up -d web-app admin"
```

### 当修改了后端代码（API）：

```bash
# Step 1: 本地提交并推送（同上）

# Step 2: 服务器拉取并重新构建 API
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "cd /opt/minigame && git pull origin main && \
   docker compose -f docker-compose.prod.yml up -d --force-recreate api"
```

### ⚠️ 重要原则：

1. **前端有翻译文件或配置界面的改动** → 必须同时重新构建 `admin` 和 `web-app`
2. **只改了 API 逻辑** → 只需要重启 `api`
3. **不要忘记 `--no-cache`** → 确保使用最新代码

---

## 🐛 常见问题和解决方案

### 问题 1: 浏览器看不到新功能

**原因：** 浏览器强缓存了旧的 JS/CSS 文件

**解决方案：**
1. 用户侧：强制刷新（Ctrl+Shift+R 或 Cmd+Shift+R）
2. 或者：完全清除浏览器缓存
3. 或者：用隐身模式测试

**预防：** 无法预防，这是浏览器行为

---

### 问题 2: Admin Panel 配置选项没有更新

**原因：** 修改了 API 的 schema 或翻译文件，但忘记重新构建 Admin Panel

**症状：**
- 新增的配置选项看不到
- 翻译文本是旧的
- 配置界面布局没变化

**解决方案：**
```bash
# 必须同时重新构建 API 和 Admin
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "cd /opt/minigame && git pull origin main && \
   docker compose -f docker-compose.prod.yml build --no-cache api admin && \
   docker compose -f docker-compose.prod.yml up -d api admin"
```

**预防：** 
- 修改了 `seed.service.ts` → 重新构建 API + Admin
- 修改了 `locales/` 翻译文件 → 重新构建 Admin
- 修改了 `typings/app.d.ts` → 重新构建 Admin

---

### 问题 3: 旧的游戏实例配置没有更新

**原因：** 修改了 schema（移除或新增配置项），但旧实例的配置已经保存在数据库里

**症状：**
- 新创建的游戏有新配置
- 旧游戏还显示已删除的配置项

**解决方案（用户操作）：**
1. 编辑旧游戏实例
2. 关闭不需要的配置项
3. 保存

**解决方案（数据库批量更新）：**
```bash
# 示例：移除所有游戏的 clickToSpin 配置
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "docker exec minigame-postgres psql -U postgres -d minigame \
   -c \"UPDATE game_instances SET config = config - 'clickToSpin' WHERE config ? 'clickToSpin';\""
```

**预防：** 
- 设计 schema 时考虑向后兼容
- 或者提供数据库迁移脚本

---

### 问题 4: 修改了 seed.service.ts 但 Admin Panel 没有变化

**原因：** `seed.service.ts` 只在初始化时运行，游戏模板已经存储在数据库里了

**症状：**
- 修改了 seed.service.ts
- 重新构建了 API
- Admin Panel 的配置选项还是旧的

**解决方案：重新运行 seed**
```bash
# 方法 1: 通过 API 端点
curl -X POST https://api.xseo.me/api/seed/run -H "Content-Type: application/json"

# 方法 2: 通过 SSH
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "curl -X POST http://localhost:3100/api/seed/run -H 'Content-Type: application/json'"
```

**注意：**
- 重新运行 seed 会更新**游戏模板**
- **不会**更新已经创建的游戏实例
- 新创建的游戏会使用新的模板
- 旧游戏需要手动编辑或重新创建

**预防：**
- 修改 seed.service.ts 后，记得运行 `/api/seed/run`
- 或者在部署脚本里自动运行

---

### 问题 5: 游戏锁定规则不生效（用户可以直接玩）

**原因：** Race condition - 游戏 iframe 在收到 backend 锁定状态前就允许用户点击/滑动

**症状：**
- Backend 配置了等级限制/时间限制
- Console.log 显示 `[GameRules] Status updated: {canPlay: false, blockReason: 'LEVEL_TOO_LOW'}`
- 但用户还是可以玩游戏

**技术细节：**
```javascript
// 错误的实现（旧代码）：
let canPlay = true;  // ← 默认 true！

// 用户可以立即点击 → spin() 检查 canPlay (true) → 游戏开始
// 稍后 backend 发送 status → canPlay 更新为 false → 但已经太迟了！
```

**解决方案（已修复 - 2026-02-01）：**
```javascript
// 正确的实现（新代码）：
let canPlay = false;  // ← 默认 false，safe default

// 页面加载 → button disabled，显示 "LOADING..."
// Backend 发送 status → canPlay 更新
//   - 如果 true → button enabled，"TAP TO SPIN"
//   - 如果 false → button 保持 disabled，显示锁定原因
```

**修改位置：**
- `apps/api/src/modules/game-instances/templates/spin-wheel.template.ts`
  - Line ~783: `canPlay` 默认值改为 `false`
  - Line ~758: Button 初始状态改为 `disabled`
  - Line ~1651: 收到 status update 时更新 status message

**Commit:** `796e4ba` - "fix: Race condition - game starts before lock status arrives"

**学到的教训：**
- 安全的默认值很重要！
- 需要权限的功能应该默认禁用，而不是默认允许
- 考虑异步通信的时序问题
- 总是假设 postMessage 会有延迟

**预防：**
- 任何需要 backend 确认的功能，默认应该是 disabled/locked
- 不要假设 postMessage 会立即到达
- 用 "LOADING..." 状态而不是假装已经 ready

---

### 问题 6: Docker 容器没有使用最新代码

**原因：** Docker 使用了旧的 build cache

**症状：**
- 代码已经 push 到 GitHub
- 服务器上 `git pull` 成功
- 但容器里的代码还是旧的

**解决方案：**
```bash
# 使用 --no-cache 强制重新构建
docker compose -f docker-compose.prod.yml build --no-cache <service>
```

**预防：** 
- 每次重新构建都加上 `--no-cache`
- 不要依赖 Docker cache

---

### 问题 5: 只修改了一个服务，但重新构建了所有服务

**原因：** 没有指定要构建的服务名

**错误示例：**
```bash
# ❌ 这会重新构建所有服务（浪费时间）
docker compose -f docker-compose.prod.yml build --no-cache
```

**正确示例：**
```bash
# ✅ 只重新构建需要的服务
docker compose -f docker-compose.prod.yml build --no-cache web-app
```

**预防：** 
- 明确指定服务名
- 理解哪些代码改动影响哪些服务

---

## 📋 代码改动 → 服务映射表

| 改动位置 | 需要重新构建的服务 | 备注 |
|---------|------------------|------|
| `apps/api/src/` | `api` | 后端逻辑 |
| `apps/web-app/src/` | `web-app` | 游戏前端 |
| `apps/soybean-admin/src/` | `admin` | Admin Panel 前端 |
| `apps/api/src/modules/seed/` (schema) | `api` + `admin` | ⚠️ Admin 必须重建才能渲染新 schema |
| `apps/soybean-admin/src/locales/` | `admin` | 翻译文件 |
| `apps/soybean-admin/src/typings/` | `admin` | TypeScript 定义 |
| `docker-compose.prod.yml` | 受影响的服务 | 配置改动 |
| `.env.production` | 受影响的服务 | 环境变量（通常只需重启） |

**⚠️ 特别注意：**
修改 `seed.service.ts` 后：
1. 重新构建 API → 更新后端 schema
2. **必须**重新构建 Admin → 前端才能正确渲染新配置
3. 重新运行 seed → 更新数据库模板
4. 创建新游戏 → 验证效果

---

## 🔧 快速检查命令

### 验证服务是否运行
```bash
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker ps | grep minigame"
```

### 验证代码是否最新
```bash
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "cd /opt/minigame && git log --oneline -3"
```

### 查看容器日志
```bash
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker logs minigame-api --tail 50"
```

### 测试 API 可访问性
```bash
curl -s https://api.xseo.me/api | head -c 100
```

### 测试 Admin/Web-app 可访问性
```bash
curl -I https://admin.xseo.me
curl -I https://game.xseo.me
```

---

## 💡 Token 节省原则

### ❌ 不要做：
1. 每次都重复检查服务器状态
2. 多次运行相同的诊断命令
3. 重复解释相同的概念
4. 构建不需要更新的服务

### ✅ 应该做：
1. 直接按照 SOP 执行
2. 只在出错时才诊断
3. 记录问题和解决方案
4. 只构建需要更新的服务

### 📝 记录原则：
1. 遇到新问题 → 立即记录到这个文件
2. 找到解决方案 → 更新对应章节
3. 发现模式 → 添加到 SOP
4. 学到经验 → 更新原则

---

## 🎯 本次部署遇到的问题记录

### 2026-01-30: 添加音效按钮功能

**改动：**
1. 添加浮动音效按钮（web-app）
2. 移除 "Click to Spin" 配置（API seed.service.ts）
3. 添加音效按钮配置选项（API + Admin）

**遇到的问题：**
1. ✅ 只重新构建了 API 和 web-app，忘记了 Admin Panel
2. ✅ 用户浏览器缓存导致看不到新功能

**解决方案：**
1. 重新构建 Admin Panel（包含翻译文件和 schema）
2. 提醒用户清除浏览器缓存

**经验教训：**
- 修改了 schema → 必须同时构建 API + Admin
- 修改了翻译文件 → 必须重新构建 Admin
- 前端改动 → 提醒用户清除缓存

**完整部署命令：**
```bash
cd ~/Documents/MiniGame
git add -A
git commit -m "feat: 添加音效按钮配置（显示/隐藏 + 透明度）"
git push origin main

sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "cd /opt/minigame && git pull origin main && \
   docker compose -f docker-compose.prod.yml build --no-cache api admin web-app && \
   docker compose -f docker-compose.prod.yml up -d api admin web-app"
```

---

### 2026-01-31: i18n翻译不生效 - 显示raw key而不是翻译文本

**症状：**
- Admin Panel显示 `page.manage.game.common.totalProbability` 而不是 "总概率"
- 其他i18n key都正常工作
- locale设置正确（zh-CN）
- console显示availableLocales包含zh-CN和en-US

**初步排查（走了弯路）：**
1. ❌ 检查locale文件存在 → zh-cn.ts和en-us.ts都在
2. ❌ 检查i18n setup → createI18n配置正确
3. ❌ 检查deployment → 代码已经push和pull成功
4. ❌ 强制rebuild --no-cache → 还是不行
5. ❌ hardcode English测试 → 证明deployment pipeline正常
6. ❌ 检查中文翻译是否bundle进去 → `grep "总概率"` 找到了文件

**真正的诊断步骤（有效）：**
1. ✅ 在component里加console.log查看`messages.value`
2. ✅ 展开console看到`pageManageGame.common`的keys
3. ✅ **发现问题：common对象里有prizes, settings, gameplay...但没有totalProbability!**
4. ✅ 搜索zh-cn.ts找到**两个`common:`定义在同一个game对象里**

**根本原因：**
```typescript
// zh-cn.ts (line 264)
game: {
  common: {
    totalProbability: '总概率',
    expectedValue: '期望价值 / 次',
    balance: '自动平衡'
  },
  tabs: { ... },
  visuals: { ... },
  prizes: { ... },
  common: {  // ❌ 第二个common定义！
    prizes: '奖品',
    settings: '设置',
    // ... 其他keys
  }
}
```

**JavaScript对象的特性：**
- 同一个对象里有两个相同的key → **后面的会覆盖前面的**
- 所以`page.manage.game.common`最终只包含第二个定义
- t('page.manage.game.common.totalProbability') 找不到key，返回key本身

**解决方案：**
1. 合并两个`common`定义成一个
2. 同时修改zh-cn.ts和en-us.ts
3. Rebuild admin前端

**修复后的结构：**
```typescript
game: {
  common: {
    // 第一组keys
    totalProbability: '总概率',
    expectedValue: '期望价值 / 次',
    balance: '自动平衡',
    // 第二组keys（合并进来）
    prizes: '奖品',
    settings: '设置',
    // ... 所有keys在同一个common对象里
  },
  tabs: { ... }
}
```

**经验教训：**
1. **i18n不工作 → 先检查messages object的实际内容**
   - 不要假设locale文件的内容就是runtime的内容
   - 用console.log(JSON.stringify(messages.value['zh-CN'].page.manage.game.common))

2. **重复的object key会覆盖**
   - TypeScript不会警告你（因为type定义可能没问题）
   - 需要手动检查locale文件的structure

3. **排查顺序很重要**
   - ❌ 从deployment、cache、build pipeline开始 → 浪费时间
   - ✅ 直接检查runtime的实际数据 → 快速定位问题

4. **添加debug console.log是最有效的**
   - 可以直接看到runtime的真实状态
   - 比猜测、重复rebuild更快

5. **Hardcode测试验证deployment pipeline**
   - 如果hardcode的text能显示 → deployment正常
   - 如果还是显示key → 浏览器cache或deployment问题

**完整的i18n troubleshooting流程（以后照这个来）：**
```bash
# Step 1: 验证locale文件存在
grep -n "your.i18n.key" apps/soybean-admin/src/locales/langs/zh-cn.ts

# Step 2: 在component里加debug
console.log('[Debug]', {
  locale: locale.value,
  messages: messages.value,
  specificKey: messages.value['zh-CN']?.your?.nested?.path,
  translation: t('your.i18n.key')
});

# Step 3: Rebuild并查看console输出
# 如果messages里没有这个key → locale文件有问题（重复定义、typo等）
# 如果messages里有这个key但t()返回key → i18n setup有问题

# Step 4: 修复locale文件
# 合并重复定义、修正typo等

# Step 5: Rebuild frontend
docker compose -f docker-compose.prod.yml build --no-cache admin
docker compose -f docker-compose.prod.yml up -d admin
```

**防止类似问题：**
1. 编辑locale文件时，搜索是否已经存在这个key
   ```bash
   grep -n "common: {" apps/soybean-admin/src/locales/langs/zh-cn.ts
   ```
2. 考虑使用linter检查重复的object keys
3. 添加到git pre-commit hook检查

**这个case的关键点：**
- 🔍 花了2小时才找到根本原因
- 💡 最终是通过console.log messages object内容发现的
- 📝 **这是最经典的"看起来应该work但不work"的问题**
- 🎯 以后类似问题：直接检查runtime data，不要猜测

---

**下次类似改动，直接执行上面的命令，不需要重复诊断。**

---

### 2026-02-01: 音效三模式labels使用hard-coded中文

**症状：**
- 音效上传三模式的radio labels显示中文，但应该支持多语言（i18n）
- 代码里hard-coded了：
  - `🎵 使用主题默认音效`
  - `📤 自定义上传`
  - `🔇 不使用音效`

**问题：**
违反了i18n rule：所有UI labels必须使用i18n keys，不能hard-code任何语言。

**解决方案：**

**Step 1: 添加i18n keys到zh-cn.ts**
```typescript
// apps/soybean-admin/src/locales/langs/zh-cn.ts
effects: {
  // ... 其他keys
  audioModeTheme: '🎵 使用主题默认音效',
  audioModeCustom: '📤 自定义上传',
  audioModeNone: '🔇 不使用音效'
}
```

**Step 2: 添加i18n keys到en-us.ts**
```typescript
// apps/soybean-admin/src/locales/langs/en-us.ts
effects: {
  // ... 其他keys
  audioModeTheme: '🎵 Use Theme Default',
  audioModeCustom: '📤 Custom Upload',
  audioModeNone: '🔇 No Audio'
}
```

**Step 3: 更新ConfigForm.vue（两处）**
```vue
<!-- Before (hard-coded) -->
<span class="text-sm">🎵 使用主题默认音效</span>

<!-- After (i18n) -->
<span class="text-sm">{{ $t('page.manage.game.effects.audioModeTheme') }}</span>
```

**Files Modified:**
- `apps/soybean-admin/src/locales/langs/zh-cn.ts`
- `apps/soybean-admin/src/locales/langs/en-us.ts`
- `apps/soybean-admin/src/views/management/game-instance/components/ConfigForm.vue` (两处)

**Verification:**
```bash
# 验证i18n keys已添加
grep -n "audioMode" apps/soybean-admin/src/locales/langs/zh-cn.ts
grep -n "audioMode" apps/soybean-admin/src/locales/langs/en-us.ts

# 验证ConfigForm使用了$t()
grep -n "audioMode" apps/soybean-admin/src/views/management/game-instance/components/ConfigForm.vue
```

**经验教训：**
1. ✅ **任何新的UI text必须使用i18n keys**
2. ✅ **同时更新zh-cn.ts和en-us.ts**
3. ✅ **i18n keys的命名遵循规则：**
   - `page.manage.game.{section}.{fieldName}`
   - 保持一致性，方便维护

**i18n Rule Reminder:**
- ❌ 永远不要hard-code任何语言的text（包括中文）
- ✅ 所有UI labels必须通过$t()或t()调用
- ✅ 新增fields必须同时更新两个语言文件
- ✅ 完成后验证所有labels都有translation

---

## Case 3: ConfigForm新功能deploy后看不到（2026-01-31）

### 症状
- 添加了音效三模式UI（三个radio选项）
- Rebuild admin并deploy成功
- Bundle里能搜到新代码（"使用主题默认音效"）
- 但Admin Panel界面还是显示old UI（普通input field）
- **Hard refresh (Cmd+Shift+R) 也无效**

### 排查过程

**❌ 走的弯路：**
1. 怀疑browser cache → Hard refresh无效
2. 怀疑Cloudflare cache → 实际是server端的bundle已经是新的

**✅ 真正的问题：**
Audio fields (`bgmUrl`, `winSound`, `loseSound`, `jackpotSound`) 在**collapse-group**里作为nested items。

**代码结构：**
```vue
<!-- Main section render -->
<NFormItem v-else ...>
  <div v-else-if="item.type === 'file' && isAudioField(item.key)">
    <!-- ✅ 三模式UI (这里正确) -->
  </div>
</NFormItem>

<!-- Collapse-group nested render -->
<div v-else-if="item.type === 'collapse-group'">
  <NCollapse>
    <template v-for="subItem in item.items">
      <!-- ❌ 这里只有简化版render，没有audio三模式logic -->
      <NInput v-else v-model:value="formModel[subItem.key]" />
    </template>
  </NCollapse>
</div>
```

**Root Cause:**
- 在line 1229添加了audio三模式UI
- 但audio fields实际在collapse-group里 (line 1099-1155)
- Collapse-group有自己的subItems render code
- **Nested render里没有包含audio field的特殊处理**
- 所以所有type='file'都被fallback的`<NInput v-else>`catch了

### 解决方案

在collapse-group的nested render section (line 1143后) 添加audio field logic：

```vue
<NSwitch v-else-if="subItem.type === 'switch'" ... />

<!-- ✅ 添加这个section -->
<div v-else-if="subItem.type === 'file' && isAudioField(subItem.key)">
  <!-- 三模式UI (完整复制) -->
</div>

<NInput v-else v-model:value="formModel[subItem.key]" />
```

**完整流程：**
```bash
# 1. 修改ConfigForm.vue - 添加nested audio logic
# 2. Commit
git add apps/soybean-admin/src/views/management/game-instance/components/ConfigForm.vue
git commit -m "fix: 添加audio三模式到collapse-group nested fields"
git push origin main

# 3. Deploy
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "cd /opt/minigame && git pull origin main && \
   docker compose -f docker-compose.prod.yml build --no-cache admin && \
   docker compose -f docker-compose.prod.yml up -d"

# 4. Hard refresh browser
# Cmd+Shift+R (macOS) or Ctrl+Shift+R (Windows)
```

### Key Learnings

1. **检查字段在schema里的位置**
   - Main section fields vs nested collapse-group fields
   - 不同section可能有不同的render logic

2. **Conditional rendering要考虑所有render paths**
   - 不只是main section
   - 也要check nested structures (collapse-group, tabs等)

3. **Debug新UI不显示的checklist：**
   - ✅ Bundle里有新代码吗？（grep搜关键字）
   - ✅ Field在main section还是nested section？
   - ✅ Nested section的render logic包含新条件吗？
   - ✅ v-else-if的顺序对吗？（先检查special cases）

4. **Deploy verification：**
   ```bash
   # Check bundle包含新代码
   docker exec minigame-admin grep -c "关键字" /usr/share/nginx/html/assets/*.js
   
   # 如果count > 0 = 代码在bundle里
   # 如果UI还是旧的 = render logic问题，不是cache
   ```

### 防止类似问题

1. **添加新field type时，检查所有render sections：**
   - Main section (line 1190+)
   - Collapse-group nested (line 1105-1145)
   - 其他可能的nested structures

2. **考虑用component抽离render logic：**
   ```vue
   <AudioFieldRender :item="item" v-model="formModel[item.key]" />
   ```
   这样只需要维护一个地方

3. **Test checklist：**
   - [ ] 测试main section的field
   - [ ] 测试collapse-group里的field
   - [ ] 测试tab里的field（如果有）

---

**这个case的关键点：**
- 💡 Deploy成功 + bundle有新代码 ≠ UI正确显示
- 🎯 要考虑Vue template的render paths
- 📝 Nested structures (collapse-group, tabs等) 需要separate logic

---

**下次类似改动，记得check所有render sections！**

---

## 🐛 Case 9: 音效Preview按钮重叠播放 (2026-01-31)

### 症状
- 点击"预览"按钮播放音效
- 多次点击同一按钮 → 音效重叠播放，很吵
- 没有停止按钮
- 用户体验terrible

### 排查步骤
1. 检查preview按钮的click handler
2. 发现每次点击都创建new Audio()
3. 没有stop previous audio
4. 没有state tracking

### 根本原因
**只考虑"能播放"，没有考虑完整的用户体验**
- 功能work了，但UX terrible
- 没有apply User-Centric Thinking

### 解决方案
**实现完整的audio preview UX：**

```typescript
// State management
let currentAudio: HTMLAudioElement | null = null;
const audioPlayingStates = ref<Record<string, boolean>>({});

function toggleAudioPreview(key: string, url: string) {
  // If this audio is playing, stop it
  if (audioPlayingStates.value[key]) {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    audioPlayingStates.value[key] = false;
    return;
  }
  
  // Stop any currently playing audio
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    Object.keys(audioPlayingStates.value).forEach(k => {
      audioPlayingStates.value[k] = false;
    });
  }
  
  // Play new audio
  currentAudio = new window.Audio(url);
  audioPlayingStates.value[key] = true;
  
  currentAudio.play();
  
  // Auto reset when ended
  currentAudio.addEventListener('ended', () => {
    setTimeout(() => {
      audioPlayingStates.value[key] = false;
      currentAudio = null;
    }, 1500);
  });
}

function getPreviewButtonText(key: string, isTheme: boolean): string {
  if (audioPlayingStates.value[key]) {
    return '⏸️ 停止';
  }
  return isTheme ? '▶️ 预览主题音效' : '▶️ 预览';
}
```

**完整的用户体验：**
- 点击"预览" → 播放 + 按钮变"⏸️ 停止"
- 再点击 → 停止 + 恢复按钮
- 多次点击 → toggle behavior，不重叠
- 点击另一个预览 → 停止当前，播放新的
- 播放结束 → 1.5秒后自动恢复按钮

### 教训
**User-Centric Thinking不是可选的：**
- ❌ 不要只问"功能work了吗？"
- ✅ 要问"用户体验好吗？会不会烦？"
- ✅ 想象完整的interaction flow
- ✅ Complete user flow > Just working code

**DJ的教导：**
> "这样才是真的user-centric thinking的behavior"

---

## 🐛 Case 10: 选择Radio后UI不更新 (2026-01-31)

### 症状
- 点击radio选择"自定义上传"
- UI没有立即显示上传按钮
- 需要关闭collapse再打开才显示

### 排查步骤
1. 检查v-if condition → 正确
2. 检查`getAudioMode()` → 看起来对
3. 发现`getAudioMode()`调用`initAudioMode()`
4. `initAudioMode()`只在`!audioModes.value[key]`时初始化
5. **用户点radio后，audioModes已存在，不重新检测formModel！**

### 根本原因
**Cache导致reactivity失效：**

```typescript
// 错误的方式：
function initAudioMode(key: string) {
  if (!audioModes.value[key]) {  // Cache hit后不再更新！
    const value = formModel.value[key];
    // ... derive mode from value
    audioModes.value[key] = mode;
  }
}

function getAudioMode(key: string) {
  initAudioMode(key);
  return audioModes.value[key];  // 返回cached值
}
```

**Flow：**
1. 用户点radio → `setAudioMode()`设置formModel
2. v-if调用`getAudioMode()` → `initAudioMode()`
3. `audioModes[key]`已存在（cache hit）
4. 不重新从formModel derive → 返回旧值
5. UI不更新！

### 解决方案
**Always derive from formModel (reactive):**

```typescript
function getAudioMode(key: string): 'theme' | 'custom' | 'none' {
  // Always derive from formModel current value (reactive!)
  const value = formModel.value[key];
  
  if (!value || value === '' || value === null) {
    return 'none';
  } else if (value === '__THEME_DEFAULT__' || value.includes('/templates/')) {
    return 'theme';
  } else if (value === '__CUSTOM_PENDING__' || !value.startsWith('__')) {
    return 'custom';
  }
  
  return 'none';
}
```

**不再cache，直接根据当前值判断 → 完全reactive ✓**

### 教训
- Vue的reactivity依赖ref的value改变
- Cache会破坏reactivity chain
- Computed/derived values应该always从source derive
- 不要为了"性能"牺牲reactivity（这种derive很cheap）

---

## 🐛 Case 11: File Picker显示错误的文件类型 (2026-01-31)

### 症状
- 点击"上传音效文件"
- File picker显示"Image Files"而不是audio files
- Accept attribute明明改成了`audio/*`

### 排查步骤（走的弯路）
1. ❌ 怀疑是macOS的问题 - DJ提醒：都是浏览器！
2. ❌ 怀疑是MIME type不认识 - 改成`.mp3,.wav`也不work
3. ❌ 怀疑是浏览器cache - 加`:key`强制re-render也不work
4. ✅ **检查timing：什么时候click()的？**

### 根本原因（终于找到了！）
**Vue reactivity是异步的，DOM还没更新就click了：**

```typescript
// 错误的代码：
function triggerUpload(..., accept) {
  currentUploadTarget.value = { ..., accept };  // 设置新accept
  uploadRef.value.click();  // 立即点击 ❌
}
```

**问题flow：**
1. 设置`currentUploadTarget.value = { accept: 'audio/*' }`
2. 立即`click()` file input
3. 但Vue的reactivity是**异步的**！
4. `:accept`绑定还没更新到DOM
5. File picker用的是**旧的accept值**（'image/*'）
6. 显示Image Files！

### 解决方案
**使用`nextTick()`等待DOM更新：**

```typescript
import { nextTick } from 'vue';

async function triggerUpload(..., accept) {
  currentUploadTarget.value = { key, name, category, item, accept };
  
  // Wait for Vue to update the DOM
  await nextTick();  // ⚠️ 关键！
  
  // Now accept attribute is updated
  if (uploadRef.value) {
    uploadRef.value.value = '';
    uploadRef.value.click();  // ✓ 现在accept已更新
  }
}
```

**Accept attribute也同时提供MIME types和extensions：**
```
'audio/*,audio/mpeg,audio/wav,audio/ogg,audio/mp4,.mp3,.wav,.ogg,.m4a,.aac'
```

### 教训
**问题不在浏览器，而在我的代码timing！**

- Vue的DOM更新是异步的（micro-task queue）
- 修改ref后不会立即更新DOM
- 需要`nextTick()`等待下一个tick
- 这种timing bug很难发现，因为"看起来应该work"

**DJ的提醒很对：**
> "不管是macOS还是Windows应该都不是真正的回答，因为我们都是用browser啊"

---

## 🐛 Case 12: __CUSTOM_PENDING__显示给用户 (2026-01-31)

### 症状
- 选择"自定义上传"
- Input显示`__CUSTOM_PENDING__`
- Terrible UX - 用户会困惑

### 根本原因
**Internal placeholder value暴露给用户：**
- 用`__CUSTOM_PENDING__`区分"custom mode未上传"和"不使用音效"
- 但直接用`v-model`绑定formModel
- 用户看到了internal implementation detail

### 解决方案
**用computed :value，不显示internal值：**

```vue
<NInput 
  :value="formModel[key] === '__CUSTOM_PENDING__' ? '' : formModel[key]" 
  placeholder="请上传音效文件" 
  size="small" 
  readonly>
  <template #prefix>🎵</template>
</NInput>
```

**显示：**
- Internal value是`__CUSTOM_PENDING__` → 用户看到**空字符串**
- 已上传的URL → 用户看到**实际URL**
- Placeholder提示："请上传音效文件"

### 教训
**User-Centric Principle：**
- 不要显示internal implementation details给用户
- 用友好的placeholder text引导用户
- 永远从用户角度检查UI

---

## 📚 音效系统完整troubleshooting总结 (2026-01-31)

这次音效三模式功能遇到的所有问题和解决方案：

### 问题列表
1. ✅ Preview按钮重叠播放（Case 9）
2. ✅ Radio切换UI不更新（Case 10）
3. ✅ File picker显示错误类型（Case 11）
4. ✅ Internal value显示给用户（Case 12）
5. ✅ 条件隐藏选项没生效（需要refresh schema）

### 核心教训
1. **User-Centric Thinking是强制的**
   - 不要只问"work了吗"
   - 要问"体验好吗？会不会烦？"

2. **Vue Reactivity的陷阱**
   - Cache会破坏reactivity
   - DOM更新是异步的，需要nextTick
   - Always derive from source

3. **完整的测试不只是"功能work"**
   - 测试完整的interaction flow
   - 测试edge cases和timing
   - 测试从用户角度的体验

4. **Project文档必须up-to-date**
   - 每次修改立即更新FEATURES.md
   - 记录所有遇到的问题到TROUBLESHOOTING.md
   - 这不是可选的，是强制的

### 工作流程（强制）
```
理解需求（完整）
  ↓
分析所有相关代码（frontend + backend）
  ↓
设计完整方案（列出所有需要修改的地方）
  ↓
Self-verify logic
  ↓
一次性修改所有地方
  ↓
测试验证（包括UX）
  ↓
立即更新project文档 ⚠️ 强制！
  ↓
Commit（代码 + 文档一起）
```

**如果忘记任何一步 → 回到这个文档review！**


---

## 彩纸效果 - Emoji不显示（2026-01-31已解决）

**症状：**
- 颜色彩纸能显示
- 但emoji彩纸看不到（虽然console显示emoji shapes创建成功）
- Console可能显示：`confetti.shapeFromText is not a function` 或 shapes创建成功但不渲染

**原因：**
Emoji字符串包含 **variation selectors**（变体选择符）：
- `U+FE0F` (VS16) - 彩色emoji表示
- `U+FE0E` (VS15) - 文本emoji表示
- 例如：`⭐️` 实际是 `⭐` + `U+FE0F`

这些隐藏字符可能导致 `canvas-confetti` 的 `shapeFromText` API失败或不能正确渲染。

**解决方案：**

在创建emoji shapes之前，清理variation selectors：

```typescript
// spin-wheel.template.ts
let emojis = config.confettiEmojis.split(',').map(e => e.trim()).filter(e => e);

// Remove variation selectors (U+FE0F, U+FE0E)
emojis = emojis.map(e => e.replace(/[\uFE0E\uFE0F]/g, ''));

// Now create shapes
const emojiShapes = emojis.map(emoji => 
    confetti.shapeFromText({ text: emoji, scalar: 3 })
);
```

**相关文件：**
- `apps/api/src/modules/game-instances/templates/spin-wheel.template.ts` (Line ~1305)
- `apps/soybean-admin/src/views/management/game-instance/components/ConfigForm.vue` (预览功能)

**如何验证修复：**

1. Console应该显示：
   ```
   Created shape for: 🎉 {type: 'bitmap', bitmap: ImageBitmap, matrix: Array(6)}
   ```

2. 游戏页面应该能看到emoji和颜色彩纸一起飞出来

**其他注意事项：**
- Canvas-confetti版本必须 >= 1.9.3（早期版本不支持emoji）
- Emoji scalar建议设置3-4（太大可能太突兀）
- 可以添加 `startVelocity`, `gravity`, `ticks` 等选项调整效果

**Debug步骤：**
1. 检查Console - 有没有 `shapeFromText` 错误？
2. 检查shapes创建 - `Created shape for` logs显示什么？
3. 检查canvas-confetti版本 - 是否 >= 1.9.3？
4. 检查emoji字符串 - 有没有variation selectors？


---

## 🐛 Case 13: 游戏状态显示系统 - API rebuild后frontend没更新 (2026-02-01)

### 问题描述
修改了API的`getPlayerStatus()`返回结构，添加了`oneTimeOnly`, `hasPlayedEver`, `timeLimitConfig`等新字段。API rebuild后，frontend看到的还是旧数据（Console显示`DailyLimit: 5`而不是新字段）。

### 排查步骤
1. ✅ 检查数据库 - 配置正确（`oneTimeOnly: true`）
2. ✅ 检查API代码 - 修改已存在
3. ✅ 检查API rebuild - 已rebuild
4. ❌ 检查Frontend rebuild - **没有rebuild！**

### 根本原因
**只rebuild了API容器，忘记rebuild web-app容器。**

Frontend的JavaScript bundle是cached的，即使API返回了新字段，frontend的旧代码不知道如何处理这些字段。

### 解决方案
**当修改API response结构时，必须同时rebuild frontend：**
```bash
docker compose -f docker-compose.prod.yml build --no-cache api web-app
docker compose -f docker-compose.prod.yml up -d
```

### 为什么需要rebuild frontend？
- Frontend的TypeScript代码编译成JavaScript bundle
- 如果frontend有新的logic来处理API的新字段，需要重新编译
- 即使只改了API，如果frontend要显示新字段，也必须rebuild

### 🎓 教训
**修改了什么 → rebuild什么：**
- ✅ 只改Frontend UI → rebuild web-app
- ✅ 只改Backend logic（不改API结构）→ rebuild api
- ⚠️ 改了API response结构 → rebuild **both** api and web-app
- ⚠️ 不确定？ → rebuild all（安全但慢）

---

## 🐛 Case 14: Live Preview看不到游戏状态 (2026-02-01)

### 问题描述
Admin在Admin Panel点击"预览"按钮，Live Preview窗口中看不到游戏状态信息（oneTimeOnly、时间限制、次数等）。但正常游戏页面可以看到。

### 排查步骤
1. 检查API - 有返回status数据 ✅
2. 检查`v-if`条件 - **发现问题！**

### 根本原因
```vue
<!-- 旧代码（错误） -->
<div v-if="gameStatus && !isPreview" ...>

<!-- isPreview=true时不显示status -->
```

**设计缺陷：** Admin需要在preview模式验证配置效果，但旧逻辑阻止了显示。

### 解决方案
**移除 `!isPreview` 条件：**
```vue
<!-- 新代码（正确） -->
<div v-if="gameStatus" ...>
```

**同时修改fetch逻辑：**
```javascript
// 旧逻辑（错误）
if (isPreview.value || !authStore.token) return;

// 新逻辑（正确）
if (!authStore.token || !instanceSlug.value) return;
```

### 好处
- ✅ Admin在preview可以立即看到配置效果
- ✅ 修改"仅限一次"、"时间限制"等配置可以实时验证
- ✅ 不需要publish后才能测试

### 🎓 教训
**Preview不是"残缺版"，是"验证工具"：**
- ✅ Preview应该显示完整的功能（除了真实数据）
- ✅ Admin需要验证配置正确性
- ❌ 不要用`!isPreview`隐藏重要信息

---

## 🐛 Case 15: 前端文字中英混合 (2026-02-01)

### 问题描述
游戏页面显示的文字有中文有英文：
- "⚠️ 仅限一次 (已使用)"
- "📅 周一、周二、周三 10:00-20:00"
- "冷却中... 1m 30s"
- "等级不足！需要 Lv5"

用户体验不一致。

### DJ的要求
> "为什么前端是又华文，又英文的？全部都统一英文就好。这个是给予前端而已，不必太多语言。后期要改才打算。限制全部都统一前端是英文。"

### 解决方案

**1. Status Display (index.vue):**
```vue
<!-- 旧 -->
<span>⚠️ 仅限一次</span>
<span v-if="hasPlayedEver">(已使用)</span>

<!-- 新 -->
<span>⚠️ One Time Only</span>
<span v-if="hasPlayedEver">(Used)</span>
```

**2. Day Names:**
```javascript
// 旧
const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// 新
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
```

**3. Block Reason Messages:**
```javascript
// 旧
'等级不足！需要 Lv5'
'活动尚未开始'
'今日不开放'
'您已经玩过此游戏，每人仅限一次机会'
'冷却中... 1m 30s'

// 新
'Level too low! Need Lv5'
'Event not started yet'
'Not available today'
'Already played (one time only)'
'Cooldown: 1m 30s'
```

**修改位置：**
- `apps/web-app/src/views/game/index.vue` - Status display
- `apps/api/src/modules/game-instances/templates/spin-wheel.template.ts` - Game engine messages

### 国际化策略
- ✅ **Frontend (用户端):** 统一英文
- ✅ **Admin backend:** 保持中文
- ✅ 未来需要多语言 → 用i18n框架（不要硬编码）

### 🎓 教训
**语言一致性原则：**
- ✅ 选择一个语言（英文）并保持一致
- ✅ 不要混用中英文 - 造成用户困惑
- ✅ Admin和用户可以用不同语言（职责不同）
- ✅ 未来扩展时用i18n框架，不要直接改代码

---



---

## 🐛 Case 11: 赢奖品同时加分 (Double Counting) (2026-02-13)

### 症状
- 玩家玩转盘，转到了 "Cash $10"。
- 预期：获得 $10 现金（待审核），积分余额不变（或只扣除成本）。
- 实际：获得 $10 现金记录 **PLUS** 积分余额增加了 10 分。
- 只有 "Points" 类型的奖品才应该加分。

### 根本原因
`ScoresService.submit()` 里的逻辑缺陷：
```typescript
// 旧逻辑
const finalPoints = scoreValue * multiplier;
await membersService.updatePoints(memberId, finalPoints - cost); // 无条件加分！
```
它把所有游戏结果都当成了"得分"，忽略了这次结果可能是一个"奖品"（Prize），而奖品的价值（value）不一定是积分。

### 解决方案
修改 `ScoresService`，区分 **纯得分** 和 **赢奖品**：

```typescript
// 新逻辑
let netPointsChange = -costPerSpin; // 先扣成本

// 只有当没有奖品索引（纯得分游戏）时，才把分数加到余额
if (metadata?.prizeIndex === undefined) {
    netPointsChange += finalPoints;
}

// 如果属于奖品（prizeIndex exists），则由 PrizeStrategyService 处理
// PrizeStrategyService 会根据类型决定是否加分（例如 'points' 类型会加，'cash' 类型不加）
```

**Files Modified:** `apps/api/src/modules/scores/scores.service.ts`

---

## 🐛 Case 12: Member Detail Page Error "$t is not defined" (2026-02-13)

### 症状
- Admin 点击会员详情页。
- 页面空白或报错。
- Console 显示：`ReferenceError: $t is not defined`.

### 根本原因
- 在 `<script setup>` 或 render function 里直接使用了 `$t`，但没有 import。
- Vue template 里可以直接用 `$t`，但在 script 里必须显式引入。

### 解决方案
```typescript
import { $t } from '@/locales';
```

**Files Modified:** `apps/soybean-admin/src/views/games/member-detail/[id].vue`

---

## 🐛 Case 13: 奖品配置乱码 (Mojibake) (2026-02-13)

### 症状
- 奖品配置里的 Emoji 显示为乱码（如 `Ã°Å¸âEXT`）。
- 导致前端显示崩坏。

### 根本原因
- 文件曾经被以错误的编码保存（UTF-8 被误读为 Windows-1252 或类似，然后再保存）。
- 这里是源代码级别的损坏。

### 解决方案
- 使用脚本或手动修复源代码文件。
- 确保编辑器使用 UTF-8 NO BOM 格式。
- 修复了 `ConfigForm.vue` 和 `SeedService.ts` 里的所有硬编码乱码。

---
## 🛡️ BUG-002: Cross-Tenant Data Leak (Tenant Isolation)

**Implementation Date:** 2026-02-14  
**Status:** Fixed ✅

### 症状
- 管理员可以通过手动修改 URL 或 API 参数（如 `?companyId=XYZ`）访问他不属于的公司的数据。
- 物理奖品列表泄露了所有公司的全量数据，没有按公司过滤。
- 玩家可以通过修改 slug 提交分数到其他公司的游戏实例。

### 根本原因
- **缺少强制过滤：** 控制层（Controllers）过于依赖参数，而没有交叉校验 JWT 中的 `companyId`。
- **JWT 属性不一致：** 在 `JwtStrategy` 中，普通会员使用 `companyId`，但 Admin/Staff 使用 `currentCompanyId`，导致部分控制器读取了错误的属性而绕过了过滤。
- **全局查询：** 部分 `find()` 操作没有带上 `where: { companyId }` 条件。

### 解决方案
- **属性标准化：** 统一在 Admin 控制器中使用 `req.user.currentCompanyId`。
- **显式所有权校验：** 在 `getOne`, `update`, `delete` 等操作中，先查询资源，然后对比 `resource.companyId === req.user.currentCompanyId`。
- **参数注入：** 在 `getAll` 类操作中，强制覆盖或追加 `companyId` 过滤条件。
- **Super Admin 例外：** 仅当 `isSuperAdmin: true` 时才允许通过 QueryParams 手动指定 `companyId`。

### 🎓 教训
- **Trust But Verify：** 永远不要信任客户端提供的 ID 或 Slug。
- **Defense in Depth：** 即使前端隐藏了按钮，后端 API 也必须进行所有权校验。
- **Consistency is Key：** JWT 载荷的各种属性必须在整个项目中保持一致的业务逻辑含义。

---
