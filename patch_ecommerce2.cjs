const fs = require('fs');
let code = fs.readFileSync('src/components/EcommerceModule.tsx', 'utf8');

if (!code.includes('is_marketplace_visible: formData.get(\'marketplace_visible\') === \'on\'')) {
  // Add to updateProduct call
  code = code.replace(/allowBackorder: formData\.get\('allowBackorder'\) === 'on',/, "allowBackorder: formData.get('allowBackorder') === 'on',\n                  is_marketplace_visible: formData.get('marketplace_visible') === 'on',");
  
  // Add the checkbox to the form
  const refCheckbox = /<input type="checkbox" name="allowBackorder" defaultChecked=\{editingProduct\.allowBackorder\} className="w-4 h-4 text-blue-600 rounded" \/>[\s\S]*?<\/div>/;
  const match = code.match(refCheckbox);
  if (match) {
    const marketplaceChkbx = `
          <div className="flex items-center gap-2 mt-2">
            <input type="checkbox" name="marketplace_visible" defaultChecked={editingProduct.is_marketplace_visible !== false} className="w-4 h-4 text-emerald-600 rounded border-slate-300" />
            <label className="text-sm font-bold text-slate-700 block gap-2 flex items-center">
              Publier sur la Marketplace Publique
            </label>
          </div>
    `;
    code = code.replace(refCheckbox, `${match[0]}\n${marketplaceChkbx}`);
    fs.writeFileSync('src/components/EcommerceModule.tsx', code);
    console.log('patched marketplace checkbox successfully');
  } else {
    console.log('checkbox match failed');
  }
}
