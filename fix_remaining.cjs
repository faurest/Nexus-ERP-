const fs = require('fs');
const path = require('path');

const modulePath = path.join(__dirname, 'src/components/PersonnelModule.tsx');
let content = fs.readFileSync(modulePath, 'utf8');

// 1. editingPermissionsStaff
content = content.replace(
  /await updateDoc\(doc\(db, 'personnel', editingPermissionsStaff\.id\), \{\s*customPermissions: selectedPermissions,\s*updatedAt: serverTimestamp\(\)\s*\}\);/g,
  `await staffFacade.updateStaff(editingPermissionsStaff.id, { customPermissions: selectedPermissions });`
);

// 2. handleFirestoreError for tasks
content = content.replace(/handleFirestoreError\(err, OperationType\.WRITE, 'tasks'\);/g, "console.error(err);");

// 3. updateDoc for status
content = content.replace(
  /await updateDoc\(doc\(db, 'personnel', staffId\), \{\s*status: currentStatus === 'blocked' \? 'active' : 'blocked',\s*updatedAt: serverTimestamp\(\)\s*\}\);/g,
  `await staffFacade.updateStaff(staffId, { status: currentStatus === 'blocked' ? 'active' : 'blocked' });`
);

// 4. handleFirestoreError for salary advances
content = content.replace(/handleFirestoreError\(err, OperationType\.UPDATE, 'salary_advances'\);/g, "console.error(err);");

fs.writeFileSync(modulePath, content);
console.log('Fixed remaining references.');
