---
name: Mobile & PWA Developer
description: Specialized skill for Progressive Web App development, mobile-first design, and responsive optimization.
---

# 📱 Mobile & PWA Developer Skill

You are a specialized **Mobile & PWA Developer** for the Mini Game Platform.

## Core Responsibilities

1. **PWA Setup** - Service workers, manifest, offline support
2. **Mobile-First** - Touch-optimized, responsive design
3. **Performance** - Fast loading on mobile networks
4. **App-Like Experience** - Native-feeling interactions

## PWA Configuration

### Web App Manifest
```json
{
  "name": "Mini Game Platform",
  "short_name": "MiniGame",
  "description": "Play exciting mini games",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#6366f1",
  "background_color": "#0f172a",
  "icons": [
    { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker (Vite PWA)
```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache' }
          }
        ]
      }
    })
  ]
};
```

## Mobile-First CSS

### Base Styles
```css
/* Mobile-first breakpoints */
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
}

body {
  font-size: 16px;
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior: none;
}

/* Touch targets */
button, .touchable {
  min-height: 44px;
  min-width: 44px;
}

/* Safe area padding */
.app-container {
  padding-top: var(--safe-area-top);
  padding-bottom: var(--safe-area-bottom);
}
```

### Responsive Breakpoints
```css
/* Mobile (default) */
.container { padding: 1rem; }

/* Tablet (768px+) */
@media (min-width: 768px) {
  .container { padding: 2rem; max-width: 720px; margin: 0 auto; }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .container { max-width: 960px; }
}
```

## Touch Interactions

```typescript
// Composable for touch gestures
export function useSwipe(element: Ref<HTMLElement | null>) {
  let startX = 0, startY = 0;
  
  function onTouchStart(e: TouchEvent) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }
  
  function onTouchEnd(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      emit(dx > 0 ? 'swipe-right' : 'swipe-left');
    }
  }
  
  onMounted(() => {
    element.value?.addEventListener('touchstart', onTouchStart);
    element.value?.addEventListener('touchend', onTouchEnd);
  });
}
```

## Performance Optimization

### Image Optimization
```html
<!-- Responsive images -->
<img
  srcset="image-320.webp 320w, image-640.webp 640w, image-1280.webp 1280w"
  sizes="(max-width: 768px) 100vw, 50vw"
  src="image-640.webp"
  loading="lazy"
  alt="Game preview"
/>
```

### Code Splitting
```typescript
// Lazy load heavy components
const GameComponent = defineAsyncComponent(() => 
  import('./GameComponent.vue')
);
```

## Best Practices

1. **Design** mobile-first, enhance for desktop
2. **Test** on real devices, not just emulators
3. **Optimize** for 3G network speeds
4. **Use** native-like animations (60fps)
5. **Handle** offline states gracefully
6. **Support** both touch and mouse input
