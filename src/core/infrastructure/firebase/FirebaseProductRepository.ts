import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { db } from '../../../lib/firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';

export class FirebaseProductRepository implements IProductRepository {
  async getProducts(companyId: string): Promise<any[]> {
    const q = query(collection(db, 'products'), where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getProductById(id: string): Promise<any | null> {
    const docRef = doc(db, 'products', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() };
  }

  async createProduct(product: any): Promise<string> {
    const docRef = await addDoc(collection(db, 'products'), product);
    return docRef.id;
  }

  async updateProduct(id: string, data: any): Promise<void> {
    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, data);
  }

  async deleteProduct(id: string): Promise<void> {
    const docRef = doc(db, 'products', id);
    await deleteDoc(docRef);
  }

  subscribeToProducts(companyId: string, callback: (products: any[]) => void): () => void {
    const q = query(collection(db, 'products'), where('companyId', '==', companyId));
    return onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(products);
    });
  }
}
