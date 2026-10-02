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
			entry: 'src/main/index.ts',
			formats: ['cjs'],
			fileName: () => 'main.js',
		},
		rollupOptions: {
			external: (id) =>
				id === 'better-sqlite3' ||
				id === 'dotenv' ||
				id === 'dotenv/config' ||
				id === 'electron' ||
				id === 'electron-updater' ||
				id === 'electron-squirrel-startup' ||
				id === 'ws' ||
				isNodeBuiltin(id),
		},
	},
});
