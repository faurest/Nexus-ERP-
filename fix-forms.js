const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Add text-slate-900 to input/textarea/select if not present
      content = content.replace(/(<(input|select|textarea)[^>]*className="[^"]*)(?=")/g, (match) => {
        if (!match.includes('text-slate-900') && !match.includes('text-white') && !match.includes('text-black')) {
             if (match.includes('bg-slate-50') || match.includes('bg-white')) {
                  return match + ' text-slate-900';
             }
        }
        return match;
      });
      
      // Alternatively, let's just make the modals dark by replacing bg-white with bg-nexus-surface!
      // But wait, the user's issue is literally just: "je n'arrive pas avoir les informations inscrites ni les informations que j'inscris"
      // They just want to see the text in the forms!
      
      fs.writeFileSync(fullPath, content);
    }
  }
}
processDir('./src/components');
