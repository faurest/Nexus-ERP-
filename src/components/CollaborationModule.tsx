import React, { useState, useEffect, useRef } from 'react';
import { db, collection, onSnapshot, query, where, addDoc, serverTimestamp, getDocs, updateDoc, doc, or, and } from '../lib/firebase';
import { 
  Send, 
  Users, 
  MessageSquare, 
  Share2, 
  Bell, 
  Search, 
  Filter, 
  MoreVertical,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Info,
  Trash2,
  FileText,
  Upload,
  Download,
  File,
  X
} from 'lucide-react';
import { useCompany } from '../lib/CompanyContext';
import { auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { cn } from '../lib/utils';
import Table, { TableRow } from './ui/Table';

interface Collaboration {
  id: string;
  senderEmail: string;
  recipientEmail: string; // 'all' or specific email
  type: 'Note' | 'Document' | 'Contact' | 'Rapport' | 'Alerte';
  title: string;
  content: string;
  referenceId?: string;
  fileName?: string;
  fileType?: string;
  fileData?: string;
  metadata?: any;
  createdAt: any;
  readBy?: string[];
}

export default function CollaborationModule() {
  const { currentCompany } = useCompany();
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'received' | 'sent' | 'all' | 'public'>('received');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    recipientEmail: 'all',
    type: 'Note' as 'Note' | 'Document' | 'Contact' | 'Rapport' | 'Alerte',
    title: '',
    content: '',
    referenceId: ''
  });

  const [attachedFile, setAttachedFile] = useState<{ name: string, type: string, data: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800000) { // Limit to 800KB for Base64 (Firestore doc is 1MB)
      alert("Le fichier est trop lourd. Limite: 800KB pour assurer le transfert via la base de données.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result as string;
      setAttachedFile({
        name: file.name,
        type: file.type,
        data: data
      });
      // Automatically switch to 'Document' type if a file is attached
      setFormData(prev => ({ ...prev, type: 'Document' }));
    };
    reader.readAsDataURL(file);
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = (col: Collaboration) => {
    if (!col.fileData || !col.fileName) return;
    const link = document.createElement('a');
    link.href = col.fileData;
    link.download = col.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (!currentCompany || !auth.currentUser) return;

    const myEmail = auth.currentUser.email?.toLowerCase() || '';

    const qCollaborations = query(
      collection(db, 'collaborations'),
      and(
        where('companyId', '==', currentCompany.id),
        or(
          where('recipientEmail', '==', 'all'),
          where('recipientEmail', '==', myEmail),
          where('senderEmail', '==', myEmail)
        )
      )
    );

    const unsub = onSnapshot(qCollaborations, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Collaboration));
      setCollaborations(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'collaborations'));

    const qPersonnel = query(
      collection(db, 'personnel'),
      where('companyId', '==', currentCompany.id)
    );
    getDocs(qPersonnel).then(snap => {
      setPersonnel(snap.docs.map(d => d.data()));
    });

    return () => unsub();
  }, [currentCompany]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Voulez-vous supprimer ce transfert ?')) return;
    try {
      await updateDoc(doc(db, 'collaborations', id), {
        deletedAt: serverTimestamp()
      });
      // Actually standard delete is better for clean workspace if requested
      // But deleteDoc is safer for simple apps
      await import('../lib/firebase').then(({ deleteDoc, doc, db }) => {
        deleteDoc(doc(db, 'collaborations', id));
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'collaborations');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !auth.currentUser || loading) return;

    setLoading(true);
    const myEmail = auth.currentUser.email?.toLowerCase() || '';
    try {
      await addDoc(collection(db, 'collaborations'), {
        ...formData,
        recipientEmail: formData.recipientEmail.toLowerCase(),
        companyId: currentCompany.id,
        senderEmail: myEmail,
        senderName: auth.currentUser.displayName || myEmail.split('@')[0],
        fileName: attachedFile?.name || null,
        fileType: attachedFile?.type || null,
        fileData: attachedFile?.data || null,
        createdAt: serverTimestamp(),
        readBy: []
      });
      setIsAdding(false);
      setFormData({ recipientEmail: 'all', type: 'Note', title: '', content: '', referenceId: '' });
      setAttachedFile(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'collaborations');
    } finally {
      setLoading(false);
    }
  };

  const myEmail = auth.currentUser?.email || '';
  const filtered = collaborations.filter(c => {
    if (activeFilter === 'received') return c.recipientEmail === myEmail || c.recipientEmail === 'all';
    if (activeFilter === 'sent') return c.senderEmail === myEmail;
    if (activeFilter === 'public') return c.recipientEmail === 'all';
    return true;
  });

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-8 sm:p-12 text-white shadow-2xl group">
        <div className="absolute inset-0 z-0 scale-110 blur-2xl opacity-20 group-hover:opacity-30 transition-opacity">
          <img 
             src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1600" 
             className="w-full h-full object-cover" 
             alt="collaboration"
          />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="max-w-xl">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
              Nexus <span className="text-blue-500">Sync</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-lg font-medium leading-relaxed">
              Transférez des données, partagez des documents stratégiques et coordonnez vos équipes à travers tout l'écosystème Nexus.
            </p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="px-8 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-[12px] uppercase tracking-widest flex items-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 shrink-0"
          >
            <Send size={18} />
            Lancer un Transfert
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-100 pb-2 overflow-x-auto scrollbar-hide">
        {[
          { id: 'received', label: 'Reçus & Publics', icon: Bell },
          { id: 'sent', label: 'Mes Envois', icon: Send },
          { id: 'public', label: 'Espace Commun', icon: Users },
          { id: 'all', label: 'Tout l\'historique', icon: Filter }
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
              activeFilter === filter.id 
                ? "bg-blue-50 text-blue-600 border border-blue-100 shadow-sm shadow-blue-100" 
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            )}
          >
            <filter.icon size={14} />
            {filter.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(item => (
          <div key={item.id} className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-2xl shadow-slate-200/40 group hover:border-blue-200 transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-sm border transition-transform group-hover:scale-110",
                item.type === 'Note' ? "bg-amber-50 text-amber-600 border-amber-100" :
                item.type === 'Document' ? "bg-blue-50 text-blue-600 border-blue-100" :
                item.type === 'Contact' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                "bg-purple-50 text-purple-600 border-purple-100"
              )}>
                {item.type === 'Note' ? <MessageSquare size={20} /> :
                 item.type === 'Document' ? <FileText size={20} /> :
                 item.type === 'Contact' ? <Users size={20} /> :
                 <Bell size={20} />}
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <div className="flex gap-1">
                   {item.senderEmail === myEmail && (
                     <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                       <Trash2 size={12} />
                     </button>
                   )}
                </div>
                <p className="text-[10px] font-black text-slate-900 leading-none">{item.type}</p>
                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter mt-1">
                  {item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'Instantané'}
                </p>
              </div>
            </div>

            <h3 className="font-black text-slate-900 text-lg mb-2 leading-tight">{item.title}</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6 line-clamp-3">
              {item.content}
            </p>

            {item.fileName && (
              <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group/file">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-100 shrink-0">
                    <File size={20} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-black text-slate-900 truncate uppercase mt-0.5" title={item.fileName}>{item.fileName}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{item.fileType?.split('/')[1] || 'Fichier'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDownload(item)}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-black transition-all shadow-lg shadow-blue-100 group-hover/file:scale-110"
                >
                  <Download size={14} />
                </button>
              </div>
            )}

            <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-500 overflow-hidden border border-white shadow-sm">
                  {item.senderEmail.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Envoyé par</p>
                  <p className="text-[11px] font-black text-slate-700 leading-tight">{(item as any).senderName || item.senderEmail}</p>
                </div>
              </div>
              {item.recipientEmail === 'all' ? (
                <div className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[8px] font-black uppercase tracking-tighter border border-blue-100">Public</div>
              ) : (
                <div className="px-3 py-1.5 bg-slate-50 text-slate-400 rounded-xl text-[8px] font-black uppercase tracking-tighter">Privé</div>
              )}
            </div>
            
            {item.referenceId && (
              <button className="w-full mt-6 flex items-center justify-center gap-2 py-3 bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                <ExternalLink size={12} />
                Voir la ressource liée
              </button>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
              <Share2 size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest">Aucune donnée trouvée</h3>
            <p className="text-xs font-bold text-slate-400 mt-2">Commencez à transférer des informations à vos collègues.</p>
          </div>
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6 sm:p-20 overflow-y-auto">
          <div className="bg-white rounded-[3rem] p-10 max-w-2xl w-full shadow-2xl border border-slate-100 my-auto">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Nouveau Transfert</h3>
                <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Sélectionnez le destinataire et le type de donnée.</p>
              </div>
              <button 
                onClick={() => setIsAdding(false)}
                className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all"
              >
                <ChevronRight className="rotate-45" size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destinataire</label>
                  <select 
                    value={formData.recipientEmail}
                    onChange={e => setFormData({...formData, recipientEmail: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-sm"
                  >
                    <option value="all">Tous les utilisateurs</option>
                    {personnel.filter(p => p.email !== auth.currentUser?.email).map(p => (
                      <option key={p.email} value={p.email}>{p.name} ({p.email})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type de Donnée</label>
                  <select 
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-sm"
                  >
                    <option value="Note">Note Interne</option>
                    <option value="Document">Document / Fichier</option>
                    <option value="Contact">Fiche Contact</option>
                    <option value="Rapport">Rapport d'activité</option>
                    <option value="Alerte">Alerte / Notification</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Titre / Objet</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-sm"
                  placeholder="Ex: Mise à jour du client Dupont"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contenu / Message</label>
                <textarea 
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                  rows={6}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-sm resize-none"
                  placeholder="Décrivez les données à transférer..."
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fichier Attachment (Optionnel)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "w-full border-2 border-dashed rounded-3xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center gap-3",
                    attachedFile ? "border-blue-200 bg-blue-50/50" : "border-slate-100 hover:border-blue-200 hover:bg-slate-50"
                  )}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.docx,.doc,.xls,.xlsx"
                  />
                  {attachedFile ? (
                    <div className="flex items-center gap-4 w-full">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100 shrink-0">
                        <File size={24} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-black text-slate-900 truncate">{attachedFile.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Prêt pour le transfert</p>
                      </div>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeAttachedFile(); }}
                        className="p-2 bg-white text-red-500 rounded-xl hover:bg-red-50 transition-all border border-slate-100"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                        <Upload size={24} />
                      </div>
                      <p className="text-xs font-bold text-slate-500">Cliquez pour ajouter un PDF, Word ou Excel</p>
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mt-1">Limite: 800KB</p>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-10">
                <button type="button" onClick={() => setIsAdding(false)} className="py-5 bg-slate-100 text-slate-600 font-black rounded-[1.5rem] text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Annuler</button>
                <button type="submit" disabled={loading} className="py-5 bg-slate-900 text-white font-black rounded-[1.5rem] text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-3">
                  <Send size={16} />
                  Effectuer le Transfert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
