#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const RN_REPO_ROOT = path.resolve(__dirname, "..");
const strictBundle = process.argv.includes("--strict-bundle");

function toRepoRelative(filePath) {
  return path.relative(RN_REPO_ROOT, filePath).split(path.sep).join("/");
}

function readRequired(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${toRepoRelative(filePath)}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function walkFiles(root, out = []) {
  if (!fs.existsSync(root)) {
    return out;
  }
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) {
      continue;
    }
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, out);
      continue;
    }
    if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      out.push(fullPath);
    }
  }
  return out;
}

function listFiles(root) {
  if (!fs.existsSync(root)) {
    return [];
  }
  const out = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else {
        out.push(fullPath);
      }
    }
  }
  return out;
}

function extractTtfNames(input) {
  return [...input.matchAll(/"([A-Za-z0-9_]+\.ttf)"/g)].map((match) => match[1]);
}

function main() {
  const iconFontLoaderFile = path.resolve(
    RN_REPO_ROOT,
    "rn/src/lib/iconFontLoader.js"
  );
  const appEntryFile = path.resolve(RN_REPO_ROOT, "rn/src/index.js");
  const vectorIconsDir = path.resolve(RN_REPO_ROOT, "rn/src/lib/vector-icons");
  const rnSourceRoot = path.resolve(RN_REPO_ROOT, "rn/src");
  const nodeModulesFontDir = path.resolve(
    RN_REPO_ROOT,
    "node_modules/react-native-vector-icons/Fonts"
  );
  const distAndroidDir = path.resolve(RN_REPO_ROOT, "dist/android");
  const distIosDir = path.resolve(RN_REPO_ROOT, "dist/ios");

  const failures = [];
  const warnings = [];
  let passed = 0;

  const iconFontLoader = readRequired(iconFontLoaderFile);
  const appEntry = readRequired(appEntryFile);

  const familyNames = new Set(
    [...iconFontLoader.matchAll(/^\s{2}([A-Za-z0-9_]+):\s*\{/gm)].map(
      (match) => match[1]
    )
  );

  const declaredFontFiles = new Set();
  for (const blockMatch of iconFontLoader.matchAll(
    /fontFiles:\s*\[([\s\S]*?)\]/g
  )) {
    const block = blockMatch[1];
    for (const fontFile of extractTtfNames(block)) {
      declaredFontFiles.add(fontFile);
    }
  }

  const requiredFontModules = new Set(
    [
      ...iconFontLoader.matchAll(
        /require\("react-native-vector-icons\/Fonts\/([^"]+\.ttf)"\)/g
      ),
    ].map((match) => match[1])
  );

  if (familyNames.size === 0) {
    failures.push(
      `- ${toRepoRelative(iconFontLoaderFile)}: no icon font families were detected`
    );
  } else {
    passed += 1;
  }

  if (declaredFontFiles.size === 0) {
    failures.push(
      `- ${toRepoRelative(iconFontLoaderFile)}: no fontFiles entries were detected`
    );
  } else {
    passed += 1;
  }

  for (const fontFile of declaredFontFiles) {
    if (!requiredFontModules.has(fontFile)) {
      failures.push(
        `- ${toRepoRelative(iconFontLoaderFile)}: declared font file ${fontFile} is missing a Metro require() entry`
      );
    } else {
      passed += 1;
    }
  }

  for (const fontFile of requiredFontModules) {
    if (!declaredFontFiles.has(fontFile)) {
      warnings.push(
        `- ${toRepoRelative(iconFontLoaderFile)}: required font ${fontFile} is not listed in fontFiles[]`
      );
    } else {
      passed += 1;
    }
  }

  if (!fs.existsSync(nodeModulesFontDir)) {
    failures.push(
      `- ${toRepoRelative(nodeModulesFontDir)}: node_modules font directory not found (run npm install before verification)`
    );
  } else {
    passed += 1;
    for (const fontFile of requiredFontModules) {
      const absoluteFontPath = path.join(nodeModulesFontDir, fontFile);
      if (!fs.existsSync(absoluteFontPath)) {
        failures.push(
          `- ${toRepoRelative(nodeModulesFontDir)}: missing ${fontFile}`
        );
      } else {
        passed += 1;
      }
    }
  }

  if (!/preloadIconFonts\(\);/.test(appEntry)) {
    failures.push(
      `- ${toRepoRelative(appEntryFile)}: preloadIconFonts() is not called during RN registration`
    );
  } else {
    passed += 1;
  }

  const wrapperFiles = fs
    .readdirSync(vectorIconsDir)
    .filter(
      (name) =>
        name.endsWith(".js") && name !== "runtime.js" && name !== "hooks.js"
    )
    .sort();

  const wrappedFamilies = new Set();
  for (const fileName of wrapperFiles) {
    const filePath = path.join(vectorIconsDir, fileName);
    const content = fs.readFileSync(filePath, "utf8");
    const familyMatch = content.match(/getWrappedIconFamily\("([^"]+)"\)/);
    if (!familyMatch) {
      failures.push(
        `- ${toRepoRelative(filePath)}: getWrappedIconFamily("...") call not found`
      );
      continue;
    }
    const familyName = familyMatch[1];
    wrappedFamilies.add(familyName);
    const expectedFile = `${familyName}.js`;
    if (expectedFile !== fileName) {
      failures.push(
        `- ${toRepoRelative(filePath)}: wrapper file name should be ${expectedFile}`
      );
    } else {
      passed += 1;
    }
    if (!familyNames.has(familyName)) {
      failures.push(
        `- ${toRepoRelative(filePath)}: ${familyName} is not declared in ICON_FAMILY_DEFINITIONS`
      );
    } else {
      passed += 1;
    }
  }

  for (const familyName of familyNames) {
    if (!wrappedFamilies.has(familyName)) {
      failures.push(
        `- ${toRepoRelative(vectorIconsDir)}: missing wrapper file for ${familyName}`
      );
    } else {
      passed += 1;
    }
  }

  const sourceFiles = walkFiles(rnSourceRoot);
  const assetRequireRegex =
    /require\(\s*["']([^"']+\.(png|jpg|jpeg|webp|gif|svg|ttf))["']\s*\)/g;

  for (const sourceFile of sourceFiles) {
    const content = fs.readFileSync(sourceFile, "utf8");
    let match = null;
    while ((match = assetRequireRegex.exec(content)) !== null) {
      const requestedPath = match[1];
      if (requestedPath.startsWith("react-native-vector-icons/")) {
        continue;
      }
      if (!requestedPath.startsWith(".") && !path.isAbsolute(requestedPath)) {
        continue;
      }
      const absoluteAssetPath = path.resolve(path.dirname(sourceFile), requestedPath);
      if (!fs.existsSync(absoluteAssetPath)) {
        failures.push(
          `- ${toRepoRelative(sourceFile)}: missing asset ${requestedPath}`
        );
      } else {
        passed += 1;
      }
    }
  }

  const expectedBundledAssets = ["src_assets_choicelylogo.png"];

  if (fs.existsSync(path.join(distAndroidDir, "index.android.bundle"))) {
    const androidFiles = listFiles(distAndroidDir);
    for (const expectedAsset of expectedBundledAssets) {
      const isPresent = androidFiles.some((filePath) =>
        filePath.endsWith(expectedAsset)
      );
      if (!isPresent) {
        warnings.push(
          `- ${toRepoRelative(distAndroidDir)}: expected bundled asset ${expectedAsset} was not found`
        );
      } else {
        passed += 1;
      }
    }
    const hasBundledFonts = androidFiles.some((filePath) =>
      filePath.toLowerCase().endsWith(".ttf")
    );
    if (!hasBundledFonts) {
      const msg = `- ${toRepoRelative(distAndroidDir)}: no bundled .ttf files detected`;
      if (strictBundle) {
        failures.push(`${msg} (strict mode)`);
      } else {
        warnings.push(`${msg} (run with --strict-bundle to fail this)`);
      }
    } else {
      passed += 1;
    }
  } else {
    warnings.push(
      `- ${toRepoRelative(distAndroidDir)}: dist/android bundle not found (run npm run bundle to verify bundled assets)`
    );
  }

  if (fs.existsSync(path.join(distIosDir, "main.jsbundle"))) {
    const iosFiles = listFiles(distIosDir);
    const hasBundledFonts = iosFiles.some((filePath) =>
      filePath.toLowerCase().endsWith(".ttf")
    );
    if (!hasBundledFonts) {
      const msg = `- ${toRepoRelative(distIosDir)}: no bundled .ttf files detected`;
      if (strictBundle) {
        failures.push(`${msg} (strict mode)`);
      } else {
        warnings.push(`${msg} (run with --strict-bundle to fail this)`);
      }
    } else {
      passed += 1;
    }
  } else {
    warnings.push(
      `- ${toRepoRelative(distIosDir)}: dist/ios bundle not found (run npm run bundle to verify bundled assets)`
    );
  }

  if (warnings.length > 0) {
    console.warn(`[font-assets-verify] WARN: ${warnings.length} warning(s)`);
    for (const warning of warnings) {
      console.warn(warning);
    }
  }

  if (failures.length > 0) {
    console.error(
      `[font-assets-verify] ERROR: Font/assets verification failed (${failures.length})`
    );
    for (const failure of failures) {
      console.error(failure);
    }
    process.exit(1);
  }

  console.log(`[font-assets-verify] Checks passed: ${passed}`);
  console.log("[font-assets-verify] OK: icon font declarations and asset files are consistent.");
}

try {
  main();
} catch (error) {
  console.error(`[font-assets-verify] ERROR: ${error.message}`);
  process.exit(1);
}
