import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';

const isNodeBuiltin = (id: string) =>
	id.startsWith('node:') ||
	builtinModules.some((moduleName) => id === moduleName || id.startsWith(`${moduleName}/`));

// https://vitejs.dev/config
export default defineConfig({
	build: {
		outDir: '.vite/build',
		emptyOutDir: false,
		lib: {
			entry: 'src/preload/index.ts',
			formats: ['cjs'],
			fileName: () => 'preload.js',
		},
		rollupOptions: {
			external: (id) => id === 'electron' || isNodeBuiltin(id),
		},
	},
});
