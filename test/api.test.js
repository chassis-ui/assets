import fs from 'fs'
import ChassisAssets from '../build/api/index.js'

/**
 * Test suite for ChassisAssets API.
 * Tests configuration loading, inventory management, and API methods.
 */
class APITestSuite {
  constructor() {
    this.testResults = []
    this.api = null
  }

  /**
   * Run all test suites.
   * @returns {Promise<void>}
   */
  async runTests() {
    console.log('🧪 Starting Chassis Assets API Test Suite...\n')

    try {
      await this.setupTestEnvironment()
      await this.testConfigurationLoading()
      await this.testBrandAppPlatformMethods()
      await this.testCombinations()
      await this.testAssetsExist()
      await this.testAssetInventory()
      await this.testStatistics()
      await this.testValidation()

      this.printResults()
    } catch (error) {
      console.error('💥 Test suite failed:', error.message)
      console.error(error.stack)
      process.exit(1)
    }
  }

  /**
   * Set up test environment.
   * @returns {Promise<void>}
   */
  async setupTestEnvironment() {
    console.log('📋 Setting up test environment...')

    try {
      this.api = new ChassisAssets()
      this.addTestResult('Setup', true, 'API instance created successfully')
    } catch (error) {
      this.addTestResult('Setup', false, error.message)
      throw error
    }
  }

  /**
   * Test configuration loading.
   * @returns {Promise<void>}
   */
  async testConfigurationLoading() {
    console.log('⚙️  Testing configuration loading...')

    try {
      const hasConfig = this.api.config && typeof this.api.config === 'object'
      const hasBuildConfig = this.api.config.build && typeof this.api.config.build === 'object'
      const hasDefaults = this.api.config.defaults && typeof this.api.config.defaults === 'object'

      const configLoaded = hasConfig && hasBuildConfig && hasDefaults

      this.addTestResult(
        'Configuration Loading',
        configLoaded,
        configLoaded ? 'Configuration loaded from package.json' : 'Configuration loading failed'
      )

      // Test package info
      const hasPackageInfo =
        this.api.packageInfo && this.api.packageInfo.name && this.api.packageInfo.version

      this.addTestResult(
        'Package Info',
        hasPackageInfo,
        hasPackageInfo
          ? `Package: ${this.api.packageInfo.name}@${this.api.packageInfo.version}`
          : 'Package info not loaded'
      )
    } catch (error) {
      this.addTestResult('Configuration Loading', false, error.message)
    }
  }

  /**
   * Test brand, app, and platform methods.
   * @returns {Promise<void>}
   */
  async testBrandAppPlatformMethods() {
    console.log('🏷️  Testing brand/app/platform methods...')

    try {
      // Test getBrands
      const brands = this.api.getBrands()
      const brandsValid = Array.isArray(brands) && brands.length > 0

      this.addTestResult(
        'getBrands()',
        brandsValid,
        brandsValid ? `Returns ${brands.length} brands: ${brands.join(', ')}` : 'getBrands() failed'
      )

      // Test getApps
      const apps = this.api.getApps()
      const appsValid = Array.isArray(apps) && apps.length > 0

      this.addTestResult(
        'getApps()',
        appsValid,
        appsValid ? `Returns ${apps.length} apps: ${apps.join(', ')}` : 'getApps() failed'
      )

      // Test getPlatforms
      const firstApp = apps[0]
      const platforms = this.api.getPlatforms(firstApp)
      const platformsValid = Array.isArray(platforms) && platforms.length > 0

      this.addTestResult(
        'getPlatforms()',
        platformsValid,
        platformsValid
          ? `Returns ${platforms.length} platforms for ${firstApp}: ${platforms.join(', ')}`
          : 'getPlatforms() failed'
      )

      // Test getAllPlatforms
      const allPlatforms = this.api.getAllPlatforms()
      const allPlatformsValid = Array.isArray(allPlatforms) && allPlatforms.length > 0
      const noDuplicates = allPlatforms.length === new Set(allPlatforms).size

      this.addTestResult(
        'getAllPlatforms()',
        allPlatformsValid && noDuplicates,
        allPlatformsValid
          ? `Returns ${allPlatforms.length} unique platforms: ${allPlatforms.join(', ')}`
          : 'getAllPlatforms() failed'
      )
    } catch (error) {
      this.addTestResult('Brand/App/Platform Methods', false, error.message)
    }
  }

