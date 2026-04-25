import fs from 'fs'
import AssetAnalyzer from '../build/analyze-assets.js'

/**
 * Test suite for AssetAnalyzer.
 * Tests file analysis, duplicate detection, statistics, and filtering.
 */
class AnalyzeTestSuite {
  constructor() {
    this.testResults = []
    this.analyzer = null
  }

  /**
   * Run all test suites.
   * @returns {Promise<void>}
   */
  async runTests() {
    console.log('🧪 Starting Asset Analyzer Test Suite...\n')

    try {
      await this.setupTestEnvironment()
      await this.testBasicAnalysis()
      await this.testDuplicateDetection()
      await this.testFileTypeCategorization()
      await this.testFiltering()
      await this.testStatistics()
      await this.testFormattedOutput()

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

    if (!fs.existsSync('source')) {
      console.warn('⚠️  source/ not found. Cannot run analyzer tests.')
      process.exit(1)
    }

    // Ensure dist exists for testing - build if needed
    if (!fs.existsSync('dist')) {
      console.log('📦 Building assets for test data...')
      try {
        const { generateAsssets } = await import('../build/build-assets.js')
        await generateAsssets({ quiet: true })
        console.log('✅ Assets built successfully')
      } catch (error) {
        console.error('❌ Failed to build assets:', error.message)
        process.exit(1)
      }
    }

    this.addTestResult('Setup', true, 'Test environment ready')
  }

  /**
   * Test basic analysis functionality.
   * @returns {Promise<void>}
   */
  async testBasicAnalysis() {
    console.log('📊 Testing basic analysis...')

    try {
      this.analyzer = new AssetAnalyzer({ quiet: true })
      this.analyzer.analyze()

      // Verify basic stats exist
      const hasStats = this.analyzer.stats && typeof this.analyzer.stats === 'object'
      const hasTotalFiles = this.analyzer.stats.totalFiles > 0
      const hasTotalSize = this.analyzer.stats.totalSize > 0

      const basicAnalysisWorks = hasStats && hasTotalFiles && hasTotalSize

      this.addTestResult(
        'Basic Analysis',
        basicAnalysisWorks,
        basicAnalysisWorks
          ? `Analyzed ${this.analyzer.stats.totalFiles} files (${this.analyzer.formatBytes(this.analyzer.stats.totalSize)})`
          : 'Analysis failed to produce valid stats'
      )
    } catch (error) {
      this.addTestResult('Basic Analysis', false, error.message)
    }
  }

  /**
   * Test duplicate detection accuracy.
   * Should separate source duplicates from dist duplicates.
   * Should NOT flag source→dist copies as duplicates.
   * @returns {Promise<void>}
   */
  async testDuplicateDetection() {
    console.log('🔍 Testing duplicate detection...')

    try {
      this.analyzer = new AssetAnalyzer({ quiet: true })
      this.analyzer.analyze()

      const stats = this.analyzer.stats

      // Verify separate tracking
      const hasSeparateTracking =
        Array.isArray(stats.duplicatesInSource) && Array.isArray(stats.duplicatesInDist)

      // Verify no cross-duplicates (source→dist should NOT be flagged)
      const noCrossDuplicates = !stats.crossDuplicates || stats.crossDuplicates.length === 0

      // Count total duplicates
      const totalDuplicates = stats.duplicatesInSource.length + stats.duplicatesInDist.length

      const duplicateDetectionWorks = hasSeparateTracking && noCrossDuplicates

      this.addTestResult(
        'Duplicate Detection',
        duplicateDetectionWorks,
        duplicateDetectionWorks
          ? `Correctly separates duplicates (${stats.duplicatesInSource.length} in source, ${stats.duplicatesInDist.length} in dist, no cross-duplicates)`
          : 'Duplicate detection not working correctly'
      )

      // Test that we don't have excessive false positives
      const reasonableDuplicateCount = totalDuplicates < 100 // Should be low in a well-maintained repo

      this.addTestResult(
        'No False Duplicates',
        reasonableDuplicateCount,
        reasonableDuplicateCount
          ? `Low duplicate count indicates accurate detection (${totalDuplicates} total)`
          : `Suspiciously high duplicate count (${totalDuplicates}) - may have false positives`
      )
    } catch (error) {
      this.addTestResult('Duplicate Detection', false, error.message)
    }
  }

  /**
   * Test file type categorization.
   * @returns {Promise<void>}
   */
  async testFileTypeCategorization() {
    console.log('📁 Testing file type categorization...')

    try {
      this.analyzer = new AssetAnalyzer({ quiet: true })
      this.analyzer.analyze()

      const fileTypes = this.analyzer.stats.fileTypes
      const hasFileTypes = fileTypes && Object.keys(fileTypes).length > 0

      // Check for expected asset types
      const expectedTypes = ['.svg', '.woff2', '.png']
      const hasExpectedTypes = expectedTypes.some((ext) => fileTypes[ext])

      // Verify counts are numbers and sum matches total files
      const totalCount = Object.values(fileTypes).reduce((sum, count) => sum + count, 0)
      const countsValid = totalCount === this.analyzer.stats.totalFiles

      const categorizationWorks = hasFileTypes && hasExpectedTypes && countsValid

      this.addTestResult(
        'File Type Categorization',
        categorizationWorks,
        categorizationWorks
          ? `Detected ${Object.keys(fileTypes).length} file types with ${totalCount} total files`
          : 'File type categorization failed'
      )
    } catch (error) {
      this.addTestResult('File Type Categorization', false, error.message)
    }
  }

  /**
   * Test filtering by brand, app, and platform.
   * @returns {Promise<void>}
   */
  async testFiltering() {
    console.log('🎯 Testing filtering...')

    try {
      // Test brand filtering
      const brandAnalyzer = new AssetAnalyzer({ quiet: true })
      brandAnalyzer.options = { brand: 'chassis', apps: [], platforms: [] }
      brandAnalyzer.analyze()

      const brandFilterWorks = brandAnalyzer.stats.totalFiles > 0

      this.addTestResult(
        'Brand Filtering',
        brandFilterWorks,
        brandFilterWorks
          ? `Brand filter works (${brandAnalyzer.stats.totalFiles} files for chassis)`
          : 'Brand filtering failed'
      )

      // Test platform filtering
      const platformAnalyzer = new AssetAnalyzer({ quiet: true })
      platformAnalyzer.options = { brand: null, apps: [], platforms: ['web'] }
      platformAnalyzer.analyze()

      const platformFilterWorks = platformAnalyzer.stats.totalFiles > 0

      this.addTestResult(
        'Platform Filtering',
        platformFilterWorks,
        platformFilterWorks
          ? `Platform filter works (${platformAnalyzer.stats.totalFiles} files for web)`
          : 'Platform filtering failed'
      )

      // Test combined filtering
      const combinedAnalyzer = new AssetAnalyzer({ quiet: true })
      combinedAnalyzer.options = { brand: 'chassis', apps: [], platforms: ['web'] }
      combinedAnalyzer.analyze()

      const combinedFilterWorks =
        combinedAnalyzer.stats.totalFiles > 0 &&
        combinedAnalyzer.stats.totalFiles <= platformAnalyzer.stats.totalFiles

      this.addTestResult(
        'Combined Filtering',
        combinedFilterWorks,
        combinedFilterWorks
          ? `Combined filters work (${combinedAnalyzer.stats.totalFiles} files)`
          : 'Combined filtering failed'
      )
    } catch (error) {
      this.addTestResult('Filtering', false, error.message)
    }
  }

  /**
   * Test statistics calculation.
   * @returns {Promise<void>}
   */
  async testStatistics() {
    console.log('📈 Testing statistics calculation...')

    try {
      this.analyzer = new AssetAnalyzer({ quiet: true })
      this.analyzer.analyze()

      const stats = this.analyzer.stats

      // Check required stats exist
      const hasRequiredStats =
        typeof stats.totalFiles === 'number' &&
        stats.totalFiles > 0 &&
        typeof stats.totalSize === 'number' &&
        stats.totalSize > 0 &&
        Array.isArray(stats.largestFiles) &&
        typeof stats.fileTypes === 'object'

      // Verify largest files are sorted and have required properties
      const largestFilesSorted =
        stats.largestFiles.length === 0 ||
        stats.largestFiles.every(
          (file, i) =>
            file.path &&
            typeof file.size === 'number' &&
            (i === 0 || file.size <= stats.largestFiles[i - 1].size)
        )

      const statisticsWork = hasRequiredStats && largestFilesSorted

      this.addTestResult(
        'Statistics Calculation',
        statisticsWork,
        statisticsWork
          ? `All statistics calculated correctly (${stats.totalFiles} files, ${stats.largestFiles.length} largest tracked)`
          : 'Statistics calculation has errors'
      )
    } catch (error) {
      this.addTestResult('Statistics Calculation', false, error.message)
    }
  }

  /**
   * Test formatted output methods.
   * @returns {Promise<void>}
   */
  async testFormattedOutput() {
    console.log('📝 Testing formatted output...')

    try {
      this.analyzer = new AssetAnalyzer({ quiet: true })

      // Test byte formatting
      const testCases = [
        { bytes: 0, expected: '0 Bytes' },
        { bytes: 1023, expected: '1023 Bytes' },
        { bytes: 1024, expected: '1 KB' },
        { bytes: 1048576, expected: '1 MB' },
        { bytes: 1073741824, expected: '1 GB' },
        { bytes: 1536, expected: '1.5 KB' } // Test decimal formatting
      ]

      let formattingWorks = true
      for (const test of testCases) {
        const result = this.analyzer.formatBytes(test.bytes)
        if (result !== test.expected) {
          formattingWorks = false
          console.error(
            `❌ formatBytes(${test.bytes}) returned "${result}", expected "${test.expected}"`
          )
        }
      }

      this.addTestResult(
        'Formatted Output',
        formattingWorks,
        formattingWorks ? 'Byte formatting works correctly' : 'Byte formatting has errors'
      )
    } catch (error) {
      this.addTestResult('Formatted Output', false, error.message)
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
  const tester = new AnalyzeTestSuite()
  tester.runTests()
}

export default AnalyzeTestSuite
