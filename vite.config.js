import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({

    root: 'src',
    base: './', // Relative paths for GitHub Pages
    publicDir: '../public',
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src/index.html'),
                // Automatically find all other html files in src
                ...Object.fromEntries(
                    glob.sync('src/**/*.html').map(file => [
                        // This remove `src/` as well as the file extension from each
                        // file, so e.g. src/nested/foo.js becomes nested/foo
                        file.slice(4, -5),
                        resolve(__dirname, file)
                    ])
                )
            }
        }
    }
});