  /**
   * Test getCombinations method.
   * @returns {Promise<void>}
   */
  async testCombinations() {
    console.log('🔗 Testing combinations...')

    try {
      const combinations = this.api.getCombinations()
      const isArray = Array.isArray(combinations)
      const hasItems = combinations.length > 0

      // Verify structure of combinations
      const validStructure =
        combinations.length > 0 &&
        combinations.every(
          (combo) =>
            combo.brand &&
            typeof combo.brand === 'string' &&
            combo.app &&
            typeof combo.app === 'string' &&
            combo.platform &&
            typeof combo.platform === 'string'
        )

      // Calculate expected count
      const brands = this.api.getBrands()
      const apps = this.api.getApps()
      let expectedCount = 0
      brands.forEach(() => {
        apps.forEach((app) => {
          expectedCount += this.api.getPlatforms(app).length
        })
      })

      const correctCount = combinations.length === expectedCount

      const combinationsWork = isArray && hasItems && validStructure && correctCount

      this.addTestResult(
        'getCombinations()',
        combinationsWork,
        combinationsWork
          ? `Returns ${combinations.length} valid brand-app-platform combinations`
          : 'getCombinations() failed'
      )
    } catch (error) {
      this.addTestResult('getCombinations()', false, error.message)
    }
  }

  /**
   * Test assetsExist method.
   * @returns {Promise<void>}
   */
  async testAssetsExist() {
    console.log('📦 Testing assetsExist...')

    try {
      const brands = this.api.getBrands()
      const apps = this.api.getApps()

      if (brands.length === 0 || apps.length === 0) {
        this.addTestResult('assetsExist()', false, 'No brands or apps to test')
        return
      }

      const brand = brands[0]
      const app = apps[0]

      // Test source existence
      const sourceExists = this.api.assetsExist(brand, app, 'source')

      this.addTestResult(
        'assetsExist() - Source',
        sourceExists,
        sourceExists
          ? `Correctly detects source assets for ${brand}/${app}`
          : `Source assets check failed for ${brand}/${app}`
      )

      // Test dist existence
      const distExists = this.api.assetsExist(brand, app, 'dist')

      this.addTestResult(
        'assetsExist() - Dist',
        typeof distExists === 'boolean',
        typeof distExists === 'boolean'
          ? `Correctly checks dist assets for ${brand}/${app} (${distExists ? 'exists' : 'does not exist'})`
          : 'Dist assets check failed'
      )
    } catch (error) {
      this.addTestResult('assetsExist()', false, error.message)
    }
  }

