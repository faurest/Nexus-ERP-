import React, { useState, useEffect } from 'react';
import { 
  Handshake, 
  Plus, 
  Send, 
  Search, 
  Clock, 
  FileText, 
  Image as ImageIcon, 
  StickyNote,
  User,
  Download,
  Trash2,
  MessageSquare,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  db, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  serverTimestamp, 
  getDocs, 
  auth, 
  OperationType, 
  handleFirestoreError 
} from '../lib/firebase';
import { useCompany } from '../lib/CompanyContext';
import { cn } from '../lib/utils';
import CommunicationModule from './CommunicationModule';

import { createNotification } from '../lib/notifications';

interface Collaboration {
  id: string;
  senderEmail: string;
  recipientEmail: string;
  type: 'Note' | 'Document' | 'Image';
  title: string;
  content: string;
  referenceId?: string;
  fileUrl?: string;
  fileName?: string;
  createdAt: any;
  readBy: string[];
}

export default function CollaborationModule() {
  const { currentCompany } = useCompany();
  const [activeView, setActiveView] = useState<'transfers' | 'chat'>('chat');
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    recipientEmail: 'all',
    type: 'Note' as const,
    title: '',
    content: '',
    referenceId: ''
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Note' | 'Document' | 'Image'>('all');
  const [stats, setStats] = useState({ total: 0, notes: 0, docs: 0, images: 0 });

  useEffect(() => {
    const s = { total: collaborations.length, notes: 0, docs: 0, images: 0 };
    collaborations.forEach(c => {
      if (c.type === 'Note') s.notes++;
      if (c.type === 'Document') s.docs++;
      if (c.type === 'Image') s.images++;
    });
    setStats(s);
  }, [collaborations]);

  useEffect(() => {
    if (!currentCompany) return;

    const myEmail = auth.currentUser?.email?.toLowerCase() || '';
    
    const q = query(
      collection(db, 'collaborations'),
      where('companyId', '==', currentCompany.id)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collaboration));
      const filtered = data.filter(item => 
        item.recipientEmail === 'all' || 
        item.recipientEmail.toLowerCase() === myEmail || 
        item.senderEmail.toLowerCase() === myEmail
      ).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      
      setCollaborations(filtered);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'collaborations'));

    return () => unsub();
  }, [currentCompany]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !auth.currentUser) return;

    setLoading(true);
    const myEmail = auth.currentUser.email?.toLowerCase() || '';
    try {
      const collaborationRef = await addDoc(collection(db, 'collaborations'), {
        ...formData,
        recipientEmail: formData.recipientEmail.toLowerCase(),
        companyId: currentCompany.id,
        senderEmail: myEmail,
        createdAt: serverTimestamp(),
        readBy: []
      });

      if (formData.recipientEmail !== 'all') {
        const recipientEmail = formData.recipientEmail.toLowerCase();
        const qUser = query(collection(db, 'users'), where('email', '==', recipientEmail));
        const userSnap = await getDocs(qUser);
        
        if (!userSnap.empty) {
          const recipientUid = userSnap.docs[0].id;
          const senderName = auth.currentUser.displayName || myEmail.split('@')[0];
          
          await createNotification(
            currentCompany.id,
            [recipientUid],
            `Nouveau ${formData.type} reçu`,
            `${senderName} vous a transféré : ${formData.title}`,
            'general'
          );
        }
      }

      setIsAdding(false);
      setFormData({ recipientEmail: 'all', type: 'Note', title: '', content: '', referenceId: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'collaborations');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = collaborations.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || 
                         c.content.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-200">
            <Handshake size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Focus Collaboration</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mt-1">Espace d'échange et communication nexus</p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-2 rounded-2xl border border-slate-200">
          <button 
            onClick={() => setActiveView('transfers')}
            className={cn(
              "flex items-center gap-3 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeView === 'transfers' ? "bg-white text-indigo-600 shadow-lg" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Share2 size={16} />
            Transferts Flux
          </button>
          <button 
            onClick={() => setActiveView('chat')}
            className={cn(
              "flex items-center gap-3 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeView === 'chat' ? "bg-white text-indigo-600 shadow-lg" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <MessageSquare size={16} />
            Messagerie Directe
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'transfers' ? (
          <motion.div
            key="transfers"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Nexus Sync Stats Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {[
                { label: 'Flux Total', value: stats.total, color: 'bg-indigo-600', icon: <Share2 size={18} /> },
                { label: 'Notes Sync', value: stats.notes, color: 'bg-amber-500', icon: <StickyNote size={18} /> },
                { label: 'Documents', value: stats.docs, color: 'bg-blue-500', icon: <FileText size={18} /> },
                { label: 'Ressources', value: stats.images, color: 'bg-rose-500', icon: <ImageIcon size={18} /> }
              ].map((stat, idx) => (
                <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-xl hover:scale-[1.02] transition-all duration-500">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-2xl font-black text-slate-900 leading-none">{stat.value}</p>
                  </div>
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", stat.color)}>
                    {stat.icon}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-4">
                <div className="relative group min-w-[300px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                  <input 
                    type="text" 
                    placeholder="Chercher une collaboration..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl outline-none text-xs font-bold text-slate-600 focus:ring-4 focus:ring-indigo-100 shadow-sm"
                  />
                </div>
                <div className="flex items-center bg-white border border-slate-100 rounded-2xl px-2">
                  {(['all', 'Note', 'Document', 'Image'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                        typeFilter === type ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-indigo-600"
                      )}
                    >
                      {type === 'all' ? 'Tous' : type}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setIsAdding(true)}
                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl flex items-center gap-3 font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-indigo-200"
              >
                <Plus size={18} />
                Nouveau Transfert
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {filteredItems.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-2xl transition-all duration-500 group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-16 -mt-16 opacity-30 group-hover:bg-indigo-100 transition-colors" />
                  
                  {/* Status Indicator */}
                  <div className="absolute top-8 right-8 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[8px] font-black text-green-600 uppercase tracking-widest">Actif</span>
                  </div>

                  <div className="flex items-start justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm",
                        item.type === 'Note' ? "bg-amber-50 text-amber-600" :
                        item.type === 'Document' ? "bg-blue-50 text-blue-600" :
                        "bg-rose-50 text-rose-600"
                      )}>
                        {item.type === 'Note' ? <StickyNote size={24} /> :
                         item.type === 'Document' ? <FileText size={24} /> :
                         <ImageIcon size={24} />}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight">{item.title}</h3>
                        <div className="flex items-center gap-3 mt-1.5 opacity-60">
                           <User size={12} className="text-slate-400" />
                           <span className="text-[10px] font-bold text-slate-500">De: {item.senderEmail}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                      {item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'En cours...'}
                    </span>
                  </div>

                  <div className="mb-8 p-6 bg-slate-50/50 rounded-[1.5rem] border border-slate-100 min-h-[100px] relative z-10">
                    <p className="text-sm font-medium text-slate-600 leading-relaxed italic">"{item.content}"</p>
                  </div>

                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                       <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest">Destinataire:</span>
                       <span className="px-3 py-1 bg-white border border-slate-100 rounded-full text-[9px] font-black text-slate-500 uppercase">
                         {item.recipientEmail === 'all' ? "Toute l'entreprise" : item.recipientEmail}
                       </span>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-3 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 shadow-lg transition-all">
                        <Download size={16} />
                      </button>
                      <button className="p-3 bg-slate-50 text-slate-300 rounded-xl hover:text-rose-500 transition-all border border-slate-100">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-32 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl text-slate-300">
                  <Handshake size={48} strokeWidth={1} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Aucun transfert actif</h3>
                <p className="text-slate-400 font-medium max-w-xs mx-auto">Utilisez le bouton Nexus pour envoyer des notes ou documents à vos collègues.</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <CommunicationModule />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl" 
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] p-10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50 rounded-bl-full -mr-24 -mt-24 opacity-50" />
              
              <div className="relative z-10 mb-10">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Nouveau Transfert</h2>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">Configuration du transfert de données nexus</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Type d'échange</label>
                    <select 
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-sm text-slate-600 appearance-none"
                    >
                      <option value="Note">Note Interactive</option>
                      <option value="Document">Document Officiel</option>
                      <option value="Image">Ressource Visuelle</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Destinataire</label>
                    <input 
                      type="text" 
                      placeholder="Email (ou 'all')" 
                      required
                      value={formData.recipientEmail}
                      onChange={e => setFormData({ ...formData, recipientEmail: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-sm text-slate-600 placeholder:text-slate-300"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Titre du Flux</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: Mise à jour stratégique..." 
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-sm text-slate-600 placeholder:text-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Contenu descriptif</label>
                  <textarea 
                    required
                    rows={4}
                    placeholder="Détails de l'échange..." 
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-sm text-slate-600 placeholder:text-slate-300 resize-none"
                  />
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-5 rounded-2xl bg-slate-100 text-slate-400 font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-[2] py-5 rounded-2xl bg-indigo-600 text-white font-black text-[11px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-3"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={18} />
                        Initialiser le Flux
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
