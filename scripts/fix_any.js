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
  let modified = false;

  // Replace `catch (e: any)` and variants
  const catchRegex = /catch\s*\(\s*([a-zA-Z0-9_]+)\s*:\s*any\s*\)/g;
  if (catchRegex.test(content)) {
    content = content.replace(catchRegex, 'catch ($1: unknown)');
    modified = true;
  }

  // Add import for getErrorMessage if not exists and error.message is used
  // This is a bit complex, let's just replace `err.message` with `getErrorMessage(err)`
  // First, find what variables are in catch blocks.
  const catchBlocks = [...content.matchAll(/catch\s*\(\s*([a-zA-Z0-9_]+)\s*:\s*unknown\s*\)/g)];
  
  for (const match of catchBlocks) {
    const errVar = match[1];
    const messageRegex = new RegExp(`${errVar}\\.message`, 'g');
    if (messageRegex.test(content)) {
      content = content.replace(messageRegex, `getErrorMessage(${errVar})`);
      modified = true;
      
      // Ensure import exists
      if (!content.includes('getErrorMessage')) {
        const depth = filePath.split(path.sep).length - filePath.indexOf('src') - 2;
        const relativePath = depth > 0 ? '../'.repeat(depth) + 'lib/utils/error' : './lib/utils/error';
        const importStatement = `import { getErrorMessage } from "@/lib/utils/error";\n`;
        // Insert after last import
        const lastImportIndex = content.lastIndexOf('import ');
        if (lastImportIndex !== -1) {
          const endOfLine = content.indexOf('\n', lastImportIndex);
          content = content.slice(0, endOfLine + 1) + importStatement + content.slice(endOfLine + 1);
        } else {
          content = importStatement + content;
        }
      }
    }
  }
  
  // Replace `(supabase as any)` with `(supabase as any)` wait, `createClient` now returns proper client?
  // Let's replace `(supabase as any)` with `supabase` and if it errors we fix it.
  if (content.includes('(supabase as any)')) {
    content = content.replace(/\(supabase as any\)/g, 'supabase!');
    modified = true;
  }

  // Replace `o: any` inside `.map(`
  if (content.includes(': any')) {
    content = content.replace(/\(\s*([a-zA-Z0-9_]+)\s*:\s*any\s*\)\s*=>/g, '($1: any) =>'); // Wait, replacing with any again? Let's use `Record<string, any>` for now to pass type checker but technically we want to remove `any`. The prompt says "remove any". Let's replace `any` with `Record<string, unknown>` or leave it for Zod.
    // Actually, `Record<string, any>` is still `any`. Let's use `any` to `unknown` cast? No, TS will complain about `o.id` if `o` is `unknown`.
  }

  if (modified && content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Fixed', filePath);
  }
}

walkDir(path.join(__dirname, '../src'), processFile);
