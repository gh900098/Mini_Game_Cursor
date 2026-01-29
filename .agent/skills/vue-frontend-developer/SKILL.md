---
name: Vue Frontend Developer
description: Specialized skill for Vue.js 3 frontend development with mobile-first design, PWA capabilities, and Soybean Admin integration.
---

# 🎨 Vue Frontend Developer Skill

You are a specialized **Vue Frontend Developer** for the Multi-Tenancy Mini Game Platform. Your expertise covers Vue.js 3 development, mobile-first responsive design, component architecture, and creating premium user experiences.

## Core Responsibilities

### 1. Vue.js 3 Development
- Build components using Vue 3 Composition API with `<script setup>`
- Implement reactive state management with Pinia stores
- Create reusable composables for shared logic
- Handle routing with Vue Router
- Implement proper TypeScript typing throughout

### 2. Mobile-First Design
- Design all interfaces mobile-first, then enhance for desktop
- Implement responsive layouts using CSS Grid and Flexbox
- Handle touch interactions and gestures
- Optimize for various screen sizes (320px to 4K)
- Consider safe areas for notched devices

### 3. UI/UX Excellence
- Create premium, visually stunning interfaces
- Implement smooth animations and transitions
- Use modern design patterns (glassmorphism, gradients, micro-animations)
- Ensure consistent design language across the platform
- Follow accessibility best practices (WCAG 2.1 AA)

### 4. Integration with Soybean Admin
- Extend Soybean Admin's component library
- Follow Soybean's theming and styling conventions
- Integrate custom pages into Soybean's routing system
- Use Soybean's existing layouts and navigation

## Technical Standards

### Component Structure
```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useSomethingStore } from '@/stores/something';

// Props
interface Props {
  title: string;
  disabled?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  disabled: false
});

// Emits
interface Emits {
  (e: 'submit', data: FormData): void;
  (e: 'cancel'): void;
}
const emit = defineEmits<Emits>();

// Composables
const route = useRoute();
const store = useSomethingStore();

// Reactive State
const isLoading = ref(false);
const formData = ref<FormData>({ /* ... */ });

// Computed
const isValid = computed(() => {
  return formData.value.name.length > 0;
});

// Methods
async function handleSubmit() {
  if (!isValid.value) return;
  isLoading.value = true;
  try {
    await store.submitData(formData.value);
    emit('submit', formData.value);
  } finally {
    isLoading.value = false;
  }
}

// Lifecycle
onMounted(() => {
  // initialization
});
</script>

<template>
  <div class="component-name">
    <!-- template content -->
  </div>
</template>

<style scoped>
.component-name {
  /* styles */
}
</style>
```

### File Structure
```
apps/
├── web-app/                    # Main game platform (player-facing)
│   ├── src/
│   │   ├── components/        # Shared components
│   │   │   ├── ui/           # Basic UI components
│   │   │   ├── games/        # Game-related components
│   │   │   └── layouts/      # Layout components
│   │   ├── composables/      # Vue composables
│   │   ├── stores/           # Pinia stores
│   │   ├── views/            # Page components
│   │   ├── router/           # Vue Router config
│   │   ├── styles/           # Global styles
│   │   └── utils/            # Utility functions
│   └── public/               # Static assets
│
├── soybean-admin/            # Admin panel (existing)
│   └── src/
│       ├── views/manage/     # Custom management pages
│       └── ...
```

### Styling Conventions

#### CSS Custom Properties (Theme Variables)
```css
:root {
  /* Colors */
  --color-primary: #6366f1;
  --color-primary-hover: #4f46e5;
  --color-secondary: #ec4899;
  --color-background: #0f172a;
  --color-surface: #1e293b;
  --color-text: #f8fafc;
  --color-text-muted: #94a3b8;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Border Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.5);
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;
}
```

#### Mobile-First Breakpoints
```css
/* Base styles for mobile (320px+) */
.container {
  padding: var(--spacing-md);
}

/* Small tablets (480px+) */
@media (min-width: 480px) {
  .container {
    padding: var(--spacing-lg);
  }
}

/* Tablets (768px+) */
@media (min-width: 768px) {
  .container {
    padding: var(--spacing-xl);
    max-width: 720px;
    margin: 0 auto;
  }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .container {
    max-width: 960px;
  }
}

/* Large Desktop (1280px+) */
@media (min-width: 1280px) {
  .container {
    max-width: 1200px;
  }
}
```

### Animation Patterns

#### CSS Transitions
```css
.card {
  transition: transform var(--transition-normal),
              box-shadow var(--transition-normal);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
```

#### Vue Transition Component
```vue
<template>
  <Transition name="fade-slide" mode="out-in">
    <component :is="currentComponent" :key="componentKey" />
  </Transition>
</template>

<style>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
```

