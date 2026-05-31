const fs = require('fs');
const path = require('path');

function replaceInFiles() {
  const dirFiles = [
    ...fs.readdirSync('src/components').map(f => 'src/components/' + f),
    ...fs.readdirSync('src/lib').map(f => 'src/lib/' + f),
    'src/App.tsx'
  ];

  for (const f of dirFiles) {
    if (!f.endsWith('.ts') && !f.endsWith('.tsx')) continue;
    try {
      let content = fs.readFileSync(f, 'utf8');
      if (content.includes('firebaseMock')) {
        content = content.replace(/firebaseMock/g, 'firebase');
        fs.writeFileSync(f, content);
      }
    } catch(e){}
  }
}

replaceInFiles();
console.log('replaced');
