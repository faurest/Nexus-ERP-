const fs = require('fs');
let code = fs.readFileSync('src/store/authStore.ts', 'utf8');

if (!code.includes('isImmutableSuperAdmin')) {
  // We place the import at the top
  code = code.replace(/import \{ persist, createJSONStorage \} from 'zustand\/middleware';/, "import { persist, createJSONStorage } from 'zustand/middleware';\nimport { isImmutableSuperAdmin, resolveMarketplacePermissions } from '../lib/permissionIntegrityChecker';");

  // Fix isMaster assignment
  code = code.replace(/const isMaster = \['hackeurfaurest@gmail.com', 'dangafelicite@gmail.com', 'yaoubaboubakary43@gmail.com'\].includes\(cleanEmail\);/, "const isMaster = isImmutableSuperAdmin(cleanEmail);");

  // Inject marketplace permissions into global admin
  code = code.replace(/set\(\{ activeRole: 'global_admin', permissions: \['\*'\] \}\);/, "set({ activeRole: 'global_admin', permissions: ['*', ...resolveMarketplacePermissions(get().user, 'global_admin', true)] });");

  // Inject marketplace permissions for standard users
  code = code.replace(/set\(\{ activeRole: activeMembership\.roles\.name, permissions \}\);/, "const marketplacePerms = resolveMarketplacePermissions(get().user, activeMembership.roles.name, false);\n        set({ activeRole: activeMembership.roles.name, permissions: [...permissions, ...marketplacePerms] });");

  fs.writeFileSync('src/store/authStore.ts', code);
  console.log('patched successfully');
} else {
  console.log('already patched');
}
