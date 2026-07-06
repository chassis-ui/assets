import fs from 'node:fs'
import path from 'node:path'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import type { AstroIntegration } from 'astro'
import { chassisBundlePlugin } from '@chassis-ui/docs'
import { getConfig } from './config'
import {
  getChassisAssetsFsPath,
  getChassisCSSFsPath,
  getChassisIconsFsPath,
  getDocsFsPath,
  getDocsPublicFsPath,
  getDocsStaticFsPath,
  validateChassisDocsPaths
} from './path'
import { chassisAutoImportIntegration } from './shortcode'

// Static file paths that will be aliased (copied) to a different destination path.
const staticFileAliases = {
  '/images/apple-touch-icon.png': '/apple-touch-icon.png',
  '/images/favicon.png': '/favicon.ico'
}

// Pages excluded from the generated sitemap.
const sitemapExcludes = ['/404', '/docs']

/**
 * Returns the full set of Astro integrations used by the Chassis docs site.
 *
 * Includes the core `chassis-integration` (asset copying, remark/rehype plugins,
 * post-build validation), MDX support, the sitemap generator, and a
 * post-process integration that injects sub-project sitemap references.
 */
export function chassis(): AstroIntegration[] {
  const config = getConfig()
  const sitemapExcludedUrls = sitemapExcludes.map((url) => `${config.baseURL}${url}/`)

  // `astro check` / `astro sync` doesn't need static assets copied into _site.
  // Track the command so the config:done hook can skip expensive file copies.
  let command = 'dev'

  return [
    chassisAutoImportIntegration(),
    {
      name: 'chassis-integration',
      hooks: {
        'astro:config:setup': ({ addWatchFile, command: cmd, updateConfig }) => {
          command = cmd
          // Reload the config when the integration is modified.
          addWatchFile(path.join(getDocsFsPath(), 'src/libs/astro.ts'))
        },
        'astro:config:done': () => {
          if (command === 'sync') return
          cleanPublicDirectory()
          copyStatic()
          copyChassisAssets()
          copyChassisCSS()
          copyChassisIcons()
          aliasStatic()
          copyPagefindIndex()
        },
        'astro:build:done': ({ dir }) => {
          validateChassisDocsPaths(dir)
        }
      }
    },
    // https://github.com/withastro/astro/issues/6475
    mdx() as AstroIntegration,
    sitemap({
      filter: (page) => !sitemapExcludedUrls.includes(page)
    })
  ]
}

/**
 * Copies the previously-generated Pagefind search index from `_site/assets/pagefind/`
 * into `public/assets/pagefind/` so `astro dev` can serve search at `/assets/pagefind/`,
 * matching the path prefix this site is proxied under in production.
 * No-op if no production build has been run yet — dev simply returns no results.
 */
function copyPagefindIndex() {
  const source = path.join(process.cwd(), '_site', 'assets', 'pagefind')
  if (!fs.existsSync(source)) return
  const destination = path.join(getDocsPublicFsPath(), 'assets', 'pagefind')

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
function cleanPublicDirectory() {
  const dir = getDocsPublicFsPath()
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
 * Copies the Chassis assets package output into `public/static/`.
 */
function copyChassisAssets() {
  const source = getChassisAssetsFsPath()
  const destination = path.join(getDocsPublicFsPath(), 'static')

  fs.mkdirSync(destination, { recursive: true })
  fs.cpSync(source, destination, { recursive: true })
}

/**
 * Copies the compiled Chassis CSS bundle into `public/static/`.
 */
function copyChassisCSS() {
  const source = getChassisCSSFsPath()
  const destination = path.join(getDocsPublicFsPath(), 'static')

  fs.mkdirSync(destination, { recursive: true })
  fs.cpSync(source, destination, { recursive: true })
}

/**
 * Copies the `icons/` folder from the Chassis Icons package into
 * `public/static/icons/` so icons are served from `/static/icons/`.
 */
function copyChassisIcons() {
  const font_source = path.join(getChassisIconsFsPath(), 'icons')
  const destination = path.join(getDocsPublicFsPath(), 'static', 'icons')

  fs.mkdirSync(destination, { recursive: true })
  fs.cpSync(font_source, destination, { recursive: true })
}

/**
 * Copies the contents of the `static/` source directory into `public/`
 * so files are served from the root URL (`/`).
 */
function copyStatic() {
  const source = getDocsStaticFsPath()
  const destination = getDocsPublicFsPath()

  fs.mkdirSync(destination, { recursive: true })
  fs.cpSync(source, destination, { recursive: true })
}

/**
 * Copies select static files from the Chassis assets package to alternative
 * destination paths (e.g. `apple-touch-icon.png` → `/apple-touch-icon.png`).
 */
function aliasStatic() {
  const source = getChassisAssetsFsPath()
  const destination = path.join(getDocsPublicFsPath())

  for (const [aliasSource, aliasDestination] of Object.entries(staticFileAliases)) {
    fs.cpSync(path.join(source, aliasSource), path.join(destination, aliasDestination))
  }
}
