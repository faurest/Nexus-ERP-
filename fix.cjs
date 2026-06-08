const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      // We will look for <input, <textarea, <select and see if they have className="... bg-slate-50 ..." and lack text-slate-*
      content = content.replace(/<(input|textarea|select)([^>]*?)className=(["'])([^"']*?)["']([^>]*?)>/g, (match, tag, before, quote, classNames, after) => {
        if (classNames.includes('bg-slate-50') && !classNames.match(/text-(slate-|gray-|black)/)) {
          modified = true;
          return `<${tag}${before}className=${quote}${classNames} text-slate-900${quote}${after}>`;
        }
        return match;
      });

      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'src', 'components'));
processDir(path.join(__dirname, 'src', 'modules'));
console.log('Done scanning components and modules.');
