/**
 * @file build-assets.test.js
 * @description The library of `build/build-assets.js`: the pure helpers, the configuration,
 *              the argument parser, the job plan, and `generateAssets()` on the fixture for
 *              what the golden test cannot show: the brand override, cleaning, dry runs,
 *              Git LFS pointers and rename collisions. Every build writes to a temporary
 *              folder.
 */

import fs from 'node:fs'
import path from 'node:path'
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest'
import {
  FORMAT_TYPES,
  IGNORE_PATTERNS,
  cleanupEmptyDirectories,
  createCollisionTracker,
  generateAssets,
  hasAllowedExtension,
  isExcluded,
  isLfsPointer,
  isReservedName,
  keepsFile,
  loadConfig,
  parseArgs,
  planJobs,
  resolveFormats,
  resolveIgnore,
  shouldIgnoreFile,
  sourceLayers
} from '../build/build-assets.js'
import { lfsInclude } from '../build/lfs-include.js'
import { androidProcessor, iosProcessor, webProcessor } from '../build/processors/index.js'
import DistValidator from '../build/validate-assets.js'
import {
  FIXTURE,
  GOLDEN,
  copyFixture,
  listFiles,
  read,
  removeTempDirs,
  tempDir
} from './helpers.js'

const LFS_POINTER = `version https://git-lfs.github.com/spec/v1
oid sha256:4d7a214614ab2935c943f9e0ff69d22eadbb8f32b1258daaa5e2ca24d17e2393
size 12345
`

afterAll(removeTempDirs)
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

/**
 * Build the fixture, or a copy of it, into a temporary folder.
 * @param {import('../build/build-assets.js').BuildOptions} [options]
 */
async function build(options = {}) {
  const out = options.out || tempDir()
  const stats = await generateAssets({ cwd: FIXTURE, quiet: true, ...options, out })
  return { out, stats }
}

/**
 * A copy of the fixture with more keys in the `chassis` block of its `package.json`.
 * @param {Record<string, unknown>} block - Such as `{ ignore: ['*.bak'] }`
 * @returns {string} The root of the copy
 */
function withChassis(block) {
  const root = copyFixture()
  const pkg = JSON.parse(read(root, 'package.json'))
  Object.assign(pkg.chassis, block)
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg))
  return root
}

describe('sourceLayers()', () => {
  test('the default brand, then the brand, each shared folder before the app', () => {
    expect(sourceLayers('_default', 'alpha', 'site')).toEqual([
      '_default/_shared',
      '_default/site',
      'alpha/_shared',
      'alpha/site'
    ])
  })

  test('the default brand once, when it is the brand', () => {
    expect(sourceLayers('_default', '_default', 'site')).toEqual([
      '_default/_shared',
      '_default/site'
    ])
  })
})

describe('isReservedName()', () => {
  test.each([
    ['_default', true],
    ['_shared', true],
    ['_', true],
    ['default', false],
    ['alpha_beta', false]
  ])('%s is %s', (name, reserved) => {
    expect(isReservedName(name)).toBe(reserved)
  })
})

describe('shouldIgnoreFile()', () => {
  test.each([
    ['.DS_Store', true],
    ['Thumbs.db', true],
    ['desktop.ini', true],
    ['.gitkeep', true],
    ['.gitignore', true],
    ['._logo.png', true],
    ['.hidden', true],
    ['notes.txt~', true],
    ['logo.svg.swp', true],
    ['export.tmp', true],
    ['export.temp', true],
    ['logo.png', false],
    ['tmp.png', false],
    ['swap.svg', false],
    ['Thumbs.db.png', false],
    ['.', false],
    ['..', false]
  ])('%s → %s', (name, ignored) => {
    expect(shouldIgnoreFile(name)).toBe(ignored)
  })

  test('every pattern matches a name it describes', () => {
    const examples = {
      '._*': '._x',
      '*~': 'x~',
      '*.swp': 'x.swp',
      '*.tmp': 'x.tmp',
      '*.temp': 'x.temp'
    }
    for (const pattern of IGNORE_PATTERNS) {
      expect(shouldIgnoreFile(examples[pattern] || pattern), pattern).toBe(true)
    }
  })
})

