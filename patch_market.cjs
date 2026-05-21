const fs = require('fs');
let code = fs.readFileSync('src/components/Marketplace.tsx', 'utf8');

if (!code.includes('is_marketplace_visible !== false')) {
  // Add to Product interface
  code = code.replace(/allowBackorder\?: boolean;/, "allowBackorder?: boolean;\n  is_marketplace_visible?: boolean;");

  // Modify setProducts
  const oldSet = /setProducts\(\s*snap\.docs\.map\(\(d\) => \(\{ id: d\.id, \.\.\.d\.data\(\) \}\) as Product\),\s*\);/;
  const newSet = `setProducts(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as Product)
            .filter((p) => p.is_marketplace_visible !== false)
        );`;
  code = code.replace(oldSet, newSet);
  fs.writeFileSync('src/components/Marketplace.tsx', code);
  console.log('patched marketplace product visibility');
}
