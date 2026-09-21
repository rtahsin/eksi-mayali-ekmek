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

  // Add missing import for getErrorMessage
  if (content.includes('getErrorMessage') && !content.includes('@/lib/utils/error')) {
    // find last import or beginning of file
    const importRegex = /import\s+.*?;?\n/g;
    let lastMatch = null;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      lastMatch = match;
    }
    
    const importStatement = `import { getErrorMessage } from "@/lib/utils/error";\n`;
    if (lastMatch) {
      content = content.slice(0, lastMatch.index + lastMatch[0].length) + importStatement + content.slice(lastMatch.index + lastMatch[0].length);
    } else {
      content = importStatement + content;
    }
    modified = true;
  }

  // Find left-over e.message where e is unknown (often supaErr or err)
  // E.g. supaErr.message -> getErrorMessage(supaErr)
  const messageRegex = /([a-zA-Z0-9_]+)\.message/g;
  content = content.replace(messageRegex, (match, varName) => {
    if (varName !== 'error' && varName !== 'e' && varName !== 'err' && varName !== 'supaErr' && varName !== 'insErr' && varName !== 'updErr' && varName !== 'delErr') {
      return match;
    }
    modified = true;
    return `getErrorMessage(${varName})`;
  });

  // Fix admin/settings never[] error
  // await supabase.from('settings').upsert({ key: "whatsapp_enabled", value: true })
  // upsert is inferring never because settings table might not have types.
  // if `supabase` is used, we can cast it to `any` for now or provide types. Since we removed `as any` from `supabase`, `supabase.from('settings')` returns type `never`.
  // Wait, I replaced `(supabase as any)` with `supabase!`. Since `supabase` is typed as returning `SupabaseClient<any, "public", any>`, why does it infer `never`?
  // Because `from('settings')` relies on Database type. If it's not typed, it might infer `never`. Let's replace `supabase.from` with `(supabase as any).from`. Wait, we want to remove `any`! Let's cast to `Record<string, unknown>`.

  if (modified && content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Fixed', filePath);
  }
}

walkDir(path.join(__dirname, '../src'), processFile);