describe('resolveIgnore() and the patterns of chassis.ignore', () => {
  test('no list is no pattern, and a list is taken once per name', () => {
    expect(resolveIgnore()).toEqual([])
    expect(resolveIgnore([])).toEqual([])
    expect(resolveIgnore(['*.bak', 'notes.md', '*.bak'])).toEqual(['*.bak', 'notes.md'])
  })

  test('names every problem of a list', () => {
    expect(() => resolveIgnore('*.bak')).toThrow('chassis.ignore is a list of names')
    expect(() => resolveIgnore({ names: ['*.bak'] })).toThrow('chassis.ignore is a list of names')
    expect(() => resolveIgnore(['*.bak', 7, '', 'drafts/old', 'a\\b'])).toThrow(
      'chassis.ignore is not valid:\n' +
        '  - 7 is not a name, such as "*.bak"\n' +
        '  - "" is not a name, such as "*.bak"\n' +
        '  - "drafts/old" is a path. A pattern is the name of a file or a folder, at any depth\n' +
        '  - "a\\b" is a path. A pattern is the name of a file or a folder, at any depth'
    )
  })

  test.each([
    ['notes.md', ['notes.md'], true],
    ['Notes.md', ['notes.md'], false],
    ['my-notes.md', ['notes.md'], false],
    ['logo.bak', ['*.bak'], true],
    ['logo.bak.png', ['*.bak'], false],
    ['logo copy.png', ['* copy.*'], true],
    ['logo (1).png', ['* (1).png'], true],
    ['logo 1.png', ['* (1).png'], false],
    ['a+b.svg', ['a+b.svg'], true],
    ['aab.svg', ['a+b.*'], false],
    ['logo.png', ['*.bak', 'notes.md'], false],
    ['.DS_Store', ['*.bak'], true],
    ['export.tmp', [], true]
  ])('%s with %j → %s', (name, patterns, ignored) => {
    expect(shouldIgnoreFile(name, patterns)).toBe(ignored)
  })

  test('a function that is given to some() reads no pattern from the index', () => {
    expect(['images', 'logo', 'mark.png'].some(shouldIgnoreFile)).toBe(false)
    expect(['images', '.cache', 'mark.png'].some(shouldIgnoreFile)).toBe(true)
  })
})

describe('resolveFormats() and keepsFile()', () => {
  test('no block is no rule, and the extensions are in lowercase, once each', () => {
    expect(resolveFormats()).toEqual({})
    expect(resolveFormats({})).toEqual({})
    expect(
      resolveFormats({ web: { fonts: ['.WOFF2', '.woff2', '.ttf'], icons: [] }, ios: {} })
    ).toEqual({ web: { fonts: ['.woff2', '.ttf'], icons: [] } })
  })

  test('names every problem of a block', () => {
    expect(() => resolveFormats(['.ttf'])).toThrow(
      'chassis.formats is an object of type folders by platform'
    )
    expect(() =>
      resolveFormats({
        windows: { fonts: ['.ttf'] },
        web: { fonts: ['ttf'], data: ['.json'], images: '.png', icons: ['.svg', 7] },
        ios: ['.ttf']
      })
    ).toThrow(
      'chassis.formats is not valid:\n' +
        '  - "windows" is not a platform. Known: web, ios, android\n' +
        '  - "fonts" of "web" is a list of extensions, such as [".woff2", ".txt"]\n' +
        '  - "data" of "web" is not a type folder with formats. Known: fonts, images, icons\n' +
        '  - "images" of "web" is a list of extensions, such as [".woff2", ".txt"]\n' +
        '  - "icons" of "web" is a list of extensions, such as [".woff2", ".txt"]\n' +
        '  - "ios" is an object of extensions by type folder'
    )
  })

  test('the types with formats are the three that a processor has a rule for', () => {
    expect(FORMAT_TYPES).toEqual(['fonts', 'images', 'icons'])
  })

  test.each([
    [webProcessor, 'fonts', 'text.woff2', true],
    [webProcessor, 'fonts', 'text.ttf', false],
    [iosProcessor, 'fonts', 'text.ttf', true],
    [iosProcessor, 'images', 'photo.webp', false],
    [iosProcessor, 'icons', 'star.png', true],
    [androidProcessor, 'icons', 'star.png', false],
    [androidProcessor, 'images', 'photo.webp', true],
    [webProcessor, null, 'brand.tokens.json', true]
  ])('without a block, %o keeps of %s the file %s: %s', (processor, type, name, kept) => {
    expect(keepsFile(processor, type, name)).toBe(kept)
    expect(keepsFile(processor, type, name, {})).toBe(kept)
    expect(keepsFile(processor, type, name, { desktop: { fonts: ['.ttf'] } })).toBe(kept)
  })

  test('a list of the block is the rule of its platform and type, and of no other', () => {
    const formats = resolveFormats({
      web: { fonts: ['.woff2', '.ttf'] },
      ios: { images: ['.png', '.webp'], icons: [] }
    })
    expect(keepsFile(webProcessor, 'fonts', 'text.ttf', formats)).toBe(true)
    expect(keepsFile(webProcessor, 'fonts', 'TEXT.TTF', formats)).toBe(true)
    expect(keepsFile(webProcessor, 'fonts', 'text.woff', formats)).toBe(false)
    expect(keepsFile(webProcessor, 'fonts', 'text.css', formats)).toBe(false)
    expect(keepsFile(webProcessor, 'icons', 'arrow.pdf', formats)).toBe(true)
    expect(keepsFile(iosProcessor, 'images', 'photo.webp', formats)).toBe(true)
    expect(keepsFile(iosProcessor, 'images', 'mark.svg', formats)).toBe(false)
    expect(keepsFile(iosProcessor, 'icons', 'arrow.svg', formats)).toBe(false)
    expect(keepsFile(iosProcessor, 'fonts', 'text.ttf', formats)).toBe(true)
    expect(keepsFile(androidProcessor, 'fonts', 'text.woff2', formats)).toBe(false)
    expect(keepsFile(webProcessor, null, 'notes.ttf', formats)).toBe(true)
  })
})

