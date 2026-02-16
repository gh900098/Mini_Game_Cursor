# MiniGame Troubleshooting and FAQ

**Principle: Use the minimum amount of tokens to accomplish the maximum amount of work.**

---

### Issue 14: Sync Parameters Missing from Admin UI

**Cause:** Omitted during the refactor of the Company edit form into a tabbed interface.

**Symptoms:**
- Administrators cannot see the "Custom API Parameters" section.
- Sync jobs fail to use necessary parameters (e.g., `agent_id`).

**Solution (Fixed - 2026-02-16):**
- Restored the dynamic key-value editor under the **Sync Settings** tab.
- Added per-sync-type parameter support (Members, Deposits, Withdrawals).
- Parameters are now correctly persisted in `jk_config.syncConfigs[type].syncParams`.

---

## 🚀 Standard Operating Procedures (SOP)

### When modifying frontend code (`web-app` or `admin`):

```bash
# Step 1: Local commit and push
cd ~/Documents/MiniGame
git add -A
git commit -m "Describe changes"
git push origin main

# Step 2: Pull and rebuild on the server
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "cd /opt/minigame && git pull origin main && \
   docker compose -f docker-compose.prod.yml build --no-cache web-app admin && \
   docker compose -f docker-compose.prod.yml up -d web-app admin"
```

### When modifying backend code (`api`):

```bash
# Step 1: Local commit and push (same as above)

# Step 2: Pull and rebuild API on the server
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "cd /opt/minigame && git pull origin main && \
   docker compose -f docker-compose.prod.yml up -d --force-recreate api"
```

### ⚠️ Critical Principles:

1. **Changes to translation files or configuration interfaces** → MUST rebuild both `admin` and `web-app`.
2. **Changes only to API logic** → ONLY need to restart `api`.
3. **Do not forget `--no-cache`** → To ensure the latest code is used.

---

## 🐛 Common Issues and Solutions

### Issue 1: New features not appearing in the browser

**Cause:** The browser has cached old JS/CSS files.

**Solution:**
1. User-side: Perform a hard refresh (Ctrl+Shift+R or Cmd+Shift+R).
2. Alternatively: Completely clear the browser cache.
3. Alternatively: Test in Incognito/Private mode.

**Prevention:** This cannot be prevented as it is standard browser behavior.

---

### Issue 2: Admin Panel configuration options are not updating

**Cause:** The API schema or translation files were modified, but the Admin Panel was not rebuilt.

**Symptoms:**
- New configuration options are not visible.
- Translation text is outdated.
- The configuration interface layout has not changed.

**Solution:**
```bash
# Both API and Admin must be rebuilt simultaneously
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "cd /opt/minigame && git pull origin main && \
   docker compose -f docker-compose.prod.yml build --no-cache api admin && \
   docker compose -f docker-compose.prod.yml up -d api admin"
```

**Prevention:** 
- Modified `seed.service.ts` → Rebuild API + Admin.
- Modified `locales/` translation files → Rebuild Admin.
- Modified `typings/app.d.ts` → Rebuild Admin.

---

### Issue 3: Older game instance configurations are not updating

**Cause:** The schema was modified (configuration items added or removed), but the configurations for old instances are already saved in the database.

**Symptoms:**
- Newly created games reflect the new configuration.
- Old games still display deleted configuration items.

**Solution (User Action):**
1. Edit the old game instance.
2. Toggle off the unneeded configuration items.
3. Save.

**Solution (Batch Database Update):**
```bash
# Example: Removing the 'clickToSpin' configuration from all games
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "docker exec minigame-postgres psql -U postgres -d minigame \
   -c \"UPDATE game_instances SET config = config - 'clickToSpin' WHERE config ? 'clickToSpin';\""
```

**Prevention:** 
- Consider backward compatibility when designing a schema.
- Alternatively, provide database migration scripts.

---

### Issue 4: Modifications to `seed.service.ts` are not reflecting in the Admin Panel

**Cause:** `seed.service.ts` only runs during initialization; game templates are already stored in the database.

**Symptoms:**
- `seed.service.ts` has been modified.
- The API has been rebuilt.
- Configuration options in the Admin Panel remain outdated.

**Solution: Re-run the seed script**
```bash
# Method 1: Via the API endpoint
curl -X POST https://api.xseo.me/api/seed/run -H "Content-Type: application/json"

# Method 2: Via SSH
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "curl -X POST http://localhost:3100/api/seed/run -H 'Content-Type: application/json'"
```

**Note:**
- Re-running the seed script updates the **game templates**.
- It **does not** update already created game instances.
- Newly created games will use the new template.
- Existing games must be manually edited or recreated.

**Prevention:**
- Remember to run `/api/seed/run` after modifying `seed.service.ts`.
- Alternatively, automate this in your deployment script.

---

### Issue 5: Game locking rules are not working (users can play directly)

**Cause:** Race condition - the game iframe allows user interactions before receiving the lock status from the backend.

**Symptoms:**
- Level or time restrictions are configured in the backend.
- `console.log` shows `[GameRules] Status updated: {canPlay: false, blockReason: 'LEVEL_TOO_LOW'}`.
- However, users are still able to play the game.

**Technical Details:**
```javascript
// Incorrect implementation (legacy code):
let canPlay = true;  // ← Defaults to true!

// User can click immediately → spin() checks canPlay (true) → game starts
// Backend sends status later → canPlay updates to false → but it's too late!
```

**Solution (Fixed - 2026-02-01):**
```javascript
// Correct implementation (new code):
let canPlay = false;  // ← Defaults to false, a safe default

// Page loads → button disabled, displays "LOADING..."
// Backend sends status → canPlay updates
//   - If true → button enabled, "TAP TO SPIN"
//   - If false → button remains disabled, shows locking reason
```

