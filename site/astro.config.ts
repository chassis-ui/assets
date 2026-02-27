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
    assets: `assets`
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
          quietDeps: true,
          silenceDeprecations: ['import', 'global-builtin', 'color-functions']
        }
      }
    },
    plugins: [algoliaPlugin(), stackblitzPlugin()],
    build: {
      rollupOptions: {
        output: {
          // chunkFileNames: 'assets/js/[name].[hash].js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) {
              return 'static/tokens-docs/docs.[hash].css'
            }
            return 'static/tokens-docs/[name].[hash][extname]'
          }
        }
      }
    }
  }
})