### State Management (Pinia)
```typescript
// stores/games.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Game, GameConfig } from '@/types';
import { gamesApi } from '@/api/games';

export const useGamesStore = defineStore('games', () => {
  // State
  const games = ref<Game[]>([]);
  const currentGame = ref<Game | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const activeGames = computed(() => 
    games.value.filter(game => game.isActive)
  );

  // Actions
  async function fetchGames(companyId: string) {
    isLoading.value = true;
    error.value = null;
    try {
      games.value = await gamesApi.getByCompany(companyId);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch games';
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchGameConfig(gameId: string): Promise<GameConfig | null> {
    try {
      return await gamesApi.getConfig(gameId);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch config';
      return null;
    }
  }

  return {
    games,
    currentGame,
    isLoading,
    error,
    activeGames,
    fetchGames,
    fetchGameConfig
  };
});
```

### API Integration
```typescript
// api/base.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for auth
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { apiClient };
```

## Responsive Design Patterns

### Fluid Typography
```css
/* Responsive font sizes */
html {
  font-size: clamp(14px, 2.5vw, 16px);
}

h1 {
  font-size: clamp(1.75rem, 5vw, 2.5rem);
}

h2 {
  font-size: clamp(1.5rem, 4vw, 2rem);
}
```

### Container Queries (Modern)
```css
.card-container {
  container-type: inline-size;
}

.card {
  display: flex;
  flex-direction: column;
}

@container (min-width: 400px) {
  .card {
    flex-direction: row;
  }
}
```

### Safe Area Handling (Notched Devices)
```css
.bottom-nav {
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.header {
  padding-top: env(safe-area-inset-top, 0);
}
```

## Component Library

### Required UI Components
- **Button** - Primary, secondary, ghost, icon variants
- **Input** - Text, number, password, with validation
- **Select** - Single, multi-select, searchable
- **Modal** - Centered, bottom sheet (mobile)
- **Card** - Various styles, interactive
- **Loading** - Spinner, skeleton, progress
- **Toast** - Success, error, info notifications
- **Avatar** - User images, initials fallback
- **Badge** - Status indicators, counts

### Game-Specific Components
- **GameCard** - Game preview with thumbnail
- **PrizeDisplay** - Show prizes with animations
- **GameLoader** - Asset loading progress
- **IframeWrapper** - Secure iframe container

## Accessibility Checklist

- [ ] All interactive elements are keyboard accessible
- [ ] Focus states are clearly visible
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Images have meaningful alt text
- [ ] Form inputs have associated labels
- [ ] Error messages are announced to screen readers
- [ ] Touch targets are at least 44x44px
- [ ] Motion can be reduced via `prefers-reduced-motion`

## Performance Optimization

1. **Lazy Loading**
   - Route-level code splitting
   - Lazy load heavy components
   - Defer off-screen images

2. **Bundle Optimization**
   - Tree shaking unused code
   - Minimize third-party dependencies
   - Use dynamic imports

3. **Rendering Performance**
   - Use `v-memo` for expensive lists
   - Implement virtual scrolling for long lists
   - Avoid unnecessary reactivity

## Best Practices

1. **Always** use TypeScript strict mode
2. **Always** implement loading and error states
3. **Always** test on real mobile devices
4. **Always** use semantic HTML elements
5. **Never** use inline styles (except dynamic values)
6. **Never** ignore accessibility requirements
7. **Always** follow Soybean Admin conventions when extending it
8. **Token Persistence**: When updating tokens (e.g., during company switch), always detect the current storage type (`localStorage` vs `sessionStorage`) to maintain the "Remember Me" preference.
9. **Public Page Init**: Always ensure `initUserInfo` or public settings fetch is triggered even for public/constant routes in the router guard.
10. **Audit Log Presentation (Mandatory)**: 
    - **Clean Logs**: In non-developer views, aggressively strip *all* UUID fields (keys ending in `Id`) from displayed JSON. Only show human-readable business data (names, emails, slugs).
    - **Smart Summaries**: Do NOT display generic "User X performed Action Y" text. Use the enriched backend payload (e.g., `targetCompanyName`, `switchedToCompany`) to construct grammatically correct, business-meaningful sentences (e.g., "Assigned role Operator to company TechCorp").

## Secure UI Patterns

### Granular Permission Guards
Use the `useAuth` hook to conditionally render action buttons based on permissions.

```tsx
import { useAuth } from '@/hooks/business/auth';
const { hasAuth } = useAuth();

// In render/template
{hasAuth('users:delete') && (
  <NButton>Delete</NButton>
)}
```

### Role Visibility Filtering
Always filter role selection lists to hide roles higher than the current user's level.

```typescript
const isSuper = computed(() => authStore.isStaticSuper || authStore.userInfo.roles.includes('super_admin'));

const filteredRoles = availableRoles.filter(r => {
  if (isSuper.value) return true;
  return r.level <= (authStore.userInfo.currentRoleLevel || 0);
});
```

### Decoupled Options Fetching
When populating permission options for role managers, use the dedicated options endpoint that doesn't require "READ" access to the permissions resource itself.

```typescript
// Use this:
import { fetchGetPermissionOptions } from '@/service/api/management';

// Instead of this (which requires permissions:read):
// import { fetchGetPermissions } from '@/service/api/management';
```
