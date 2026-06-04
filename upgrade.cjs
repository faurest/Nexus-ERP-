const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Upgrade basic bg-white / bg-slate-50 forms to dark premium theme
      content = content.replace(/bg-slate-50/g, 'bg-white/5');
      content = content.replace(/border-slate-100/g, 'border-white/5');
      content = content.replace(/border-slate-200/g, 'border-white/10');
      content = content.replace(/border-slate-300/g, 'border-white/20');
      content = content.replace(/text-slate-400/g, 'text-nexus-text-muted');
      content = content.replace(/text-slate-500/g, 'text-nexus-text-muted/80');
      content = content.replace(/text-slate-600/g, 'text-nexus-text-muted');
      content = content.replace(/text-slate-700/g, 'text-nexus-text-muted');
      // For general modal backgrounds, text should be nexus-text
      content = content.replace(/text-slate-800/g, 'text-nexus-text');
      content = content.replace(/text-slate-900/g, 'text-nexus-text');
      
      // Specifically target inputs to ensure they have correct text color
      content = content.replace(/(<(input|select|textarea)[^>]*className="[^"]*)(?=")/g, (match) => {
        if (!match.includes('text-white') && !match.includes('text-nexus-text')) {
             return match + ' text-nexus-text placeholder-white/40';
        }
        return match;
      });
      
      // Upgrade modal backgrounds
      // Modals often look like: bg-white rounded-2xl p-8
      content = content.replace(/bg-white rounded-([a-z0-9]+)/g, 'bg-nexus-surface rounded-$1 border border-white/10');
      // Specific replacements for bg-white on some boxes/buttons
      content = content.replace(/bg-white/g, 'bg-nexus-surface');

      fs.writeFileSync(fullPath, content);
    }
  }
}
processDir('./src/components');
