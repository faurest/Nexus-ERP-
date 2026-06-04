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
      // Upgrade basic bg-white / bg-slate-50 forms to dark premium theme
      content = content.replace(/bg-slate-50/g, 'bg-white/5');
      content = content.replace(/border-slate-100/g, 'border-white/5');
      content = content.replace(/border-slate-200/g, 'border-white/10');
      content = content.replace(/border-slate-300/g, 'border-white/20');
      content = content.replace(/text-slate-400/g, 'text-nexus-text-muted');
      content = content.replace(/text-slate-500/g, 'text-nexus-text-muted/80');
      content = content.replace(/text-slate-600/g, 'text-nexus-text-muted');
      content = content.replace(/text-slate-700/g, 'text-nexus-text-muted');
      content = content.replace(/text-slate-800/g, 'text-nexus-text');
      content = content.replace(/text-slate-900/g, 'text-nexus-text');
      
      // Upgrade input tags to have correct text color
      content = content.replace(/(<(input|select|textarea)[^>]*className="[^"]*)(?=")/g, (match) => {
        if (!match.includes('text-white') && !match.includes('text-nexus-text') && !match.includes('text-nexus-text-muted')) {
             return match + ' text-nexus-text placeholder-white/40';
        }
        return match;
      });
      
      // Specific replacements for bg-white on some boxes/buttons
      content = content.replace(/bg-white(?!\/)/g, 'bg-nexus-surface');
      content = content.replace(/text-black/g, 'text-nexus-text');
      
      if (content !== originalContent) {
           fs.writeFileSync(fullPath, content);
           console.log(`Updated ${fullPath}`);
      }
    }
  }
}
processDir('./src/components');
processDir('./src/modules');
processDir('./src/core');