describe('hasAllowedExtension() and isExcluded()', () => {
  test.each([
    ['text.woff2', ['.woff', '.woff2'], true],
    ['TEXT.WOFF2', ['.woff2'], true],
    ['text.ttf', ['.woff', '.woff2'], false],
    ['README', ['.woff2'], false],
    ['text.woff2', [], false]
  ])('hasAllowedExtension(%s, %j) is %s', (name, list, expected) => {
    expect(hasAllowedExtension(name, list)).toBe(expected)
  })

  test.each([
    ['photo.webp', ['.webp'], true],
    ['photo.WebP', ['.webp'], true],
    ['photo.png', ['.webp'], false],
    ['photo.webp', [], false]
  ])('isExcluded(%s, %j) is %s', (name, list, expected) => {
    expect(isExcluded(name, list)).toBe(expected)
  })
})

describe('isLfsPointer()', () => {
  test.each([
    ['a pointer', LFS_POINTER, true],
    ['an empty file', '', false],
    ['a text file', 'version 1\n', false],
    ['a large file that starts like a pointer', LFS_POINTER + 'x'.repeat(2048), false]
  ])('%s → %s', (_, content, expected) => {
    const file = path.join(tempDir(), 'file.png')
    fs.writeFileSync(file, content)
    expect(isLfsPointer(file)).toBe(expected)
  })

  test('no file of the fixture is a pointer', () => {
    for (const file of listFiles(path.join(FIXTURE, 'source'))) {
      expect(isLfsPointer(path.join(FIXTURE, 'source', file)), file).toBe(false)
    }
  })
})

describe('cleanupEmptyDirectories()', () => {
  test('removes empty folders and keeps folders with files', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const root = tempDir()
    fs.mkdirSync(path.join(root, 'out/images/drawable'), { recursive: true })
    fs.mkdirSync(path.join(root, 'out/fonts/nested/deeper'), { recursive: true })
    fs.mkdirSync(path.join(root, 'out/icons'), { recursive: true })
    fs.writeFileSync(path.join(root, 'out/icons/arrow.svg'), 'svg')

    cleanupEmptyDirectories(path.join(root, 'out'))

    expect(fs.existsSync(path.join(root, 'out/images'))).toBe(false)
    expect(fs.existsSync(path.join(root, 'out/fonts'))).toBe(false)
    expect(listFiles(path.join(root, 'out'))).toEqual(['icons/arrow.svg'])
  })

  test('removes the folder itself when nothing is left in it', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const root = tempDir()
    fs.mkdirSync(path.join(root, 'out/a/b'), { recursive: true })
    cleanupEmptyDirectories(path.join(root, 'out'))
    expect(fs.existsSync(path.join(root, 'out'))).toBe(false)
  })

  test('does nothing for a missing folder', () => {
    expect(() => cleanupEmptyDirectories(path.join(tempDir(), 'missing'))).not.toThrow()
  })
})

describe('createCollisionTracker()', () => {
  test('warns when a second file is renamed to a name in the same folder', () => {
    const tracker = createCollisionTracker()
    expect(tracker.track('/out/images', 'My_Icon.png', 'my-icon.png')).toBeNull()
    expect(tracker.track('/out/images', 'my icon.png', 'my-icon.png')).toBe(
      'Filename collision: "my icon.png" → "my-icon.png" (conflicts with "My_Icon.png")'
    )
  })

  test('the same name in another folder is no collision', () => {
    const tracker = createCollisionTracker()
    expect(tracker.track('/out/a', 'X.png', 'x.png')).toBeNull()
    expect(tracker.track('/out/b', 'X.png', 'x.png')).toBeNull()
  })

  test('clear() forgets the names', () => {
    const tracker = createCollisionTracker()
    tracker.track('/out', 'X.png', 'x.png')
    tracker.clear()
    expect(tracker.track('/out', 'X.png', 'x.png')).toBeNull()
  })

  test('the same source name again is an override, not a collision', () => {
    const tracker = createCollisionTracker()
    expect(tracker.track('/out', 'mark.svg', 'mark.svg')).toBeNull()
    expect(tracker.track('/out', 'mark.svg', 'mark.svg')).toBeNull()
  })

  test('seen() returns the source name an output name was written from', () => {
    const tracker = createCollisionTracker()
    expect(tracker.seen('/out', 'x.png')).toBeUndefined()
    tracker.track('/out', 'X.png', 'x.png')
    expect(tracker.seen('/out', 'x.png')).toBe('X.png')
  })
})

