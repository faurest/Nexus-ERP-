const fs = require('fs');
const path = 'src/components/SalesModule.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Imports
content = content.replace(/import { collection, onSnapshot, query, where, addDoc, setDoc, serverTimestamp, doc, updateDoc, deleteDoc, auth } from '\.\.\/lib\/firebase';/, "import { useDependencies } from '../core/di/DependencyProvider';");
content = content.replace(/import { db } from '\.\.\/lib\/firebase';/, "");
content = content.replace(/import { handleFirestoreError, OperationType } from '\.\.\/lib\/firebase';/, "");

// 2. Add useDependencies
content = content.replace("export default function SalesModule() {", "export default function SalesModule() {\n  const { facades } = useDependencies();\n  const { sale: saleFacade, resource: resourceFacade, service: serviceFacade, openOrder: openOrderFacade, customer: customerFacade, invoice: invoiceFacade, finance: financeFacade } = facades;");

// 3. useEffect
const oldUseEffect = `  useEffect(() => {
    if (!currentCompany) return;

    const unsubSales = onSnapshot(query(collection(db, 'sales'), where('companyId', '==', currentCompany.id)), snap => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'sales'));

    const unsubInvoices = onSnapshot(query(collection(db, 'sales_invoices'), where('companyId', '==', currentCompany.id)), snap => {
      setInvoices(snap.docs.map(d => {
        const data = d.data();
        let items = data.items || [];
        if (typeof items === 'string') {
          try { items = JSON.parse(items) } catch(e) { items = [] }
        }
        return { id: d.id, ...data, items } as Invoice;
      }));
    }, err => handleFirestoreError(err, OperationType.LIST, 'sales_invoices'));

    const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), where('companyId', '==', currentCompany.id)), snap => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'expenses'));

    const unsubResources = onSnapshot(query(collection(db, 'resources'), where('companyId', '==', currentCompany.id)), snap => {
      setResources(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'resources'));

    const unsubClients = onSnapshot(query(collection(db, 'clients'), where('companyId', '==', currentCompany.id)), snap => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'clients'));

    const unsubPayments = onSnapshot(query(collection(db, 'payments'), where('companyId', '==', currentCompany.id)), snap => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'payments'));

    const unsubServices = onSnapshot(query(collection(db, 'services'), where('companyId', '==', currentCompany.id)), snap => {
      setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'services'));

    const unsubOpenOrders = onSnapshot(query(collection(db, 'open_orders'), where('companyId', '==', currentCompany.id)), snap => {
      // Need to ensure items is parsed correctly if it's coming from standard firebase mock or sqlite
      setOpenOrders(snap.docs.map(d => {
        const data = d.data();
        let items = data.items || [];
        if (typeof items === 'string') {
          try { items = JSON.parse(items) } catch(e) { items = [] }
        }
        return { id: d.id, ...data, items };
      }));
    }, err => handleFirestoreError(err, OperationType.LIST, 'open_orders'));

    return () => {
      unsubSales();
      unsubInvoices();
      unsubExpenses();
      unsubResources();
      unsubClients();
      unsubPayments();
      unsubServices();
      unsubOpenOrders();
    };
  }, [currentCompany]);`;

const newUseEffect = `  useEffect(() => {
    if (!currentCompany) return;

    const unsubSales = saleFacade.observeSales(currentCompany.id, setSales);
    const unsubInvoices = invoiceFacade.observeInvoices(currentCompany.id, snap => {
      setInvoices(snap.map(d => {
        let items = d.items || [];
        if (typeof items === 'string') {
          try { items = JSON.parse(items) } catch(e) { items = [] }
        }
        return { ...d, items } as Invoice;
      }));
    });
    const unsubExpenses = financeFacade.observeExpenses(currentCompany.id, setExpenses);
    const unsubResources = resourceFacade.observeResources(currentCompany.id, setResources);
    const unsubClients = customerFacade.observeCustomers(currentCompany.id, setClients);
    const unsubPayments = financeFacade.observePayments(currentCompany.id, setPayments);
    const unsubServices = serviceFacade.observeServices(currentCompany.id, setServices);
    const unsubOpenOrders = openOrderFacade.observeOpenOrders(currentCompany.id, snap => {
      setOpenOrders(snap.map(d => {
        let items = d.items || [];
        if (typeof items === 'string') {
          try { items = JSON.parse(items) } catch(e) { items = [] }
        }
        return { ...d, items };
      }));
    });

    return () => {
      if (unsubSales) unsubSales();
      if (unsubInvoices) unsubInvoices();
      if (unsubExpenses) unsubExpenses();
      if (unsubResources) unsubResources();
      if (unsubClients) unsubClients();
      if (unsubPayments) unsubPayments();
      if (unsubServices) unsubServices();
      if (unsubOpenOrders) unsubOpenOrders();
    };
  }, [currentCompany, saleFacade, invoiceFacade, financeFacade, resourceFacade, customerFacade, serviceFacade, openOrderFacade]);`;

content = content.replace(oldUseEffect, newUseEffect);

// Wait, I need to see exactly what handleCreatePayment etc look like
fs.writeFileSync('temp_patch.js', content);
