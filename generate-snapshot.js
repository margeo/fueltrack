import fs from 'fs';
import path from 'path';

const INCLUDE_DIRS = ['src', 'netlify'];
const INCLUDE_EXTENSIONS = ['.jsx', '.js', '.css', '.json', '.md', '.toml'];
const EXCLUDE = ['node_modules', 'dist', '.git', 'SNAPSHOT.md', 'package-lock.json'];

function readDir(dir, base = '') {
  const results = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (EXCLUDE.includes(item)) continue;
    const fullPath = path.join(dir, item);
    const relPath = path.join(base, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...readDir(fullPath, relPath));
    } else if (INCLUDE_EXTENSIONS.includes(path.extname(item))) {
      results.push({ path: relPath, content: fs.readFileSync(fullPath, 'utf8') });
    }
  }
  return results;
}

let snapshot = `# SNAPSHOT — ${new Date().toISOString()}\n\n`;

// Root files
for (const f of ['package.json', 'vite.config.js', 'netlify.toml', 'index.html']) {
  if (fs.existsSync(f)) {
    snapshot += `## ${f}\n\`\`\`\n${fs.readFileSync(f, 'utf8')}\n\`\`\`\n\n`;
  }
}

// src + netlify
for (const dir of INCLUDE_DIRS) {
  if (!fs.existsSync(dir)) continue;
  const files = readDir(dir, dir);
  for (const file of files) {
    snapshot += `## ${file.path}\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
  }
}

fs.writeFileSync('SNAPSHOT.md', snapshot);
console.log('✅ SNAPSHOT.md generated!');