describe('loadConfig()', () => {
  test('reads the chassis block of package.json in cwd', () => {
    expect(loadConfig(FIXTURE)).toEqual({
      brands: ['alpha', 'beta'],
      apps: { site: ['web'], mobile: ['ios', 'android'] },
      brandFolder: '_default',
      contracts: [
        expect.objectContaining({ job: 'web/site/alpha', files: expect.any(Array) }),
        expect.objectContaining({ job: 'web/site/alpha', sets: expect.any(Array) })
      ],
      lintAllow: [],
      ignore: [],
      formats: {},
      name: 'chassis-assets-fixture',
      version: '0.0.0-fixture'
    })
  })

  test('reads chassis.ignore and chassis.formats, checked', () => {
    const root = withChassis({
      ignore: ['*.bak', 'notes.md'],
      formats: { web: { fonts: ['.woff2', '.TTF'] } }
    })
    expect(loadConfig(root)).toMatchObject({
      ignore: ['*.bak', 'notes.md'],
      formats: { web: { fonts: ['.woff2', '.ttf'] } }
    })
    expect(() => loadConfig(withChassis({ ignore: 'notes.md' }))).toThrow(
      'chassis.ignore is a list of names'
    )
    expect(() => loadConfig(withChassis({ formats: { web: ['.ttf'] } }))).toThrow(
      'chassis.formats is not valid'
    )
  })

  test('defaults the fallback brand folder to _default', () => {
    const dir = tempDir()
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'x' }))
    expect(loadConfig(dir)).toMatchObject({
      brands: [],
      apps: {},
      brandFolder: '_default',
      contracts: [],
      lintAllow: []
    })
  })
})

describe('parseArgs()', () => {
  const defaults = {
    brands: [],
    apps: [],
    platforms: [],
    types: [],
    include: [],
    clean: null,
    quiet: false,
    cwd: undefined,
    out: undefined,
    dryRun: false,
    watch: false,
    allowLfsPointers: false,
    vectorDrawables: false,
    assetCatalog: false,
    res: false,
    optimize: false,
    webp: false,
    avif: false,
    subset: false,
    split: null,
    help: false,
    version: false
  }

  test.each([
    [[], {}],
    [['--brand', 'alpha'], { brands: ['alpha'] }],
    [['--brand', 'alpha', 'beta', '--app', 'site'], { brands: ['alpha', 'beta'], apps: ['site'] }],
    [['--platform', 'ios', '--platform', 'android'], { platforms: ['ios', 'android'] }],
    [['--clean'], { clean: true }],
    [['--no-clean'], { clean: false }],
    [['--out', 'build/out', '--cwd', '..'], { out: 'build/out', cwd: '..' }],
    [
      ['--dry-run', '--quiet', '--allow-lfs-pointers'],
      { dryRun: true, quiet: true, allowLfsPointers: true }
    ],
    [['--vector-drawables'], { vectorDrawables: true }],
    [['--asset-catalog'], { assetCatalog: true }],
    [['--res'], { res: true }],
    [['--watch'], { watch: true }],
    [
      ['--type', 'images', 'icons', '--include', 'images/home/**'],
      { types: ['images', 'icons'], include: ['images/home/**'] }
    ],
    [['--optimize'], { optimize: true }],
    [['--webp', '--avif'], { webp: true, avif: true }],
    [['--subset'], { subset: true }],
    [['--subset', '--quiet'], { subset: true, quiet: true }],
    [['--subset', 'latin', '--split'], { subset: ['latin'], split: true }],
    [['--no-split', '--subset'], { subset: true, split: false }],
    [
      ['--subset', 'latin', 'U+0370-03FF', '--brand', 'alpha'],
      { subset: ['latin', 'U+0370-03FF'], brands: ['alpha'] }
    ],
    [['--help'], { help: true }],
    [['-h'], { help: true }],
    [['--version'], { version: true }],
    [['-v'], { version: true }]
  ])('%j', (argv, expected) => {
    expect(parseArgs(argv)).toEqual({ ...defaults, ...expected })
  })

  test.each([
    [['--brand'], '--brand needs at least one value'],
    [['--app', '--clean'], '--app needs at least one value'],
    [['--out'], '--out needs a value'],
    [['--cwd', '--clean'], '--cwd needs a value'],
    [['--brands', 'alpha'], 'Unknown option --brands'],
    [['alpha'], 'Unknown option alpha']
  ])('%j fails', (argv, message) => {
    expect(() => parseArgs(argv)).toThrow(message)
  })
})

