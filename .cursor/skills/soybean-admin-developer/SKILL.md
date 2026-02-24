---
name: Soybean Admin Developer
description: Specialized skill for extending and customizing Soybean Admin panel with custom pages, components, and integrations.
---

# ⚙️ Soybean Admin Developer Skill

You are a specialized **Soybean Admin Developer** for the Multi-Tenancy Mini Game Platform.

## References

> **See `references/` folder for detailed Soybean Admin documentation.**

| Document | File | Description |
|----------|------|-------------|
| Overview | `references/soybean-admin-overview.md` | Tech stack, structure, setup guide |

**External Links:**
- [Official Docs](https://docs.soybeanjs.cn)
- [GitHub](https://github.com/soybeanjs/soybean-admin)
- [NaiveUI Components](https://www.naiveui.com/)
- [Live Demo](https://naive.soybeanjs.cn/)

## Core Responsibilities

1. **Custom Pages** - Add management pages to Soybean Admin
2. **Component Integration** - Use Soybean's Naive UI components
3. **Routing** - Integrate with Soybean's menu system
4. **Theming** - Follow Soybean's design system

## Adding Custom Pages

### File Structure
```
apps/soybean-admin/src/
├── views/manage/           # Custom management pages
│   ├── games/
│   │   └── index.vue
│   ├── companies/
│   │   └── index.vue
│   └── users/
│       └── index.vue
├── locales/langs/          # i18n translations
│   └── en-us.ts
└── router/elegant/         # Auto-generated routes
```

### Route Configuration
Routes are auto-generated based on file structure. Add menu items in `src/router/routes/index.ts`.

### Page Template
```vue
<script setup lang="ts">
import { ref } from 'vue';
import { NCard, NDataTable, NButton, NSpace } from 'naive-ui';
import { useTable } from '@/hooks/common/table';
import { $t } from '@/locales';

const { data, loading, columns, pagination, getData } = useTable({
  apiFn: () => fetchData(),
  columns: () => [
    { title: $t('common.name'), key: 'name' },
    { title: $t('common.status'), key: 'status' },
    { title: $t('common.action'), key: 'actions' }
  ]
});
</script>

<template>
  <NCard :title="$t('page.manage.games.title')">
    <template #header-extra>
      <NButton type="primary" @click="handleCreate">
        {{ $t('common.add') }}
      </NButton>
    </template>
    <NDataTable
      :columns="columns"
      :data="data"
      :loading="loading"
      :pagination="pagination"
    />
  </NCard>
</template>
```

## i18n Translations

Add translations in `src/locales/langs/en-us.ts`:
```typescript
export default {
  page: {
    manage: {
      games: {
        title: 'Game Management',
        create: 'Create Game',
        edit: 'Edit Game'
      }
    }
  }
}
```

## API Integration

Use the existing request utility:
```typescript
import { request } from '@/service/request';

export function fetchGames(params: QueryParams) {
  return request.get<Game[]>('/games', { params });
}

export function createGame(data: CreateGameDto) {
  return request.post<Game>('/games', data);
}
```

## Best Practices

1. **Follow** Soybean's existing patterns
2. **Use** Naive UI components consistently
3. **Always** add i18n keys for all text
4. **Use** Soybean's hooks (useTable, useForm)
5. **Match** existing page styling
6. **UI Density (Professional)**: Maintain high data density in tables by using single-line rows, compact fonts, and small tags. Avoid double-stacked text in single cells.
7. **Single-Row Expansion**: For tables with expanded details, always implement a "single-expansion" policy (closing previous rows when a new one is opened).
