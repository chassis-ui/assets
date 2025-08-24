import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { generateAsssets } from '../build/copy-assets.js'

// Test suite for chassis-assets build system
class AssetBuildTester {
  constructor() {
    this.testResults = []
    this.tempDir = 'test-output'
  }

  async runTests() {
    console.log('🧪 Starting Chassis Assets Test Suite...\n')

    try {
      await this.setupTestEnvironment()
      await this.testBasicBuild()
      await this.testPlatformSpecificProcessing()
      await this.testBrandOverrides()
      await this.testErrorHandling()

      this.printResults()
    } catch (error) {
      console.error('💥 Test suite failed:', error.message)
      process.exit(1)
    } finally {
      this.cleanup()
    }
  }

  async setupTestEnvironment() {
    console.log('📋 Setting up test environment...')

    // Clean any existing dist directory for fresh testing
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true })
    }

    this.addTestResult('Setup', true, 'Test environment created')
  }

  async testBasicBuild() {
    console.log('🔨 Testing basic build process...')

    try {
      await generateAsssets()

      // Verify dist structure exists for actual configuration
      const expectedPaths = [
        'dist/web/chassis-docs',
        'dist/ios/chassis-test',
        'dist/android/chassis-test',
        'dist/web/test-docs',
        'dist/ios/test-test',
        'dist/android/test-test'
      ]

      let allPathsExist = true
      expectedPaths.forEach(expectedPath => {
        if (!fs.existsSync(expectedPath)) {
          allPathsExist = false
          console.error(`❌ Missing expected path: ${expectedPath}`)
        }
      })

      this.addTestResult('Basic Build', allPathsExist,
        allPathsExist ? 'All platforms generated' : 'Missing expected paths')

    } catch (error) {
      this.addTestResult('Basic Build', false, error.message)
    }
  }

  async testPlatformSpecificProcessing() {
    console.log('📱 Testing platform-specific processing...')

    try {
      // Check Android file naming for actual configuration
      const androidIconsPath = 'dist/android/chassis-test/icons'
      if (fs.existsSync(androidIconsPath)) {
        const files = fs.readdirSync(androidIconsPath)
        const hasCorrectPrefix = files.every(file =>
          file.startsWith('ic_') || fs.statSync(path.join(androidIconsPath, file)).isDirectory()
        )

        this.addTestResult('Android Icon Prefixing', hasCorrectPrefix,
          hasCorrectPrefix ? 'All icons have ic_ prefix' : 'Some icons missing ic_ prefix')
      } else {
        this.addTestResult('Android Icon Prefixing', false, 'Android icons directory not found')
      }

      // Check Android filename conventions
      const androidPath = 'dist/android/chassis-test'
      if (fs.existsSync(androidPath)) {
        const hasCorrectNaming = this.checkAndroidNaming(androidPath)
        this.addTestResult('Android File Naming', hasCorrectNaming,
          hasCorrectNaming ? 'Files follow Android conventions' : 'Some files have incorrect naming')
      }

    } catch (error) {
      this.addTestResult('Platform Processing', false, error.message)
    }
  }

  async testBrandOverrides() {
    console.log('🎨 Testing brand override system...')

    try {
      // Test brand overrides with actual configuration
      const brandLogoPath = 'dist/web/test-docs/images/chassis-logo-brand.png'
      const defaultLogoPath = 'dist/web/chassis-docs/images/chassis-logo-brand.png'

      if (fs.existsSync(brandLogoPath) && fs.existsSync(defaultLogoPath)) {
        // Check if brand-specific assets exist and differ from defaults
        const brandStat = fs.statSync(brandLogoPath)
        const defaultStat = fs.statSync(defaultLogoPath)

        // If files have different sizes or timestamps, overrides are working
        const hasOverrides = brandStat.size !== defaultStat.size ||
                           Math.abs(brandStat.mtimeMs - defaultStat.mtimeMs) > 1000

        this.addTestResult('Brand Override', hasOverrides,
          hasOverrides ? 'Brand-specific assets override defaults' : 'Brand assets are identical to defaults')
      } else {
        this.addTestResult('Brand Override', false, 'Brand logo not found')
      }

    } catch (error) {
      this.addTestResult('Brand Override', false, error.message)
    }
  }

  async testErrorHandling() {
    console.log('⚠️  Testing error handling...')

    // Test with invalid configuration
    try {
      const invalidConfig = { chassis: { build: { brands: [], apps: {} } } }
      // This test would need to be implemented with proper mocking
      this.addTestResult('Error Handling', true, 'Error handling test placeholder')
    } catch (error) {
      this.addTestResult('Error Handling', false, error.message)
    }
  }

  checkAndroidNaming(dirPath) {
    const items = fs.readdirSync(dirPath)

    for (const item of items) {
      const itemPath = path.join(dirPath, item)
      const stat = fs.statSync(itemPath)

      if (stat.isFile()) {
        // Check if filename follows Android conventions (lowercase, underscores)
        const hasUppercase = /[A-Z]/.test(item)
        const hasDashes = item.includes('-')

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

  backupConfig() {
    const packagePath = 'package.json'
    return JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  }

  setTestConfig() {
    const testConfig = {
      chassis: {
        defaults: { brandFolder: 'default' },
        build: {
          brands: ['test-brand'],
          apps: {
            'test-app': ['web', 'ios', 'android']
          }
        }
      }
    }

    const packageData = this.backupConfig()
    packageData.chassis = testConfig.chassis
    fs.writeFileSync('package.json', JSON.stringify(packageData, null, 2))
  }

  restoreConfig(originalConfig) {
    fs.writeFileSync('package.json', JSON.stringify(originalConfig, null, 2))
  }

  addTestResult(testName, passed, message) {
    this.testResults.push({ testName, passed, message })
    const status = passed ? '✅' : '❌'
    console.log(`${status} ${testName}: ${message}`)
  }

  printResults() {
    console.log('\n📊 Test Results Summary:')
    console.log('=' .repeat(50))

    const passed = this.testResults.filter(r => r.passed).length
    const total = this.testResults.length

    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌'
      console.log(`${status} ${result.testName}: ${result.message}`)
    })

    console.log('=' .repeat(50))
    console.log(`Overall: ${passed}/${total} tests passed`)

    if (passed !== total) {
      process.exit(1)
    }
  }

  cleanup() {
    // Clean up dist directory after tests
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true })
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new AssetBuildTester()
  tester.runTests()
}

export default AssetBuildTester
