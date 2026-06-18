import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Headphones, MessageCircle, Phone, Mail, Send, CheckCircle2, Clock, AlertCircle, LifeBuoy, ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, doc, updateDoc, arrayUnion } from '../lib/firebase';
import { useCompany } from '../lib/CompanyContext';
import { cn } from '../lib/utils';

interface TicketResponse {
  id: string;
  text: string;
  senderEmail: string;
  createdAt: number;
}

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  createdAt: any;
  userEmail: string;
  responses?: TicketResponse[];
}

const SUPPORT_NUMBER = "237640790996";

export default function SupportModule({ user }: { user: any }) {
  const { currentCompany } = useCompany();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isNewTicket, setIsNewTicket] = useState(false);
  const [form, setForm] = useState({ subject: '', message: '', priority: 'NORMAL' as const });
  const [submitting, setSubmitting] = useState(false);
  
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = user?.email === 'hackeurfaurest@gmail.com' || user?.email === 'dangafelicite@gmail.com' || user?.email === 'yaoubaboubakary43@gmail.com' || user?.role === 'Admin';

  useEffect(() => {
    if (!currentCompany) return;
    const q = query(
      collection(db, 'support_tickets'),
      where('companyId', '==', currentCompany.id)
    );
    const unsub = onSnapshot(q, snap => {
      let fetchedTickets = snap.docs.map(d => ({ id: d.id, ...d.data() } as Ticket));
      
      // Filter out other users' tickets if not admin
      if (!isAdmin) {
        fetchedTickets = fetchedTickets.filter(t => t.userEmail === user.email);
      }

      // Sort descending by createdAt locally
      fetchedTickets.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
      setTickets(fetchedTickets);
    });
    return () => unsub();
  }, [currentCompany, isAdmin, user.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !form.subject.trim() || !form.message.trim()) return;
    
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'support_tickets'), {
        ...form,
        companyId: currentCompany.id,
        userEmail: user.email,
        status: 'PENDING',
        createdAt: serverTimestamp()
      });
      setForm({ subject: '', message: '', priority: 'NORMAL' });
      setIsNewTicket(false);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la création du ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (ticketId: string) => {
    if (!replyText.trim()) return;
    try {
      setSubmitting(true);
      const newResponse: TicketResponse = {
        id: Math.random().toString(36).substring(2, 9),
        text: replyText.trim(),
        senderEmail: user.email,
        createdAt: Date.now()
      };
      await updateDoc(doc(db, 'support_tickets', ticketId), {
        responses: arrayUnion(newResponse),
        updatedAt: serverTimestamp()
      });
      setReplyText('');
    } catch (err) {
      console.error('Error adding reply:', err);
      alert('Impossible d\'envoyer la réponse.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: Ticket['status']) => {
    try {
      await updateDoc(doc(db, 'support_tickets', ticketId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error changing status:', err);
      alert('Impossible de changer le statut.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'IN_PROGRESS': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'RESOLVED': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-500';
      case 'HIGH': return 'text-orange-500';
      case 'NORMAL': return 'text-blue-500';
      case 'LOW': return 'text-slate-500';
      default: return 'text-slate-500';
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ticket.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ticket.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || ticket.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-10 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-20 -mt-20" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30 backdrop-blur-sm">
              <LifeBuoy size={24} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">Support Numérique</h1>
              <p className="text-blue-400 font-medium mt-1">Nexus ERP - Assistance pour les clients</p>
            </div>
          </div>
          <p className="text-slate-300 max-w-2xl leading-relaxed">
            Notre équipe d'experts est disponible pour vous accompagner dans l'utilisation de votre ERP. N'hésitez pas à nous contacter via WhatsApp pour une assistance immédiate ou à ouvrir un ticket pour un suivi détaillé.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact direct */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-6">Assistance Rapide</h2>
            
            <button 
              onClick={() => window.open(`https://wa.me/${SUPPORT_NUMBER}?text=${encodeURIComponent("Bonjour, j'ai besoin d'assistance sur mon espace Nexus ERP.")}`, "_blank")}
              className="w-full flex items-center justify-between p-5 bg-emerald-50 rounded-2xl hover:bg-emerald-100 transition-colors group mb-4 border border-emerald-100"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-sm">
                  <MessageCircle size={20} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-emerald-900 uppercase tracking-widest leading-none mb-1">WhatsApp</p>
                  <p className="text-[10px] font-bold text-emerald-600">Réponse en moins de 5 min</p>
                </div>
              </div>
            </button>

            <button 
              className="w-full flex items-center justify-between p-5 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-colors group mb-4 border border-blue-100"
              onClick={() => window.location.href = `tel:+${SUPPORT_NUMBER}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm">
                  <Phone size={20} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-blue-900 uppercase tracking-widest leading-none mb-1">Appel Vocal</p>
                  <p className="text-[10px] font-bold text-blue-600">Ligne d'urgence</p>
                </div>
              </div>
            </button>
          </div>

          <div className="bg-slate-900 rounded-3xl p-8 shadow-sm text-white">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-300 mb-6">Statut de nos systèmes</h2>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              <p className="text-sm font-bold text-emerald-400">Tous les systèmes sont opérationnels</p>
            </div>
            <p className="text-xs text-slate-500 mt-4 leading-relaxed font-medium">Service de synchronisation temps réel, facturation, IA et bases de données en ligne.</p>
          </div>
        </div>

        {/* Tickets */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Vos Tickets Support</h2>
              <p className="text-xs text-slate-500 font-medium">Suivi de vos demandes d'assistance</p>
            </div>
            <button 
              onClick={() => setIsNewTicket(true)}
              className="px-6 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-colors"
            >
              Nouveau Ticket
            </button>
          </div>

          {isNewTicket && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl shadow-sm border border-blue-100"
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Sujet du problème</label>
                  <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                    placeholder="Ex: Problème d'impression facture"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Priorité</label>
                    <select
                      value={form.priority}
                      onChange={e => setForm(f => ({ ...f, priority: e.target.value as any }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                    >
                      <option value="LOW">Faible (Question générale)</option>
                      <option value="NORMAL">Normale (Gêne modérée)</option>
                      <option value="HIGH">Haute (Fonction bloquée)</option>
                      <option value="CRITICAL">Critique (Crash système)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Description détaillée</label>
                  <textarea
                    required
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px] resize-y text-slate-900"
                    placeholder="Décrivez précisément ce qu'il se passe..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsNewTicket(false)}
                    className="px-6 py-3 font-bold text-slate-500 text-xs uppercase tracking-widest hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                  >
                    {submitting ? 'Envoi...' : 'Envoyer le ticket'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {tickets.length > 0 && (
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un ticket..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                />
              </div>
              <div className="relative w-48">
                <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 appearance-none font-bold"
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value="PENDING">En Attente</option>
                  <option value="IN_PROGRESS">En Cours</option>
                  <option value="RESOLVED">Résolu</option>
                </select>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {filteredTickets.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl text-center border border-slate-100 border-dashed">
                <CheckCircle2 size={40} className="mx-auto text-slate-300 mb-4" />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Aucun ticket trouvé</p>
                <p className="text-xs text-slate-400 mt-2">Vérifiez vos critères de recherche ou ouvrez un nouveau ticket.</p>
              </div>
            ) : (
              filteredTickets.map(ticket => (
                <div key={ticket.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-blue-100 hover:shadow-md transition-all">
                  <div 
                    className="flex justify-between items-start mb-4 cursor-pointer"
                    onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">TICKET #{ticket.id.slice(0, 6)}</span>
                        <span className={cn("px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border", getStatusColor(ticket.status))}>
                          {ticket.status === 'PENDING' ? 'En Attente' : ticket.status === 'IN_PROGRESS' ? 'En Cours' : 'Résolu'}
                        </span>
                        {isAdmin && (
                          <div className="flex gap-1 ml-2">
                            <button onClick={(e) => { e.stopPropagation(); handleStatusChange(ticket.id, 'PENDING'); }} className="text-[10px] uppercase font-bold text-slate-400 hover:text-amber-500">Attente</button>
                            <button onClick={(e) => { e.stopPropagation(); handleStatusChange(ticket.id, 'IN_PROGRESS'); }} className="text-[10px] uppercase font-bold text-slate-400 hover:text-blue-500">En Cours</button>
                            <button onClick={(e) => { e.stopPropagation(); handleStatusChange(ticket.id, 'RESOLVED'); }} className="text-[10px] uppercase font-bold text-slate-400 hover:text-emerald-500">Résolu</button>
                          </div>
                        )}
                      </div>
                      <h3 className="font-black text-slate-800 text-lg">{ticket.subject}</h3>
                      <p className="text-xs text-slate-500 font-medium">De: {ticket.userEmail}</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <Clock size={12} />
                      {ticket.createdAt?.toDate().toLocaleDateString('fr-FR')}
                      {expandedTicket === ticket.id ? <ChevronUp size={16} className="ml-2" /> : <ChevronDown size={16} className="ml-2" />}
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {expandedTicket === ticket.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="text-sm text-slate-600 leading-relaxed mb-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 whitespace-pre-wrap">
                          {ticket.message}
                        </p>

                        {ticket.responses && ticket.responses.length > 0 && (
                          <div className="space-y-3 mb-4 mt-6">
                            <h4 className="text-[10px] font-black tracking-widest uppercase text-slate-400 ml-2">Historique des échanges</h4>
                            {ticket.responses.map(resp => (
                              <div key={resp.id} className={cn("p-4 rounded-2xl border w-[90%]", resp.senderEmail === user.email ? "bg-blue-50 border-blue-100 ml-auto rounded-tr-sm" : "bg-white border-slate-100 mr-auto rounded-tl-sm")}>
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs font-bold text-slate-700">{resp.senderEmail}</span>
                                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{new Date(resp.createdAt).toLocaleString('fr-FR')}</span>
                                </div>
                                <p className="text-sm text-slate-600">{resp.text}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {ticket.status !== 'RESOLVED' && (
                          <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                            <input
                              type="text"
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleReply(ticket.id)}
                              placeholder="Votre réponse..."
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                            />
                            <button
                              onClick={() => handleReply(ticket.id)}
                              disabled={!replyText.trim() || submitting}
                              className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold disabled:opacity-50"
                            >
                              <Send size={18} />
                            </button>
                          </div>
                        )}

                        <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                          <span className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1", getPriorityColor(ticket.priority))}>
                            <AlertCircle size={12} />
                            Priorité: {ticket.priority}
                          </span>
                          {ticket.status === 'PENDING' && (
                            <span className="text-[10px] font-bold text-slate-400 italic">Notre équipe vous contactera bientôt</span>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
