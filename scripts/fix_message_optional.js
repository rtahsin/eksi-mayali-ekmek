const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;
  
  // Replace `e?.message` or `err?.message` etc.
  const regex = /([a-zA-Z0-9_]+)\?\.message/g;
  content = content.replace(regex, (match, varName) => {
    if (['e', 'err', 'error', 'supaErr', 'insErr', 'updErr', 'delErr'].includes(varName)) {
      return `getErrorMessage(${varName})`;
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Fixed', filePath);
  }
}

walkDir(path.join(__dirname, '../src'), processFile);