describe('planJobs()', () => {
  const config = loadConfig(FIXTURE)
  const names = (jobs) => jobs.map((job) => `${job.platform}/${job.app}/${job.brand}`)

  test('every brand, every app, every platform of the app', () => {
    expect(names(planJobs(config))).toEqual([
      'web/site/alpha',
      'ios/mobile/alpha',
      'android/mobile/alpha',
      'web/site/beta',
      'ios/mobile/beta',
      'android/mobile/beta'
    ])
  })

  test.each([
    [{ brands: ['beta'] }, ['web/site/beta', 'ios/mobile/beta', 'android/mobile/beta']],
    [{ apps: ['site'] }, ['web/site/alpha', 'web/site/beta']],
    [{ platforms: ['android'] }, ['android/mobile/alpha', 'android/mobile/beta']],
    [{ brands: ['alpha'], platforms: ['ios', 'web'] }, ['web/site/alpha', 'ios/mobile/alpha']]
  ])('filters %j', (filters, expected) => {
    expect(names(planJobs(config, filters))).toEqual(expected)
  })

  test.each([
    [{ brands: ['nope'] }, 'Unknown brand "nope". Configured: alpha, beta'],
    [{ brands: ['nope', 'gone'] }, 'Unknown brands "nope", "gone". Configured: alpha, beta'],
    [{ apps: ['docs'] }, 'Unknown app "docs". Configured: site, mobile'],
    [{ platforms: ['windows'] }, 'Unknown platform "windows". Configured: web, ios, android'],
    [{ apps: ['site'], platforms: ['ios'] }, 'The filters select no job']
  ])('fails for %j', (filters, message) => {
    expect(() => planJobs(config, filters)).toThrow(message)
  })
})