**Modification Location:**
- `apps/api/src/modules/game-instances/templates/spin-wheel.template.ts`
  - Line ~783: Changed `canPlay` default value to `false`.
  - Line ~758: Changed initial button state to `disabled`.
  - Line ~1651: Updates the status message upon receiving a status update.

**Commit:** `796e4ba` - "fix: Race condition - game starts before lock status arrives"

**Lessons Learned:**
- Secure default values are critical!
- Features requiring permissions should be disabled by default, not allowed.
- Consider timing issues in asynchronous communications.
- Always assume `postMessage` will have latency.

**Prevention:**
- Any feature requiring backend confirmation should be disabled/locked by default.
- Do not assume `postMessage` will arrive immediately.
- Use a "LOADING..." state instead of pretending to be ready.

---

### Issue 6: Docker container not using the latest code

**Cause:** Docker is using an outdated build cache.

**Symptoms:**
- Code has been pushed to GitHub.
- `git pull` was successful on the server.
- However, the code within the container remains outdated.

**Solution:**
```bash
# Use --no-cache to force a clean rebuild
docker compose -f docker-compose.prod.yml build --no-cache <service>
```

**Prevention:** 
- Always append `--no-cache` to rebuild commands.
- Do not rely on Docker's cache.

---

### Issue 7: Modified only one service, but rebuilt all of them

**Cause:** No service name was specified in the build command.

**Incorrect Example:**
```bash
# ❌ This will rebuild all services (waste of time)
docker compose -f docker-compose.prod.yml build --no-cache
```

**Correct Example:**
```bash
# ✅ Rebuild only the necessary service
docker compose -f docker-compose.prod.yml build --no-cache web-app
```

**Prevention:** 
- Explicitly specify the service name.
- Understand which code changes affect which services.

---

## 📋 Code Change → Service Mapping Table

| Modification Location | Services to Rebuild | Remarks |
|---------|------------------|------|
| `apps/api/src/` | `api` | Backend logic |
| `apps/web-app/src/` | `web-app` | Game frontend |
| `apps/soybean-admin/src/` | `admin` | Admin Panel frontend |
| `apps/api/src/modules/seed/` (schema) | `api` + `admin` | ⚠️ Admin MUST be rebuilt to render the new schema |
| `apps/soybean-admin/src/locales/` | `admin` | Translation files |
| `apps/soybean-admin/src/typings/` | `admin` | TypeScript definitions |
| `docker-compose.prod.yml` | Affected services | Configuration changes |
| `.env.production` | Affected services | Environment variables (usually only a restart is needed) |

**⚠️ Special Note:**
After modifying `seed.service.ts`:
1. Rebuild API → Update backend schema.
2. **MUST** rebuild Admin → Ensure frontend correctly renders the new configuration.
3. Re-run seed → Update database templates.
4. Create a new game → Verify results.

---

## 🔧 Quick Check Commands

### Verify that services are running
```bash
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker ps | grep minigame"
```

### Verify that the code is up to date
```bash
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "cd /opt/minigame && git log --oneline -3"
```

### View container logs
```bash
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker logs minigame-api --tail 50"
```

### Test API accessibility
```bash
curl -s https://api.xseo.me/api | head -c 100
```

### Test Admin/Web-app accessibility
```bash
curl -I https://admin.xseo.me
curl -I https://game.xseo.me
```

---

## 💡 Token Saving Principles

### ❌ DO NOT:
1. Repeatedly check server status.
2. Run the same diagnostic commands multiple times.
3. Repeatedly explain the same concepts.
4. Build services that do not require updates.

### ✅ SHOULD:
1. Directly follow the SOP.
2. Only diagnose when an error occurs.
3. Record issues and their solutions.
4. Build only the services that need updating.

### 📝 Recording Principles:
1. Encounter a new issue → Record it immediately in this file.
2. Find a solution → Update the corresponding section.
3. Identify a pattern → Add it to the SOP.
4. Gain experience → Update the principles.

---

## 🎯 Deployment Issue Records

### 2026-01-30: Adding Sound Effect Button Feature

**Changes:**
1. Added a floating sound effect button (`web-app`).
2. Removed the "Click to Spin" configuration (`API seed.service.ts`).
3. Added sound effect button configuration options (`API + Admin`).

**Issues Encountered:**
1. ✅ Rebuilt only the API and `web-app`, forgetting the Admin Panel.
2. ✅ Browser caching prevented users from seeing the new feature.

**Solutions:**
1. Rebuilt the Admin Panel (to include translation files and schema changes).
2. Reminded users to clear their browser cache.

**Lessons Learned:**
- Modified schema → MUST build both API + Admin.
- Modified translation files → MUST rebuild Admin.
- Frontend changes → Remind users to clear their cache.

**Complete Deployment Commands:**
```bash
cd ~/Documents/MiniGame
git add -A
git commit -m "feat: added sound effect button configuration (show/hide + opacity)"
git push origin main

sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "cd /opt/minigame && git pull origin main && \
   docker compose -f docker-compose.prod.yml build --no-cache api admin web-app && \
   docker compose -f docker-compose.prod.yml up -d api admin web-app"
```

---

### 2026-01-31: i18n Translation Not Reflecting - Raw Keys Displayed instead of Translated Text

**Symptoms:**
- Admin Panel displays `page.manage.game.common.totalProbability` instead of "Total Probability".
- Other i18n keys are working normally.
- Locale is set correctly (`zh-CN`).
- Console shows `availableLocales` includes `zh-CN` and `en-US`.

