import * as fs from 'fs';
import * as path from 'path';

function processDir(dir: string) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      content = content.replace(/(<(?:input|select|textarea)[\s\S]*?className=")([^"]*)("[\s\S]*?>)/g, (match, prefix, classContent, suffix) => {
        let classes = classContent;
        if (!classes.includes('text-white') && !classes.includes('text-nexus-text') && !classes.includes('text-nexus-text-muted') && !classes.includes('text-black') && !classes.includes('text-slate-')) {
             classes = classes + ' text-nexus-text placeholder-white/40';
        }
        return prefix + classes + suffix;
      });
      
      if (content !== originalContent) {
           fs.writeFileSync(fullPath, content);
           console.log(`Fixed inputs in ${fullPath}`);
      }
    }
  }
}

processDir('./src/components');
processDir('./src/modules');