describe('generateAssets()', () => {
  test('returns the statistics of the run', async () => {
    const { stats } = await build()
    expect(stats.errors).toEqual([])
    expect(stats.warnings).toEqual([])
    expect(stats.jobs.map((job) => `${job.platform}/${job.app}/${job.brand}`)).toHaveLength(6)
    expect(stats.filesProcessed).toBe(listFiles(GOLDEN).length)
  })

  test('a brand file overrides the default file of the same path', async () => {
    const { out } = await build()
    const source = path.join(FIXTURE, 'source')
    expect(read(out, 'web/site/alpha/images/logo/mark.svg')).toBe(
      read(source, 'alpha/site/images/logo/mark.svg')
    )
    expect(read(out, 'web/site/beta/images/logo/mark.svg')).toBe(
      read(source, '_default/site/images/logo/mark.svg')
    )
    expect(read(out, 'android/mobile/alpha/images/logo/drawable-xhdpi/mark.png')).toBe(
      read(source, 'alpha/mobile/images/logo/mark@2x.png')
    )
    expect(read(out, 'ios/mobile/beta/images/logo/mark@2x.png')).toBe(
      read(source, '_default/mobile/images/logo/mark@2x.png')
    )
  })

  test('a brand-only file goes to that brand only', async () => {
    const { out } = await build()
    expect(fs.existsSync(path.join(out, 'web/site/alpha/images/alpha-only.png'))).toBe(true)
    expect(fs.existsSync(path.join(out, 'web/site/beta/images/alpha-only.png'))).toBe(false)
    expect(fs.existsSync(path.join(out, 'ios/mobile/alpha/fonts/display.ttf'))).toBe(true)
    expect(fs.existsSync(path.join(out, 'ios/mobile/beta/fonts/display.ttf'))).toBe(false)
  })

  test('a shared file goes to every app of its brand, under the files of the app', async () => {
    const { out } = await build()
    const source = path.join(FIXTURE, 'source')
    // The shared folder of the default brand reaches every brand and app
    for (const job of ['web/site/beta', 'ios/mobile/beta', 'android/mobile/beta']) {
      expect(read(out, `${job}/data/notice.txt`)).toBe(
        read(source, '_default/_shared/data/notice.txt')
      )
    }
    // The shared folder of a brand wins over the default brand, in every app
    for (const job of ['web/site/alpha', 'ios/mobile/alpha', 'android/mobile/alpha']) {
      expect(read(out, `${job}/data/notice.txt`)).toBe(
        read(source, 'alpha/_shared/data/notice.txt')
      )
    }
    expect(read(out, 'ios/mobile/alpha/images/logo/mark.svg')).toBe(
      read(source, 'alpha/_shared/images/logo/mark.svg')
    )
    expect(read(out, 'android/mobile/alpha/images/logo/drawable/mark.svg')).toBe(
      read(source, 'alpha/_shared/images/logo/mark.svg')
    )
    // An app file of the brand wins over its shared file
    expect(read(out, 'web/site/alpha/images/logo/mark.svg')).toBe(
      read(source, 'alpha/site/images/logo/mark.svg')
    )
    // A shared folder is no app, and no output folder is named after it
    expect(fs.existsSync(path.join(out, 'web/_shared'))).toBe(false)
  })

  test('a default brand with a shared folder and no folder for an app builds the app', async () => {
    const root = copyFixture()
    fs.rmSync(path.join(root, 'source/_default/site'), { recursive: true })
    const { out, stats } = await build({ cwd: root, apps: ['site'] })
    expect(stats.errors).toEqual([])
    expect(listFiles(path.join(out, 'web/site/beta'))).toEqual(['data/notice.txt'])
  })

  test('a default brand without the app and without a shared folder is an error', async () => {
    const root = copyFixture()
    fs.rmSync(path.join(root, 'source/_default/site'), { recursive: true })
    fs.rmSync(path.join(root, 'source/_default/_shared'), { recursive: true })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(build({ cwd: root, apps: ['site'] })).rejects.toThrow(
      'Default source path does not exist: source/_default/site'
    )
  })

  test('the source is not changed', async () => {
    const before = listFiles(path.join(FIXTURE, 'source'))
    await build()
    expect(listFiles(path.join(FIXTURE, 'source'))).toEqual(before)
  })

  test('fails for a configuration without the default brand folder', async () => {
    const root = copyFixture()
    fs.rmSync(path.join(root, 'source/_default'), { recursive: true })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(build({ cwd: root })).rejects.toThrow(
      'Default brand folder does not exist: source/_default'
    )
  })

  test.each([
    [{ brands: ['alpha', '_beta'] }, 'The brand "_beta" starts with _'],
    [{ apps: { site: ['web'], _shared: ['web'] } }, 'The app "_shared" starts with _']
  ])('fails for a reserved name in chassis.build: %j', async (block, message) => {
    const root = copyFixture()
    const pkg = JSON.parse(read(root, 'package.json'))
    Object.assign(pkg.chassis.build, block)
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg))
    await expect(build({ cwd: root })).rejects.toThrow(message)
  })

  test('fails for a platform without a processor', async () => {
    const root = copyFixture()
    const pkg = JSON.parse(read(root, 'package.json'))
    pkg.chassis.build.apps.site.push('windows')
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg))
    await expect(build({ cwd: root })).rejects.toThrow(
      'No processor for platform "windows" of app "site"'
    )
  })

  test('fails for an unknown filter value, naming the configured ones', async () => {
    await expect(build({ brands: ['nope'] })).rejects.toThrow('Configured: alpha, beta')
  })

  test('warns when two files are renamed to the same name', async () => {
    const root = copyFixture()
    fs.writeFileSync(path.join(root, 'source/_default/site/images/my_icon.png'), 'one')
    fs.writeFileSync(path.join(root, 'source/_default/site/images/my icon.png'), 'two')
    const { out, stats } = await build({ cwd: root, apps: ['site'], brands: ['beta'] })
    expect(stats.warnings).toHaveLength(1)
    expect(stats.warnings[0]).toMatch(/^Filename collision: "my[ _]icon\.png" → "my-icon\.png"/)
    expect(listFiles(path.join(out, 'web/site/beta/images'))).toContain('my-icon.png')
  })

  test('warns when a renamed file takes the name of a file that keeps its name', async () => {
    const root = copyFixture()
    fs.writeFileSync(path.join(root, 'source/_default/site/images/my-icon.png'), 'one')
    fs.writeFileSync(path.join(root, 'source/_default/site/images/My Icon.png'), 'two')
    const { out, stats } = await build({ cwd: root, apps: ['site'], brands: ['beta'] })
    expect(stats.warnings).toHaveLength(1)
    expect(stats.warnings[0]).toMatch(/^Filename collision: ".+" → "my-icon\.png" \(conflicts with/)
    const images = listFiles(path.join(out, 'web/site/beta/images'))
    expect(images.filter((file) => file === 'my-icon.png')).toHaveLength(1)
  })

  test('warns when Android drops the indicator of two variants outside images/', async () => {
    const root = copyFixture()
    fs.writeFileSync(path.join(root, 'source/_default/mobile/data/poster.png'), 'one')
    fs.writeFileSync(path.join(root, 'source/_default/mobile/data/poster@2x.png'), 'two')
    const { out, stats } = await build({ cwd: root, apps: ['mobile'], brands: ['beta'] })
    // iOS keeps the indicator, so only the Android job has a collision
    expect(stats.warnings).toHaveLength(1)
    expect(stats.warnings[0]).toMatch(/^Filename collision: "poster(@2x)?\.png" → "poster\.png"/)
    expect(fs.existsSync(path.join(out, 'ios/mobile/beta/data/poster@2x.png'))).toBe(true)
    expect(fs.existsSync(path.join(out, 'android/mobile/beta/data/poster.png'))).toBe(true)
  })

  test('warns when two Android images meet in one density folder', async () => {
    const root = copyFixture()
    fs.writeFileSync(path.join(root, 'source/_default/mobile/images/Side Bar@2x.png'), 'one')
    fs.writeFileSync(path.join(root, 'source/_default/mobile/images/side-bar@2x.png'), 'two')
    const { stats } = await build({ cwd: root, apps: ['mobile'], platforms: ['android'] })
    // Once per brand
    expect(stats.warnings).toHaveLength(2)
    expect(stats.warnings[0]).toMatch(/→ "side_bar\.png"/)
  })

  test('counts a file that a brand overrides once', async () => {
    const { out, stats } = await build({ brands: ['alpha'], apps: ['site'] })
    expect(stats.jobs[0].files).toBe(listFiles(path.join(out, 'web/site/alpha')).length)
  })
})

