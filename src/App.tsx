import React, { useState } from 'react';
import { Shield, Home, Settings, FileText, Activity, AlertCircle, Users, Briefcase, MessageSquare, Store, UserCheck, Menu, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';

// Modules métiers

const AccountingModule = () => (
  <div className="p-6 bg-neutral-800 rounded-lg border border-neutral-700 shadow-xl mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
      <FileText className="w-6 h-6 text-blue-400" />
      Comptabilité
    </h2>
    <p className="text-neutral-400 mb-6">Interface opérationnelle. Connexion aux serveurs établie.</p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-neutral-900 border border-neutral-800 p-4 rounded text-center">
        <h3 className="text-neutral-500 text-sm font-medium">Chiffre d'Affaires</h3>
        <p className="text-3xl font-bold text-emerald-400 mt-2 flex items-center justify-center gap-2">
          1.2M €
          <ArrowUpRight className="w-5 h-5 text-emerald-500" />
        </p>
      </div>
      <div className="bg-neutral-900 border border-neutral-800 p-4 rounded text-center">
        <h3 className="text-neutral-500 text-sm font-medium">Dépenses</h3>
        <p className="text-3xl font-bold text-rose-400 mt-2 flex items-center justify-center gap-2">
          420k €
          <ArrowDownRight className="w-5 h-5 text-rose-500" />
        </p>
      </div>
      <div className="bg-neutral-900 border border-neutral-800 p-4 rounded text-center">
        <h3 className="text-neutral-500 text-sm font-medium">Bénéfice</h3>
        <p className="text-3xl font-bold text-blue-400 mt-2">780k €</p>
      </div>
    </div>
  </div>
);

const MarketplaceModule = () => (
  <div className="p-6 bg-neutral-800 rounded-lg border border-neutral-700 shadow-xl mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
      <Store className="w-6 h-6 text-purple-400" />
      Marketplace
    </h2>
    <p className="text-neutral-400 mb-6">Applications et extensions disponibles pour votre ERP.</p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-neutral-900 border border-neutral-800 p-4 rounded flex justify-between items-center group">
        <div>
          <h3 className="text-neutral-200 font-medium tracking-tight">Intégration Stripe</h3>
          <p className="text-neutral-500 text-sm">Paiements en ligne synchronisés</p>
        </div>
        <button className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs rounded border border-purple-500/30 transition-colors">Installer</button>
      </div>
      <div className="bg-neutral-900 border border-neutral-800 p-4 rounded flex justify-between items-center group">
        <div>
          <h3 className="text-neutral-200 font-medium tracking-tight">Connecteur Slack</h3>
          <p className="text-neutral-500 text-sm">Notifications d'évènements</p>
        </div>
        <button className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs rounded border border-purple-500/30 transition-colors">Installer</button>
      </div>
    </div>
  </div>
);

import { ClientModule } from './modules/crm';

const HrModule = () => (
  <div className="p-6 bg-neutral-800 rounded-lg border border-neutral-700 shadow-xl mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
      <UserCheck className="w-6 h-6 text-rose-400" />
      Ressources Humaines (RH)
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-lg border-l-4 border-l-blue-500">
        <h3 className="text-neutral-500 text-sm font-medium">Employés actifs</h3>
        <p className="text-3xl font-bold text-neutral-200 mt-2">142</p>
      </div>
      <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-lg border-l-4 border-l-amber-500">
        <h3 className="text-neutral-500 text-sm font-medium">En congés</h3>
        <p className="text-3xl font-bold text-amber-400 mt-2">12</p>
      </div>
      <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-lg border-l-4 border-l-emerald-500">
        <h3 className="text-neutral-500 text-sm font-medium">Nouveaux ce mois</h3>
        <p className="text-3xl font-bold text-emerald-400 mt-2">+4</p>
      </div>
      <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-lg border-l-4 border-l-purple-500">
        <h3 className="text-neutral-500 text-sm font-medium">Entretiens prévus</h3>
        <p className="text-3xl font-bold text-purple-400 mt-2">8</p>
      </div>
    </div>
  </div>
);

const ProjectModule = () => (
  <div className="p-6 bg-neutral-800 rounded-lg border border-neutral-700 shadow-xl mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
      <Briefcase className="w-6 h-6 text-orange-400" />
      Gestion de Projets
    </h2>
    <div className="space-y-4">
      <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-lg">
        <div className="flex justify-between mb-3">
          <div>
            <span className="text-neutral-200 font-medium text-lg">Refonte plateforme web</span>
            <p className="text-sm text-neutral-500 mt-1">Lancement prévu : 15 Juin</p>
          </div>
          <span className="text-orange-400 font-bold text-lg">75%</span>
        </div>
        <div className="w-full bg-neutral-800 rounded-full h-2.5 overflow-hidden">
          <div className="bg-orange-500 h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: '75%' }}></div>
        </div>
      </div>
      <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-lg">
        <div className="flex justify-between mb-3">
          <div>
            <span className="text-neutral-200 font-medium text-lg">Migration Cloud</span>
            <p className="text-sm text-neutral-500 mt-1">Phase d'audit d'infrastructure</p>
          </div>
          <span className="text-orange-400 font-bold text-lg">30%</span>
        </div>
        <div className="w-full bg-neutral-800 rounded-full h-2.5 overflow-hidden">
          <div className="bg-orange-500 h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: '30%' }}></div>
        </div>
      </div>
    </div>
  </div>
);

const CollaborationModule = () => (
  <div className="p-6 bg-neutral-800 rounded-lg border border-neutral-700 shadow-xl mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
      <MessageSquare className="w-6 h-6 text-pink-400" />
      Collaboration
    </h2>
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
      <div className="flex gap-4 items-start mb-6">
        <div className="w-10 h-10 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold shrink-0">AL</div>
        <div className="bg-neutral-800 border border-neutral-700 p-3 rounded-lg rounded-tl-none flex-1">
          <p className="text-sm text-neutral-200"><span className="font-semibold text-pink-300">Alice L.</span> a partagé le document :</p>
          <div className="mt-2 text-sm bg-neutral-900 p-2 rounded border border-neutral-700 text-blue-400 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Specs_V2.pdf
          </div>
          <p className="text-xs text-neutral-500 mt-2">Il y a 10 min</p>
        </div>
      </div>
      <div className="flex gap-4 items-start">
        <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">BM</div>
        <div className="bg-neutral-800 border border-neutral-700 p-3 rounded-lg rounded-tl-none flex-1">
          <p className="text-sm text-neutral-200"><span className="font-semibold text-blue-300">Bob M.</span> a laissé un commentaire sur le projet <b>Migration Cloud</b> :</p>
          <p className="text-sm text-neutral-400 mt-1 italic">"Les serveurs de test sont provisionnés. On peut démarrer la phase 2."</p>
          <p className="text-xs text-neutral-500 mt-2">Il y a 1 heure</p>
        </div>
      </div>
    </div>
  </div>
);

const Dashboard = () => (
  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Bonjour, Administrateur</h1>
      <p className="text-neutral-400">Voici l'état de votre entreprise aujourd'hui.</p>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <div className="bg-neutral-800 border border-neutral-700 p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <div className="bg-blue-500/20 p-3 rounded-lg">
            <Activity className="w-6 h-6 text-blue-400" />
          </div>
          <span className="text-xs font-medium px-2 py-1 bg-neutral-900 text-neutral-300 rounded border border-neutral-700">Aujourd'hui</span>
        </div>
        <h3 className="text-neutral-400 text-sm font-medium mb-1">Nouveaux prospects</h3>
        <p className="text-3xl font-bold text-white">+14</p>
      </div>

      <div className="bg-neutral-800 border border-neutral-700 p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <div className="bg-emerald-500/20 p-3 rounded-lg">
            <FileText className="w-6 h-6 text-emerald-400" />
          </div>
          <span className="text-xs font-medium px-2 py-1 bg-neutral-900 text-neutral-300 rounded border border-neutral-700">Ce mois</span>
        </div>
        <h3 className="text-neutral-400 text-sm font-medium mb-1">Factures payées</h3>
        <p className="text-3xl font-bold text-white">45k €</p>
      </div>

      <div className="bg-neutral-800 border border-neutral-700 p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <div className="bg-orange-500/20 p-3 rounded-lg">
            <Briefcase className="w-6 h-6 text-orange-400" />
          </div>
          <span className="text-xs font-medium px-2 py-1 bg-neutral-900 text-neutral-300 rounded border border-neutral-700">En cours</span>
        </div>
        <h3 className="text-neutral-400 text-sm font-medium mb-1">Projets actifs</h3>
        <p className="text-3xl font-bold text-white">12</p>
      </div>
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-neutral-800 border border-neutral-700 p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold mb-4 border-b border-neutral-700 pb-2">Activité Récente</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <p className="text-sm text-neutral-300">Paiement reçu de <span className="font-semibold">Acme Corp</span> (1,200 €)</p>
            <span className="text-xs text-neutral-500 ml-auto">10:42</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <p className="text-sm text-neutral-300">Nouveau contrat signé avec <span className="font-semibold">Global Tech</span></p>
            <span className="text-xs text-neutral-500 ml-auto">Hier</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
            <p className="text-sm text-neutral-300">Serveur de paie mis à jour</p>
            <span className="text-xs text-neutral-500 ml-auto">Lun</span>
          </div>
        </div>
      </div>
      
      <div className="bg-neutral-800 border border-neutral-700 p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold mb-4 border-b border-neutral-700 pb-2">Actions Rapides</h3>
        <div className="grid grid-cols-2 gap-3">
          <button className="flex flex-col items-center justify-center gap-2 p-4 bg-neutral-900 border border-neutral-800 rounded-lg hover:border-blue-500/50 hover:bg-neutral-800 transition-colors group">
            <Users className="w-6 h-6 text-neutral-400 group-hover:text-blue-400 transition-colors" />
            <span className="text-sm font-medium text-neutral-300">Nouveau Client</span>
          </button>
          <button className="flex flex-col items-center justify-center gap-2 p-4 bg-neutral-900 border border-neutral-800 rounded-lg hover:border-blue-500/50 hover:bg-neutral-800 transition-colors group">
            <FileText className="w-6 h-6 text-neutral-400 group-hover:text-emerald-400 transition-colors" />
            <span className="text-sm font-medium text-neutral-300">Créer Facture</span>
          </button>
          <button className="flex flex-col items-center justify-center gap-2 p-4 bg-neutral-900 border border-neutral-800 rounded-lg hover:border-blue-500/50 hover:bg-neutral-800 transition-colors group">
            <UserCheck className="w-6 h-6 text-neutral-400 group-hover:text-rose-400 transition-colors" />
            <span className="text-sm font-medium text-neutral-300">Poser Congé</span>
          </button>
          <button className="flex flex-col items-center justify-center gap-2 p-4 bg-neutral-900 border border-neutral-800 rounded-lg hover:border-blue-500/50 hover:bg-neutral-800 transition-colors group">
            <Store className="w-6 h-6 text-neutral-400 group-hover:text-purple-400 transition-colors" />
            <span className="text-sm font-medium text-neutral-300">Extensions</span>
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Simulation d'un utilisateur invité (user === null) pour vérifier le correctif de plantage
  const [user, setUser] = useState<{ email?: string } | null>(null);

  // CORRECTIF APPLIQUÉ SUR LA CHAINE DE CARACTÈRES
  // Utilisation sécurisée de l'opérateur optionnel ? tout au long de la chaîne
  const cleanEmail = user?.email?.trim()?.toLowerCase()?.replace(/\s+/g, '');
  const isMaster = cleanEmail === 'admin@nexus.erp';

  const NavButton = ({ id, icon: Icon, label, colorClass }: { id: string, icon: any, label: string, colorClass: string }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setIsSidebarOpen(false); // Close sidebar on mobile after clicking
      }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
        activeTab === id 
          ? `bg-${colorClass}-600/10 text-${colorClass}-400 border border-${colorClass}-500/20 font-medium` 
          : 'text-neutral-400 hover:bg-neutral-900 border border-transparent'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  return (
    <div className="flex h-screen bg-neutral-950 text-white font-sans overflow-hidden selection:bg-blue-500/30">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-72 bg-neutral-950 border-r border-neutral-800 flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6 flex justify-between items-center bg-neutral-950 z-10 sticky top-0 border-b border-neutral-900">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Activity className="text-blue-500 w-7 h-7" />
              NEXUS ERP
            </h1>
            <div className="mt-2 text-xs font-mono text-neutral-400 bg-neutral-900 px-2 py-1 rounded inline-block border border-neutral-800">
              {isMaster ? 'Root Admin' : 'Mode Invité'}
            </div>
          </div>
          <button 
            className="md:hidden text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-neutral-900 transition-colors"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 space-y-1 mt-2 pb-4 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
          <NavButton id="dashboard" icon={Home} label="Vue d'ensemble" colorClass="blue" />
          
          <div className="pt-6 pb-2 px-4 text-xs font-bold text-neutral-600 uppercase tracking-widest">
            Opérations
          </div>
          
          <NavButton id="clients" icon={Users} label="Gestion Client (CRM)" colorClass="cyan" />
          <NavButton id="projects" icon={Briefcase} label="Gestion de Projets" colorClass="orange" />
          <NavButton id="hr" icon={UserCheck} label="Ressources Humaines" colorClass="rose" />
          <NavButton id="accounting" icon={FileText} label="Comptabilité" colorClass="emerald" />
          <NavButton id="collaboration" icon={MessageSquare} label="Collaboration" colorClass="pink" />

          <div className="pt-6 pb-2 px-4 text-xs font-bold text-neutral-600 uppercase tracking-widest">
            Système
          </div>

          <NavButton id="marketplace" icon={Store} label="Marketplace" colorClass="purple" />
          <NavButton id="settings" icon={Settings} label="Paramètres" colorClass="neutral" />
        </nav>
        
        <div className="p-4 border-t border-neutral-900 bg-neutral-950/50">
          <div className="flex items-start gap-3 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg">
            <Shield className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-emerald-400">Système Stable</p>
              <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed">Rendu React opérationnel. Aucun crash détecté. All systems nominal.</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0c0c0c] relative">
        <header className="sticky top-0 z-10 p-4 md:p-6 bg-[#0c0c0c]/80 border-b border-neutral-800/80 flex justify-between items-center backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 -ml-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-semibold text-neutral-100 capitalize tracking-tight hidden sm:block">
              {activeTab === 'dashboard' ? 'Tableau de bord' : 
               activeTab === 'clients' ? 'Gestion Client (CRM)' :
               activeTab === 'hr' ? 'Ressources Humaines' :
               activeTab === 'projects' ? 'Projets' :
               activeTab === 'accounting' ? 'Comptabilité' :
               activeTab}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <div className="text-sm px-4 py-2 bg-neutral-800/80 rounded-full text-neutral-300 border border-neutral-700 shadow-sm font-medium">
                {user.email}
              </div>
            ) : (
              <div className="text-xs flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full font-medium shadow-sm">
                <AlertCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Non authentifié</span>
                <span className="sm:hidden">Invité</span>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto w-full">
          <div className="p-4 md:p-8 max-w-7xl mx-auto pb-32">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'clients' && <ClientModule />}
            {activeTab === 'hr' && <HrModule />}
            {activeTab === 'projects' && <ProjectModule />}
            {activeTab === 'collaboration' && <CollaborationModule />}
            {activeTab === 'accounting' && <AccountingModule />}
            {activeTab === 'marketplace' && <MarketplaceModule />}
            {activeTab === 'settings' && (
              <div className="text-neutral-400 text-sm p-6 bg-neutral-800 rounded-lg border border-neutral-700 shadow-xl flex items-center justify-center min-h-[300px]">
                <div className="text-center">
                  <Settings className="w-12 h-12 text-neutral-600 mx-auto mb-4 animate-spin-slow" />
                  <p className="text-lg font-medium text-neutral-300">Panneau de configuration</p>
                  <p className="mt-2 text-neutral-500">Ce module est actuellement en cours de construction.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
