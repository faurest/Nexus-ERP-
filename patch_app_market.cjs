const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('const Marketplace = React.lazy(() => import(\'./components/Marketplace\'));')) {
  // Add lazy import
  code = code.replace(/const MarketplaceAdminModule = React\.lazy\(\(\) => import\('\.\/components\/MarketplaceAdminModule'\)\);/, "const MarketplaceAdminModule = React.lazy(() => import('./components/MarketplaceAdminModule'));\nconst Marketplace = React.lazy(() => import('./components/Marketplace'));");
  fs.writeFileSync('src/App.tsx', code);
  console.log('patched Marketplace import in App.tsx');
}
