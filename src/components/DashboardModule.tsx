import React, { useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Package, 
  Briefcase,
  Download,
  Upload
} from 'lucide-react';
import { motion } from 'motion/react';
import Table, { TableRow } from './ui/Table';
import { cn } from '../lib/utils';
import { useCompany } from '../lib/CompanyContext';
import { exportCompanyDataAsJSON, importCompanyDataFromJSON } from '../lib/exportUtils';

export default function DashboardModule() {
  const { currentCompany } = useCompany();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    if (!currentCompany) return;
    setIsExporting(true);
    try {
      await exportCompanyDataAsJSON(currentCompany.id, currentCompany.name);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Erreur lors de l'extraction des données.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentCompany) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Attention : L'import va fusionner et mettre à jour les données actuelles de la plateforme selon le fichier JSON. Souhaitez-vous continuer ?")) {
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonString = event.target?.result as string;
          const jsonData = JSON.parse(jsonString);
          
          await importCompanyDataFromJSON(currentCompany.id, jsonData);
          alert("Données importées avec succès !");
          // Optionally simple page reload to reflect changes
          window.location.reload();
        } catch (error: any) {
          console.error("Import parsing failed:", error);
          alert("Erreur lors de la lecture ou de l'importation locale : " + error.message);
        } finally {
          setIsImporting(false);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error("Import file read failed:", error);
      alert("Erreur lors de la lecture du fichier.");
      setIsImporting(false);
    }
  };

  const stats = [
    { label: 'Ventes du mois', value: '45,200 €', icon: TrendingUp, trend: '+12%', color: 'text-green-600' },
    { label: 'Nouveaux Clients', value: '24', icon: Users, trend: '+5%', color: 'text-blue-600' },
    { label: 'Tâches en retard', value: '8', icon: AlertCircle, trend: '-2', color: 'text-red-500' },
    { label: 'Ruptures Stock', value: '3', icon: Package, trend: 'Critique', color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-12">
      {/* Header and Export */}
      <div className="flex justify-between items-center bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Tableau de bord</h2>
          <p className="text-slate-500 text-sm mt-1">Vue d'ensemble de vos activités et métriques clés.</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            accept=".json" 
            id="import-json" 
            hidden 
            onChange={handleImport}
            disabled={isImporting || isExporting}
          />
          <button 
            onClick={() => document.getElementById('import-json')?.click()}
            disabled={isImporting || isExporting}
            className="bg-white border-2 border-slate-900 text-slate-900 px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm"
          >
            <Upload size={18} />
            {isImporting ? 'Importation en cours...' : 'Importer'}
          </button>
          
          <button 
            onClick={handleExport}
            disabled={isExporting || isImporting}
            className="bg-slate-900 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
          >
            <Download size={18} />
            {isExporting ? 'Extraction en cours...' : 'Extraire (JSON)'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all text-slate-600">
                <stat.icon size={18} />
              </div>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-bold",
                stat.color === 'text-green-600' ? "bg-green-100 text-green-700" :
                stat.color === 'text-blue-600' ? "bg-blue-100 text-blue-700" :
                stat.color === 'text-red-500' ? "bg-red-100 text-red-700" :
                "bg-orange-100 text-orange-700"
              )}>
                {stat.trend}
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{stat.value}</h3>
            
            <div className="absolute -bottom-2 -right-2 opacity-[0.03] scale-150 rotate-12">
              <stat.icon size={64} />
            </div>
          </motion.div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Tasks */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} />
              Tâches Récentes
            </h2>
            <button className="text-[10px] font-bold text-blue-600 hover:underline">VOIR TOUT</button>
          </div>
          
          <Table headers={['Tâche', 'Assigné', 'Priorité', 'Status']}>
            <TableRow>
              <span className="font-semibold text-slate-700">Relance client "Danga"</span>
              <span className="text-slate-500">Jean Dupont</span>
              <span className="text-red-600 font-bold">HAUTE</span>
              <span className="text-slate-400 font-medium">EN COURS</span>
            </TableRow>
            <TableRow>
              <span className="font-semibold text-slate-700">Inventaire Entrepôt A</span>
              <span className="text-slate-500">Marie Curie</span>
              <span className="text-blue-600 font-bold">MOYENNE</span>
              <span className="text-slate-400 font-medium">À FAIRE</span>
            </TableRow>
          </Table>
        </section>

        {/* Project Status */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 size={16} />
              Projets Actifs
            </h2>
            <button className="text-[10px] font-bold text-white bg-slate-900 px-3 py-1.5 rounded-md hover:bg-slate-800">NOUVEAU</button>
          </div>
          
          <div className="space-y-4">
            {[
              { name: 'Migration Cloud', partner: 'Google Cloud', progress: 75, status: 'Active' },
              { name: 'Logistique Export', partner: 'CMA CGM', progress: 40, status: 'Delayed' },
              { name: 'Audit Financier', partner: 'Deloitte', progress: 95, status: 'Finalization' }
            ].map((p, i) => (
              <div key={i} className="bg-white border border-slate-200 p-4 rounded-lg flex items-center gap-4 hover:border-blue-200 transition-all shadow-sm">
                <div className="w-10 h-10 bg-slate-50 rounded flex items-center justify-center shrink-0 border border-slate-100">
                  <Briefcase size={18} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{p.name}</h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{p.status}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${p.progress}%` }}
                      className="h-full bg-blue-600"
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] font-medium text-slate-400 italic">{p.partner}</span>
                    <span className="text-[10px] font-bold text-slate-900">{p.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

