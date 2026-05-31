import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, arrayUnion, setDoc, serverTimestamp } from '../lib/firebase';
import { 
  Building2, 
  Plus, 
  Users, 
  Search, 
  ExternalLink, 
  ShieldCheck, 
  ShieldAlert,
  Layers,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  Upload,
  Edit2,
  Trash2,
  UserPlus,
  X,
  CheckCircle2,
  AlertCircle,
  Database,
  Shield
} from 'lucide-react';
import { motion } from 'motion/react';
import Table, { TableRow } from './ui/Table';
import { cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';

export default function AdminModule() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [globalSales, setGlobalSales] = useState<any[]>([]);
  const [globalExpenses, setGlobalExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', ownerEmail: '', joinCode: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeAdminTab, setActiveAdminTab] = useState<'companies' | 'users' | 'tools' | 'guide'>('companies');
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [editingCompany, setEditingCompany] = useState<any | null>(null);
  const [showMemberModal, setShowMemberModal] = useState<any | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [showUserAssignModal, setShowUserAssignModal] = useState<any | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchGlobalData = async () => {
    try {
      setLoading(true);
      const [compSnap, salesSnap, expSnap] = await Promise.all([
        getDocs(collection(db, 'companies')),
        getDocs(collection(db, 'sales')),
        getDocs(collection(db, 'expenses'))
      ]);
      
      setCompanies(compSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setGlobalSales(salesSnap.docs.map(d => d.data()));
      setGlobalExpenses(expSnap.docs.map(d => d.data()));

      // Fetch users and potential user sources (personnel, clients)
      try {
        const [usersSnap, personnelSnap, clientsSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'personnel')),
          getDocs(collection(db, 'clients'))
        ]);
        
        const activeUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data(), source: 'active' }));
        const personnelUsers = personnelSnap.docs.map(d => ({ id: d.id, ...d.data(), source: 'personnel' }));
        const clientUsers = clientsSnap.docs.map(d => ({ id: d.id, ...d.data(), source: 'client' }));

        // Use a Map to merge by email (normalized) and UID
        const userMap = new Map<string, any>();

        // 1. Process Personnel & Clients first (the "Invitations")
        [...personnelUsers, ...clientUsers].forEach(u => {
          if (u.email) {
            const email = u.email.trim().toLowerCase().replace(/\s+/g, '');
            const existing = userMap.get(email);
            
            // Prioritize connected status if already found
            const status = (u.uid || existing?.uid || u.status === 'active') ? 'connected' : 'invited';
            
            userMap.set(email, {
              ...existing,
              ...u,
              email: email,
              displayName: u.name || u.displayName || existing?.displayName || 'Utilisateur Invitée',
              status: status,
              uid: u.uid || existing?.uid || null,
              nexusId: u.id || existing?.nexusId || existing?.id || null
            });
          }
        });

        // 2. Process Active Users (the "Logins")
        activeUsers.forEach(u => {
          const email = u.email?.trim().toLowerCase().replace(/\s+/g, '');
          const uid = u.uid;
          
          if (!uid && !email) return;

          // Find if we already have this user via email or UID
          // We check the map values too because some keys might be UIDs if email was missing initially
          let existingKey = email && userMap.has(email) ? email : null;
          
          if (!existingKey) {
            for (const [key, val] of userMap.entries()) {
              if ((uid && val.uid === uid) || (email && val.email === email)) {
                existingKey = key;
                break;
              }
            }
          }

          if (existingKey) {
            const existing = userMap.get(existingKey);
            userMap.set(existingKey, {
              ...existing,
              ...u,
              id: existingKey,
              status: 'connected',
              email: email || existing.email,
              uid: uid || existing.uid,
              displayName: u.displayName || existing.displayName
            });
          } else {
            // New user not seen in personnel/clients
            const key = email || uid || u.id;
            userMap.set(key, {
              ...u,
              id: key,
              email: email || null,
              status: 'connected'
            });
          }
        });

        setSystemUsers(Array.from(userMap.values()));
      } catch (err) {
        console.warn("Nexus Admin: Erreur lors de l'agrégation des utilisateurs", err);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const totalRevenue = globalSales.reduce((acc, s) => acc + (s.total || 0), 0);
  const totalExpenses = globalExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  // Group revenue by company for chart
  const revenueByCompany = companies.map(c => ({
    name: c.name?.substring(0, 10) || 'Unknown',
    revenue: globalSales.filter(s => s.companyId === c.id).reduce((acc, s) => acc + (s.total || 0), 0)
  })).filter(d => d.revenue > 0).sort((a, b) => b.revenue - a.revenue);

  const COLORS = ['#2563eb', '#9333ea', '#10b981', '#f59e0b', '#ef4444'];

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.name || !newCompany.ownerEmail) return;

    setSubmitting(true);
    try {
      const joinCode = newCompany.joinCode || Math.random().toString(36).substring(2, 8).toUpperCase();
      const cleanEmail = newCompany.ownerEmail.trim().toLowerCase();
      const snap = await addDoc(collection(db, 'companies'), {
        ...newCompany,
        joinCode,
        ownerId: 'manual',
        memberEmails: [cleanEmail],
        createdAt: serverTimestamp()
      });

      const { setDoc, doc } = await import('firebase/firestore');
      await setDoc(doc(db, 'personnel', cleanEmail), {
        companyId: snap.id,
        uid: 'manual',
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        role: 'owner',
        status: 'active',
        joinMethod: 'master_creation',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setShowCreateModal(false);
      setNewCompany({ name: '', ownerEmail: '', joinCode: '' });
      fetchGlobalData();
      alert(`Entreprise ${newCompany.name} créée avec succès ! Code d'accès : ${joinCode}`);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la création de l\'entreprise');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany || !editingCompany.name) return;

    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'companies', editingCompany.id), {
        name: editingCompany.name,
        joinCode: editingCompany.joinCode,
        ownerEmail: editingCompany.ownerEmail,
        updatedAt: serverTimestamp()
      });
      setEditingCompany(null);
      fetchGlobalData();
      alert('Entreprise mise à jour avec succès');
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la mise à jour');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCompany = async (id: string, name: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitvement l'entreprise "${name}" ? Cette action est irréversible.`)) return;

    try {
      await deleteDoc(doc(db, 'companies', id));
      fetchGlobalData();
      alert('Entreprise supprimée');
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showMemberModal || !newMemberEmail) return;

    try {
      const company = showMemberModal;
      const email = newMemberEmail.trim().toLowerCase();
      if (company.memberEmails?.includes(email)) {
        alert('Cet utilisateur est déjà membre.');
        return;
      }

      const updatedEmails = [...(company.memberEmails || []), email];
      await updateDoc(doc(db, 'companies', company.id), {
        memberEmails: updatedEmails,
        updatedAt: serverTimestamp()
      });
      
      setNewMemberEmail('');
      setShowMemberModal({ ...company, memberEmails: updatedEmails });
      fetchGlobalData();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'ajout du membre');
    }
  };

  const handleRemoveMember = async (companyId: string, email: string) => {
    if (!window.confirm(`Retirer ${email} de cette entreprise ?`)) return;

    try {
      const company = companies.find(c => c.id === companyId);
      if (!company) return;

      const updatedEmails = company.memberEmails.filter((e: string) => e !== email);
      await updateDoc(doc(db, 'companies', companyId), {
        memberEmails: updatedEmails,
        updatedAt: serverTimestamp()
      });
      
      if (showMemberModal?.id === companyId) {
        setShowMemberModal({ ...showMemberModal, memberEmails: updatedEmails });
      }
      fetchGlobalData();
    } catch (err) {
      console.error(err);
      alert('Erreur lors du retrait');
    }
  };

  const handleAssignUserToCompany = async (userEmail: string, companyId: string) => {
    try {
      const company = companies.find(c => c.id === companyId);
      if (!company) return;

      if (company.memberEmails?.includes(userEmail)) {
        alert('Cet utilisateur est déjà membre de cette entreprise.');
        return;
      }

      await updateDoc(doc(db, 'companies', companyId), {
        memberEmails: [...(company.memberEmails || []), userEmail],
        updatedAt: serverTimestamp()
      });
      
      setShowUserAssignModal(null);
      fetchGlobalData();
      alert('Utilisateur affecté avec succès');
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'affectation');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.email) return;

    setSubmitting(true);
    try {
      await setDoc(doc(db, 'users', editingUser.id), {
        displayName: editingUser.displayName,
        email: editingUser.email,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setEditingUser(null);
      fetchGlobalData();
      alert('Utilisateur mis à jour');
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la mise à jour');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!window.confirm(`Supprimer l'utilisateur ${email} ? Cette action supprimera sa fiche dans la base Nexus.`)) return;

    try {
      await deleteDoc(doc(db, 'users', id));
      fetchGlobalData();
      alert('Utilisateur supprimé');
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression');
    }
  };

  const handleExportData = async () => {
    try {
      const exportData: Record<string, any[]> = { companies };
      const collectionsToExport = ['clients', 'personnel', 'resources', 'projects', 'tasks', 'sales', 'sales_invoices', 'expenses', 'partners', 'services', 'interventions', 'notifications', 'invoices', 'payments', 'open_orders'];
      
      for (const coll of collectionsToExport) {
          const snap = await getDocs(collection(db, coll));
          exportData[coll] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `nexus_global_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Erreur lors de l'exportation des données.");
    }
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const collectionsToImport = ['companies', 'clients', 'personnel', 'resources', 'projects', 'tasks', 'sales', 'sales_invoices', 'expenses', 'partners', 'users', 'services', 'interventions', 'notifications', 'invoices', 'payments', 'open_orders'];
        for (const coll of collectionsToImport) {
          if (data[coll] && Array.isArray(data[coll])) {
            for (const item of data[coll]) {
              try {
                await addDoc(collection(db, coll), item);
              } catch (err) {
                console.error(`Erreur import ${coll}:`, err);
              }
            }
          }
        }
        alert('Import global réussi vers Firebase !');
        fetchGlobalData();
      } catch (err) {
        console.error(err);
        alert("Erreur lors de l'importation");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleMigrateFromSQLite = async () => {
    if (!window.confirm("Voulez-vous migrer les données du serveur local (SQLite) vers Supabase ? Cela peut créer des doublons si déjà fait.")) return;
    
    setLoading(true);
    try {
      const collections = ['companies', 'clients', 'personnel', 'resources', 'projects', 'tasks', 'sales', 'sales_invoices', 'expenses', 'partners', 'users', 'services', 'interventions', 'notifications', 'invoices', 'payments', 'open_orders'];
      let migratedCount = 0;

      for (const coll of collections) {
        try {
          const res = await fetch(`/api/data/${coll}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              for (const item of data) {
                await addDoc(collection(db, coll), item);
                migratedCount++;
              }
            }
          }
        } catch (e) {
          console.warn(`Migration failed for ${coll}`, e);
        }
      }
      alert(`Migration terminée ! ${migratedCount} éléments migrés.`);
      fetchGlobalData();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la migration");
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.joinCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [cloneSource, setCloneSource] = useState('');
  const [cloneTarget, setCloneTarget] = useState('');
  const [diagEmail, setDiagEmail] = useState('');
  const [diagResult, setDiagResult] = useState<any>(null);

  const handleCloneAccess = async () => {
    if (!cloneSource.trim() || !cloneTarget.trim()) {
      alert("Veuillez saisir les deux adresses email.");
      return;
    }
    if (!window.confirm(`Voulez-vous copier TOUS les accès de ${cloneSource} vers ${cloneTarget} ?`)) return;
    
    setLoading(true);
    const src = cloneSource.trim().toLowerCase();
    const tgt = cloneTarget.trim().toLowerCase();

    try {
      // 1. Get all documents to be case-insensitive (better for cleanup phase)
      const [pSnap, cSnap] = await Promise.all([
        getDocs(collection(db, 'personnel')),
        getDocs(collection(db, 'companies'))
      ]);

      const personnelToClone = pSnap.docs.filter(d => (d.data() as any).email?.toLowerCase() === src);
      const companiesOwned = cSnap.docs.filter(d => (d.data() as any).ownerEmail?.toLowerCase() === src);
      const companiesMember = cSnap.docs.filter(d => (d.data() as any).memberEmails?.some((e: string) => e.toLowerCase() === src));

      let created = 0;
      let updated = 0;

      // 2. Clone Personnel entries
      for (const d of personnelToClone) {
        const data = d.data();
        // Check if target already exists in this company (case-insensitive)
        const alreadyExists = pSnap.docs.some(pd => 
          (pd.data() as any).email?.toLowerCase() === tgt && 
          (pd.data() as any).companyId === data.companyId
        );

        if (!alreadyExists) {
          await addDoc(collection(db, 'personnel'), {
            ...data,
            email: tgt,
            name: `(Clone) ${data.name || ''}`.trim(),
            status: 'active',
            createdAt: serverTimestamp()
          });
          created++;
        }

        // Add to company memberEmails list
        await updateDoc(doc(db, 'companies', data.companyId), {
          memberEmails: arrayUnion(tgt)
        });
        updated++;
      }

      // 3. Clone Company Memberships (Owner or Member)
      const allCompanyDocs = [...new Set([...companiesOwned, ...companiesMember])];
      for (const d of allCompanyDocs) {
        await updateDoc(doc(db, 'companies', d.id), {
          memberEmails: arrayUnion(tgt)
        });
        updated++;
      }

      alert(`Clonage terminé !\n- ${created} nouvelles fiches personnel créées\n- ${updated} listes de membres mises à jour.`);
      setCloneSource('');
      setCloneTarget('');
      fetchGlobalData();
    } catch (err) {
      console.error(err);
      alert("Erreur lors du clonage des accès.");
    } finally {
      setLoading(false);
    }
  };

  const handleDiagnostic = async () => {
    if (!diagEmail.trim()) return;
    setLoading(true);
    const email = diagEmail.trim().toLowerCase();
    try {
      // Find case-insensitive results for diagnosis
      const [uSnap, pSnap, cSnap, cliSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'personnel')),
        getDocs(collection(db, 'companies')),
        getDocs(collection(db, 'clients'))
      ]);

      const inUsers = uSnap.docs.find(d => {
        const e = (d.data() as any).email;
        return e && e.toLowerCase().replace(/\s+/g, '') === email.replace(/\s+/g, '');
      });
      const personnelMatches = pSnap.docs.filter(d => {
        const e = (d.data() as any).email;
        return e && e.toLowerCase().replace(/\s+/g, '') === email.replace(/\s+/g, '');
      });
      const ownedCompanies = cSnap.docs.filter(d => {
        const e = (d.data() as any).ownerEmail;
        return e && e.toLowerCase().replace(/\s+/g, '') === email.replace(/\s+/g, '');
      });
      const clientMatches = cliSnap.docs.filter(d => {
        const e = (d.data() as any).email;
        return e && e.toLowerCase().replace(/\s+/g, '') === email.replace(/\s+/g, '');
      });

      // Fuzzy matching: check for emails that might have typos like '.' instead of '@'
      const normalizeForFuzzy = (e: string) => e?.toLowerCase().replace(/[@.\s]/g, '');
      const fuzzyTarget = normalizeForFuzzy(email);
      const fuzzyMatches: string[] = [];

      if (personnelMatches.length === 0 && clientMatches.length === 0 && ownedCompanies.length === 0) {
        [...pSnap.docs, ...cliSnap.docs, ...cSnap.docs].forEach(d => {
          const data = d.data() as any;
          const e = data.email || data.ownerEmail;
          if (e && normalizeForFuzzy(e) === fuzzyTarget && e.toLowerCase() !== email) {
            fuzzyMatches.push(e);
          }
        });
      }

      setDiagResult({
        email,
        inUsers: !!inUsers,
        actualUserEmail: inUsers ? (inUsers.data() as any).email : null,
        personnelCount: personnelMatches.length,
        ownedCompanies: ownedCompanies.map(d => (d.data() as any).name),
        personnelDetails: personnelMatches.map(d => {
          const data = d.data() as any;
          const comp = companies.find(c => c.id === data.companyId);
          return { company: comp?.name || 'Inconnue', id: data.companyId, status: data.status, role: data.role, actualEmail: data.email };
        }),
        clientCount: clientMatches.length,
        clientDetails: clientMatches.map(d => {
          const data = d.data() as any;
          const comp = companies.find(c => c.id === data.companyId);
          return { company: comp?.name || 'Inconnue', id: data.companyId, actualEmail: data.email };
        }),
        fuzzyMatches: [...new Set(fuzzyMatches)]
      });
    } catch (err) {
      console.error(err);
      alert("Erreur de diagnostic");
    } finally {
      setLoading(false);
    }
  };

  const handleNormalizeEmails = async () => {
    if (!window.confirm("Cette action va convertir TOUTES les adresses emails en minuscules (y compris les listes de membres) pour assurer la compatibilité case-insensitive. Continuer ?")) return;
    setLoading(true);
    try {
      const collections = ['companies', 'personnel', 'users', 'clients'];
      let count = 0;
      for (const coll of collections) {
        const snap = await getDocs(collection(db, coll));
        for (const docSnap of snap.docs) {
          const data = docSnap.data();
          const updates: any = {};
          
          if (coll === 'companies') {
            // Normalize ownerEmail
            if (data.ownerEmail) {
              const cleaned = data.ownerEmail.trim().toLowerCase().replace(/\s+/g, '');
              if (data.ownerEmail !== cleaned) {
                updates.ownerEmail = cleaned;
              }
            }
            // Normalize memberEmails array
            if (data.memberEmails && Array.isArray(data.memberEmails)) {
              const cleanedEmails = data.memberEmails
                .filter((e: any) => typeof e === 'string' && e.trim() !== '')
                .map((e: string) => e.trim().toLowerCase().replace(/\s+/g, ''));
              
              // Remove duplicates while we are at it
              const uniqueEmails = [...new Set(cleanedEmails)];
              
              const hasChange = data.memberEmails.length !== uniqueEmails.length || 
                                data.memberEmails.some((e: string, i: number) => e !== uniqueEmails[i]);
              
              if (hasChange) {
                updates.memberEmails = uniqueEmails;
              }
            }
          } else {
            // Normalize standard email field
            if (data.email) {
              const cleaned = data.email.trim().toLowerCase().replace(/\s+/g, '');
              if (data.email !== cleaned) {
                updates.email = cleaned;
              }
            }
          }

          if (Object.keys(updates).length > 0) {
            updates.updatedAt = serverTimestamp();
            
            // Defensive check for any remaining undefined values
            Object.keys(updates).forEach(key => {
              if (updates[key] === undefined) {
                console.warn(`Nexus Security: Supprimé un champ undefined '${key}' pour ${coll}/${docSnap.id}`);
                delete updates[key];
              }
            });

            if (Object.keys(updates).length > 1) { // > 1 because updatedAt is always there
              if (coll === 'users') {
                await setDoc(doc(db, coll, docSnap.id), updates, { merge: true });
              } else {
                await updateDoc(doc(db, coll, docSnap.id), updates);
              }
              count++;
            }
          }
        }
      }
      alert(`${count} documents ont été normalisés en minuscules.`);
      fetchGlobalData();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la normalisation");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusCheck = () => {
    const unlinked = systemUsers.filter(u => u.status === 'invited' && u.source === 'personnel');
    const noEmail = systemUsers.filter(u => !u.email || u.email === '-');
    const totals = systemUsers.length;
    const connected = systemUsers.filter(u => u.status === 'connected').length;
    
    alert(`Rapport d'Intégrité:\n- Total Utilisateurs: ${totals}\n- Connectés: ${connected}\n- Invitations en attente: ${unlinked.length}\n- Sans Email: ${noEmail.length}`);
  };

  const handleDeduplicateUsers = async () => {
    if (!window.confirm("Cette action va fusionner les comptes utilisateurs en double (ceux identifiés par UID et ceux par Email) et supprimer les doublons. Voulez-vous continuer ?")) return;
    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const emailMap: Record<string, any[]> = {};
      const uidMap: Record<string, any[]> = {};
      
      usersSnap.docs.forEach(d => {
        const data = d.data();
        const docInfo = { id: d.id, ...data };
        
        if (data.email) {
          const clean = data.email.trim().toLowerCase().replace(/\s+/g, '');
          if (!emailMap[clean]) emailMap[clean] = [];
          emailMap[clean].push(docInfo);
        }
        
        if (data.uid) {
          if (!uidMap[data.uid]) uidMap[data.uid] = [];
          uidMap[data.uid].push(docInfo);
        }
      });

      let mergedCount = 0;
      const processedIds = new Set<string>();

      // Merge by Email primarily
      for (const email in emailMap) {
        const docs = emailMap[email];
        if (docs.length > 1) {
          // Identify best target (Prefer doc with email as ID)
          const targetDoc = docs.find(d => d.id === email) || docs[0];
          const others = docs.filter(d => d.id !== targetDoc.id);
          
          let finalData = { ...targetDoc };
          for (const other of others) {
            // Merge other fields if missing in target
            Object.keys(other).forEach(key => {
              if (finalData[key] === undefined || finalData[key] === null) {
                finalData[key] = other[key];
              }
            });
            // Record found UID if target was missing it
            if (other.uid) finalData.uid = other.uid;
            
            await deleteDoc(doc(db, 'users', other.id));
            processedIds.add(other.id);
            mergedCount++;
          }
          
          finalData.email = email;
          finalData.status = finalData.uid ? 'connected' : (finalData.status || 'invited');
          finalData.updatedAt = serverTimestamp();
          delete finalData.id;
          
          // Cleanup undefined
          Object.keys(finalData).forEach(k => { if (finalData[k] === undefined) finalData[k] = null; });
          
          await setDoc(doc(db, 'users', targetDoc.id), finalData, { merge: true });
          processedIds.add(targetDoc.id);
        }
      }

      // Merge by UID secondarily (for docs discovered remaining)
      for (const uid in uidMap) {
        const docs = uidMap[uid].filter(d => !processedIds.has(d.id));
        if (docs.length > 1) {
          const targetDoc = docs.find(d => d.id.includes('@')) || docs[0];
          const others = docs.filter(d => d.id !== targetDoc.id);
          
          let finalData = { ...targetDoc };
          for (const other of others) {
             Object.keys(other).forEach(key => {
              if (finalData[key] === undefined || finalData[key] === null) {
                finalData[key] = other[key];
              }
            });
            await deleteDoc(doc(db, 'users', other.id));
            mergedCount++;
          }
          
          finalData.status = 'connected';
          finalData.updatedAt = serverTimestamp();
          delete finalData.id;
          
          // CRITICAL: Ensure email is never undefined
          if (!finalData.email && targetDoc.id.includes('@')) finalData.email = targetDoc.id;
          
          Object.keys(finalData).forEach(k => { if (finalData[k] === undefined) finalData[k] = null; });
          await setDoc(doc(db, 'users', targetDoc.id), finalData, { merge: true });
        }
      }

      alert(`${mergedCount} comptes utilisateurs fusionnés et nettoyés.`);
      fetchGlobalData();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la déduplication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[80vh] space-y-8 p-1">
      {/* Background Decor */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl -tr-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-3xl -bl-1/2" />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Console Maître Nexus</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 italic">Administration Globale & Supervision des Flux</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Temps Réel Actif</span>
        </div>
      </div>

      {/* Header Cards with Aggregated Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center justify-between group hover:border-blue-200 transition-all"
        >
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Actifs Entreprises</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{companies.length}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
            <Building2 size={24} />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center justify-between group hover:border-purple-200 transition-all"
        >
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Flux Global (FCFA)</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{totalRevenue.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
            <TrendingUp size={24} />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center justify-between group hover:border-emerald-200 transition-all"
        >
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Membres Totaux</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
              {companies.reduce((acc, curr) => acc + (curr.memberEmails?.length || 0), 0)}
            </h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
            <Users size={24} />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900 p-6 rounded-3xl shadow-2xl shadow-slate-900/30 flex items-center justify-between text-white"
        >
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status Réseau</p>
            <h3 className="text-xl font-black tracking-tight text-blue-400 flex items-center gap-2">
              <Activity size={20} className="animate-pulse" />
              SÉCURISÉ
            </h3>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
            <ShieldCheck size={24} />
          </div>
        </motion.div>
      </div>
      
      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Analyse des Revenus Écosystème</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Comparaison des performances inter-entreprises</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <BarChart3 size={20} />
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByCompany}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                <YAxis fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'black', marginBottom: '4px' }}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {revenueByCompany.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Répartition des Flux</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Part de marché par entité</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
              <PieChartIcon size={20} />
            </div>
          </div>
          <div className="h-[250px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueByCompany}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="revenue"
                >
                  {revenueByCompany.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global</span>
              <span className="text-xl font-black text-slate-900 tracking-tight">{totalRevenue.toLocaleString()}FCFA</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-4 border-b border-slate-100 pb-1">
        <button 
          onClick={() => setActiveAdminTab('companies')}
          className={cn(
            "pb-3 px-2 text-sm font-black transition-all border-b-2 uppercase tracking-widest",
            activeAdminTab === 'companies' ? "text-blue-600 border-blue-600" : "text-slate-400 border-transparent hover:text-slate-600"
          )}
        >
          Entreprises
        </button>
        <button 
          onClick={() => setActiveAdminTab('users')}
          className={cn(
            "pb-3 px-2 text-sm font-black transition-all border-b-2 uppercase tracking-widest",
            activeAdminTab === 'users' ? "text-blue-600 border-blue-600" : "text-slate-400 border-transparent hover:text-slate-600"
          )}
        >
          Utilisateurs
        </button>
        <button 
          onClick={() => setActiveAdminTab('tools')}
          className={cn(
            "pb-3 px-2 text-sm font-black transition-all border-b-2 uppercase tracking-widest",
            activeAdminTab === 'tools' ? "text-blue-600 border-blue-600" : "text-slate-400 border-transparent hover:text-slate-600"
          )}
        >
          Outils & Migration
        </button>
        <button 
          onClick={() => setActiveAdminTab('guide')}
          className={cn(
            "pb-3 px-2 text-sm font-black transition-all border-b-2 uppercase tracking-widest",
            activeAdminTab === 'guide' ? "text-blue-600 border-blue-600" : "text-slate-400 border-transparent hover:text-slate-600"
          )}
        >
          Guide Pratique
        </button>
      </div>

      {activeAdminTab === 'companies' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/40 relative overflow-hidden backdrop-blur-xl bg-white/90">
          <div className="p-10 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Répertoire des Écosystèmes</h2>
              <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest flex items-center gap-2">
                <Layers size={14} />
                Supervision de {companies.length} structures de travail
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition"
              >
                <Plus size={16} /> Créer Entité
              </button>
              
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Rechercher..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-11 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-xs font-black w-72 focus:ring-4 focus:ring-blue-50 focus:bg-white transition-all shadow-inner"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto px-4 pb-8">
            <Table headers={["Institution", "Accès Principal", "Code Nexus", "Équipe", "Actions"]}>
              {filteredCompanies.map((company) => (
                <TableRow key={company.id} className="group hover:bg-slate-50/80 transition-all border-b border-slate-50 last:border-0 rounded-2xl">
                  <div className="py-7 pl-8">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:rotate-3 shadow-md">
                        {company.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-base font-black text-slate-900 tracking-tight">{company.name}</p>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Nexus ID: {company.id?.substring(0, 8)}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-700">{company.ownerEmail}</p>
                      <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-all">
                        <ShieldCheck size={10} className="text-emerald-500" />
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Propriétaire</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-900 rounded-xl text-[11px] font-black tracking-[0.2em] uppercase border border-slate-200">
                      {company.joinCode}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-4">
                        {Array.from({ length: Math.min(3, company.memberEmails?.length || 1) }).map((_, i) => (
                          <div key={i} className={cn(
                            "w-10 h-10 rounded-2xl border-4 border-white flex items-center justify-center text-[11px] font-black shadow-sm",
                            i === 0 ? "bg-blue-600 text-white" : i === 1 ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-600"
                          )}>
                            {company.memberEmails?.[i]?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        ))}
                      </div>
                      <span className="text-[10px] font-black text-slate-400 ml-2">+{company.memberEmails?.length || 0}</span>
                    </div>
                  </div>
                  <div className="pr-8 text-right flex items-center justify-end gap-2">
                    <button 
                      onClick={() => setShowMemberModal(company)}
                      className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      title="Gérer l'équipe"
                    >
                      <Users size={16} />
                    </button>
                    <button 
                      onClick={() => setEditingCompany(company)}
                      className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                      title="Modifier"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteCompany(company.id, company.name)}
                      className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="h-6 w-px bg-slate-100 mx-2" />
                    <button 
                      onClick={() => {
                        localStorage.setItem('nexus_switch_company', JSON.stringify(company));
                        window.dispatchEvent(new Event('storage'));
                        window.location.reload();
                      }}
                      className="group/btn inline-flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                    >
                      Ouvrir
                      <ArrowUpRight size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                </TableRow>
              ))}
            </Table>
          </div>
        </div>
      )}

      {activeAdminTab === 'users' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/40 p-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Base Utilisateurs Globale</h2>
              <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest leading-relaxed">
                Liste exhaustive des comptes enregistrés sur la plateforme.<br />
                Note: Les utilisateurs sans entreprise rattachée apparaissent ici.
              </p>
            </div>
          </div>

          <Table headers={["Utilisateur", "Email", "Statut", "Entreprise(s)", "Actions"]}>
            {systemUsers.map((u) => (
              <TableRow key={u.id} className="border-b border-slate-50 last:border-0 grow">
                <div className="py-5">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm",
                      u.status === 'connected' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                    )}>
                      {u.displayName?.charAt(0) || u.email?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{u.displayName || 'Utilisateur'}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        {u.status === 'connected' ? `Nexus Active: ${u.uid?.substring(0, 8)}` : `Nexus ID: ${u.nexusId || u.id?.substring(0, 8) || '???'}`}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-600">
                  {u.email || u.id || '-'}
                </div>
                <div>
                  {u.status === 'connected' ? (
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                      Connecté
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                      Invité
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap gap-1">
                    {companies.filter(c => c.memberEmails?.includes(u.email) || c.ownerEmail === u.email).map(c => (
                      <span key={c.id} className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-bold">
                        {c.name}
                      </span>
                    ))}
                    <button 
                      onClick={() => setShowUserAssignModal(u)}
                      className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1"
                    >
                      <Plus size={10} /> Affecter
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 pr-4">
                  <button 
                    onClick={() => setEditingUser(u)}
                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                    title="Modifier"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDeleteUser(u.id, u.email)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </TableRow>
            ))}
          </Table>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                <Users size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Modifier Utilisateur</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">{editingUser.email}</p>
              </div>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nom Complet</label>
                <input 
                  type="text" 
                  required
                  value={editingUser.displayName || ''}
                  onChange={e => setEditingUser({...editingUser, displayName: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-bold text-sm transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label>
                <input 
                  type="email" 
                  required
                  value={editingUser.email || ''}
                  onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-bold text-sm transition-all"
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  type="button" 
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                >
                  {submitting ? 'Traitement...' : 'Mettre à jour'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {activeAdminTab === 'tools' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/40 p-10 space-y-8">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Diagnostic d'Accès Utilisateur</h2>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest leading-loose">Vérifiez si un email est correctement configuré dans le système.</p>
            </div>

            <div className="flex gap-3">
              <input 
                type="email" 
                placeholder="Email à diagnostiquer..." 
                value={diagEmail}
                onChange={e => setDiagEmail(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-bold text-sm transition-all"
              />
              <button 
                onClick={handleDiagnostic}
                disabled={loading || !diagEmail}
                className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95 disabled:opacity-50"
              >
                Scanner
              </button>
            </div>

            {diagResult && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4"
              >
                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Résultats pour {diagResult.email}</span>
                  <button onClick={() => setDiagResult(null)} className="text-slate-400 hover:text-slate-900"><X size={14} /></button>
                </div>

                {diagResult.fuzzyMatches && diagResult.fuzzyMatches.length > 0 && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[10px] font-bold text-amber-800 space-y-1">
                    <p className="flex items-center gap-2 mb-2"><AlertCircle size={14} /> Sommes-nous sur un cas de faute de frappe ?</p>
                    <p>Nous avons trouvé ces adresses similaires dans la base :</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                       {diagResult.fuzzyMatches.map((m: string) => (
                         <button 
                          key={m} 
                          onClick={() => { setDiagEmail(m); handleDiagnostic(); }}
                          className="px-2 py-1 bg-white border border-amber-200 rounded hover:bg-amber-100 transition-all font-mono"
                         >
                           {m}
                         </button>
                       ))}
                    </div>
                  </div>
                )}
                
                  <div className="grid grid-cols-2 gap-4 text-[11px] font-bold">
                  <div className="p-3 bg-white rounded-xl border border-slate-100 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Compte Firebase</span>
                      {diagResult.inUsers ? <CheckCircle2 size={14} className="text-emerald-500" /> : <X size={14} className="text-red-500" />}
                    </div>
                    {diagResult.inUsers && diagResult.actualUserEmail !== diagResult.email && (
                      <span className="text-[8px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded leading-none">⚠️ Case mismatch: {diagResult.actualUserEmail}</span>
                    )}
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-400">Propriétaire Entreprise</span>
                    <span className="text-blue-600">{diagResult.ownedCompanies.length > 0 ? "OUI" : "NON"}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Affiliations Personnel ({diagResult.personnelCount})</span>
                    {!diagResult.inUsers && diagResult.personnelCount > 0 && (
                      <button 
                        onClick={async () => {
                          setLoading(true);
                          try {
                            const { addDoc, collection, db } = await import('../lib/firebase');
                            await addDoc(collection(db, 'users'), {
                              email: diagResult.email,
                              createdAt: new Date()
                            });
                            alert("Compte fantôme créé pour synchronisation.");
                            handleDiagnostic();
                          } catch (e) { alert("Erreur link"); }
                          setLoading(false);
                        }}
                        className="text-[8px] font-black text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-1 rounded-lg"
                      >
                        Scanner & Réparer Profil
                      </button>
                    )}
                  </div>
                  {diagResult.personnelDetails.length === 0 ? (
                    <p className="text-[10px] text-red-500 italic px-1">Aucune affiliation personnel trouvée.</p>
                  ) : (
                    <div className="space-y-2">
                      {diagResult.personnelDetails.map((pd: any, i: number) => (
                        <div key={i} className="p-3 bg-white rounded-xl border border-slate-100 flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="text-slate-700">{pd.company}</span>
                            <span className="text-[8px] text-slate-400 font-mono tracking-tight">{pd.id}</span>
                            {pd.actualEmail !== diagResult.email && (
                              <span className="text-[8px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded w-fit mt-1">⚠️ {pd.actualEmail}</span>
                            )}
                          </div>
                          <div className="flex gap-2 items-center">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[8px] uppercase">{pd.role}</span>
                            <span className={cn("px-2 py-0.5 rounded text-[8px] uppercase", pd.status === 'blocked' ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600")}>
                              {pd.status === 'blocked' ? 'Bloqué' : 'Actif'}
                            </span>
                            <button 
                              onClick={async () => {
                                if (!confirm("Voulez-vous forcer l'ajout de cet email aux membres de l'entreprise ?")) return;
                                setLoading(true);
                                try {
                                  const { arrayUnion, doc, updateDoc, db } = await import('../lib/firebase');
                                  const compRef = doc(db, 'companies', pd.id);
                                  await updateDoc(compRef, {
                                    memberEmails: arrayUnion(diagResult.email)
                                  });
                                  alert("Lien d'adhésion forcé pour " + pd.company);
                                  handleDiagnostic();
                                } catch (e) { 
                                  console.error(e);
                                  alert("Erreur de permission ou réseau."); 
                                }
                                setLoading(false);
                              }}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-slate-200"
                              title="Forcer Adhésion"
                            >
                              <Shield size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center ml-1 mt-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Affiliations Client ({diagResult.clientCount})</span>
                  </div>
                  {diagResult.clientDetails.length === 0 ? (
                    <p className="text-[10px] text-red-500 italic px-1">Aucune affiliation client trouvée.</p>
                  ) : (
                    <div className="space-y-2">
                       {diagResult.clientDetails.map((cd: any, i: number) => (
                        <div key={i} className="p-3 bg-white rounded-xl border border-slate-100 flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="text-slate-700">{cd.company}</span>
                            <span className="text-[8px] text-slate-400 font-mono tracking-tight">{cd.id}</span>
                            {cd.actualEmail !== diagResult.email && (
                              <span className="text-[8px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded w-fit mt-1">⚠️ {cd.actualEmail}</span>
                            )}
                          </div>
                          <div className="flex gap-2 items-center">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[8px] uppercase font-bold">CLIENT</span>
                             <button 
                              onClick={async () => {
                                if (!confirm("Voulez-vous forcer l'ajout de cet email aux membres de l'entreprise ?")) return;
                                setLoading(true);
                                try {
                                  const { arrayUnion, doc, updateDoc, db } = await import('../lib/firebase');
                                  const compRef = doc(db, 'companies', cd.id);
                                  await updateDoc(compRef, {
                                    memberEmails: arrayUnion(diagResult.email)
                                  });
                                  alert("Lien d'adhésion forcé pour le client sur " + cd.company);
                                  handleDiagnostic();
                                } catch (e) { 
                                  console.error(e);
                                  alert("Erreur de permission ou réseau."); 
                                }
                                setLoading(false);
                              }}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-emerald-600 transition-all border border-transparent hover:border-slate-200"
                              title="Forcer Adhésion"
                            >
                              <Shield size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/40 p-10 space-y-8">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Clonage d'Accès Utilisateur</h2>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest leading-loose">Transférez les permissions d'un email vers un autre.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Source (Celui qui a l'accès)</label>
                <input 
                  type="email" 
                  placeholder="Ex: dangafelicite@gmail.com" 
                  value={cloneSource}
                  onChange={e => setCloneSource(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Cible (Celui qui doit recevoir)</label>
                <input 
                  type="email" 
                  placeholder="Ex: hackeurfaurest@gmail.com" 
                  value={cloneTarget}
                  onChange={e => setCloneTarget(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-emerald-600 font-bold text-sm"
                />
              </div>
              <button 
                onClick={handleCloneAccess}
                disabled={loading || !cloneSource || !cloneTarget}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-blue-200 active:scale-[0.98] disabled:opacity-50"
              >
                Démarrer le Clonage d'Accès
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/40 p-10 space-y-8">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Maintenance Système</h2>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest leading-loose">Synchronisation et sauvegardes multi-cloud.</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={handleExportData}
                className="w-full flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-blue-200 hover:bg-white transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Download size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900">Backup JSON Complet</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Télécharger toutes les tables</p>
                  </div>
                </div>
                <ArrowUpRight size={18} className="text-slate-300 group-hover:text-blue-600 transition-all" />
              </button>

              <label className="w-full flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-purple-200 hover:bg-white transition-all group cursor-pointer">
                <input type="file" className="hidden" accept=".json" onChange={handleImportData} />
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl group-hover:bg-purple-600 group-hover:text-white transition-all">
                    <Upload size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900">Importer Sauvegarde</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Restaurer des données Firebase</p>
                  </div>
                </div>
                <ArrowUpRight size={18} className="text-slate-300 group-hover:text-purple-600 transition-all" />
              </label>

              <button 
                onClick={handleMigrateFromSQLite}
                className="w-full flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-indigo-200 hover:bg-white transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <Database size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900">Migration SQLite</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Récupérer les données locales</p>
                  </div>
                </div>
                <ArrowUpRight size={18} className="text-slate-300 group-hover:text-indigo-600 transition-all" />
              </button>

              <button 
                onClick={handleNormalizeEmails}
                className="w-full flex items-center justify-between p-6 bg-amber-50/50 rounded-[2rem] border border-amber-100 hover:border-amber-200 hover:bg-white transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl group-hover:bg-amber-600 group-hover:text-white transition-all">
                    <Shield size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900">Nettoyage Emails Global</p>
                    <p className="text-[10px] font-bold text-amber-600/60 uppercase tracking-widest">Minuscules & Suppression Espaces</p>
                  </div>
                </div>
                <Activity size={18} className="text-amber-300 group-hover:text-amber-600 transition-all" />
              </button>

              <button 
                onClick={handleDeduplicateUsers}
                className="w-full flex items-center justify-between p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-100 hover:border-emerald-200 hover:bg-white transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <Users size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900">Déduplication Utilisateurs</p>
                    <p className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest">Fusionner UID et Email IDs</p>
                  </div>
                </div>
                <Activity size={18} className="text-emerald-300 group-hover:text-emerald-600 transition-all" />
              </button>

              <button 
                onClick={handleStatusCheck}
                className="w-full flex items-center justify-between p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100 hover:border-blue-200 hover:bg-white transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <ShieldAlert size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900">Diagnostic Intégrité</p>
                    <p className="text-[10px] font-bold text-blue-600/60 uppercase tracking-widest">Vérifier les Synchronisations</p>
                  </div>
                </div>
                <Activity size={18} className="text-blue-300 group-hover:text-blue-600 transition-all" />
              </button>
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'guide' && (
        <div className="space-y-8">
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/40 p-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Gestion du Guide Équipe</h2>
                <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Configurez les fiches actions et le contenu de formation</p>
              </div>
              <button 
                onClick={async () => {
                   if (!confirm("Voulez-vous injecter les données de démonstration pour le guide ?")) return;
                   const { addDoc, collection, db, serverTimestamp } = await import('../lib/firebase');
                   try {
                     const steps = [
                       { title: "Réception Commande", content: "Vérifiez le stock, cliquez sur Accepter. Un message WhatsApp est envoyé.", category: "Marketplace", order: 1, keywords: ["commande", "réception", "whatsapp"] },
                       { title: "Paiement Mobile", content: "Assurez-vous que le client a bien validé sur son téléphone avant de livrer.", category: "Finance", order: 2, keywords: ["momo", "orange", "mtn", "paiement"] },
                       { title: "Naira vs CFA", content: "Utilisez le convertisseur en haut à droite pour donner le prix juste.", category: "Outils", order: 3, keywords: ["naira", "cfa", "taux", "change"] }
                     ];
                     for (const s of steps) {
                       await addDoc(collection(db, 'guide_steps'), { 
                         ...s, 
                         createdAt: serverTimestamp(), 
                         updatedAt: serverTimestamp() 
                       });
                     }
                     alert("Guide initialisé avec succès !");
                   } catch (e) { console.error(e); alert("Erreur d'injection"); }
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:scale-105 transition-all"
              >
                Initialiser Guide (Seed)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <h4 className="text-sm font-black text-slate-900 mb-2">Fiches Actions</h4>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">Centralisez les procédures standards pour réduire les erreurs de manipulation.</p>
                  <button onClick={() => alert("Interface de modification en cours...")} className="w-full py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-blue-600 transition-all">Gérer les fiches</button>
               </div>
               <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                  <h4 className="text-sm font-black text-emerald-900 mb-2">Nexus Academy</h4>
                  <p className="text-xs text-emerald-600 leading-relaxed mb-4">Créez des quiz pour certifier que vos vendeurs maîtrisent l'outil.</p>
                  <button onClick={() => alert("Lancement Nexus Academy Studio...")} className="w-full py-3 bg-white border border-emerald-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all">Studio Quiz</button>
               </div>
               <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
                  <h4 className="text-sm font-black text-amber-900 mb-2">Support & FAQ</h4>
                  <p className="text-xs text-amber-600 leading-relaxed mb-4">Réponses aux questions les plus fréquentes des clients de Maroua.</p>
                  <button onClick={() => alert("Edition FAQ...")} className="w-full py-3 bg-white border border-amber-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-600 hover:text-white transition-all">Éditer FAQ</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {editingCompany && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                <Edit2 size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Modifier l'Entité</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">{editingCompany.name}</p>
              </div>
            </div>

            <form onSubmit={handleUpdateCompany} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nom de l'entité</label>
                <input 
                  type="text" 
                  required
                  value={editingCompany.name}
                  onChange={e => setEditingCompany({...editingCompany, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent font-bold text-sm transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Propriétaire</label>
                <input 
                  type="email" 
                  required
                  value={editingCompany.ownerEmail}
                  onChange={e => setEditingCompany({...editingCompany, ownerEmail: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent font-bold text-sm transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Code Nexus</label>
                <input 
                  type="text" 
                  required
                  value={editingCompany.joinCode}
                  onChange={e => setEditingCompany({...editingCompany, joinCode: e.target.value.toUpperCase()})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent font-mono font-bold text-sm uppercase tracking-widest transition-all"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-4">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic">Configuration Marketplace</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Numéro WhatsApp</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 237690000000"
                      value={editingCompany.whatsappNumber || ''}
                      onChange={e => setEditingCompany({...editingCompany, whatsappNumber: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Catégorie Marché</label>
                    <input 
                      type="text" 
                      placeholder="Ex: IT, BTP, Santé"
                      value={editingCompany.category || ''}
                      onChange={e => setEditingCompany({...editingCompany, category: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Lien du Logo (URL)</label>
                  <input 
                    type="text" 
                    placeholder="https://..."
                    value={editingCompany.logo || ''}
                    onChange={e => setEditingCompany({...editingCompany, logo: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  type="button" 
                  onClick={() => setEditingCompany(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                >
                  {submitting ? 'Enregistrement...' : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showMemberModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-600/20">
                  <Users size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Gestion de l'Équipe</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">{showMemberModal.name}</p>
                </div>
              </div>
              <button onClick={() => setShowMemberModal(null)} className="p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Ajouter un email utilisateur</label>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  required
                  placeholder="exemple@mail.com"
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent font-bold text-sm"
                  value={newMemberEmail}
                  onChange={e => setNewMemberEmail(e.target.value)}
                />
                <button 
                  type="submit"
                  className="px-5 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2"
                >
                  <Plus size={16} /> Ajouter
                </button>
              </div>
            </form>

            <div className="flex-1 overflow-y-auto pr-2">
              <div className="space-y-2">
                {showMemberModal.memberEmails?.map((email: string) => (
                  <div key={email} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl group hover:border-emerald-200 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400">
                        {email.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-bold text-slate-700">{email}</span>
                      {email === showMemberModal.ownerEmail && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-md text-[8px] font-black uppercase tracking-tighter">Proprio</span>
                      )}
                    </div>
                    {email !== showMemberModal.ownerEmail && (
                      <button 
                        onClick={() => handleRemoveMember(showMemberModal.id, email)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showUserAssignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                  <UserPlus size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Affectation Entreprise</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">{showUserAssignModal.email}</p>
                </div>
              </div>
              <button onClick={() => setShowUserAssignModal(null)} className="p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Choisir une entreprise pour cet utilisateur :</p>
              {companies.map((comp) => (
                <button
                  key={comp.id}
                  onClick={() => handleAssignUserToCompany(showUserAssignModal.email, comp.id)}
                  className="w-full text-left p-4 rounded-2xl border bg-white border-slate-100 hover:border-blue-600 hover:shadow-lg transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      {comp.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{comp.name}</p>
                    </div>
                  </div>
                  <Plus size={18} className="text-slate-200 group-hover:text-blue-600" />
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal - Create Company */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-bl-full -mr-16 -mt-16" />
            
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/30">
                    <Plus size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Nouveau Business</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Provisionner un espace Nexus</p>
                  </div>
                </div>

            <form onSubmit={handleCreateCompany} className="space-y-5">
              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nom de l'entité</label>
                  <input 
                    type="text" 
                    required
                    value={newCompany.name}
                    onChange={e => setNewCompany({...newCompany, name: e.target.value})}
                    placeholder="Ex: Global Logistics SA"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-bold text-sm transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Propriétaire (Access Maître)</label>
                  <input 
                    type="email" 
                    required
                    value={newCompany.ownerEmail}
                    onChange={e => setNewCompany({...newCompany, ownerEmail: e.target.value})}
                    placeholder="admin@entreprise.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-bold text-sm transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Code d'accès Personnalisé (Optionnel)</label>
                  <input 
                    type="text" 
                    value={newCompany.joinCode}
                    onChange={e => setNewCompany({...newCompany, joinCode: e.target.value.toUpperCase()})}
                    placeholder="AUTO-GENERATED"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono font-bold text-sm uppercase tracking-widest transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                >
                  {submitting ? 'Initialisation...' : "Créer et Envoyer l'Exclusivité"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
