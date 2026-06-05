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

      content = content.replace(/bg-nexus-surface\/90 backdrop-blur-xl rounded(-\[[0-9a-zrem]+\]|-2xl|-3xl) p-8 max-w-lg w-full shadow-2xl border border-white\/10 ring-1 ring-white\/5/g, 
        'bg-[#12182B] rounded$1 p-8 max-w-lg w-full shadow-2xl border border-slate-800/80');

      content = content.replace(/bg-nexus-surface rounded-\[([0-9a-zrem]+)\] p-([0-9]+) max-w-lg w-full shadow-2xl border border-white\/[0-9]+/g, 
        'bg-[#12182B] rounded-[$1] p-$2 max-w-lg w-full shadow-2xl border border-slate-800/80');

      content = content.replace(/bg-nexus-surface rounded-(2xl|3xl) p-8 max-w-lg w-full shadow-2xl border border-white\/[0-9]+/g, 
        'bg-[#12182B] rounded-$1 p-8 max-w-lg w-full shadow-2xl border border-slate-800/80');
        
      content = content.replace(/bg-nexus-surface border border-white\/10 p-8 max-w-lg w-full shadow-2xl border border-white\/5/g, 
        'bg-[#12182B] p-8 max-w-lg w-full shadow-2xl border border-slate-800/80');

      content = content.replace(/bg-nexus-surface border border-white\/10/g, 'bg-[#12182B] border border-slate-800/80');

      // Reformat inputs beautifully
      content = content.replace(/(<(?:input|select|textarea)[\s\S]*?className=")([^"]*)("[\s\S]*?>)/g, (match, prefix, cls, suffix) => {
        if (cls.includes('bg-white/5') || cls.includes('bg-white/10')) {
          let newCls = cls.replace(/bg-white\/\d+/g, 'bg-[#0B1020]')
                         .replace(/border-white\/\d+/g, 'border-[#1E293B]')
                         .replace(/text-nexus-text(-muted)?/g, 'text-slate-100')
                         .replace(/placeholder-white\/\d+/g, 'placeholder-slate-500')
                         .replace(/focus:border-\w+(-\w+)?/g, 'focus:border-[#3B82F6]')
                         .replace(/focus:ring-\w+(-\w+)?/g, 'focus:ring-[#3B82F6]')
                         + ' shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] hover:border-[#334155] transition-colors';
          newCls = newCls.replace(/\s+/g, ' ').trim();
          return prefix + newCls + suffix;
        }
        return match;
      });

      content = content.replace(/bg-nexus-accent text-white hover:bg-nexus-accent\/80/g, 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-600/20 shadow-md');

      if (content !== originalContent) {
           fs.writeFileSync(fullPath, content);
           console.log(`Refined UI in ${fullPath}`);
      }
    }
  }
}

processDir('./src/components');
processDir('./src/modules');
