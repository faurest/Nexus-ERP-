import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Users, 
  Search, 
  Hash, 
  Clock, 
  User, 
  ChevronRight,
  MoreVertical,
  Plus,
  ArrowLeft,
  Briefcase,
  Check
} from 'lucide-react';
import { 
  db, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc,
  doc,
  serverTimestamp, 
  getDocs, 
  auth, 
  OperationType, 
  handleFirestoreError,
  or,
  and,
  orderBy
} from '../lib/firebase';
import { useCompany } from '../lib/CompanyContext';
import { cn } from '../lib/utils';
import { createNotification } from '../lib/notifications';

interface DirectMessage {
  id: string;
  senderId: string;
  recipientId: string;
  senderName: string;
  content: string;
  timestamp: any;
  isRead: boolean;
}

interface ProjectDiscussion {
  id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: any;
}

interface Project {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  uid?: string;
  name: string;
  email: string;
  role: string;
}

const parseTimestamp = (timestamp: any): Date | null => {
  if (!timestamp) return new Date(); // Fallback for pending serverTimestamp
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  const date = new Date(timestamp);
  return isNaN(date.getTime()) ? new Date() : date;
};

const formatDate = (timestamp: any) => {
  const date = parseTimestamp(timestamp);
  if (!date) return '';
  
  const now = new Date();
  
  if (date.toDateString() === now.toDateString()) return "Aujourd'hui";
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
};

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-nexus-accent text-white hover:bg-nexus-accent/80', 'bg-indigo-600', 'bg-purple-600', 
    'bg-emerald-600', 'bg-rose-600', 'bg-amber-600', 'bg-nexus-accent'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function CommunicationModule() {
  const { currentCompany } = useCompany();
  const [activeTab, setActiveTab] = useState<'direct' | 'project'>('direct');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [projectMessages, setProjectMessages] = useState<ProjectDiscussion[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({});
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch unread counts
  useEffect(() => {
    if (!currentCompany || !auth.currentUser) return;

    const myEmail = auth.currentUser.email?.toLowerCase().trim() || '';
    const qUnread = query(
      collection(db, 'messages'),
      where('companyId', '==', currentCompany.id),
      where('recipientEmail', '==', myEmail)
    );

    const unsub = onSnapshot(qUnread, (snap) => {
      const counts: { [key: string]: number } = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.isRead === false) {
          // Use email to match with contact.email
          const senderId = data.senderEmail || data.senderId;
          counts[senderId] = (counts[senderId] || 0) + 1;
        }
      });
      setUnreadCounts(counts);
    });

    return () => unsub();
  }, [currentCompany]);

  // Grouping messages by date
  const groupMessagesByDate = (msgs: (DirectMessage | ProjectDiscussion)[]) => {
    const groups: { [key: string]: (DirectMessage | ProjectDiscussion)[] } = {};
    msgs.forEach(msg => {
      const date = formatDate(msg.timestamp);
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fetch contacts and projects
  useEffect(() => {
    if (!currentCompany) return;

    const qContacts = query(collection(db, 'personnel'), where('companyId', '==', currentCompany.id));
    const unsubContacts = onSnapshot(qContacts, (snap) => {
      setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Contact)).filter(c => c.email !== auth.currentUser?.email));
    });

    const qProjects = query(collection(db, 'projects'), where('companyId', '==', currentCompany.id));
    const unsubProjects = onSnapshot(qProjects, (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
    });

    return () => {
      unsubContacts();
      unsubProjects();
    };
  }, [currentCompany]);

  // Fetch direct messages
  useEffect(() => {
    if (!currentCompany || !selectedContact || activeTab !== 'direct' || !auth.currentUser) return;

    const myEmail = auth.currentUser.email?.toLowerCase().trim() || '';
    const contactEmail = selectedContact.email?.toLowerCase().trim() || '';
    const conversationId = [myEmail, contactEmail].sort().join('_');

    // Direct messages are stored in a simple collection, we filter for conversationId
    const qMessages = query(
      collection(db, 'messages'),
      where('companyId', '==', currentCompany.id),
      where('conversationId', '==', conversationId)
    );

    const unsub = onSnapshot(qMessages, (snap) => {
      const fetchedMessages = snap.docs.map(d => ({ id: d.id, ...d.data() } as DirectMessage));
      fetchedMessages.sort((a, b) => {
        const timeA = parseTimestamp(a.timestamp)?.getTime() || Date.now();
        const timeB = parseTimestamp(b.timestamp)?.getTime() || Date.now();
        return timeA - timeB;
      });
      setMessages(fetchedMessages);

      // Mark unread messages as read
      if (auth.currentUser) {
        snap.docs.forEach(async (d) => {
          const data = d.data();
          if (data.recipientEmail === myEmail && !data.isRead) {
            try {
              await updateDoc(doc(db, 'messages', d.id), { isRead: true });
            } catch (err) {
              console.warn("Nexus Chat: Failed to mark message as read", err);
            }
          }
        });
      }
    }, err => handleFirestoreError(err, OperationType.LIST, 'messages'));

    return () => unsub();
  }, [currentCompany, selectedContact, activeTab]);

  // Fetch project discussions
  useEffect(() => {
    if (!currentCompany || !selectedProject || activeTab !== 'project') return;

    const qProjectMessages = query(
      collection(db, 'project_discussions'),
      where('companyId', '==', currentCompany.id),
      where('projectId', '==', selectedProject.id)
    );

    const unsub = onSnapshot(qProjectMessages, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectDiscussion));
      msgs.sort((a, b) => {
        const timeA = parseTimestamp(a.timestamp)?.getTime() || Date.now();
        const timeB = parseTimestamp(b.timestamp)?.getTime() || Date.now();
        return timeA - timeB;
      });
      setProjectMessages(msgs);
    }, err => handleFirestoreError(err, OperationType.LIST, 'project_discussions'));

    return () => unsub();
  }, [currentCompany, selectedProject, activeTab]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, projectMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentCompany || !auth.currentUser || loading) return;

    setLoading(true);
    setIsTyping(false);
    try {
      if (activeTab === 'direct' && selectedContact) {
        const myEmail = auth.currentUser.email?.toLowerCase().trim() || '';
        const contactEmail = selectedContact.email?.toLowerCase().trim() || '';
        const conversationId = [myEmail, contactEmail].sort().join('_');
        
        await addDoc(collection(db, 'messages'), {
          companyId: currentCompany.id,
          conversationId,
          senderId: auth.currentUser.uid,
          senderEmail: myEmail,
          recipientId: selectedContact.uid || selectedContact.id,
          recipientEmail: contactEmail,
          senderName: auth.currentUser.displayName || 'Utilisateur',
          content: newMessage.trim(),
          timestamp: serverTimestamp(),
          isRead: false
        });

        // Trigger notification (only if we have a real UID)
        if (selectedContact.uid) {
          await createNotification(
            currentCompany.id,
            [selectedContact.uid],
            'Nouveau message direct',
            `${auth.currentUser.displayName || 'Un collègue'} vous a envoyé un message.`,
            'general'
          );
        }
      } else if (activeTab === 'project' && selectedProject) {
        await addDoc(collection(db, 'project_discussions'), {
          companyId: currentCompany.id,
          projectId: selectedProject.id,
          senderId: auth.currentUser.uid,
          senderName: auth.currentUser.displayName || 'Utilisateur',
          content: newMessage.trim(),
          timestamp: serverTimestamp()
        });

        // Notify other project members?
        // We find all personnel that have a UID and are in the current company (excluding me)
        const qMembers = query(
          collection(db, 'personnel'), 
          and(
            where('companyId', '==', currentCompany.id),
            where('uid', '!=', auth.currentUser.uid)
          )
        );
        const membersSnap = await getDocs(qMembers);
        const projectMembersUids = membersSnap.docs
          .map(d => d.data().uid)
          .filter(uid => !!uid);

        if (projectMembersUids.length > 0) {
          await createNotification(
            currentCompany.id,
            projectMembersUids,
            `Discussion: ${selectedProject.name}`,
            `${auth.currentUser.displayName || 'Un collègue'} a posté un message.`,
            'project'
          );
        }
      }
      setNewMessage('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, activeTab === 'direct' ? 'messages' : 'project_discussions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-160px)] md:h-[calc(100vh-180px)] bg-nexus-surface rounded-[2rem] lg:rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      {/* Sidebar */}
      <aside className={cn(
        "w-full lg:w-80 border-r border-white/5 flex flex-col bg-white/5/30 transition-all",
        (selectedContact || selectedProject) && "hidden lg:flex"
      )}>
        <div className="p-6 lg:p-8 border-b border-white/5">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl mb-6">
            <button 
              onClick={() => setActiveTab('direct')}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'direct' ? "bg-nexus-surface text-blue-600 shadow-sm" : "text-nexus-text-muted hover:text-nexus-text-muted"
              )}
            >
              Direct
            </button>
            <button 
              onClick={() => setActiveTab('project')}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'project' ? "bg-nexus-surface text-blue-600 shadow-sm" : "text-nexus-text-muted hover:text-nexus-text-muted"
              )}
            >
              Projets
            </button>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-nexus-surface border border-white/5 rounded-xl outline-none text-[11px] font-bold text-nexus-text-muted transition-all focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {activeTab === 'direct' ? (
            filteredContacts.map(contact => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl transition-all group",
                  selectedContact?.id === contact.id ? "bg-nexus-surface shadow-xl shadow-slate-200/50 border border-white/5" : "hover:bg-white/5 border border-transparent"
                )}
              >
                <div className="relative">
                  <div className={cn(
                    "w-12 h-12 rounded-[1.25rem] flex items-center justify-center text-white font-black text-lg border border-white/20 shadow-sm",
                    getAvatarColor(contact.name)
                  )}>
                    {contact.name.charAt(0)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-4 border-white" />
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-[11px] font-black text-nexus-text line-clamp-1">{contact.name}</p>
                  <p className="text-[9px] font-bold text-nexus-text-muted uppercase tracking-widest leading-none mt-1">{contact.role}</p>
                </div>
                {((contact.email && unreadCounts[contact.email.toLowerCase().trim()]) || unreadCounts[contact.id]) > 0 && (
                  <div className="w-5 h-5 bg-nexus-accent text-white hover:bg-nexus-accent/80 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg animate-bounce">
                    {(contact.email && unreadCounts[contact.email.toLowerCase().trim()]) || unreadCounts[contact.id]}
                  </div>
                )}
                {selectedContact?.id === contact.id && (
                   <ChevronRight size={16} className="text-blue-500" />
                )}
              </button>
            ))
          ) : (
            filteredProjects.map(project => (
              <button
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl transition-all group",
                  selectedProject?.id === project.id ? "bg-nexus-surface shadow-xl shadow-slate-200/50 border border-white/5" : "hover:bg-white/5 border border-transparent"
                )}
              >
                <div className="w-12 h-12 rounded-[1.25rem] bg-nexus-accent flex items-center justify-center text-white border border-slate-800 shadow-lg">
                  <Hash size={24} strokeWidth={2.5} />
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-[11px] font-black text-nexus-text line-clamp-1">{project.name}</p>
                  <p className="text-[9px] font-bold text-nexus-text-muted uppercase tracking-widest leading-none mt-1">Fil du projet</p>
                </div>
                {selectedProject?.id === project.id && (
                   <ChevronRight size={16} className="text-blue-500" />
                )}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-nexus-surface overflow-hidden relative">
        {(selectedContact || selectedProject) ? (
          <>
            {/* Header */}
            <header className="p-4 lg:p-8 border-b border-white/5 flex items-center justify-between bg-nexus-surface/80 backdrop-blur-md sticky top-0 z-10 gap-4">
              <div className="flex items-center gap-3 lg:gap-6">
                <button 
                  onClick={() => { setSelectedContact(null); setSelectedProject(null); }}
                  className="lg:hidden p-2 rounded-xl bg-slate-100 text-nexus-text-muted hover:bg-slate-200"
                >
                  <ArrowLeft size={18} />
                </button>
                {activeTab === 'direct' ? (
                  <>
                    <div className={cn(
                      "w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-[1.5rem] flex items-center justify-center text-white text-lg lg:text-2xl font-black shadow-xl",
                      getAvatarColor(selectedContact?.name || 'U')
                    )}>
                      {selectedContact?.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base lg:text-xl font-black text-nexus-text tracking-tight leading-none truncate">{selectedContact?.name}</h2>
                      <div className="flex items-center gap-2 mt-1 lg:mt-2">
                        <div className="w-1.5 lg:w-2 h-1.5 lg:h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[8px] lg:text-[9px] font-black text-nexus-text-muted uppercase tracking-widest truncate">{selectedContact?.role} • En ligne</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-[1.5rem] bg-nexus-accent flex items-center justify-center text-white shadow-xl">
                      <Briefcase size={20} className="lg:hidden" />
                      <Briefcase size={28} className="hidden lg:block" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base lg:text-xl font-black text-nexus-text tracking-tight leading-none truncate">{selectedProject?.name}</h2>
                      <p className="text-[8px] lg:text-[9px] font-black text-blue-600 uppercase tracking-widest mt-1 lg:mt-2 truncate">Flux Projet</p>
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-2 lg:gap-4">
                <button className="hidden sm:flex w-10 h-10 lg:w-12 lg:h-12 items-center justify-center bg-white/5 text-nexus-text-muted rounded-xl lg:rounded-2xl hover:text-nexus-text hover:bg-slate-100 transition-all border border-white/5">
                  <Users size={18} />
                </button>
                <button className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center bg-white/5 text-nexus-text-muted rounded-xl lg:rounded-2xl hover:text-nexus-text hover:bg-slate-100 transition-all border border-white/5">
                  <MoreVertical size={18} />
                </button>
              </div>
            </header>

            {/* Messages Body */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-10 space-y-12 scroll-smooth custom-scrollbar bg-white/5/20"
            >
              <div className="bg-nexus-accent text-white hover:bg-nexus-accent/80/5 backdrop-blur-sm p-4 rounded-2xl border border-blue-600/10 flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-nexus-accent text-white hover:bg-nexus-accent/80 flex items-center justify-center text-white">
                    <Briefcase size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Nexus Smart Canal</p>
                    <p className="text-[9px] font-bold text-nexus-text-muted">Canal chiffré de bout en bout</p>
                  </div>
                </div>
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Latence: 12ms</span>
              </div>

              {Object.entries(groupMessagesByDate(activeTab === 'direct' ? messages : projectMessages)).map(([date, msgs]) => (
                <div key={date} className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[9px] font-black text-nexus-text-muted uppercase tracking-[0.2em]">{date}</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>
                  
                  {msgs.map((msg, i) => {
                    const isMe = msg.senderId === auth.currentUser?.uid || ('senderEmail' in msg && msg.senderEmail === auth.currentUser?.email?.toLowerCase().trim());
                    return (
                      <div key={msg.id} className={cn(
                        "flex flex-col max-w-[80%] gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300",
                        isMe ? "ml-auto items-end" : "mr-auto items-start"
                      )}>
                        {!isMe && (
                          <div className="flex items-center gap-2 mb-1">
                            <div className={cn(
                              "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white",
                              getAvatarColor(msg.senderName)
                            )}>
                              {msg.senderName.charAt(0)}
                            </div>
                            <span className="text-[9px] font-black text-nexus-text uppercase tracking-widest">{msg.senderName}</span>
                          </div>
                        )}
                        <div className={cn(
                          "px-6 py-4 rounded-[1.75rem] text-sm font-medium leading-relaxed shadow-sm",
                          isMe 
                            ? "bg-nexus-accent text-white rounded-tr-none shadow-xl shadow-slate-200" 
                            : "bg-nexus-surface text-nexus-text-muted border border-white/5 rounded-tl-none"
                        )}>
                          {msg.content}
                        </div>
                        <div className="flex items-center gap-2 opacity-40 px-2 mt-1">
                          <Clock size={10} />
                          <span className="text-[9px] font-bold">
                            {msg.timestamp ? parseTimestamp(msg.timestamp)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                          </span>
                          {isMe && <Check size={10} className="text-blue-500" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              
              {isTyping && (
                <div className="flex items-center gap-3 ml-2 opacity-50 animate-pulse">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-nexus-accent text-white hover:bg-nexus-accent/80 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-nexus-accent text-white hover:bg-nexus-accent/80 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-nexus-accent text-white hover:bg-nexus-accent/80 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-[9px] font-black text-nexus-text-muted uppercase tracking-widest">Nexus AI analyse le flux...</span>
                </div>
              )}
              
              {(activeTab === 'direct' ? messages : projectMessages).length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 select-none">
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300">
                    <MessageSquare size={48} />
                  </div>
                  <h3 className="text-xl font-black text-nexus-text-muted tracking-tight uppercase">Nexus Comm</h3>
                  <p className="text-xs font-bold text-nexus-text-muted mt-2">Envoyez le premier message pour débuter la discussion.</p>
                </div>
              )}
            </div>

            {/* Footer / Input */}
            <footer className="p-8 border-t border-white/5 bg-nexus-surface">
              <form onSubmit={handleSendMessage} className="flex gap-4">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={e => {
                    setNewMessage(e.target.value);
                    if (e.target.value.length > 0 && !isTyping) {
                      setIsTyping(true);
                      setTimeout(() => setIsTyping(false), 3000);
                    }
                  }}
                  placeholder="Tapez votre message ici..."
                  className="flex-1 bg-white/5 border border-white/5 rounded-[1.5rem] px-8 py-5 outline-none focus:ring-4 focus:ring-blue-100 focus:bg-nexus-surface focus:border-blue-200 transition-all text-sm font-medium text-nexus-text placeholder:text-slate-300"
                />
                <button 
                  disabled={!newMessage.trim() || loading}
                  className="w-[72px] h-[72px] flex items-center justify-center bg-nexus-accent text-white hover:bg-nexus-accent/80 text-white rounded-[1.5rem] hover:bg-black transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 disabled:grayscale group"
                >
                  <Send className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" size={28} />
                </button>
              </form>
              <div className="mt-4 flex items-center justify-center gap-6">
                 {['Photo', 'Fichier', 'Mouvement', 'Nexus AI'].map(label => (
                   <button key={label} type="button" className="text-[9px] font-black text-nexus-text-muted uppercase tracking-widest hover:text-blue-600 transition-colors">
                     + {label}
                   </button>
                 ))}
              </div>
            </footer>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center">
            <div className="relative mb-12">
              <div className="w-32 h-32 bg-blue-50 rounded-[2.5rem] animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center text-blue-600">
                <MessageSquare size={64} strokeWidth={1} className="animate-bounce" />
              </div>
            </div>
            <h1 className="text-4xl font-black text-nexus-text tracking-tighter leading-tight mb-4">
              Nexus <span className="text-blue-600">Connect</span>
            </h1>
            <p className="text-nexus-text-muted max-w-md mx-auto text-lg font-medium leading-relaxed">
              Sélectionnez un collègue ou un projet dans la barre latérale pour démarrer une communication sécurisée et synchronisée.
            </p>
            
            <div className="grid grid-cols-2 gap-4 mt-12 w-full max-w-lg">
              <div className="bg-white/5 p-6 rounded-3xl border border-white/5 text-left">
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Canaux Directs</p>
                 <p className="text-xs text-nexus-text-muted/80 font-medium leading-relaxed">Chattez en temps réel avec n'importe quel membre de votre organisation.</p>
              </div>
              <div className="bg-white/5 p-6 rounded-3xl border border-white/5 text-left">
                 <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2">Fils de Projets</p>
                 <p className="text-xs text-nexus-text-muted/80 font-medium leading-relaxed">Gardez vos discussions contextuelles et liées à vos objectifs stratégiques.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}} />
    </div>
  );
}
