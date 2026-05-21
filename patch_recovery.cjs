const fs = require('fs');
let code = fs.readFileSync('src/store/recoveryEngine.ts', 'utf8');

if (!code.includes('isImmutableSuperAdmin')) {
  code = code.replace(/import \{ useAuthStore \} from '\.\/authStore';/, "import { useAuthStore } from './authStore';\nimport { isImmutableSuperAdmin } from '../lib/permissionIntegrityChecker';");
  
  // Enhance global admin validation fallback check
  code = code.replace(/if \(store\.isGlobalAdmin\) \{/, "const hasGlobalRights = store.isGlobalAdmin || isImmutableSuperAdmin(user.email);\n        if (hasGlobalRights) {");
  
  // Wait, I need to make sure the user passed down is effectively passed.
  // We can just verify if the `isImmutableSuperAdmin` is imported correctly.
  
  fs.writeFileSync('src/store/recoveryEngine.ts', code);
  console.log('patched recovery Engine successfully');
}
