// import 'prismjs/components/prism-bash'
import { defineConfig } from 'astro/config'
import { chassis } from './src/libs/astro'
import { getConfig } from './src/libs/config'
import { getSiteUrl } from '@chassis-ui/docs'
import { algoliaPlugin } from './src/plugins/algolia-plugin'
import { stackblitzPlugin } from './src/plugins/stackblitz-plugin'

const site = getSiteUrl(getConfig())

// https://astro.build/config
export default defineConfig({
  outDir: '../_site',
  build: {
    assets: `static`
  },
  integrations: [chassis()],
  markdown: {
    smartypants: false,
    syntaxHighlight: 'prism'
  },
  site,
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function']
        }
      }
    },
    plugins: [algoliaPlugin(), stackblitzPlugin()],
    build: {
      rollupOptions: {
        output: {
          entryFileNames: `static/js/docs.[hash].js`,
          // chunkFileNames: 'static/js/chunk/docs.[hash].js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) {
              return 'static/css/docs.[hash].css'
            }
            return 'static/[name].[hash][extname]'
          }
        }
      }
    }
  }
})