**Initial Investigation (Detours Taken):**
1. ❌ Checked if locale files existed → `zh-cn.ts` and `en-us.ts` were both present.
2. ❌ Checked i18n setup → `createI18n` was configured correctly.
3. ❌ Checked deployment → Code had been successfully pushed and pulled.
4. ❌ Forced a `--no-cache` rebuild → No change.
5. ❌ Tested with hardcoded English → Proved that the deployment pipeline was functioning correctly.
6. ❌ Checked if Chinese translations were bundled → `grep "Total Probability"` found the file.

**Actual Diagnostic Steps (Effective):**
1. ✅ Added `console.log` in the component to inspect `messages.value`.
2. ✅ Expanded the console to view the keys of `pageManageGame.common`.
3. ✅ **Found the issue: The `common` object contained `prizes`, `settings`, `gameplay`... but NOT `totalProbability`!**
4. ✅ Searched `zh-cn.ts` and found **two `common:` definitions within the same `game` object.**

**Root Cause:**
```typescript
// zh-cn.ts (line 264)
game: {
  common: {
    totalProbability: 'Total Probability',
    expectedValue: 'Expected Value / Spin',
    balance: 'Auto Balance'
  },
  tabs: { ... },
  visuals: { ... },
  prizes: { ... },
  common: {  // ❌ Second common definition!
    prizes: 'Prizes',
    settings: 'Settings',
    // ... other keys
  }
}
```

**JavaScript Object Behavior:**
- In the same object, if two identical keys exist → **The latter overrides the former.**
- Therefore, `page.manage.game.common` ultimately only contained the second definition.
- `t('page.manage.game.common.totalProbability')` could not find the key and returned the key itself.

**Solution:**
1. Merged the two `common` definitions into one.
2. Updated both `zh-cn.ts` and `en-us.ts`.
3. Rebuilt the `admin` frontend.

**Fixed Structure:**
```typescript
game: {
  common: {
    // First set of keys
    totalProbability: 'Total Probability',
    expectedValue: 'Expected Value / Spin',
    balance: 'Auto Balance',
    // Second set of keys (merged in)
    prizes: 'Prizes',
    settings: 'Settings',
    // ... all keys within a single common object
  },
  tabs: { ... }
}
```

**Lessons Learned:**
1. **If i18n is not working → Check the actual contents of the `messages` object first.**
   - Do not assume that the contents of the locale files match the runtime contents.
   - Use `console.log(JSON.stringify(messages.value['zh-CN'].page.manage.game.common))`.

2. **Duplicated object keys will be overwritten.**
   - TypeScript will not warn you (as the type definition might still be valid).
   - Manually check the structure of the locale files.

3. **Ordering of troubleshooting steps is important.**
   - ❌ Starting with deployment, cache, or build pipelines → Waste of time.
   - ✅ Directly checking runtime data → Quickly pinpointing the issue.

4. **Adding debug `console.log` is most effective.**
   - Provides direct visibility into the runtime state.
   - Faster than guessing or repeated rebuilding.

5. **Hardcode tests to verify the deployment pipeline.**
   - If hardcoded text displays → Deployment is normal.
   - If it still displays the key → It's a browser cache or deployment issue.

**Complete i18n troubleshooting workflow (Follow this in the future):**
```bash
# Step 1: Verify the existence of the locale file
grep -n "your.i18n.key" apps/soybean-admin/src/locales/langs/zh-cn.ts

# Step 2: Add debug logs in the component
console.log('[Debug]', {
  locale: locale.value,
  messages: messages.value,
  specificKey: messages.value['zh-CN']?.your?.nested?.path,
  translation: t('your.i18n.key')
});

# Step 3: Rebuild and inspect the console output
# If the key is missing from messages → There's an issue with the locale file (duplicated definition, typo, etc.).
# If the key is present in messages but t() returns the key → There's an issue with the i18n setup.

# Step 4: Fix the locale file
# Merge duplicated definitions, fix typos, etc.

# Step 5: Rebuild frontend
docker compose -f docker-compose.prod.yml build --no-cache admin
docker compose -f docker-compose.prod.yml up -d admin
```

**Preventing similar issues:**
1. When editing locale files, check if the key already exists.
   ```bash
   grep -n "common: {" apps/soybean-admin/src/locales/langs/zh-cn.ts
   ```
2. Consider using a linter to detect duplicated object keys.
3. Add a check to the git pre-commit hook.

**Key takeaways from this case:**
- 🔍 It took 2 hours to find the root cause.
- 💡 The issue was eventually pinpointed by logging the `messages` object content.
- 📝 **This is a classic "looks correct but doesn't work" problem.**
- 🎯 Future similar issues: Directly inspect runtime data; do not guess.

---

**For future modifications of this nature, execute the above commands directly; no need for repeated diagnosis.**

---

### 2026-02-01: Hardcoded Chinese Labels in Audio Three-Mode Selection

**Symptoms:**
- The radio labels for audio upload modes were in Chinese, but they should support internationalization (i18n).
- Code contained hardcoded strings:
  - `🎵 Use Theme Default Audio`
  - `📤 Custom Upload`
  - `🔇 No Audio`

**Issue:**
Violated i18n rules: All UI labels must use i18n keys and cannot have hardcoded language.

**Solution:**

**Step 1: Add i18n keys to `zh-cn.ts`**
```typescript
// apps/soybean-admin/src/locales/langs/zh-cn.ts
effects: {
  // ... other keys
  audioModeTheme: '🎵 Use Theme Default',
  audioModeCustom: '📤 Custom Upload',
  audioModeNone: '🔇 No Audio'
}
```