  /**
   * Test getAssetInventory method.
   * @returns {Promise<void>}
   */
  async testAssetInventory() {
    console.log('📋 Testing asset inventory...')

    try {
      const brands = this.api.getBrands()
      const apps = this.api.getApps()

      if (brands.length === 0 || apps.length === 0) {
        this.addTestResult('getAssetInventory()', false, 'No brands or apps to test')
        return
      }

      const brand = brands[0]
      const app = apps[0]

      // Test source inventory
      const sourceInventory = this.api.getAssetInventory(brand, app)

      const hasCorrectStructure =
        sourceInventory &&
        sourceInventory.brand === brand &&
        sourceInventory.app === app &&
        Array.isArray(sourceInventory.fonts) &&
        Array.isArray(sourceInventory.images) &&
        Array.isArray(sourceInventory.icons) &&
        Array.isArray(sourceInventory.other)

      const hasAssets =
        sourceInventory.fonts.length > 0 ||
        sourceInventory.images.length > 0 ||
        sourceInventory.icons.length > 0 ||
        sourceInventory.other.length > 0

      const totalAssets =
        sourceInventory.fonts.length +
        sourceInventory.images.length +
        sourceInventory.icons.length +
        sourceInventory.other.length

      const inventoryWorks = hasCorrectStructure && hasAssets

      this.addTestResult(
        'getAssetInventory()',
        inventoryWorks,
        inventoryWorks
          ? `Returns valid inventory for ${brand}/${app} (${totalAssets} assets: ${sourceInventory.fonts.length} fonts, ${sourceInventory.icons.length} icons, ${sourceInventory.images.length} images, ${sourceInventory.other.length} other)`
          : 'getAssetInventory() failed'
      )

      // Test asset info structure
      const allAssets = [
        ...sourceInventory.fonts,
        ...sourceInventory.images,
        ...sourceInventory.icons,
        ...sourceInventory.other
      ]

      const validAssetInfo =
        allAssets.length === 0 ||
        allAssets.every(
          (asset) =>
            asset.name &&
            asset.path &&
            typeof asset.size === 'number' &&
            asset.extension !== undefined &&
            asset.directory !== undefined
        )

      this.addTestResult(
        'Asset Info Structure',
        validAssetInfo,
        validAssetInfo
          ? 'All assets have complete metadata (name, path, size, extension, directory)'
          : 'Asset info structure is incomplete'
      )
    } catch (error) {
      this.addTestResult('getAssetInventory()', false, error.message)
    }
  }

  /**
   * Test getStats method.
   * @returns {Promise<void>}
   */
  async testStatistics() {
    console.log('📊 Testing statistics...')

    try {
      const stats = this.api.getStats()

      const hasRequiredFields =
        typeof stats.brands === 'number' &&
        typeof stats.apps === 'number' &&
        typeof stats.combinations === 'number' &&
        typeof stats.platforms === 'number'

      // Verify counts match methods
      const brandsMatch = stats.brands === this.api.getBrands().length
      const appsMatch = stats.apps === this.api.getApps().length
      const combinationsMatch = stats.combinations === this.api.getCombinations().length
      const platformsMatch = stats.platforms === this.api.getAllPlatforms().length

      const countsCorrect = brandsMatch && appsMatch && combinationsMatch && platformsMatch

      const statsWork = hasRequiredFields && countsCorrect

      this.addTestResult(
        'getStats()',
        statsWork,
        statsWork
          ? `Returns correct stats (${stats.brands} brands, ${stats.apps} apps, ${stats.platforms} platforms, ${stats.combinations} combinations)`
          : 'getStats() has incorrect values'
      )

      // Test optional fields
      const hasOptionalFields =
        (fs.existsSync('source') && typeof stats.sourceAssets === 'number') ||
        !fs.existsSync('source')

      this.addTestResult(
        'Stats Optional Fields',
        hasOptionalFields,
        hasOptionalFields
          ? fs.existsSync('source')
            ? `Source assets counted: ${stats.sourceAssets}`
            : 'Optional fields handled correctly'
          : 'Optional stats fields missing'
      )
    } catch (error) {
      this.addTestResult('getStats()', false, error.message)
    }
  }

  /**
   * Test validate method.
   * @returns {Promise<void>}
   */
  async testValidation() {
    console.log('✅ Testing validation...')

    try {
      const validation = this.api.validate()

      const hasCorrectStructure =
        typeof validation === 'object' &&
        typeof validation.valid === 'boolean' &&
        Array.isArray(validation.errors) &&
        Array.isArray(validation.warnings)

      this.addTestResult(
        'validate() Structure',
        hasCorrectStructure,
        hasCorrectStructure
          ? 'Returns valid validation object with errors and warnings arrays'
          : 'validate() structure is incorrect'
      )

      // For valid configuration, should have valid=true
      const isValid = validation.valid && validation.errors.length === 0

      this.addTestResult(
        'validate() Result',
        isValid,
        isValid
          ? `Configuration is valid (${validation.warnings.length} warnings)`
          : `Configuration invalid: ${validation.errors.join(', ')}`
      )
    } catch (error) {
      this.addTestResult('validate()', false, error.message)
    }
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
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new APITestSuite()
  tester.runTests()
}

export default APITestSuite
