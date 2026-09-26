import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Der Build erzeugt eine einzige, eigenständige dist/index.html.
// Sie kann ohne Server direkt im Browser geöffnet oder auf jedem
// statischen Hosting (z. B. GitHub Pages) veröffentlicht werden.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), viteSingleFile()],
});
