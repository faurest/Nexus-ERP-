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
      
      // Fix the bg-nexus-surface/5 mistake
      content = content.replace(/bg-nexus-surface\/5/g, 'bg-white/5');
      content = content.replace(/bg-nexus-surface\/10/g, 'bg-white/10');
      content = content.replace(/bg-nexus-surface\/20/g, 'bg-white/20');
      
      // Upgrade input focus states to premium nexus accent
      content = content.replace(/focus:border-blue-[400|500|600]+\b/g, 'focus:border-nexus-accent focus:ring-1 focus:ring-nexus-accent');
      content = content.replace(/focus:border-indigo-[400|500|600]+\b/g, 'focus:border-nexus-accent focus:ring-1 focus:ring-nexus-accent');
      content = content.replace(/focus:border-teal-[400|500|600]+\b/g, 'focus:border-nexus-accent focus:ring-1 focus:ring-nexus-accent');
      content = content.replace(/focus:ring-blue-[400|500|600]+\b/g, 'focus:ring-nexus-accent');
      
      // Upgrade basic form buttons
      content = content.replace(/bg-slate-900(?=[\s"'])(?![\w/])/g, 'bg-nexus-accent');
      content = content.replace(/hover:bg-slate-800/g, 'hover:bg-nexus-accent/80 text-white');
      content = content.replace(/bg-blue-600/g, 'bg-nexus-accent text-white hover:bg-nexus-accent/80');
      
      // Modals should look premium. Let's add glass effects to any bg-nexus-surface that is a modal box.
      // Usually they have `rounded-2xl`, let's add shadow-2xl if they don't have it, and border
      content = content.replace(/bg-nexus-surface rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-white\/10/g, 
        'bg-nexus-surface/90 backdrop-blur-xl rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-white/10 ring-1 ring-white/5'
      );
      
      // Same for 3xl
      content = content.replace(/bg-nexus-surface rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-white\/10/g, 
        'bg-nexus-surface/90 backdrop-blur-xl rounded-[2rem] p-8 max-w-lg w-full shadow-2xl border border-white/10 ring-1 ring-white/5'
      );

      // Clean up multiple text-nexus-text
      content = content.replace(/text-nexus-text text-nexus-text/g, 'text-nexus-text');
      
      if (content !== originalContent) {
           fs.writeFileSync(fullPath, content);
           console.log(`Upgraded form visuals in ${fullPath}`);
      }
    }
  }
}

processDir('./src/components');
processDir('./src/modules');
