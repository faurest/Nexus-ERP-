const fs = require('fs');
const path = 'src/components/ProjectModule.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove firebase imports
content = content.replace(/import { collection, onSnapshot, query, addDoc, serverTimestamp, where, doc, updateDoc, deleteDoc } from '\.\.\/lib\/firebase';/, "import { useDependencies } from '../core/di/DependencyProvider';");
content = content.replace(/import { db } from '\.\.\/lib\/firebase';/, "");
content = content.replace(/import { handleFirestoreError, OperationType } from '\.\.\/lib\/firebase';/, "");

// 2. Insert useDependencies inside ProjectModule
content = content.replace("export default function ProjectModule() {", "export default function ProjectModule() {\n  const { facades } = useDependencies();\n  const { project: projectFacade, partner: partnerFacade, finance: financeFacade, invoice: invoiceFacade } = facades;");

// 3. Replace useEffect
const oldUseEffect = `  useEffect(() => {
    if (!currentCompany) return;

    const queryWithCompany = (collectionName: string) => 
      query(collection(db, collectionName), where('companyId', '==', currentCompany.id));

    const unsubProjects = onSnapshot(query(collection(db, 'projects'), where('companyId', '==', currentCompany.id)), (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'projects'));

    const unsubPartners = onSnapshot(query(collection(db, 'partners'), where('companyId', '==', currentCompany.id)), (snap) => {
      setPartners(snap.docs.map(d => ({ id: d.id, ...d.data() } as Partner)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'partners'));

    const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), where('companyId', '==', currentCompany.id)), (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'expenses'));

    const unsubInvoices = onSnapshot(query(collection(db, 'invoices'), where('companyId', '==', currentCompany.id)), (snap) => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'invoices'));

    const unsubPayments = onSnapshot(query(collection(db, 'payments'), where('companyId', '==', currentCompany.id)), (snap) => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'payments'));

    return () => { 
      unsubProjects(); 
      unsubPartners(); 
      unsubExpenses();
      unsubInvoices();
      unsubPayments();
    };
  }, [currentCompany]);`;

const newUseEffect = `  useEffect(() => {
    if (!currentCompany) return;

    const unsubProjects = projectFacade.observeProjects(currentCompany.id, setProjects);
    const unsubPartners = partnerFacade.observePartners(currentCompany.id, setPartners);
    const unsubExpenses = financeFacade.observeExpenses(currentCompany.id, setExpenses);
    const unsubInvoices = invoiceFacade.observeInvoices(currentCompany.id, setInvoices);
    const unsubPayments = financeFacade.observePayments(currentCompany.id, setPayments);

    return () => { 
      if (unsubProjects) unsubProjects(); 
      if (unsubPartners) unsubPartners(); 
      if (unsubExpenses) unsubExpenses();
      if (unsubInvoices) unsubInvoices();
      if (unsubPayments) unsubPayments();
    };
  }, [currentCompany, projectFacade, partnerFacade, financeFacade, invoiceFacade]);`;

content = content.replace(oldUseEffect, newUseEffect);

// 4. Replace handleAddFinancial
const oldAddFinancial = `  const handleAddFinancial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddingFinancial || !currentCompany || submitting) return;

    setSubmitting(true);
    try {
      const collectionName = isAddingFinancial === 'expense' ? 'expenses' : 
                            isAddingFinancial === 'invoice' ? 'invoices' : 'payments';
      
      await addDoc(collection(db, collectionName), {
        ...formData,
        amount: Number(formData.amount),
        companyId: currentCompany.id,
        createdAt: serverTimestamp(),
      });

      setIsAddingFinancial(null);
      setFormData({});
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, isAddingFinancial);
    } finally {
      setSubmitting(false);
    }
  };`;

