const fs = require('fs');
let code = fs.readFileSync('src/components/EcommerceModule.tsx', 'utf8');

if (!code.includes('is_marketplace_visible: formData.get(\'marketplace_visible\') === \'on\'')) {
  // Add to product creation defaults
  code = code.replace(/allowBackorder: false,/, "allowBackorder: false,\n                         is_marketplace_visible: true,");

  // Add to updateProduct call
  code = code.replace(/allowBackorder: formData\.get\('allowBackorder'\) === 'on',/, "allowBackorder: formData.get('allowBackorder') === 'on',\n                  is_marketplace_visible: formData.get('marketplace_visible') === 'on',");
  
  // Add the checkbox to the form
  const refCheckbox = /<div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">\s*<input name="allowBackorder"[\s\S]*?<\/div>\s*<\/div>/;
  const match = code.match(refCheckbox);
  if (match) {
    const marketplaceChkbx = `
                <div className="flex items-center gap-3 bg-emerald-50 p-4 rounded-xl border border-emerald-200 mt-4">
                  <input name="marketplace_visible" type="checkbox" defaultChecked={editingProduct.is_marketplace_visible !== false} className="w-5 h-5 rounded-md border-emerald-300 text-emerald-600 focus:ring-emerald-500" />
                  <div>
                    <label className="text-xs font-black text-emerald-900 uppercase tracking-tight">Publier sur Marketplace</label>
                    <p className="text-[9px] font-medium text-emerald-600 uppercase">Le produit sera visible sur l'espace d'achat B2B.</p>
                  </div>
                </div>
    `;
    code = code.replace(refCheckbox, `${match[0]}\n${marketplaceChkbx}`);
    fs.writeFileSync('src/components/EcommerceModule.tsx', code);
    console.log('patched marketplace checkbox successfully');
  } else {
    console.log('checkbox match failed');
  }
}