**Step 2: Add i18n keys to `en-us.ts`**
```typescript
// apps/soybean-admin/src/locales/langs/en-us.ts
effects: {
  // ... other keys
  audioModeTheme: '🎵 Use Theme Default',
  audioModeCustom: '📤 Custom Upload',
  audioModeNone: '🔇 No Audio'
}
```

**Step 3: Update `ConfigForm.vue` (two locations)**
```vue
<!-- Before (hard-coded) -->
<span class="text-sm">🎵 Use Theme Default</span>

<!-- After (i18n) -->
<span class="text-sm">{{ $t('page.manage.game.effects.audioModeTheme') }}</span>
```

**Files Modified:**
- `apps/soybean-admin/src/locales/langs/zh-cn.ts`
- `apps/soybean-admin/src/locales/langs/en-us.ts`
- `apps/soybean-admin/src/views/management/game-instance/components/ConfigForm.vue` (two locations)

**Verification:**
```bash
# Verify that i18n keys were added
grep -n "audioMode" apps/soybean-admin/src/locales/langs/zh-cn.ts
grep -n "audioMode" apps/soybean-admin/src/locales/langs/en-us.ts

# Verify that ConfigForm uses $t()
grep -n "audioMode" apps/soybean-admin/src/views/management/game-instance/components/ConfigForm.vue
```

**Lessons Learned:**
1. ✅ **Any new UI text must use i18n keys.**
2. ✅ **Simultaneously update both `zh-cn.ts` and `en-us.ts`.**
3. ✅ **i18n key naming follows the rule:**
   - `page.manage.game.{section}.{fieldName}`
   - Maintains consistency and ease of maintenance.

**i18n Rule Reminder:**
- ❌ Never hardcode text in any language (including Chinese).
- ✅ All UI labels must be accessed via `$t()` or `t()`.
- ✅ New fields must update both language files at the same time.
- ✅ After completion, verify that all labels have translations.

---

## Case 3: `ConfigForm` New Features Not Visible After Deployment (2026-01-31)

### Symptoms
- Added audio three-mode UI (three radio selections).
- Rebuilt `admin` and deployed successfully.
- Search within the bundle finds the new code ("Use Theme Default Audio").
- However, the Admin Panel interface still shows the old UI (a plain input field).
- **Hard refresh (Cmd+Shift+R) also fails to work.**

### Troubleshooting Process

**❌ Detours Taken:**
1. Suspected browser cache → Hard refresh was ineffective.
2. Suspected Cloudflare cache → The server-side bundle was actually up-to-date.

**✅ The Real Issue:**
Audio fields (`bgmUrl`, `winSound`, `loseSound`, `jackpotSound`) are within a **collapse-group** as nested items.

**Code Structure:**
```vue
<!-- Main section render -->
<NFormItem v-else ...>
  <div v-else-if="item.type === 'file' && isAudioField(item.key)">
    <!-- ✅ Three-mode UI (Correct here) -->
  </div>
</NFormItem>

<!-- Collapse-group nested render -->
<div v-else-if="item.type === 'collapse-group'">
  <NCollapse>
    <template v-for="subItem in item.items">
      <!-- ❌ Only a simplified render exists here, without audio three-mode logic -->
      <NInput v-else v-model:value="formModel[subItem.key]" />
    </template>
  </NCollapse>
</div>
```

**Root Cause:**
- Audio three-mode UI was added around line 1229.
- However, audio fields are actually located within a `collapse-group` (lines 1099-1155).
- `collapse-group` has its own `subItems` rendering logic.
- **The nested rendering logic did not include special handling for audio fields.**
- Consequently, all `type='file'` items were caught by the fallback `<NInput v-else>`.

### Solution

Add the audio field logic to the nested rendering section of the `collapse-group` (after line 1143):

```vue
<NSwitch v-else-if="subItem.type === 'switch'" ... />

<!-- ✅ Add this section -->
<div v-else-if="subItem.type === 'file' && isAudioField(subItem.key)">
  <!-- Three-mode UI (Complete copy) -->
</div>

<NInput v-else v-model:value="formModel[subItem.key]" />
```

