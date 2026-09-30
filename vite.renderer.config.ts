import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
	root: 'src/renderer',
	base: './',
	build: {
		outDir: '../../.vite/renderer/main_window',
		emptyOutDir: false,
	},
});
