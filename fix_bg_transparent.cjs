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

      const tagsToMatch = ['input', 'textarea', 'select'];
      for (const tag of tagsToMatch) {
         let searchStr = `<${tag}`;
         let splitContent = content.split(searchStr);
         if (splitContent.length > 1) {
            for (let i = 1; i < splitContent.length; i++) {
               let part = splitContent[i];
               let classMatch = part.match(/className=(["'])([^"']*)["']/);
               if (classMatch) {
                   let classStr = classMatch[2];
                   if (classStr.includes('bg-transparent') && !classStr.match(/text-(slate-|gray-|black|white|nexus-text[^\s]|blue-|indigo-|amber-|emerald-)/)) {
                       let newClassStr = classStr.trim() + " text-nexus-text";
                       let newPart = part.replace(`className=${classMatch[1]}${classStr}${classMatch[1]}`, `className=${classMatch[1]}${newClassStr}${classMatch[1]}`);
                       splitContent[i] = newPart;
                       modified = true;
                   }
               }
            }
            content = splitContent.join(searchStr);
         }
      }

      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated bg-transparent missing text in ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'src', 'components'));
processDir(path.join(__dirname, 'src', 'modules'));
console.log('Done scanning components and modules for bg-transparent.');
