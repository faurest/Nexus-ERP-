import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function processDir(dir) {
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
        'bg-[#0f172a] rounded$1 p-10 max-w-2xl w-full shadow-2xl border border-slate-800/80');

      content = content.replace(/bg-nexus-surface\/90 backdrop-blur-xl rounded-\[([0-9a-zrem]+)\] p-([0-9]+) max-w-lg w-full shadow-2xl border border-white\/10 ring-1 ring-white\/5/g, 
        'bg-[#0f172a] rounded-[$1] p-10 max-w-2xl w-full shadow-2xl border border-slate-800/80');

      content = content.replace(/bg-nexus-surface rounded-(2xl|3xl) p-8 max-w-lg w-full shadow-2xl border border-white\/[0-9]+/g, 
        'bg-[#0f172a] rounded-$1 p-10 max-w-2xl w-full shadow-2xl border border-slate-800/80');
        
      content = content.replace(/bg-nexus-surface border border-white\/10 p-8 max-w-lg w-full shadow-2xl border border-white\/5/g, 
        'bg-[#0f172a] p-10 max-w-2xl w-full shadow-2xl border border-slate-800/80');

      content = content.replace(/bg-nexus-surface border border-white\/10/g, 'bg-[#0f172a] border border-slate-800/80');

      // Add a bit more max width because inputs were small
      content = content.replace(/max-w-lg/g, 'max-w-2xl');

      // Reformat inputs beautifully
      content = content.replace(/(<(?:input|select|textarea)[\s\S]*?className=")([^"]*)("[\s\S]*?>)/g, (match, prefix, cls, suffix) => {
        if (cls.includes('bg-white/5') || cls.includes('bg-white/10') || cls.includes('focus:border-nexus-accent')) {
          let newCls = cls.replace(/bg-white\/\d+/g, '')
                         .replace(/border-white\/\d+/g, '')
                         .replace(/focus:border-\w+(-\w+)?/g, '')
                         .replace(/focus:ring-\w+(-\w+)?/g, '')
                         .replace(/text-nexus-text(-muted)?/g, '')
                         .replace(/placeholder-white\/\d+/g, '')
                         .replace(/shadow\w*/g, '')
                         .replace(/outline-none/g, '');
                         
          // Remove potential duplicates
          newCls = newCls.replace(/bg-\[#\w+\]|border-\[#\w+\]|text-\w+-\d+|placeholder-\w+-\d+|hover:border-\w+-\d+|shadow-\[.*?\]|transition-colors/g, '');

          // Now standardize it exactly
          newCls += ' bg-[#1e293b] border border-slate-700 text-slate-50 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-inner px-4 py-3 outline-none hover:border-slate-500 transition-colors';
          newCls = newCls.replace(/\s+/g, ' ').trim();
          return prefix + newCls + suffix;
        }
        return match;
      });

      content = content.replace(/bg-nexus-accent text-white hover:bg-nexus-accent\/80/g, 'bg-[#2563eb] text-white hover:bg-[#1d4ed8] shadow-lg hover:shadow-blue-500/20');
      content = content.replace(/bg-slate-900 text-white hover:bg-slate-800/g, 'bg-[#2563eb] text-white hover:bg-[#1d4ed8] shadow-lg hover:shadow-blue-500/20');

      // Let's improve the labels so they are readable and elegant
      content = content.replace(/text-\[10px\] font-bold text-nexus-text-muted uppercase ml-1/g, 'text-xs text-slate-300 font-semibold mb-1 ml-1 block');

      if (content !== originalContent) {
           fs.writeFileSync(fullPath, content);
           console.log(`Refined UI in ${fullPath}`);
      }
    }
  }
}

// In the new container, PWD is /
processDir('./src/components');
processDir('./src/modules');
processDir('./src/core');
