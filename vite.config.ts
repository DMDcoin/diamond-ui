import { loadEnv } from 'vite';
import commonjs from 'vite-plugin-commonjs';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vitest/config';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import generateHtmlPlugin from "./src/plugins/generateHtmlPlugin";

export default defineConfig(({ mode }) => {
    // Load environment variables based on the mode
    const env = loadEnv(mode, process.cwd(), '');

    return {
        base: './',
        plugins: [react(), commonjs(), nodePolyfills()],
        test: {
            globals: true,
            environment: 'jsdom',
            setupFiles: './src/setupTests.ts',
            css: true,
            reporters: ['verbose'],
            coverage: {
                reporter: ['text', 'json', 'html'],
                include: ['src/**/*'],
                exclude: [],
            }
        },
        define: {
            'process.env': env, // Pass all env variables to process.env
            global: 'globalThis',
        },
        server: {
            port: env.VITE_APP_PORT ? parseInt(env.VITE_APP_PORT) : 3000, // Default to 3000 if not set
        },
        build: {
            lib: {
                formats: ['iife'],
                entry: 'src/index.tsx',
                cssFileName: 'styles.css',
                name: 'test',
            },
        }
    };
});
