import { defineConfig, presetIcons, presetUno, transformerDirectives, transformerVariantGroup } from 'unocss';

export default defineConfig({
    presets: [
        presetUno(),
        presetIcons({
            warn: true,
            extraProperties: {
                display: 'inline-block',
                'vertical-align': 'middle',
            },
        }),
    ],
    transformers: [transformerDirectives(), transformerVariantGroup()],
    theme: {
        colors: {
            primary: '#6366f1',
            primary_hover: '#4f46e5',
            primary_pressed: '#4338ca',
            primary_active: 'rgba(99, 102, 241, 0.1)',
        },
        breakpoints: {
            sm: '640px',
            md: '768px',
            lg: '1024px',
            xl: '1280px',
        },
    },
    shortcuts: {
        'flex-center': 'flex justify-center items-center',
        'flex-x-center': 'flex justify-center',
        'flex-y-center': 'flex items-center',
        'flex-col-center': 'flex-col flex-center',
        'glass-card': 'bg-white/10 backdrop-blur-md border border-white/20 rounded-xl',
        'btn-primary': 'bg-primary hover:bg-primary_hover active:bg-primary_pressed text-white transition-all duration-300 rounded-lg px-4 py-2 cursor-pointer',
    },
});
