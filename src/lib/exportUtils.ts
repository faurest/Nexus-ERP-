import { collection, query, where, getDocs, doc, setDoc } from './firebase';
import { db } from './firebase';

export async function exportCompanyDataAsJSON(companyId: string, companyName: string) {
  const collectionsToExport = ['clients', 'personnel', 'resources', 'projects', 'tasks', 'sales', 'sales_invoices', 'expenses', 'partners'];
  const exportData: Record<string, any[]> = {};

  for (const collectionName of collectionsToExport) {
    const q = query(collection(db, collectionName), where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    exportData[collectionName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // Convert to JSON string
  const jsonString = JSON.stringify({ company: companyName, data: exportData }, null, 2);

  // Trigger download
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Export-${companyName.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function importCompanyDataFromJSON(companyId: string, jsonData: any) {
  if (!jsonData || !jsonData.data) {
    throw new Error('Format de fichier invalide. Aucune donnée trouvée.');
  }

  const collectionsToImport = ['clients', 'personnel', 'resources', 'projects', 'tasks', 'sales', 'sales_invoices', 'expenses', 'partners'];
  
  for (const collectionName of collectionsToImport) {
    const items = jsonData.data[collectionName];
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const itemData = { ...item, companyId };
        const itemId = item.id;
        delete itemData.id; // Enlever l'id des champs du document
        
        let docRef;
        if (itemId) {
          docRef = doc(db, collectionName, itemId);
        } else {
          docRef = doc(collection(db, collectionName));
        }

        // Utiliser merge: true pour mettre à jour ou créer sans écraser les champs manquants
        await setDoc(docRef, itemData, { merge: true });
      }
    }
  }
}

