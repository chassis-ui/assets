import { defineConfig } from 'astro/config'
import { loadConfig } from '@chassis-ui/docs'
import { chassisDocs } from '@chassis-ui/docs/integration'
import { chassis } from './src/libs/astro'

const root = import.meta.dirname
const config = loadConfig({ root })

// https://astro.build/config
export default defineConfig({
  outDir: '../../_site',
  build: {
    assets: `static/astro`,
    // The site is served under /assets of chassis-ui.com, where /static belongs to the main
    // site. With `staticPath` of config.yml, every static file is requested under /assets/static.
    assetsPrefix: '/assets'
  },
  integrations: [chassisDocs({ config }), ...chassis({ config, root })],
  vite: {
    environments: {
      client: {
        build: {
          rolldownOptions: {
            output: {
              entryFileNames: `static/astro/docs.[hash].js`,
              chunkFileNames: 'static/astro/docs.[hash].js'
              // assetFileNames: 'static/astro/docs.[hash][extname]'
            }
          }
        }
      }
    },
    // Required for CSS files
    build: {
      rolldownOptions: {
        output: {
          assetFileNames: 'static/astro/docs.[hash][extname]'
        }
      }
    }
  }
})
