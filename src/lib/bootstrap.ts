import { collection, getDocs, addDoc, serverTimestamp } from './firebase';
import { db } from './firebase';

export async function bootstrapDemoData(companyId: string) {
  const clientsSnap = await getDocs(collection(db, 'clients'));
  if (clientsSnap.empty) {
    console.log('Bootstrapping clients...');
    await addDoc(collection(db, 'clients'), {
      companyId,
      name: 'Entreprise Alpha',
      email: 'contact@alpha.com',
      phone: '01 23 45 67 89',
      salesTotal: 15400,
      loyaltyPoints: 120,
      createdAt: serverTimestamp()
    });
    await addDoc(collection(db, 'clients'), {
      companyId,
      name: 'Jean Martin',
      email: 'jean.martin@gmail.com',
      phone: '06 12 34 56 78',
      salesTotal: 3200,
      loyaltyPoints: 45,
      createdAt: serverTimestamp()
    });
  }

  const personnelSnap = await getDocs(collection(db, 'personnel'));
  if (personnelSnap.empty) {
    console.log('Bootstrapping personnel...');
    await addDoc(collection(db, 'personnel'), {
      companyId,
      name: 'Alice Bernard',
      role: 'Responsable Ventes',
      email: 'alice.b@entreprise.com',
      status: 'active',
      department: 'Commercial',
      tasksAssignedCount: 3,
      createdAt: serverTimestamp()
    });
    await addDoc(collection(db, 'personnel'), {
      companyId,
      name: 'Bob Richards',
      role: 'Directeur Logistique',
      email: 'bob.r@entreprise.com',
      status: 'active',
      department: 'Opérations',
      tasksAssignedCount: 12,
      createdAt: serverTimestamp()
    });
  }

  const resourcesSnap = await getDocs(collection(db, 'resources'));
  if (resourcesSnap.empty) {
    console.log('Bootstrapping resources...');
    await addDoc(collection(db, 'resources'), {
      companyId,
      name: 'Papier A4 Premium',
      type: 'Stock',
      quantity: 5,
      status: 'Low',
      location: 'Armoire B12',
      createdAt: serverTimestamp()
    });
    await addDoc(collection(db, 'resources'), {
      companyId,
      name: 'MacBook Pro 16"',
      type: 'Material',
      quantity: 14,
      status: 'Available',
      location: 'Bureau IT',
      createdAt: serverTimestamp()
    });
  }

  const partnersSnap = await getDocs(collection(db, 'partners'));
  if (partnersSnap.empty) {
    console.log('Bootstrapping partners...');
    const google = await addDoc(collection(db, 'partners'), {
      companyId,
      name: 'Google Cloud',
      type: 'Partner',
      contactEmail: 'sales@google.com',
      createdAt: serverTimestamp()
    });

    await addDoc(collection(db, 'projects'), {
      companyId,
      name: 'Migration Infrastructure',
      partnerId: google.id,
      status: 'active',
      budget: 85000,
      startDate: serverTimestamp(),
      createdAt: serverTimestamp()
    });
  }
}
