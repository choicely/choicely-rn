console.log('Loading metro.config.js...')

const path = require('node:path')
const fs = require('node:fs')

const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config')
const {FileStore} = require('metro-cache')

const repoRoot = path.resolve(__dirname, '..')
const rnRoot = path.resolve(repoRoot, 'rn')
const iconFamilyNames = [
  'AntDesign',
  'Entypo',
  'EvilIcons',
  'Feather',
  'FontAwesome',
  'FontAwesome5',
  'FontAwesome6',
  'Fontisto',
  'Foundation',
  'Ionicons',
  'MaterialCommunityIcons',
  'MaterialIcons',
  'Octicons',
  'SimpleLineIcons',
  'Zocial',
]

const iconModuleAliases = iconFamilyNames.reduce((aliases, familyName) => {
  aliases[`react-native-vector-icons/${familyName}`] = path.join(
    rnRoot,
    `src/lib/vector-icons/${familyName}.js`
  )
  return aliases
}, {})

const {getPorts} = require('./dev/ports')
const {metroPort} = getPorts(repoRoot)

const defaultConfig = getDefaultConfig(rnRoot)

// When choicely-rn is accessed via a symlink from another project (e.g. the
// Android sibling repo), Metro resolves __dirname to the *canonical* (iOS)
// path.  The RN Gradle plugin supplies an entryFile whose absolute path uses
// the *symlink* path.  Metro can't compute a SHA-1 for that file because it's
// not under the canonical projectRoot or watchFolders.
//
// Fix: detect every distinct parent that exposes this repo root via a symlink
// and add its "rn" directory to watchFolders so Metro can track those paths.
const extraWatchFolders = []
try {
  const grandparent = path.dirname(path.dirname(repoRoot)) // e.g. /Volumes/WD/git
  const siblingDirs = fs.readdirSync(grandparent)
  for (const sibling of siblingDirs) {
    const candidate = path.join(grandparent, sibling, path.basename(repoRoot))
    if (candidate === repoRoot) continue // skip canonical self
    try {
      const real = fs.realpathSync(candidate)
      if (real === repoRoot) {
        // candidate is a symlink pointing to our canonical repoRoot
        const symlinkRn = path.join(candidate, 'rn')
        if (fs.existsSync(symlinkRn)) {
          extraWatchFolders.push(symlinkRn)
        }
      }
    } catch (_) { /* not a symlink or doesn't exist */ }
  }
} catch (_) { /* best-effort */ }

module.exports = mergeConfig(defaultConfig, {
  projectRoot: rnRoot,
  watchFolders: [path.join(repoRoot, 'node_modules'), ...extraWatchFolders],
  server: {port: metroPort},
  resolver: {
    nodeModulesPaths: [path.join(repoRoot, 'node_modules')],
    disableHierarchicalLookup: true,
    resolveRequest: (context, moduleName, platform) => {
      const aliasedPath = iconModuleAliases[moduleName]
      if (aliasedPath) {
        return {
          type: 'sourceFile',
          filePath: aliasedPath,
        }
      }

      if (moduleName.startsWith('react-native-vector-icons/')) {
        const familyName = moduleName.replace('react-native-vector-icons/', '')
        const dynamicAliasPath = path.join(
          rnRoot,
          `src/lib/vector-icons/${familyName}.js`
        )

        if (fs.existsSync(dynamicAliasPath)) {
          return {
            type: 'sourceFile',
            filePath: dynamicAliasPath,
          }
        }
      }

      if (typeof context.resolveRequest === 'function') {
        return context.resolveRequest(context, moduleName, platform)
      }

      return null
    },
  },
  cacheStores: [
    new FileStore({
      root: path.join(repoRoot, '.cache/metro'),
    }),
  ],
})
