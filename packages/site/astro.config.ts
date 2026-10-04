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
    // The site is served under /assets of chassis-ui.com. Astro's files are written to
    // _site/assets/static/astro/ and requested at the same path, so the deployment, `astro
    // preview` and the link check find them without a rewrite. Under /static/ the main site
    // routes by the Referer header, which fails for a script that another script imports.
    assets: 'assets/static/astro'
  },
  integrations: [chassisDocs({ config }), ...chassis({ config, root })],
  vite: {
    environments: {
      client: {
        build: {
          rolldownOptions: {
            output: {
              entryFileNames: `assets/static/astro/docs.[hash].js`,
              chunkFileNames: 'assets/static/astro/docs.[hash].js'
              // assetFileNames: 'assets/static/astro/docs.[hash][extname]'
            }
          }
        }
      }
    },
    // Required for CSS files
    build: {
      rolldownOptions: {
        output: {
          assetFileNames: 'assets/static/astro/docs.[hash][extname]'
        }
      }
    }
  }
})