**Complete Workflow:**
```bash
# 1. Modify ConfigForm.vue - Add nested audio logic
# 2. Commit
git add apps/soybean-admin/src/views/management/game-instance/components/ConfigForm.vue
git commit -m "fix: added audio three-mode to collapse-group nested fields"
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

1. **Check the field's position in the schema**
   - Main section fields vs. nested `collapse-group` fields.
   - Different sections may have different rendering logic.

2. **Conditional rendering must account for all render paths**
   - Not just the main section.
   - Also check nested structures (`collapse-group`, tabs, etc.).

3. **Checklist for when the new UI is not displaying:**
   - ✅ Is there new code in the bundle? (grep for keywords)
   - ✅ Is the field in the main section or nested section?
   - ✅ Does the nested section's render logic include new conditions?
   - ✅ Is the v-else-if order correct? (check special cases first)

4. **Deploy verification:**
   ```bash
   # Check bundle for new code
   docker exec minigame-admin grep -c "keyword" /usr/share/nginx/html/assets/*.js
   
   # If count > 0 = Code is in the bundle
   # If UI is still old = render logic issue, not cache
   ```

### Preventing Similar Issues

1. **When adding a new field type, check all rendering sections:**
   - Main section (line 1190+)
   - Collapse-group nested (line 1105-1145)
   - Other possible nested structures

2. **Consider using a component to extract rendering logic:**
   ```vue
   <AudioFieldRender :item="item" v-model="formModel[item.key]" />
   ```
   This way you only need to maintain one place.

3. **Test checklist:**
   - [ ] Test fields in the main section.
   - [ ] Test fields within a `collapse-group`.
   - [ ] Test fields within a tab (if applicable).

---

**Key takeaway for this case:**
- 💡 Deploy successful + bundle has new code ≠ UI displaying correctly
- 🎯 Must consider Vue template render paths
- 📝 Nested structures (collapse-group, tabs, etc.) require separate logic

---

**Next time you make a similar change, remember to check all rendering sections!**

---

## 🐛 Case 9: Overlapping Playback from Audio Preview Buttons (2026-01-31)

### Symptoms
- Clicking the "Preview" button starts audio playback.
- Multiple clicks on the same button → Audio overlaps, creating noise.
- No stop button is provided.
- User experience is terrible.

### Troubleshooting Steps
1. Checked preview button click handler.
2. Discovered each click creates a `new Audio()`.
3. No mechanism to stop previous audio.
4. No state tracking implemented.

### Root Cause
**Only "making it work" was considered, without considering the full user experience.**
- The feature functioned, but the UX was terrible.
- User-Centric Thinking was not applied.

### Solution
**Implement full audio preview UX:**

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
    return '⏸️ Stop';
  }
  return isTheme ? '▶️ Preview Theme Audio' : '▶️ Preview';
}
```

**Full User Experience:**
- Click "Preview" → Playback starts + button becomes "⏸️ Stop".
- Click again → Stop + restore button text.
- Multiple clicks → Toggle behavior, no overlap.
- Click another preview → Stop current, play new.
- Playback ends → Automatically reset button text after 1.5 seconds.

### Lessons Learned
**User-Centric Thinking is not optional:**
- ❌ Don't just ask "Does the feature work?"
- ✅ Ask "Is the user experience good? Will it be annoying?"
- ✅ Imagine full interaction flows.
- ✅ Complete user flow > Just working code.

**DJ's Advice:**
> "Only this truly reflects user-centric thinking behavior."

---

## 🐛 Case 10: UI Does Not Update After Selecting Radio Option (2026-01-31)

### Symptoms
- Click a radio button to select "Custom Upload".
- UI does not immediately show the upload button.
- Collapse section needs to be closed and reopened for display.

### Troubleshooting Steps
1. Checked `v-if` condition → Correct.
2. Checked `getAudioMode()` → Appeared correct.
3. Discovered `getAudioMode()` calls `initAudioMode()`.
4. `initAudioMode()` only initializes when `!audioModes.value[key]`.
5. **After clicking the radio, `audioModes` already exists and doesn't re-detect `formModel`!**

### Root Cause
**Cache causing reactivity loss:**

```typescript
// The incorrect way:
function initAudioMode(key: string) {
  if (!audioModes.value[key]) {  // Prevents updates after cache hit!
    const value = formModel.value[key];
    // ... derive mode from value
    audioModes.value[key] = mode;
  }
}

function getAudioMode(key: string) {
  initAudioMode(key);
  return audioModes.value[key];  // Returns cached value
}
```

**Process Flow:**
1. User clicks radio → `setAudioMode()` updates `formModel`.
2. `v-if` triggers `getAudioMode()` → `initAudioMode()`.
3. `audioModes[key]` already exists (cache hit).
4. Does not re-derive from `formModel` → returns old value.
5. UI does not update!

### Solution
**Always derive from `formModel` (reactive):**

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

**No more caching, direct evaluation based on current value → fully reactive ✓**

### Lessons Learned
- Vue's reactivity depends on the change of `ref.value`.
- Caching breaks the reactivity chain.
- Computed/derived values should always be derived from the source.
- Do not sacrifice reactivity for "performance" (this derivation is very inexpensive).

---

## 🐛 Case 11: File Picker Displaying Incorrect File Types (2026-01-31)

### Symptoms
- Clicked "Upload Audio File".
- File picker displayed "Image Files" instead of audio files.
- The `accept` attribute had been changed to `audio/*`.

### Troubleshooting Steps (Detours Taken)
1. ❌ Suspected a macOS issue - DJ's reminder: "We all use browsers!"
2. ❌ Suspected unrecognized MIME types - Changed to `.mp3,.wav`, but it still didn't work.
3. ❌ Suspected browser cache - Added `:key` to force a re-render, but it didn't help.
4. ✅ **Checked timing: When was `click()` called?**

### Root Cause (Found it!)
**Vue reactivity is asynchronous; the click occurred before the DOM updated:**

```typescript
// Incorrect code:
function triggerUpload(..., accept) {
  currentUploadTarget.value = { ..., accept };  // Sets new accept
  uploadRef.value.click();  // Click immediately ❌
}
```

**Issue Flow:**
1. Set `currentUploadTarget.value = { accept: 'audio/*' }`.
2. Immediately `click()` the file input.
3. However, Vue's reactivity is **asynchronous**!
4. The `:accept` binding hasn't been updated in the DOM yet.
5. The file picker uses the **old accept value** ('image/*').
6. "Image Files" are displayed!

### Solution
**Use `nextTick()` to wait for the DOM to update:**

```typescript
import { nextTick } from 'vue';

async function triggerUpload(..., accept) {
  currentUploadTarget.value = { key, name, category, item, accept };
  
  // Wait for Vue to update the DOM
  await nextTick();  // ⚠️ Critical!
  
  // Now accept attribute is updated
  if (uploadRef.value) {
    uploadRef.value.value = '';
    uploadRef.value.click();  // ✓ Now accept is updated
  }
}
```

**The `accept` attribute also provides MIME types and extensions:**
```
'audio/*,audio/mpeg,audio/wav,audio/ogg,audio/mp4,.mp3,.wav,.ogg,.m4a,.aac'
```

### Lessons Learned
**The problem wasn't the browser; it was the code timing!**

- Vue's DOM updates are asynchronous (micro-task queue).
- Modifying a ref does not immediately update the DOM.
- `nextTick()` is required to wait for the next tick.
- This timing bug is hard to find because "it looks like it should work."

**DJ was right:**
> "Whether it's macOS or Windows isn't the real answer, because we're both using browsers."

---

## 🐛 Case 12: `__CUSTOM_PENDING__` displayed to the user (2026-01-31)

### Symptoms
- Select "Custom Upload".
- Input displays `__CUSTOM_PENDING__`.
- Terrible UX - user will be confused.

### Root Cause
**Internal placeholder value exposed to user:**
- Use `__CUSTOM_PENDING__` to distinguish between "custom mode not uploaded" and "do not use audio".
- But directly using `v-model` to bind `formModel`.
- User saw the internal implementation detail.

### Solution
**Use computed `:value`, do not display internal value:**

```vue
<NInput 
  :value="formModel[key] === '__CUSTOM_PENDING__' ? '' : formModel[key]" 
  placeholder="Please upload audio file" 
  size="small" 
  readonly>
  <template #prefix>🎵</template>
</NInput>
```

**Display:**
- Internal value is `__CUSTOM_PENDING__` → User sees **empty string**
- Uploaded URL → User sees **actual URL**
- Placeholder prompt: "Please upload audio file"

### Lessons Learned
**User-Centric Principle:**
- Do not display internal implementation details to the user.
- Use friendly placeholder text to guide the user.
- Always check the UI from the user's perspective.

---

## 📚 Audio System Complete Troubleshooting Summary (2026-01-31)

Summary of all issues and solutions encountered during the implementation of the three-mode audio feature:

### Issue List
1. ✅ Preview button overlapping playback (Case 9)
2. ✅ Radio switch UI not updating (Case 10)
3. ✅ File picker showing wrong type (Case 11)
4. ✅ Internal value displayed to user (Case 12)
5. ✅ Conditional hidden options not taking effect (requires schema refresh)

### Core Lessons
1. **User-Centric Thinking is mandatory**
   - Don't just ask "does it work"
   - Ask "is the experience good? Will it be annoying?"

2. **Vue Reactivity Traps**
   - Cache will break reactivity.
   - DOM updates are asynchronous, needing `nextTick`.
   - Always derive from the source.

3. **Complete testing is more than just "functionality work"**
   - Test the complete interaction flow
   - Test edge cases and timing
   - Test experience from user's perspective

4. **Project documentation must be up-to-date**
   - Update `FEATURES.md` immediately after each modification.
   - Record all encountered issues into `TROUBLESHOOTING.md`.
   - This is not optional, it's mandatory.

### Workflow (Mandatory)
```
Understand the requirements (Completely)
  ↓
Analyze all relevant code (Frontend + Backend)
  ↓
Design a complete solution (List all places needing modification)
  ↓
Self-verify logic
  ↓
Modify all places at once
  ↓
Test validation (including UX)
  ↓
Update project documentation immediately ⚠️ Mandatory!
  ↓
Commit (Code + Documentation together)
```

**If you forget any step → Return to this document for review!**


---

## Confetti Effect - Emoji Not Showing (Resolved 2026-01-31)

**Symptoms:**
- Colored confetti displays normally.
- However, emoji confetti is not visible (although the console indicates that emoji shapes were created successfully).
- Console may show: `confetti.shapeFromText is not a function` or shapes are created successfully but not rendered.

**Cause:**
Emoji strings contain **variation selectors**:
- `U+FE0F` (VS16) - For colored emoji representation.
- `U+FE0E` (VS15) - For text emoji representation.
- For example: `⭐️` is actually `⭐` + `U+FE0F`.

These hidden characters can cause the `canvas-confetti` `shapeFromText` API to fail or render incorrectly.

**Solution:**

Before creating emoji shapes, strip variation selectors:

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

**Related Files:**
- `apps/api/src/modules/game-instances/templates/spin-wheel.template.ts` (Line ~1305)
- `apps/soybean-admin/src/views/management/game-instance/components/ConfigForm.vue` (Preview feature)

**How to Verify the Fix:**

1. The console should display:
   ```
   Created shape for: 🎉 {type: 'bitmap', bitmap: ImageBitmap, matrix: Array(6)}
   ```

2. Emoji and colored confetti should fly out together on the game page.

**Other Considerations:**
- The `canvas-confetti` version must be >= 1.9.3 (earlier versions do not support emojis).
- Emoji `scalar` is recommended to be set to 3-4 (too large can be intrusive).
- Options like `startVelocity`, `gravity`, and `ticks` can be added to adjust the effect.

**Debug Steps:**
1. Check Console - Any `shapeFromText` errors?
2. Check shape creation - What do the `Created shape for` logs show?
3. Check `canvas-confetti` version - Is it >= 1.9.3?
4. Check emoji strings - Are there any variation selectors?


---

## 🐛 Case 13: Game Status Display System - Frontend Not Updating After API Rebuild (2026-02-01)

### Issue Description
Modified the API's `getPlayerStatus()` return structure, adding new fields: `oneTimeOnly`, `hasPlayedEver`, `timeLimitConfig`, etc. After the API was rebuilt, the frontend still saw the old data (Console displayed `DailyLimit: 5` instead of the new fields).

### Troubleshooting Steps
1. ✅ Checked Database - Configuration is correct (`oneTimeOnly: true`).
2. ✅ Checked API Code - Modifications are present.
3. ✅ Checked API Rebuild - Already rebuilt.
4. ❌ Checked Frontend Rebuild - **Not rebuilt!**

### Root Cause
**Only the API container was rebuilt, forgetting to rebuild the web-app container.**

The frontend's JavaScript bundle is cached. Even if the API returns new fields, the old frontend code doesn't know how to handle them.

### Solution
**When modifying the API response structure, the frontend MUST be rebuilt simultaneously:**
```bash
docker compose -f docker-compose.prod.yml build --no-cache api web-app
docker compose -f docker-compose.prod.yml up -d
```

### Why Rebuild the Frontend?
- Frontend TypeScript code is compiled into a JavaScript bundle.
- If the frontend has new logic to handle new API fields, it needs to be recompiled.
- Even if only the API changed, if the frontend needs to display the new fields, it must be rebuilt.

### 🎓 Lessons Learned
**What you modify → What you rebuild:**
- ✅ Just Frontend UI → Rebuild `web-app`.
- ✅ Just Backend logic (no API structure change) → Rebuild `api`.
- ⚠️ Modified API response structure → Rebuild **both** `api` and `web-app`.
- ⚠️ Unsure? → Rebuild all (safe but slower).

---

## 🐛 Case 14: Game Status Not Visible in Live Preview (2026-02-01)

### Issue Description
When admins click the "Preview" button in the Admin Panel, game status information (`oneTimeOnly`, time limits, remaining play counts, etc.) is not visible in the Live Preview window. However, it is visible on the normal game page.

### Troubleshooting Steps
1. Checked API - Returns status data ✅.
2. Checked `v-if` condition - **Found the problem!**

### Root Cause
```vue
<!-- Old code (Incorrect) -->
<div v-if="gameStatus && !isPreview" ...>

<!-- Status is not displayed when isPreview=true -->
```

**Design Flaw:** Admins need to verify configuration effects in preview mode, but the old logic blocked the display.

### Solution
**Remove the `!isPreview` condition:**
```vue
<!-- New code (Correct) -->
<div v-if="gameStatus" ...>
```

**Also modify fetch logic:**
```javascript
// Old logic (Incorrect)
if (isPreview.value || !authStore.token) return;

// New logic (Correct)
if (!authStore.token || !instanceSlug.value) return;
```

### Benefits
- ✅ Admins can immediately see configuration effects in preview.
- ✅ Modifications to "One Time Only", "Time Limits", etc., can be verified in real-time.
- ✅ Testing no longer requires publishing first.

### 🎓 Lessons Learned
**Preview is NOT a "crippled version"; it is a "verification tool":**
- ✅ Preview should display full functionality (except for real user data).
- ✅ Admins need to verify configuration correctness.
- ❌ Do not use `!isPreview` to hide important information.

---

## 🐛 Case 15: Mixed Language in Frontend (2026-02-01)

### Issue Description
The text displayed on the game page is a mix of Chinese and English:
- "⚠️ One Time Only (Used)"
- "📅 Mon, Tue, Wed 10:00-20:00"
- "Cooldown: 1m 30s"
- "Level too low! Need Lv5"

This results in an inconsistent user experience.

### DJ's Requirement
> "Why is the frontend a mix of Chinese and English? Everything should be unified in English. This is just for the frontend, so there's no need for too many languages for now. We can reconsider later if needed. For now, restrict the entire frontend to English."

### Solution

**1. Status Display (index.vue):**
```vue
<!-- Old -->
<span>⚠️ One Time Only</span>
<span v-if="hasPlayedEver">(Used)</span>

<!-- New -->
<span>⚠️ One Time Only</span>
<span v-if="hasPlayedEver">(Used)</span>
```

**2. Day Names:**
```javascript
// Old
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// New
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
```

**3. Block Reason Messages:**
```javascript
// Old
'Level too low! Need Lv5'
'Event not started yet'
'Not available today'
'Already played (one time only)'
'Cooldown: 1m 30s'

// New
'Level too low! Need Lv5'
'Event not started yet'
'Not available today'
'Already played (one time only)'
'Cooldown: 1m 30s'
```

**Modified Locations:**
- `apps/web-app/src/views/game/index.vue` - Status display
- `apps/api/src/modules/game-instances/templates/spin-wheel.template.ts` - Game engine messages

### Internationalization Strategy
- ✅ **Frontend (User Side):** Unified English.
- ✅ **Admin Backend:** Keep Chinese.
- ✅ Future Multi-language Support → Use an i18n framework (no hardcoding).

### 🎓 Lessons Learned
**Language Consistency Principle:**
- ✅ Choose one language (English) and maintain consistency.
- ✅ Do not mix languages - it confuses the user.
- ✅ Admin and users can use different languages (different roles).
- ✅ Use i18n frameworks for future expansion; do not modify the code directly.

---



---

## 🐛 Case 11: Points Added While Winning Prizes (Double Counting) (2026-02-13)

### Symptoms
- A player plays the spin wheel and lands on "Cash $10".
- Expected: Receive record for $10 cash (pending review), points balance remains unchanged (or only cost is deducted).
- Actual: Record for $10 cash **PLUS** points balance increased by 10 points.
- Only "Points" type prizes should result in a balance increase.

### Root Cause
Logic flaw in `ScoresService.submit()`:
```typescript
// Old logic
const finalPoints = scoreValue * multiplier;
await membersService.updatePoints(memberId, finalPoints - cost); // Unconditional point addition!
```
It treated all game results as "scores," ignoring the fact that a result could be a "Prize" whose value is not necessarily points.

### Solution
Modify `ScoresService` to distinguish between **pure scores** and **prizes**:

```typescript
// New logic
let netPointsChange = -costPerSpin; // Deduct cost first

// Only if there is no prize index (pure score game), add points to balance
if (metadata?.prizeIndex === undefined) {
    netPointsChange += finalPoints;
}

// If it's a prize (prizeIndex exists), it's handled by PrizeStrategyService
// PrizeStrategyService decides whether to add points based on type (e.g., 'points' type adds, 'cash' type doesn't)
```

**Files Modified:** `apps/api/src/modules/scores/scores.service.ts`

---

## 🐛 Case 12: Member Detail Page Error "$t is not defined" (2026-02-13)

### Symptoms
- Admin clicks Member Detail page.
- Page is blank or reports an error.
- Console displays: `ReferenceError: $t is not defined`.

### Root Cause
- Directly used `$t` in `<script setup>` or a render function without importing it.
- In Vue templates, `$t` can be used directly, but in scripts it must be explicitly imported.

### Solution
```typescript
import { $t } from '@/locales';
```

**Files Modified:** `apps/soybean-admin/src/views/games/member-detail/[id].vue`

---

## 🐛 Case 13: Prize Configuration Garbled (Mojibake) (2026-02-13)

### Symptoms
- Emojis in prize configuration are displayed as garbled characters (e.g., `Ã°Å¸âEXT`).
- Causes frontend display to break.

### Root Cause
- The file was previously saved with incorrect encoding (UTF-8 misread as Windows-1252 or similar, then resaved).
- This is source-code level corruption.

### Solution
- Use a script or manually fix source files.
- Ensure the editor uses UTF-8 NO BOM format.
- Fixed all hardcoded garbled characters in `ConfigForm.vue` and `SeedService.ts`.

---
## 🛡️ BUG-002: Cross-Tenant Data Leak (Tenant Isolation)

**Implementation Date:** 2026-02-14  
**Status:** Fixed ✅

### Symptoms
- Admins can access data of companies they don't belong to by manually modifying URLs or API parameters (e.g., `?companyId=XYZ`).
- Physical prize list leaked full data from all companies, not filtered by company.
- Players can submit scores to other companies' game instances by modifying the slug.

### Root Cause
- **Missing Mandatory Filtering:** Controllers depended too much on parameters, rather than cross-checking `companyId` in the JWT.
- **Inconsistent JWT Attributes:** In `JwtStrategy`, regular members use `companyId`, but Admin/Staff use `currentCompanyId`, causing some controllers to read the wrong attribute and bypass filtering.
- **Global Queries:** Some `find()` operations didn't include the `where: { companyId }` condition.

### Solution
- **Attribute Standardization:** Uniformly use `req.user.currentCompanyId` in Admin controllers.
- **Explicit Ownership Validation:** In `getOne`, `update`, `delete`, etc., query the resource first, then compare `resource.companyId === req.user.currentCompanyId`.
- **Parameter Injection:** In `getAll` operations, forcibly override or append the `companyId` filtering condition.
- **Super Admin Exception:** Only when `isSuperAdmin: true` is it allowed to manually specify `companyId` via QueryParams.

### Lessons Learned
- **Trust But Verify:** Never trust IDs or Slugs provided by clients.
- **Defense in Depth:** Even if frontend hides buttons, backend API must perform ownership validation.
- **Consistency is Key:** JWT payload attributes must maintain consistent business logic meaning throughout the project.

---

---

### 🐛 Case 11: Backend Logic Update Not Reflecting in Docker Container (2026-02-14)

### Symptoms
- Modified backend controller logic (e.g., `game-instances.controller.ts`).
- Rebuilt using `docker compose up -d --build api`.
- Container logs showed startup, but the **behavior remained unchanged**.
- `docker exec ... cat file.js` revealed the **old code** was still present in `dist/`.

### Root Cause
- **Docker Layer Caching:** The build process reused a cached layer for `COPY . .` or `RUN pnpm build` because it didn't detect significant file changes, or the volume mount shadowed the build artifact.
- **Dist vs Src:** NestJS builds to `dist/`. If the build step in Dockerfile is skipped (due to cache), the `dist/` folder inside the image remains stale.

### Solution
**Force a clean rebuild without cache:**
```bash
docker compose -f docker-compose.prod.yml build --no-cache api
docker compose -f docker-compose.prod.yml up -d api
```

**Verification:**
Always verify the code *inside* the container if you suspect a cache issue:
```bash
docker exec minigame-api grep -r "NewUniqueString" dist/
```

### Lesson Learned
- When modifying core logic that requires compilation (TypeScript -> JavaScript), **always** use `--no-cache` if standard builds fail to apply changes.
- Trust but verify: Check the running container's filesystem.
---

### Issue 14: Docker Build Fails with "Cannot find module" at runtime (pnpm workspaces)

**Symptoms:**
- Docker build completes successfully.
- Container starts but crashes with `Error: Cannot find module 'xxx'`.
- This often happens with newly added dependencies in a monorepo.

**Cause:**
`pnpm` workspace resolution can be inconsistent inside Docker if the lockfile is not perfectly synchronized or if the production stage doesn't have the workspace context.

**Solution:**
1. **Host-side Sync:** Run `pnpm install --lockfile-only` on the host after adding dependencies to ensure the lockfile is up to date without hitting file locking issues.
2. **Emergency Builder Fix:** In the `builder` stage, explicitly install missing modules into the local `node_modules` of the app:
   ```dockerfile
   RUN cd apps/api && npm install --no-save
   ```
3. **Robust Production Stage:** Use `npm install --omit=dev` in the standalone production stage instead of `pnpm install --prod` to ensure a clean, isolated dependency tree.

**Commit Reference:** `Dockerfile.api` updates on 2026-02-14.
