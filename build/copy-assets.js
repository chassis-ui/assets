import fs from 'fs'
import path from 'path'

const packageJson = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
)
const buildOptions = packageJson.chassis.build
const DEFAULT_BRAND_FOLDER = packageJson.chassis.defaults.brandFolder

// Statistics tracking
const stats = {
  filesProcessed: 0,
  filesRenamed: 0,
  directoriesCreated: 0,
  errors: []
}

// Validation function
function validateConfiguration() {
  const errors = []

  if (!buildOptions.brands || buildOptions.brands.length === 0) {
    errors.push('No brands defined in chassis.build.brands')
  }

  if (!buildOptions.apps || Object.keys(buildOptions.apps).length === 0) {
    errors.push('No apps defined in chassis.build.apps')
  }

  // Check if default brand folder exists
  const defaultPath = path.join('source', DEFAULT_BRAND_FOLDER)
  if (!fs.existsSync(defaultPath)) {
    errors.push(`Default brand folder does not exist: ${defaultPath}`)
  }

  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:')
    errors.forEach(error => console.error(`  - ${error}`))
    process.exit(1)
  }

  console.log('✅ Configuration validation passed')
}

// Function to recursively rename files in a directory according to the renaming function
export function renameFilesRecursively(folderPath, renameFunction) {
  if (!fs.existsSync(folderPath)) {
    console.warn(`⚠️  Rename target does not exist: ${folderPath}`)
    return
  }

  const items = fs.readdirSync(folderPath)

  items.forEach(item => {
    const itemPath = path.join(folderPath, item)
    const isDirectory = fs.statSync(itemPath).isDirectory()

    if (isDirectory) {
      renameFilesRecursively(itemPath, renameFunction)
    } else {
      try {
        const newName = renameFunction(item, folderPath)
        if (newName !== item) {
          const newPath = path.join(folderPath, newName)
          fs.renameSync(itemPath, newPath)
          console.log(`📝 Renamed: ${item} → ${newName}`)
          stats.filesRenamed++
        }
      } catch (error) {
        const errorMsg = `Failed to rename ${itemPath}: ${error.message}`
        console.error(`❌ ${errorMsg}`)
        stats.errors.push(errorMsg)
      }
    }
  })
}

// Function to recursively copy files from source to destination
function copyFilesRecursively(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`⚠️  Source path does not exist: ${src}`)
    return
  }

  const items = fs.readdirSync(src)

  items.forEach(item => {
    const srcPath = path.join(src, item)
    const destPath = path.join(dest, item)
    const isDirectory = fs.statSync(srcPath).isDirectory()

    if (isDirectory) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true })
        stats.directoriesCreated++
      }
      copyFilesRecursively(srcPath, destPath)
    } else {
      try {
        fs.copyFileSync(srcPath, destPath)
        console.log(`📄 Copied: ${path.relative(process.cwd(), srcPath)}`)
        stats.filesProcessed++
      } catch (error) {
        const errorMsg = `Failed to copy ${srcPath} to ${destPath}: ${error.message}`
        console.error(`❌ ${errorMsg}`)
        stats.errors.push(errorMsg)
      }
    }
  })
}

export async function generateAsssets() {
  console.log('🚀 Starting Chassis Assets build process...')

  // Validate configuration
  validateConfiguration()

  // Clean dist directory
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true })
    console.log('🧹 Cleaned dist directory')
  }

  try {
    console.log('\n📦 Processing assets...')
    buildOptions.brands.forEach(brand => {
      Object.entries(buildOptions.apps).forEach(([app, platforms]) => {
        platforms.forEach(platform => {
          const destPath = `dist/${platform.split('-')[0]}/${brand}-${app}`

          console.log(`\n🔨 Processing: ${brand} - ${app} - ${platform}`)
          console.log(`📁 Output: ${destPath}`)

          fs.mkdirSync(destPath, { recursive: true })
          stats.directoriesCreated++

          // Copy default brand files
          const defaultAppPath = `source/${DEFAULT_BRAND_FOLDER}/${app}`
          if (fs.existsSync(defaultAppPath)) {
            console.log(`📋 Copying from default: ${defaultAppPath}`)
            copyFilesRecursively(defaultAppPath, destPath)
          }

          // Override with specific brand files if they exist
          const brandAppPath = `source/${brand}/${app}`
          if (fs.existsSync(brandAppPath)) {
            console.log(`🎨 Applying brand overrides: ${brandAppPath}`)
            copyFilesRecursively(brandAppPath, destPath)
          }

          // Apply platform-specific processing
          if (platform === 'android') {
            console.log('🤖 Applying Android naming conventions...')

            // Rename all files to Android conventions
            renameFilesRecursively(destPath, fileName =>
              fileName.toLowerCase().replaceAll('-', '_')
            )

            // Prefix icon files with ic_
            const iconsPath = `${destPath}/icons`
            if (fs.existsSync(iconsPath)) {
              renameFilesRecursively(iconsPath, fileName =>
                fileName.startsWith('ic_') ? fileName : `ic_${fileName}`
              )
            }
          }
        })
      })
    })

    // Print summary
    console.log('\n📊 Build Summary:')
    console.log(`✅ ${stats.filesProcessed} files processed`)
    console.log(`📝 ${stats.filesRenamed} files renamed`)
    console.log(`📁 ${stats.directoriesCreated} directories created`)

    if (stats.errors.length > 0) {
      console.log(`❌ ${stats.errors.length} errors occurred:`)
      stats.errors.forEach(error => console.log(`   - ${error}`))
      process.exit(1)
    }

    console.log('\n🎉 Assets build completed successfully!')
  } catch (error) {
    console.error('💥 Build failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

generateAsssets()
