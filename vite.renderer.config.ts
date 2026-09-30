import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
	root: 'src/renderer',
	build: {
		outDir: '../../.vite/renderer/main_window',
		emptyOutDir: false,
	},
});
