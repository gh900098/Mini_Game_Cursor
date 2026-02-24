---
name: Localization Specialist
description: Specialized skill for internationalization (i18n) and localization (l10n) including multi-language support, RTL, and regional content.
---

# 🌐 Localization Specialist Skill

You are a specialized **Localization Specialist** for the Multi-Tenancy Mini Game Platform.

## Core Responsibilities

1. **i18n Setup** - Configure internationalization framework
2. **Translation Management** - Organize and maintain translations
3. **Multi-Tenant Localization** - Per-company language settings
4. **RTL Support** - Right-to-left language support
5. **Regional Content** - Date, time, currency formatting

## Vue i18n Setup

### Configuration
```typescript
// src/plugins/i18n.ts
import { createI18n } from 'vue-i18n';
import en from '@/locales/en-us';
import zh from '@/locales/zh-cn';
import ms from '@/locales/ms-my';

export const i18n = createI18n({
  legacy: false,
  locale: 'en-us',
  fallbackLocale: 'en-us',
  messages: {
    'en-us': en,
    'zh-cn': zh,
    'ms-my': ms,
  }
});
```

### Translation File Structure
```
src/locales/
├── en-us.ts          # English (US)
├── zh-cn.ts          # Chinese (Simplified)
├── zh-tw.ts          # Chinese (Traditional)
├── ms-my.ts          # Malay (Malaysia)
└── types.ts          # TypeScript definitions
```

### Translation File Format
```typescript
// src/locales/en-us.ts
export default {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    confirm: 'Confirm',
    loading: 'Loading...',
  },
  auth: {
    login: 'Login',
    logout: 'Logout',
    register: 'Register',
  },
  games: {
    title: 'Games',
    spinWheel: 'Spin the Wheel',
    scratchCard: 'Scratch Card',
    play: 'Play Now',
    credits: 'Credits',
    prize: 'Prize',
    congratulations: 'Congratulations!',
    tryAgain: 'Try Again',
  },
  errors: {
    network: 'Network error. Please try again.',
    insufficientCredits: 'Insufficient credits.',
    gameNotAvailable: 'Game is not available.',
  }
};
```

## Usage in Components

### Template Usage
```vue
<template>
  <div>
    <h1>{{ $t('games.title') }}</h1>
    <button>{{ $t('games.play') }}</button>
    
    <!-- With interpolation -->
    <p>{{ $t('games.creditsRemaining', { count: credits }) }}</p>
    
    <!-- Pluralization -->
    <p>{{ $t('games.prizes', prizesCount) }}</p>
  </div>
</template>
```

### Composition API
```typescript
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();

const message = t('games.congratulations');

function switchLanguage(lang: string) {
  locale.value = lang;
  localStorage.setItem('locale', lang);
}
```

## Multi-Tenant Localization

### Company Language Settings
```typescript
interface CompanySettings {
  defaultLocale: string;           // Default language
  supportedLocales: string[];      // Available languages
  contentOverrides: {              // Per-company text overrides
    [locale: string]: {
      [key: string]: string;
    };
  };
}
```

### Loading Company Translations
```typescript
async function loadCompanyLocale(companyId: string, locale: string) {
  // Load base translations
  const base = await import(`@/locales/${locale}.ts`);
  
  // Fetch company overrides
  const overrides = await api.get(`/companies/${companyId}/translations/${locale}`);
  
  // Merge with base
  return deepMerge(base.default, overrides);
}
```

## Date/Time/Currency Formatting

### Number Formatting
```typescript
const { n, locale } = useI18n();

// Currency
n(1234.56, 'currency'); // $1,234.56 (en-us) / RM1,234.56 (ms-my)

// Percentage
n(0.25, 'percent'); // 25%
```

### Date Formatting
```typescript
const { d } = useI18n();

d(new Date(), 'short');  // 1/23/26 (en-us) / 23/1/26 (ms-my)
d(new Date(), 'long');   // January 23, 2026
```

### Configuration
```typescript
// i18n config
{
  numberFormats: {
    'en-us': {
      currency: { style: 'currency', currency: 'USD' }
    },
    'ms-my': {
      currency: { style: 'currency', currency: 'MYR' }
    }
  },
  datetimeFormats: {
    'en-us': {
      short: { year: 'numeric', month: 'short', day: 'numeric' }
    }
  }
}
```

## Backend i18n (NestJS)

### Error Messages
```typescript
// src/i18n/en.json
{
  "errors": {
    "INSUFFICIENT_CREDITS": "Insufficient credits. Required: {required}, Available: {available}",
    "GAME_NOT_FOUND": "Game not found"
  }
}

// Service usage
throw new BadRequestException(
  this.i18n.t('errors.INSUFFICIENT_CREDITS', {
    lang: user.locale,
    args: { required: 100, available: 50 }
  })
);
```

## Soybean Admin Integration

Soybean Admin has built-in i18n. Add translations in:
```
apps/soybean-admin/src/locales/langs/
├── en-us.ts
├── zh-cn.ts
└── [locale].ts
```

Follow Soybean's nested structure for consistency.

## Best Practices

1. **Never** hardcode user-facing text
2. **Use** translation keys, not raw strings
3. **Organize** translations by feature/module
4. **Provide** context for translators (comments)
5. **Test** with long strings (German is ~30% longer)
6. **Support** fallback locale for missing translations
