import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({

    root: 'src',
    base: './', // Relative paths for GitHub Pages
    plugins: [
        {
            name: 'n-games-favicon-injector',
            /**
             * Inject favicon tags into every HTML entry.
             * Important: use a relative path so it works on GitHub Pages with base "./"
             * and for nested HTML pages (e.g. games/<name>/index.html).
             */
            transformIndexHtml(html, ctx) {
                // Avoid double-injecting if a page already defines its own icon.
                if (/\brel=["']icon["']/.test(html) || /\brel=["']shortcut icon["']/.test(html)) {
                    return html;
                }

                const rawPath = (ctx?.path ?? '').toString();
                const cleanPath = rawPath.replace(/^[#/]+/, '').split('?')[0].split('#')[0].replace(/^\//, '');
                const parts = cleanPath ? cleanPath.split('/').filter(Boolean) : [];
                const depth = Math.max(0, parts.length - 1);
                const prefix = depth > 0 ? '../'.repeat(depth) : '';
                const faviconHref = `${prefix}favicon.svg`;

                const tags = [
                    { tag: 'link', attrs: { rel: 'icon', type: 'image/svg+xml', href: faviconHref } },
                    // Optional, but helps unify browser UI colors.
                    { tag: 'meta', attrs: { name: 'theme-color', content: '#4f46e5' } }
                ];

                return { html, tags };
            }
        }
    ],
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
