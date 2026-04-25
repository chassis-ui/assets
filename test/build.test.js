import fs from 'fs'
import path from 'path'
import { generateAsssets } from '../build/build-assets.js'

/**
 * Test suite for chassis-assets build system.
 * Tests build process, filtering, platform processing, and incremental builds.
 */
class AssetBuildTester {
  constructor() {
    this.testResults = []
    this.tempDir = 'test-output'
    this.originalArgv = process.argv
  }

  /**
   * Run all test suites.
   * @returns {Promise<void>}
   */
  async runTests() {
    console.log('🧪 Starting Chassis Assets Test Suite...\n')

    try {
      await this.setupTestEnvironment()
      await this.testBasicBuild()
      await this.testCommandLineFiltering()
      await this.testIncrementalBuilds()
      await this.testPlatformSpecificProcessing()
      await this.testBrandOverrides()

      this.printResults()
    } catch (error) {
      console.error('💥 Test suite failed:', error.message)
      console.error(error.stack)
      process.exit(1)
    } finally {
      this.cleanup()
    }
  }

  /**
   * Set up test environment by cleaning dist directory.
   * @returns {Promise<void>}
   */
  async setupTestEnvironment() {
    console.log('📋 Setting up test environment...')

    // Clean any existing dist directory for fresh testing
    if (fs.existsSync('dist')) {
      try {
        fs.rmSync('dist', { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
      } catch (error) {
        if (error.code === 'ENOTEMPTY') {
          // Fallback: Remove contents first, then directory
          try {
            const items = fs.readdirSync('dist')
            items.forEach((item) => {
              const itemPath = path.join('dist', item)
              fs.rmSync(itemPath, { recursive: true, force: true, maxRetries: 3 })
            })
            fs.rmdirSync('dist')
          } catch {
            console.warn('⚠️  Could not fully clean dist directory. Continuing with overwrite...')
          }
        } else {
          throw error
        }
      }
    }

    this.addTestResult('Setup', true, 'Test environment created')
  }

  /**
   * Test basic build process without filters.
   * Should build all brands, apps, and platforms.
   * @returns {Promise<void>}
   */
  async testBasicBuild() {
    console.log('🔨 Testing basic build process...')

    try {
      // Full build with no filters (should clean automatically)
      process.argv = ['node', 'build/build-assets.js']
      await generateAsssets({ quiet: true })

      // Verify dist structure exists for actual configuration
      // Config: brands: [chassis, example], apps: {docs: [web], demo: [ios, android]}
      const expectedPaths = [
        'dist/web/chassis-docs',
        'dist/web/example-docs',
        'dist/ios/chassis-demo',
        'dist/ios/example-demo',
        'dist/android/chassis-demo',
        'dist/android/example-demo'
      ]

      let allPathsExist = true
      const missingPaths = []

      expectedPaths.forEach((expectedPath) => {
        if (!fs.existsSync(expectedPath)) {
          allPathsExist = false
          missingPaths.push(expectedPath)
        }
      })

      if (!allPathsExist) {
        console.error(`❌ Missing expected paths: ${missingPaths.join(', ')}`)
      }

      this.addTestResult(
        'Basic Build',
        allPathsExist,
        allPathsExist ? 'All platforms generated correctly' : `Missing: ${missingPaths.join(', ')}`
      )
    } catch (error) {
      this.addTestResult('Basic Build', false, error.message)
    } finally {
      // Restore original argv
      process.argv = this.originalArgv
    }
  }

  /**
   * Test command-line filtering by brand, app, and platform.
   * @returns {Promise<void>}
   */
  async testCommandLineFiltering() {
    console.log('🎯 Testing command-line filtering...')

    try {
      // Test brand filtering
      process.argv = ['node', 'build/build-assets.js', '--clean', '--brand', 'chassis']
      await generateAsssets({ quiet: true })

      const expectedBrandPaths = [
        'dist/web/chassis-docs',
        'dist/ios/chassis-demo',
        'dist/android/chassis-demo'
      ]

      const unexpectedBrandPaths = [
        'dist/web/example-docs',
        'dist/ios/example-demo',
        'dist/android/example-demo'
      ]

      let brandFilterWorks = true
      expectedBrandPaths.forEach((p) => {
        if (!fs.existsSync(p)) {
          brandFilterWorks = false
          console.error(`❌ Missing expected brand-filtered path: ${p}`)
        }
      })

      unexpectedBrandPaths.forEach((p) => {
        if (fs.existsSync(p)) {
          brandFilterWorks = false
          console.error(`❌ Unexpected path exists (brand filter failed): ${p}`)
        }
      })

      this.addTestResult(
        'Brand Filtering',
        brandFilterWorks,
        brandFilterWorks ? 'Brand filtering works correctly' : 'Brand filtering failed'
      )

      // Test app filtering
      process.argv = ['node', 'build/build-assets.js', '--clean', '--app', 'docs']
      await generateAsssets({ quiet: true })

      const expectedAppPaths = ['dist/web/chassis-docs', 'dist/web/example-docs']

      const unexpectedAppPaths = [
        'dist/ios/chassis-demo',
        'dist/android/chassis-demo',
        'dist/ios/example-demo',
        'dist/android/example-demo'
      ]

      let appFilterWorks = true
      expectedAppPaths.forEach((p) => {
        if (!fs.existsSync(p)) {
          appFilterWorks = false
          console.error(`❌ Missing expected app-filtered path: ${p}`)
        }
      })

      unexpectedAppPaths.forEach((p) => {
        if (fs.existsSync(p)) {
          appFilterWorks = false
          console.error(`❌ Unexpected path exists (app filter failed): ${p}`)
        }
      })

      this.addTestResult(
        'App Filtering',
        appFilterWorks,
        appFilterWorks ? 'App filtering works correctly' : 'App filtering failed'
      )

      // Test platform filtering
      process.argv = ['node', 'build/build-assets.js', '--clean', '--platform', 'web']
      await generateAsssets({ quiet: true })

      const expectedPlatformPaths = ['dist/web/chassis-docs', 'dist/web/example-docs']

      const unexpectedPlatformPaths = [
        'dist/ios/chassis-demo',
        'dist/ios/example-demo',
        'dist/android/chassis-demo',
        'dist/android/example-demo'
      ]

      let platformFilterWorks = true
      expectedPlatformPaths.forEach((p) => {
        if (!fs.existsSync(p)) {
          platformFilterWorks = false
          console.error(`❌ Missing expected platform-filtered path: ${p}`)
        }
      })

      unexpectedPlatformPaths.forEach((p) => {
        if (fs.existsSync(p)) {
          platformFilterWorks = false
          console.error(`❌ Unexpected path exists (platform filter failed): ${p}`)
        }
      })

      this.addTestResult(
        'Platform Filtering',
        platformFilterWorks,
        platformFilterWorks ? 'Platform filtering works correctly' : 'Platform filtering failed'
      )

      // Test combined filtering
      process.argv = [
        'node',
        'build/build-assets.js',
        '--clean',
        '--brand',
        'example',
        '--platform',
        'ios'
      ]
      await generateAsssets({ quiet: true })

      const expectedCombinedPaths = ['dist/ios/example-demo']

      const unexpectedCombinedPaths = [
        'dist/web/chassis-docs',
        'dist/web/example-docs',
        'dist/ios/chassis-demo',
        'dist/android/chassis-demo',
        'dist/android/example-demo'
      ]

      let combinedFilterWorks = true
      expectedCombinedPaths.forEach((p) => {
        if (!fs.existsSync(p)) {
          combinedFilterWorks = false
          console.error(`❌ Missing expected combined-filtered path: ${p}`)
        }
      })

      unexpectedCombinedPaths.forEach((p) => {
        if (fs.existsSync(p)) {
          combinedFilterWorks = false
          console.error(`❌ Unexpected path exists (combined filter failed): ${p}`)
        }
      })

      this.addTestResult(
        'Combined Filtering',
        combinedFilterWorks,
        combinedFilterWorks ? 'Combined filtering works correctly' : 'Combined filtering failed'
      )
    } catch (error) {
      this.addTestResult('Command Line Filtering', false, error.message)
    } finally {
      // Restore original argv
      process.argv = this.originalArgv
    }
  }

  /**
   * Test incremental build behavior.
   * Selective builds should preserve existing files.
   * @returns {Promise<void>}
   */
  async testIncrementalBuilds() {
    console.log('🔄 Testing incremental build behavior...')

    try {
      // Step 1: Build chassis/web with clean
      process.argv = [
        'node',
        'build/build-assets.js',
        '--clean',
        '--brand',
        'chassis',
        '--platform',
        'web'
      ]
      await generateAsssets({ quiet: true })

      const firstBuildPath = 'dist/web/chassis-docs'
      if (!fs.existsSync(firstBuildPath)) {
        this.addTestResult('Incremental Builds', false, 'First build failed')
        return
      }

      // Step 2: Build example/ios without clean (should be incremental)
      process.argv = ['node', 'build/build-assets.js', '--brand', 'example', '--platform', 'ios']
      await generateAsssets({ quiet: true })

      const secondBuildPath = 'dist/ios/example-demo'
      const firstBuildStillExists = fs.existsSync(firstBuildPath)
      const secondBuildExists = fs.existsSync(secondBuildPath)

      const incrementalWorks = firstBuildStillExists && secondBuildExists

      if (!incrementalWorks) {
        if (!firstBuildStillExists) {
          console.error('❌ First build was deleted (incremental build not working)')
        }
        if (!secondBuildExists) {
          console.error('❌ Second build failed')
        }
      }

      this.addTestResult(
        'Incremental Builds',
        incrementalWorks,
        incrementalWorks
          ? 'Selective builds preserve existing files'
          : 'Incremental build deleted previous files'
      )

      // Test explicit --clean flag
      process.argv = [
        'node',
        'build/build-assets.js',
        '--clean',
        '--brand',
        'chassis',
        '--platform',
        'web'
      ]
      await generateAsssets({ quiet: true })

      const afterCleanBuild = fs.existsSync('dist/web/chassis-docs')
      const otherPlatformGone = !fs.existsSync('dist/ios/example-demo')

      const cleanFlagWorks = afterCleanBuild && otherPlatformGone

      this.addTestResult(
        'Clean Flag',
        cleanFlagWorks,
        cleanFlagWorks
          ? '--clean flag properly cleans dist before selective build'
          : '--clean flag not working correctly'
      )
    } catch (error) {
      this.addTestResult('Incremental Builds', false, error.message)
    } finally {
      process.argv = this.originalArgv
    }
  }

  /**
   * Test platform-specific processing rules.
   * @returns {Promise<void>}
   */
  async testPlatformSpecificProcessing() {
    console.log('📱 Testing platform-specific processing...')

    try {
      // Ensure we have a full build
      process.argv = ['node', 'build/build-assets.js', '--clean']
      await generateAsssets({ quiet: true })
      process.argv = this.originalArgv

      // Check Android file naming (should use underscores, not dashes)
      const androidPath = 'dist/android/chassis-demo'
      if (fs.existsSync(androidPath)) {
        const hasCorrectNaming = this.checkAndroidNaming(androidPath)
        this.addTestResult(
          'Android File Naming',
          hasCorrectNaming,
          hasCorrectNaming
            ? 'Files follow Android conventions (snake_case)'
            : 'Some files have incorrect naming'
        )
      } else {
        this.addTestResult('Android File Naming', false, 'Android path not found')
      }

      // Check iOS file naming (should use underscores, not dashes)
      const iosPath = 'dist/ios/chassis-demo'
      if (fs.existsSync(iosPath)) {
        const hasCorrectNaming = this.checkIOSNaming(iosPath)
        this.addTestResult(
          'iOS File Naming',
          hasCorrectNaming,
          hasCorrectNaming
            ? 'Files follow iOS conventions (snake_case)'
            : 'Some files have incorrect naming'
        )
      } else {
        this.addTestResult('iOS File Naming', false, 'iOS path not found')
      }

      // Check Web file naming (should use kebab-case)
      const webPath = 'dist/web/chassis-docs'
      if (fs.existsSync(webPath)) {
        const hasCorrectNaming = this.checkWebNaming(webPath)
        this.addTestResult(
          'Web File Naming',
          hasCorrectNaming,
          hasCorrectNaming
            ? 'Files follow web conventions (kebab-case)'
            : 'Some files have incorrect naming'
        )
      } else {
        this.addTestResult('Web File Naming', false, 'Web path not found')
      }

      // Check Android icon prefixing
      const androidIconsPath = 'dist/android/chassis-demo/icons'
      if (fs.existsSync(androidIconsPath)) {
        const files = fs.readdirSync(androidIconsPath).filter((f) => {
          const stat = fs.statSync(path.join(androidIconsPath, f))
          return stat.isFile()
        })

        const hasCorrectPrefix = files.every((file) => file.startsWith('ic_'))

        this.addTestResult(
          'Android Icon Prefixing',
          hasCorrectPrefix,
          hasCorrectPrefix
            ? 'All Android icon files have ic_ prefix'
            : 'Some icons missing ic_ prefix'
        )
      } else {
        this.addTestResult('Android Icon Prefixing', true, 'No Android icons to test (OK)')
      }
    } catch (error) {
      this.addTestResult('Platform Processing', false, error.message)
    }
  }

  /**
   * Test brand override system.
   * Brand-specific assets should exist alongside default assets.
   * @returns {Promise<void>}
   */
  async testBrandOverrides() {
    console.log('🎨 Testing brand override system...')

    try {
      // Ensure we have a full build
      process.argv = ['node', 'build/build-assets.js', '--clean']
      await generateAsssets({ quiet: true })
      process.argv = this.originalArgv

      // Check that both brands have their assets
      const chassisDocs = 'dist/web/chassis-docs'
      const exampleDocs = 'dist/web/example-docs'

      const chassisExists = fs.existsSync(chassisDocs)
      const exampleExists = fs.existsSync(exampleDocs)

      if (!chassisExists || !exampleExists) {
        this.addTestResult(
          'Brand Override',
          false,
          `Missing brand directories: ${!chassisExists ? 'chassis-docs ' : ''}${!exampleExists ? 'example-docs' : ''}`
        )
        return
      }

      // Check that brand folders have assets
      const chassisFiles = this.countFiles(chassisDocs)
      const exampleFiles = this.countFiles(exampleDocs)

      const hasAssets = chassisFiles > 0 && exampleFiles > 0

      this.addTestResult(
        'Brand Override',
        hasAssets,
        hasAssets
          ? `Brand assets built correctly (chassis: ${chassisFiles} files, example: ${exampleFiles} files)`
          : 'Brand directories are empty'
      )
    } catch (error) {
      this.addTestResult('Brand Override', false, error.message)
    }
  }

  /**
   * Check if Android files follow naming conventions (lowercase, underscores).
   * @param {string} dirPath - Directory path to check
   * @returns {boolean} True if conventions are followed
   */
  checkAndroidNaming(dirPath) {
    const items = fs.readdirSync(dirPath)

    for (const item of items) {
      const itemPath = path.join(dirPath, item)
      const stat = fs.statSync(itemPath)

      if (stat.isFile()) {
        // Check if filename follows Android conventions (lowercase, underscores)
        const hasUppercase = /[A-Z]/.test(item)
        const hasDashes = item.includes('-') && !item.includes('chassis-') // Allow chassis- prefix

        if (hasUppercase || hasDashes) {
          return false
        }
      } else if (stat.isDirectory()) {
        if (!this.checkAndroidNaming(itemPath)) {
          return false
        }
      }
    }

    return true
  }

  /**
   * Check if iOS files follow naming conventions (lowercase, underscores).
   * @param {string} dirPath - Directory path to check
   * @returns {boolean} True if conventions are followed
   */
  checkIOSNaming(dirPath) {
    const items = fs.readdirSync(dirPath)

    for (const item of items) {
      const itemPath = path.join(dirPath, item)
      const stat = fs.statSync(itemPath)

      if (stat.isFile()) {
        // Check if filename follows iOS conventions (lowercase, underscores)
        const hasUppercase = /[A-Z]/.test(item)
        const hasDashes = item.includes('-') && !item.includes('chassis-') // Allow chassis- prefix

        if (hasUppercase || hasDashes) {
          return false
        }
      } else if (stat.isDirectory()) {
        if (!this.checkIOSNaming(itemPath)) {
          return false
        }
      }
    }

    return true
  }

  /**
   * Check if web files follow naming conventions (lowercase, kebab-case).
   * @param {string} dirPath - Directory path to check
   * @returns {boolean} True if conventions are followed
   */
  checkWebNaming(dirPath) {
    const items = fs.readdirSync(dirPath)

    for (const item of items) {
      const itemPath = path.join(dirPath, item)
      const stat = fs.statSync(itemPath)

      if (stat.isFile()) {
        // Check if filename follows web conventions (lowercase, hyphens OK)
        const hasUppercase = /[A-Z]/.test(item)
        const hasUnderscores = item.includes('_')

        if (hasUppercase || hasUnderscores) {
          return false
        }
      } else if (stat.isDirectory()) {
        if (!this.checkWebNaming(itemPath)) {
          return false
        }
      }
    }

    return true
  }

  /**
   * Count files recursively in a directory.
   * @param {string} dirPath - Directory path
   * @returns {number} File count
   */
  countFiles(dirPath) {
    let count = 0
    const items = fs.readdirSync(dirPath)

    items.forEach((item) => {
      const itemPath = path.join(dirPath, item)
      const stat = fs.statSync(itemPath)

      if (stat.isFile()) {
        count++
      } else if (stat.isDirectory()) {
        count += this.countFiles(itemPath)
      }
    })

    return count
  }

  /**
   * Add a test result to the results array.
   * @param {string} testName - Name of the test
   * @param {boolean} passed - Whether the test passed
   * @param {string} message - Result message
   */
  addTestResult(testName, passed, message) {
    this.testResults.push({ testName, passed, message })
    const status = passed ? '✅' : '❌'
    console.log(`${status} ${testName}: ${message}`)
  }

  /**
   * Print test results summary and exit with appropriate code.
   */
  printResults() {
    console.log('\n📊 Test Results Summary:')
    console.log('='.repeat(50))

    const passed = this.testResults.filter((r) => r.passed).length
    const total = this.testResults.length

    this.testResults.forEach((result) => {
      const status = result.passed ? '✅' : '❌'
      console.log(`${status} ${result.testName}: ${result.message}`)
    })

    console.log('='.repeat(50))
    console.log(`Overall: ${passed}/${total} tests passed`)

    if (passed !== total) {
      process.exit(1)
    }
  }

  /**
   * Clean up test artifacts.
   */
  cleanup() {
    // Restore original argv
    process.argv = this.originalArgv

    // Clean up dist directory after tests
    if (fs.existsSync('dist')) {
      try {
        fs.rmSync('dist', { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
      } catch (error) {
        console.warn('⚠️  Could not clean up dist directory:', error.message)
      }
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new AssetBuildTester()
  tester.runTests()
}

export default AssetBuildTester
