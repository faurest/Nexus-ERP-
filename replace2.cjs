const fs = require('fs');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/from 'firebase\/firestore'/g, "from '../lib/firebaseMock'");
  content = content.replace(/from '\.\.\/lib\/firebase'/g, "from '../lib/firebaseMock'");
  content = content.replace(/from '\.\/lib\/firebase'/g, "from './lib/firebaseMock'");
  // specific replacing for App.tsx which might have firebase imports not starting with from:
  content = content.replace(/import \{.*?\} from 'firebase\/firestore';/, "import { auth, loginWithGoogle, loginWithEmail, signupWithEmail, logout, db, onAuthStateChanged, addDoc, collection, query, where, getDocs, doc, updateDoc, arrayUnion } from './lib/firebaseMock';");
  fs.writeFileSync(filePath, content);
}

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
  if (fs.existsSync(f)) {
    replaceInFile(f);
  }
});