describe('chassis.ignore and chassis.formats', () => {
  test('a build without the blocks is the golden output', async () => {
    const { out } = await build({ cwd: withChassis({}) })
    expect(listFiles(out)).toEqual(listFiles(GOLDEN))
  })

  test('the build leaves out the files and the folders of chassis.ignore', async () => {
    const root = withChassis({ ignore: ['photo.*', 'svgs', '*-license.txt'] })
    const { out, stats } = await build({ cwd: root })
    const left = ['photo.', '/svgs/', 'license']
    const expected = listFiles(GOLDEN).filter((file) => !left.some((part) => file.includes(part)))
    expect(listFiles(out)).toEqual(expected)
    expect(expected.length).toBeLessThan(listFiles(GOLDEN).length)
    expect(stats.warnings).toEqual([])
    expect(listFiles(path.join(root, 'source'))).toEqual(listFiles(path.join(FIXTURE, 'source')))
  })

  test('a list of chassis.formats is what a platform keeps of a type', async () => {
    const root = withChassis({
      formats: {
        web: { fonts: ['.woff2', '.ttf', '.txt'], icons: ['.svg'] },
        ios: { images: ['.png', '.webp'] }
      }
    })
    const { out } = await build({ cwd: root })
    expect(listFiles(path.join(out, 'web/site/alpha/fonts'))).toEqual([
      'text-license.txt',
      'text.ttf',
      'text.woff2'
    ])
    expect(listFiles(path.join(out, 'web/site/alpha/icons'))).toEqual([
      'arrow-right.svg',
      'svgs/check-mark.svg'
    ])
    const images = listFiles(path.join(out, 'ios/mobile/alpha/images'))
    expect(images).toContain('photo.webp')
    expect(images).not.toContain('logo/mark.svg')
    // What the block does not name is as it was
    const untouched = (/** @type {string} */ file) =>
      !/^web\/site\/[a-z]+\/(fonts|icons)\//.test(file) &&
      !/^ios\/mobile\/[a-z]+\/images\//.test(file)
    expect(listFiles(out).filter(untouched)).toEqual(listFiles(GOLDEN).filter(untouched))
  })

  test('the validator and the Git LFS paths follow the blocks', async () => {
    const root = withChassis({
      ignore: ['photo.*'],
      formats: { web: { fonts: ['.woff2', '.ttf', '.txt'] }, ios: { images: ['.png', '.webp'] } }
    })
    await build({ cwd: root, out: 'dist' })
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const validator = new DistValidator({ cwd: root })
    expect(await validator.runValidation()).toBe(true)
    expect(validator.errors).toEqual([])

    const paths = lfsInclude({ cwd: root, apps: ['site'], types: ['fonts', 'images'] })
    expect(paths).toContain('source/_default/site/fonts/text.ttf')
    expect(paths).not.toContain('source/_default/site/fonts/text.woff')
    expect(paths.join(',')).not.toContain('photo')
  })

  test('a block that is not valid fails the build before the output is removed', async () => {
    const root = withChassis({ formats: { web: { fonts: ['ttf'] } } })
    fs.mkdirSync(path.join(root, 'dist'))
    fs.writeFileSync(path.join(root, 'dist/keep.txt'), 'kept')
    await expect(build({ cwd: root, out: 'dist' })).rejects.toThrow(
      'chassis.formats is not valid:\n  - "fonts" of "web" is a list of extensions'
    )
    await expect(
      build({ cwd: withChassis({ ignore: ['source/_default'] }), out: 'dist' })
    ).rejects.toThrow('chassis.ignore is not valid')
    expect(read(root, 'dist/keep.txt')).toBe('kept')
  })
})

