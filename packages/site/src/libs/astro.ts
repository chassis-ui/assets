import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import type { AstroIntegration } from 'astro'
import {
  getChassisAssetsFsPath,
  getChassisCSSFsPath,
  getChassisIconsFsPath
} from '@chassis-ui/docs'
import type { ChassisConfig } from '@chassis-ui/docs/schema'

// Static file paths that will be aliased (copied) to a different destination path.
const staticFileAliases = {
  '/images/apple-touch-icon.png': '/apple-touch-icon.png',
  '/images/favicon.png': '/favicon.ico'
}

// Pages excluded from the generated sitemap.
const sitemapExcludes = ['/404', '/docs']

/**
 * Returns the site's own Astro integrations, added after `chassisDocs()` of `@chassis-ui/docs`.
 *
 * Includes the `chassis-integration` (static file copying), MDX support, the sitemap
 * generator, and a post-process integration that lists the sitemap under the site's path.
 */
export function chassis({
  config,
  root
}: {
  config: ChassisConfig
  root: string
}): AstroIntegration[] {
  const sitemapExcludedUrls = sitemapExcludes.map((url) => `${config.baseURL}${url}/`)
  const publicDir = path.join(root, 'public')

  // `astro check` / `astro sync` doesn't need static assets copied into _site.
  // Track the command so the config:done hook can skip expensive file copies.
  let cmd = 'dev'
  let outDir = path.join(root, 'dist')

  return [
    {
      name: 'chassis-integration',
      hooks: {
        'astro:config:setup': ({ addWatchFile, command, config: astroConfig }) => {
          cmd = command
          outDir = fileURLToPath(astroConfig.outDir)
          // Reload the config when the integration is modified.
          addWatchFile(path.join(root, 'src/libs/astro.ts'))
        },
        'astro:config:done': () => {
          if (cmd === 'sync') return
          cleanPublicDirectory(publicDir)
          copyStatic(path.join(root, 'static'), publicDir)
          copyChassisAssets(root, publicDir)
          copyChassisCSS(root, publicDir)
          copyChassisIcons(root, publicDir)
          aliasStatic(root, publicDir)
          copyPagefindIndex(outDir, publicDir)
        },
        'astro:server:setup': ({ server }) => {
          // The pages request the static files under `staticPath` of config.yml, and the
          // files are in `public/static/`. In production a rewrite of vercel.json maps one
          // to the other; the dev server has no such rewrite, so this does the same.
          const staticPath = config.staticPath
          if (!staticPath || staticPath === '/static') return

          server.middlewares.use((request, _response, next) => {
            if (request.url?.startsWith(`${staticPath}/`)) {
              request.url = `/static${request.url.slice(staticPath.length)}`
            }
            next()
          })
        }
      }
    },
    // https://github.com/withastro/astro/issues/6475
    mdx() as AstroIntegration,
    sitemap({
      filter: (page) => !sitemapExcludedUrls.includes(page)
    }),
    {
      // Must run after `@astrojs/sitemap` writes `sitemap-index.xml`.
      name: 'chassis-sitemap-postprocess',
      hooks: {
        'astro:build:done': ({ dir }) => {
          rebaseSitemapIndex(fileURLToPath(dir), config.baseURL)
        }
      }
    }
  ]
}

/**
 * Rewrites the sitemaps listed in `sitemap-index.xml` to the URLs they are served from.
 *
 * `@astrojs/sitemap` lists them at the origin, `https://chassis-ui.com/sitemap-0.xml`, which is
 * the sitemap of the main site. This site is proxied under the path of `baseURL`, so its own
 * sitemap is `https://chassis-ui.com/assets/sitemap-0.xml`.
 */
function rebaseSitemapIndex(outDir: string, baseURL: string) {
  const sitemapIndexPath = path.join(outDir, 'sitemap-index.xml')
  if (!fs.existsSync(sitemapIndexPath)) return

  const origin = new URL(baseURL).origin
  const base = baseURL.replace(/\/$/, '')
  const content = fs.readFileSync(sitemapIndexPath, 'utf8')

  fs.writeFileSync(
    sitemapIndexPath,
    content.replaceAll(`<loc>${origin}/sitemap-`, `<loc>${base}/sitemap-`)
  )
}

/**
 * Copies the previously-generated Pagefind search index from `_site/assets/pagefind/`
 * into `public/assets/pagefind/` so `astro dev` can serve search at `/assets/pagefind/`,
 * matching the path prefix this site is proxied under in production.
 * No-op if no production build has been run yet — dev simply returns no results.
 */
function copyPagefindIndex(outDir: string, publicDir: string) {
  const source = path.join(outDir, 'assets', 'pagefind')
  if (!fs.existsSync(source)) return
  const destination = path.join(publicDir, 'assets', 'pagefind')

  fs.mkdirSync(destination, { recursive: true })
  fs.cpSync(source, destination, { recursive: true })
}

/**
 * Deletes the contents of the `public/` directory before each dev/build run so
 * stale vendor assets (CSS, icons, images) from a previous build are removed.
 * The directory itself is preserved to avoid ENOTEMPTY errors on the root.
 * Errors on individual entries are intentionally swallowed — the directory may
 * contain locked or read-only files in some environments.
 */
function cleanPublicDirectory(dir: string) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir)) {
    const entryPath = path.join(dir, entry)
    try {
      fs.rmSync(entryPath, { force: true, recursive: true })
    } catch {
      // ignore
    }
  }
}

/**
 * Copies the docs build of this repository, `dist/web/docs/chassis`, into `public/static/`.
 */
function copyChassisAssets(root: string, publicDir: string) {
  const source = getChassisAssetsFsPath({ root })
  const destination = path.join(publicDir, 'static')

  fs.mkdirSync(destination, { recursive: true })
  fs.cpSync(source, destination, { recursive: true })
}

/**
 * Copies the compiled Chassis CSS bundle into `public/static/`.
 */
function copyChassisCSS(root: string, publicDir: string) {
  const source = getChassisCSSFsPath({ root })
  const destination = path.join(publicDir, 'static')

  fs.mkdirSync(destination, { recursive: true })
  fs.cpSync(source, destination, { recursive: true })
}

/**
 * Copies the `icons/` folder from the Chassis Icons package into
 * `public/static/icons/` so icons are served from `/static/icons/`.
 */
function copyChassisIcons(root: string, publicDir: string) {
  const source = path.join(getChassisIconsFsPath({ root }), 'icons')
  const destination = path.join(publicDir, 'static', 'icons')

  fs.mkdirSync(destination, { recursive: true })
  fs.cpSync(source, destination, { recursive: true })
}

/**
 * Copies the contents of the `static/` source directory into `public/`
 * so files are served from the root URL (`/`).
 */
function copyStatic(source: string, publicDir: string) {
  fs.mkdirSync(publicDir, { recursive: true })
  fs.cpSync(source, publicDir, { recursive: true })
}

/**
 * Copies select static files of the docs build to alternative destination paths
 * (e.g. `apple-touch-icon.png` → `/apple-touch-icon.png`).
 */
function aliasStatic(root: string, publicDir: string) {
  const source = getChassisAssetsFsPath({ root })

  for (const [aliasSource, aliasDestination] of Object.entries(staticFileAliases)) {
    fs.cpSync(path.join(source, aliasSource), path.join(publicDir, aliasDestination))
  }
}
