import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages: https://<user>.github.io/word-typer/
export default defineConfig({
  base: '/word-typer/',
  plugins: [react(), tailwindcss()],
});