describe('cleaning the output (D6)', () => {
  /** A full build with a stray file in two jobs' folders. */
  async function withStrays() {
    const { out } = await build()
    fs.writeFileSync(path.join(out, 'web/site/alpha/stray.txt'), 'stray')
    fs.writeFileSync(path.join(out, 'ios/mobile/beta/stray.txt'), 'stray')
    fs.writeFileSync(path.join(out, 'stray.txt'), 'stray')
    return out
  }
  const has = (out, file) => fs.existsSync(path.join(out, file))

  test('a full build removes the output first', async () => {
    const out = await withStrays()
    await build({ out })
    expect(has(out, 'stray.txt')).toBe(false)
    expect(has(out, 'web/site/alpha/stray.txt')).toBe(false)
    expect(has(out, 'ios/mobile/beta/stray.txt')).toBe(false)
  })

  test('a full build with clean: false keeps it', async () => {
    const out = await withStrays()
    await build({ out, clean: false })
    expect(has(out, 'stray.txt')).toBe(true)
    expect(has(out, 'web/site/alpha/stray.txt')).toBe(true)
  })

  test('a filtered build keeps it', async () => {
    const out = await withStrays()
    await build({ out, brands: ['alpha'], apps: ['site'] })
    expect(has(out, 'web/site/alpha/stray.txt')).toBe(true)
    expect(has(out, 'ios/mobile/beta/stray.txt')).toBe(true)
  })

  test('a filtered build with clean: true removes the selected jobs only', async () => {
    const out = await withStrays()
    await build({ out, brands: ['alpha'], apps: ['site'], clean: true })
    expect(has(out, 'web/site/alpha/stray.txt')).toBe(false)
    expect(has(out, 'web/site/alpha/images/hero-banner.png')).toBe(true)
    expect(has(out, 'ios/mobile/beta/stray.txt')).toBe(true)
    expect(has(out, 'stray.txt')).toBe(true)
  })
})

describe('dry run', () => {
  test('writes nothing and counts the files of each job', async () => {
    const out = path.join(tempDir(), 'out')
    const { stats } = await build({ out, dryRun: true })
    expect(fs.existsSync(out)).toBe(false)
    expect(stats.jobs).toEqual([
      // The files of the output: the default brand has one shared file, the brand has one
      // file of its own per job, and a file that replaces another is counted once
      { brand: 'alpha', app: 'site', platform: 'web', files: 16 + 1 + 1 },
      { brand: 'alpha', app: 'mobile', platform: 'ios', files: 16 + 1 + 1 },
      { brand: 'alpha', app: 'mobile', platform: 'android', files: 15 + 1 + 1 },
      { brand: 'beta', app: 'site', platform: 'web', files: 16 + 1 },
      { brand: 'beta', app: 'mobile', platform: 'ios', files: 16 + 1 },
      { brand: 'beta', app: 'mobile', platform: 'android', files: 15 + 1 }
    ])
  })

  test('keeps an existing output', async () => {
    const { out } = await build()
    const before = listFiles(out)
    await build({ out, dryRun: true })
    expect(listFiles(out)).toEqual(before)
  })
})

describe('Git LFS pointers', () => {
  function withPointer() {
    const root = copyFixture()
    fs.writeFileSync(path.join(root, 'source/_default/site/images/pointer.png'), LFS_POINTER)
    return root
  }

  test('a pointer in source/ fails the build, naming the file and the fix', async () => {
    vi.stubEnv('CHASSIS_ALLOW_LFS_POINTERS', '')
    const error = await build({ cwd: withPointer() }).catch((e) => e)
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toContain('are Git LFS pointers')
    expect(error.message).toContain('source/_default/site/images/pointer.png')
    expect(error.message).toContain('git lfs pull')
    expect(error.message).toContain('--allow-lfs-pointers')
  })

  test('allowLfsPointers copies the pointer', async () => {
    const { out } = await build({ cwd: withPointer(), allowLfsPointers: true })
    expect(read(out, 'web/site/alpha/images/pointer.png')).toBe(LFS_POINTER)
  })

  test('CHASSIS_ALLOW_LFS_POINTERS=1 does the same', async () => {
    vi.stubEnv('CHASSIS_ALLOW_LFS_POINTERS', '1')
    const { out } = await build({ cwd: withPointer() })
    expect(read(out, 'web/site/beta/images/pointer.png')).toBe(LFS_POINTER)
  })
})
