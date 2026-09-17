const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function refactorFetch(filePath) {
  if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) return;
  if (filePath.includes('node_modules') || filePath.includes('api.js') || filePath.includes('dist')) return;

  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // Pattern to replace `fetch('http://localhost:5000/api/...'` to `apiFetch('/...'`
  const fetchRegex = /fetch\(([`'"])http:\/\/localhost:5000\/api(.*?)\1(\s*,\s*\{[\s\S]*?(?:headers:\s*(?:authHeaders\(\)|\{.*?Bearer.*?\})[\s\S]*?)?\})?\)/g;
  
  content = content.replace(fetchRegex, (match, quote, path, optionsStr) => {
    if (optionsStr) {
      // Remove headers: authHeaders() or headers: { Authorization: `Bearer ...` }
      // This is slightly tricky, we will just pass the options but we need to strip out the headers part 
      // if it's the only thing in options. Let's just remove the headers prop.
      let newOptions = optionsStr.replace(/headers:\s*(?:authHeaders\(\)|\{\s*['"]Authorization['"]\s*:\s*`Bearer \$\{.*?token.*?\}`\s*\}|authHeaders),\s*/g, '');
      newOptions = newOptions.replace(/headers:\s*(?:authHeaders\(\)|\{\s*['"]Authorization['"]\s*:\s*`Bearer \$\{.*?token.*?\}`\s*\})/g, '');
      
      // Clean up empty options `{ , }` or `{ }`
      newOptions = newOptions.replace(/\{\s*,\s*\}/g, '{}');
      newOptions = newOptions.replace(/,\s*\}/g, ' }');
      
      if (newOptions.trim() === ', {}' || newOptions.trim() === ',' || newOptions.trim() === '') {
        return `apiFetch(\`${path}\`)`;
      }
      return `apiFetch(\`${path}\`${newOptions})`;
    }
    return `apiFetch(\`${path}\`)`;
  });

  // Since apiFetch parses JSON, replace .then(res => res.ok ? res.json() : ...) with .then(data => data) 
  // or just remove the .then() mapping entirely.
  // Original is usually `.then(res => res.ok ? res.json() : [...])` or `.then(res => res.json())`
  const resOkRegex = /\.then\(res\s*=>\s*res\.ok\s*\?\s*res\.json\(\)\s*:\s*(.*?)\)/g;
  content = content.replace(resOkRegex, '.then(data => data)');

  const handleAuthErrorRegex = /\.then\(handleAuthError\)/g;
  content = content.replace(handleAuthErrorRegex, '');
  
  const resJsonRegex = /\.then\([^=>]*res\s*=>\s*res\.json\(\)\)/g;
  content = content.replace(resJsonRegex, '.then(data => data)');

  if (content !== originalContent) {
    if (!content.includes("import { apiFetch }")) {
      // find relative path
      let depth = filePath.split(path.sep).length - path.resolve('frontend/src').split(path.sep).length;
      let relativePrefix = '';
      if (depth === 1) relativePrefix = './lib/';
      else if (depth === 2) relativePrefix = '../lib/';
      else if (depth === 3) relativePrefix = '../../lib/';
      else relativePrefix = '../lib/'; // fallback

      // Add import at the top
      content = `import { apiFetch } from '${relativePrefix}api';\n` + content;
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${filePath}`);
  }
}

walkDir(path.resolve('frontend/src'), refactorFetch);
