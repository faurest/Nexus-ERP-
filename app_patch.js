const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/const \[userProfile, setUserProfile\] = useState<UserProfile \| null>\(null\);/, '');
code = code.replace(/const unsubscribe = onAuthStateChanged.*?setLoading\(false\);\n    }\);/ms, 'setLoading(false); // Managed by recoveryEngine');
code = code.replace(/userProfile={userProfile}/g, 'userProfile={profile}');
fs.writeFileSync('src/App.tsx', code);
console.log('Done!');
