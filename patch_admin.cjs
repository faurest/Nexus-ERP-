const fs = require('fs');
let code = fs.readFileSync('src/components/MarketplaceAdminModule.tsx', 'utf8');
code = code.replace(/collection\(db, 'global_orders'\)/g, "collection(db, 'ecommerce_orders')");
fs.writeFileSync('src/components/MarketplaceAdminModule.tsx', code);
console.log('patched');
