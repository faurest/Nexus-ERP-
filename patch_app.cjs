const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('MarketplaceAdminModule')) {
  // Add lazy import
  code = code.replace(/const GuideModule = React\.lazy\(\(\) => import\('\.\/components\/GuideModule'\)\);/, "const GuideModule = React.lazy(() => import('./components/GuideModule'));\nconst MarketplaceAdminModule = React.lazy(() => import('./components/MarketplaceAdminModule'));");
  
  // Add navigation item if user is global admin (super admin view for marketplace)
  // We'll just hijack the admin dropdown or add it there.
  // Actually, we can add it to navItems
  code = code.replace(/\{ id: 'admin', label: 'Administration', icon: Shield \}/, "{ id: 'admin', label: 'Administration', icon: Shield },\n      ...(isGlobalAdmin ? [{ id: 'market_admin', label: 'Admin Marketplace', icon: Shield }] : [])");

  // Add the tab rendering inside the suspense
  code = code.replace(/\{activeTab === 'admin' && <AdminModule \/>\}/, "{activeTab === 'admin' && <AdminModule />}\n              {activeTab === 'market_admin' && <MarketplaceAdminModule />}");
  
  // Also we need to make sure 'market_admin' passes the RBAC filter inside App.tsx
  code = code.replace(/if \(item\.id === 'admin'\) return isGlobalAdmin;/, "if (item.id === 'admin' || item.id === 'market_admin') return isGlobalAdmin;");

  fs.writeFileSync('src/App.tsx', code);
  console.log('patched App.tsx successfully');
} else {
  console.log('already patched');
}
