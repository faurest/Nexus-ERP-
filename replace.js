const fs = require('fs');

const files = [
  'src/components/ProjectModule.tsx',
  'src/components/PersonnelModule.tsx',
  'src/components/ResourceModule.tsx',
  'src/components/ClientModule.tsx',
  'src/components/SalesModule.tsx',
  'src/lib/bootstrap.ts',
  'src/lib/CompanyContext.tsx',
  'src/lib/exportUtils.ts',
  'src/App.tsx'
];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/from '\.\.\/lib\/firebaseMock'/g, "from 'firebase/firestore'");
  c = c.replace(/from '\.\/firebaseMock'/g, "from 'firebase/firestore'");
  c = c.replace(/from '\.\/lib\/firebaseMock'/g, "from 'firebase/firestore'");
  fs.writeFileSync(f, c);
});
console.log('done replacing');
