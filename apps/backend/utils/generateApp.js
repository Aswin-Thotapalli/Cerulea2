const fs = require('fs');
const path = require('path');

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function generateApp(studio, targetDir) {
  ensureDir(targetDir);

  // Write individual files
  writeJSON(path.join(targetDir, 'appMetadata.json'), studio.appMetadata);
  writeJSON(path.join(targetDir, 'tokenomics.json'), studio.tokenomics);
  writeJSON(path.join(targetDir, 'accessControls.json'), studio.accessControls);
  writeJSON(path.join(targetDir, 'logicFlow.json'), studio.logicFlow);
  writeJSON(path.join(targetDir, 'uiConfig.json'), studio.uiBuilder);
  writeJSON(path.join(targetDir, 'aiConfig.json'), studio.aiConfigs);

  // Composite runtimeConfig
  const runtimeConfig = {
    modules: studio.selectedModules,
    logic: studio.logicFlow,
    access: studio.accessControls,
    ai: studio.aiConfigs,
    tokenomics: studio.tokenomics,
  };
  writeJSON(path.join(targetDir, 'runtimeConfig.json'), runtimeConfig);
}

module.exports = { generateApp };
