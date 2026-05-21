const fs = require('fs');
let code = fs.readFileSync('src/components/EcommerceModule.tsx', 'utf8');

// Add to Product interface
if (!code.includes('is_marketplace_visible?: boolean;')) {
  code = code.replace(/allowBackorder\?: boolean;/, "allowBackorder?: boolean;\n  is_marketplace_visible?: boolean;");

  // In the activeView === 'admin' when rendering products editing... Let's find how products are edited.
  // There is a state: editingProduct. We can add a checkbox.
  const regexCheckbox = /<div className="flex items-center gap-2 mt-4">[\s\S]*?<input[\s\S]*?allowBackorder[\s\S]*?<\/div>/;
  
  const checkboxMatch = code.match(regexCheckbox);
  if (checkboxMatch) {
    const marketplaceToggle = `
          <div className="flex items-center gap-2 mt-4 border-t pt-4">
            <input
              type="checkbox"
              id="marketplace_visible"
              checked={editingProduct.is_marketplace_visible !== false}
              onChange={(e) => setEditingProduct({ ...editingProduct, is_marketplace_visible: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="marketplace_visible" className="text-sm font-bold flex items-center gap-2">
              <Store size={16} className="text-blue-500" /> Publier sur le Marketplace Public
            </label>
          </div>`;
    
    code = code.replace(regexCheckbox, `${checkboxMatch[0]}\n${marketplaceToggle}`);
    fs.writeFileSync('src/components/EcommerceModule.tsx', code);
    console.log('patched EcommerceModule successfully');
  } else {
    // maybe we can insert it just before 'Enregistrer les modifications'
    const saveBtn = /<button\s+onClick=\{.*updateProduct.*\}[^>]*>\s*Enregistrer/i;
    if (saveBtn.test(code)) {
      const btnMatch = code.match(saveBtn);
      const marketplaceToggle = `
          <div className="flex items-center gap-2 mt-4 mb-4 border-t pt-4">
            <input
              type="checkbox"
              id="marketplace_visible"
              checked={editingProduct.is_marketplace_visible !== false}
              onChange={(e) => setEditingProduct({ ...editingProduct, is_marketplace_visible: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <label htmlFor="marketplace_visible" className="text-sm font-bold flex items-center gap-2">
               Publier sur le Marketplace Public
            </label>
          </div>`;
          
      code = code.replace(saveBtn, `${marketplaceToggle}\n${btnMatch[0]}`);
      fs.writeFileSync('src/components/EcommerceModule.tsx', code);
      console.log('patched EcommerceModule via fallback');
    }
  }
}
