const fs = require('fs');

const files = [
  'src/components/ProjectModule.tsx',
  'src/components/PersonnelModule.tsx',
  'src/components/ResourceModule.tsx',
  'src/components/ClientModule.tsx',
  'src/components/SalesModule.tsx',
  'src/lib/bootstrap.ts',
  'src/lib/exportUtils.ts',
  'src/lib/CompanyContext.tsx'
];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/from 'firebase\/firestore'/g, "from '../lib/firebaseMock'");
  fs.writeFileSync(f, c);
});

let appc = fs.readFileSync('src/App.tsx', 'utf8');
appc = appc.replace(/from 'firebase\/firestore'/g, "from './lib/firebaseMock'");
appc = appc.replace(/from '\.\/lib\/firebase'/g, "from './lib/firebaseMock'");
fs.writeFileSync('src/App.tsx', appc);
console.log('done reverting');
