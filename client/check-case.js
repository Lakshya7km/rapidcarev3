const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  // get git tracked files with EXACT cases
  const gitFiles = execSync('git ls-files src').toString().split('\n').filter(Boolean);
  const gitSet = new Set(gitFiles.map(f => f.replace(/\\/g, '/')));
  const lowerGitMap = new Map();
  gitSet.forEach(f => lowerGitMap.set(f.toLowerCase(), f));

  function checkFile(filePath) {
    if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) return;
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      // Very naive import matcher
      const match = line.match(/import\s+.*?\s+from\s+['"](.+)['"]/);
      if (match) {
        let importPath = match[1];
        if (!importPath.startsWith('.')) return; // skip npm modules
        
        let target = path.join(path.dirname(filePath), importPath).replace(/\\/g, '/');
        
        // try adding .js or .jsx if no extension
        const possibleTargets = [target, target + '.js', target + '.jsx', target + '/index.js', target + '/index.jsx'];
        
        let found = false;
        let matchedTarget = null;
        for (let pt of possibleTargets) {
          const relativeToRoot = 'src' + pt.split('src')[1]; // assuming src is the root
          
          if (gitSet.has(relativeToRoot)) {
            found = true;
            break;
          }
          
          // Check lowercase match
          if (lowerGitMap.has(relativeToRoot.toLowerCase())) {
             const actual = lowerGitMap.get(relativeToRoot.toLowerCase());
             if (actual !== relativeToRoot) {
               console.log(`CASE MISMATCH in ${filePath}:${i+1} -> importing "${importPath}"`);
               console.log(`  Expected: ${actual.replace('src/', '')}`);
               console.log(`  Found in code: ${relativeToRoot.replace('src/', '')}`);
             }
             found = true;
             break;
          }
        }
      }
    });
  }

  function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
      const p = path.join(dir, file);
      if (fs.statSync(p).isDirectory()) walk(p);
      else checkFile(p);
    });
  }

  walk('src');
  console.log('done checking');

} catch(e) {
  console.error(e);
}