const newAddFinancial = `  const handleAddFinancial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddingFinancial || !currentCompany || submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        createdAt: new Date().toISOString()
      };
      
      if (isAddingFinancial === 'expense') {
        await financeFacade.createExpense(currentCompany.id, payload);
      } else if (isAddingFinancial === 'invoice') {
        await invoiceFacade.createInvoice({ ...payload, companyId: currentCompany.id });
      } else if (isAddingFinancial === 'payment') {
        await financeFacade.createPayment(currentCompany.id, payload);
      }

      setIsAddingFinancial(null);
      setFormData({});
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de l'ajout.");
    } finally {
      setSubmitting(false);
    }
  };`;

content = content.replace(oldAddFinancial, newAddFinancial);

// 5. Replace handleAddProject
const oldAddProject = `  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || submitting) return;

    setSubmitting(true);
    try {
      const recipients = [...(currentCompany.employees || [])];
      if (!recipients.includes(currentCompany.ownerId)) recipients.push(currentCompany.ownerId);

      if (editingProject) {
        await updateDoc(doc(db, 'projects', editingProject.id), {
          ...formData,
          budget: Number(formData.budget || 0),
          updatedAt: serverTimestamp(),
        });
        if (editingProject.status !== formData.status) {
          // If the status is completed or on_hold, we consider it an alert (critical)
          const isAlert = ['completed', 'on_hold', 'active'].includes(formData.status);
          await createNotification(
            currentCompany.id,
            recipients,
            'Mise à jour du Projet',
            \`Le statut du projet "\${formData.name}" est passé à "\${formData.status}".\`,
            isAlert ? 'alert' : 'project'
          );
        }
      } else {
        await addDoc(collection(db, 'projects'), {
          ...formData,
          budget: Number(formData.budget || 0),
          companyId: currentCompany.id,
          createdAt: serverTimestamp(),
          status: 'planned'
        });
        await createNotification(
          currentCompany.id,
          recipients,
          'Nouveau Projet',
          \`Le projet "\${formData.name}" a été créé.\`,
          'project'
        );
      }
      setIsAddingProject(false);
      setEditingProject(null);
      setFormData({});
    } catch(err) {
      handleFirestoreError(err, editingProject ? OperationType.UPDATE : OperationType.WRITE, 'projects');
    } finally {
      setSubmitting(false);
    }
  };`;

const newAddProject = `  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || submitting) return;

    setSubmitting(true);
    try {
      const recipients = [...(currentCompany.employees || [])];
      if (!recipients.includes(currentCompany.ownerId)) recipients.push(currentCompany.ownerId);

      const projectData = {
        ...formData,
        budget: Number(formData.budget || 0)
      };

      if (editingProject) {
        await projectFacade.updateProject(currentCompany.id, editingProject.id, projectData);
        if (editingProject.status !== formData.status) {
          const isAlert = ['completed', 'on_hold', 'active'].includes(formData.status);
          await createNotification(
            currentCompany.id,
            recipients,
            'Mise à jour du Projet',
            \`Le statut du projet "\${formData.name}" est passé à "\${formData.status}".\`,
            isAlert ? 'alert' : 'project'
          );
        }
      } else {
        await projectFacade.createProject(currentCompany.id, { ...projectData, status: 'planned' });
        await createNotification(
          currentCompany.id,
          recipients,
          'Nouveau Projet',
          \`Le projet "\${formData.name}" a été créé.\`,
          'project'
        );
      }
      setIsAddingProject(false);
      setEditingProject(null);
      setFormData({});
    } catch(err) {
      console.error(err);
      alert("Une erreur est survenue lors de l'enregistrement du projet.");
    } finally {
      setSubmitting(false);
    }
  };`;

content = content.replace(oldAddProject, newAddProject);

// 6. Replace handleDeleteProject
const oldDeleteProject = `  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) return;
    try {
      await deleteDoc(doc(db, 'projects', projectId));
    } catch(err) {
      handleFirestoreError(err, OperationType.DELETE, 'projects');
    }
  };`;

const newDeleteProject = `  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) return;
    try {
      await projectFacade.deleteProject(currentCompany.id, projectId);
    } catch(err) {
      console.error(err);
      alert("Une erreur est survenue lors de la suppression du projet.");
    }
  };`;

content = content.replace(oldDeleteProject, newDeleteProject);

// Save back
fs.writeFileSync(path, content, 'utf8');
