const fs = require('fs');
let code = fs.readFileSync('src/components/EcommerceModule.tsx', 'utf8');

// Replace standard Interface
code = code.replace(/allowBackorder\?: boolean;/g, "allowBackorder?: boolean;\n  is_marketplace_visible?: boolean;");

fs.writeFileSync('src/components/EcommerceModule.tsx', code);
console.log('patched');
