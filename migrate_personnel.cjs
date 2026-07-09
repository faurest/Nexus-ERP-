const fs = require('fs');
const path = require('path');

const modulePath = path.join(__dirname, 'src/components/PersonnelModule.tsx');
let content = fs.readFileSync(modulePath, 'utf8');

// 1. Remove Firebase and Supabase imports
content = content.replace(/import\s*\{[^}]*\}\s*from\s*'\.\.\/lib\/firebase';\n?/g, '');
content = content.replace(/import\s*\{\s*supabase\s*\}\s*from\s*'\.\.\/lib\/supabase';\n?/g, '');

// 2. Add useDI
if (!content.includes('import { useDI }')) {
  content = content.replace(
    "import Table, { TableRow } from './ui/Table';",
    "import Table, { TableRow } from './ui/Table';\nimport { useDI } from '../core/di/DependencyProvider';"
  );
}

// Extract Facades inside the component
const facadeExt = `  const {
    staff: staffFacade,
    task: taskFacade,
    leaveRequest: leaveRequestFacade,
    timeEntry: timeEntryFacade,
    salaryAdvance: salaryAdvanceFacade,
    project: projectFacade,
    notification: notificationFacade,
    user: userFacade,
    company: companyFacade,
    session: sessionFacade
  } = useDI().facades;`;

if (!content.includes('staffFacade')) {
  content = content.replace(
    "const PersonnelModule = () => {",
    "const PersonnelModule = () => {\n" + facadeExt
  );
}

// 3. Migrate useEffect fetching
const newUseEffect = `    const fetchCompanyData = () => {
      if (!currentCompany) return;
      try {
        setLoading(true);

        const unsubPersonnel = staffFacade.observeStaff(currentCompany.id, (data) => {
          setStaffList(data.map(p => ({ ...p, tasksAssignedCount: p.tasks_assigned_count || p.tasksAssignedCount || 0 } as Staff)));
        });
        const unsubTasks = taskFacade.observe(currentCompany.id, (data) => {
          setTasks(data.map(t => ({ ...t, assignedTo: t.assigned_to || t.assignedTo, startDate: t.start_date || t.startDate, endDate: t.end_date || t.endDate } as Task)));
        });
        const unsubLeave = leaveRequestFacade.observe(currentCompany.id, (data) => {
          setLeaveRequests(data.map(l => ({ ...l, staffId: l.staff_id || l.staffId, startDate: l.start_date || l.startDate, endDate: l.end_date || l.endDate } as LeaveRequest)));
        });
        const unsubTime = timeEntryFacade.observe(currentCompany.id, (data) => {
          setTimeEntries(data.map(t => ({ ...t, staffId: t.staff_id || t.staffId, projectId: t.project_id || t.projectId } as TimeEntry)));
        });
        const unsubAdvances = salaryAdvanceFacade.observe(currentCompany.id, (data) => {
          setAdvances(data.map(a => ({ ...a, staffId: a.staff_id || a.staffId, requestDate: a.request_date || a.requestDate } as SalaryAdvance)));
        });
        const unsubProjects = projectFacade.observeProjects(currentCompany.id, (data) => {
          setProjectsList(data.map(p => ({ ...p, clientId: p.client_id || p.clientId, companyId: p.company_id || p.companyId } as Project)));
        });

        setLoading(false);

        return () => {
          unsubPersonnel();
          unsubTasks();
          unsubLeave();
          unsubTime();
          unsubAdvances();
          unsubProjects();
        };
      } catch (error) {
        console.error('Error setting up observers:', error);
        setLoading(false);
      }
    };

    const cleanup = fetchCompanyData();
    return () => {
      if (cleanup) cleanup();
    };`;

content = content.replace(/const fetchCompanyData = async \(\) => \{[\s\S]*?return \(\) => \{[\s\S]*?supa.*?\n\s*\};\n\s*\};/m, newUseEffect);

// 4. Migrate generating Join code
content = content.replace(
  /await updateDoc\(doc\(db, 'companies', currentCompany\.id\), \{\s*joinCode: generatedJoinCode,\s*updatedAt: serverTimestamp\(\)\s*\}\);/g,
  `await companyFacade.updateCompany(currentCompany.id, { joinCode: generatedJoinCode });`
);
content = content.replace(/handleFirestoreError\(err, OperationType\.UPDATE, 'companies'\);/g, "console.error(err);");

// 5. Migrate update roles
content = content.replace(
  /await updateDoc\(doc\(db, 'companies', currentCompany\.id\), \{\s*roles: editingRoles,\s*updatedAt: serverTimestamp\(\)\s*\}\);/g,
  `await companyFacade.updateCompany(currentCompany.id, { roles: editingRoles });`
);

// 6. Migrate adding task
content = content.replace(
  /const taskDoc = await addDoc\(collection\(db, 'tasks'\), \{\s*([^}]+)\s*createdAt: serverTimestamp\(\)\s*\}\);/g,
  `const taskDocId = await taskFacade.create({ $1 });`
);
// Replace taskDoc.id with taskDocId
content = content.replace(/taskDoc\.id/g, "taskDocId");

content = content.replace(
  /const qUser = query\(collection\(db, 'users'\), where\('email', '==', assignedStaff\.email\.toLowerCase\(\)\)\);\s*const userSnap = await getDocs\(qUser\);\s*if \(!userSnap\.empty\) \{\s*const recipientUid = userSnap\.docs\[0\]\.id;/g,
  `const user = await userFacade.getUserByEmail(assignedStaff.email);
        if (user) {
          const recipientUid = user.id;`
);

// 7. Migrate editing staff
content = content.replace(
  /await updateDoc\(doc\(db, 'companies', currentCompany\.id\), \{\s*memberEmails: arrayUnion\(cleanEmail\),\s*updatedAt: serverTimestamp\(\)\s*\}\);/g,
  `await companyFacade.addMemberEmail(currentCompany.id, cleanEmail);`
);

content = content.replace(
  /await updateDoc\(doc\(db, 'personnel', editingStaff\.id\), \{\s*([^}]+)\s*updatedAt: serverTimestamp\(\)\s*\}\);/g,
  `await staffFacade.updateStaff(editingStaff.id, { $1 });`
);
content = content.replace(/handleFirestoreError\(err, OperationType\.UPDATE, 'personnel'\);/g, "console.error(err);");

// 8. Migrate Add new staff
content = content.replace(
  /await registerUserWithoutLogin\(cleanEmail, newStaff\.accessKey\);/g,
  `await sessionFacade.registerWithoutLogin(cleanEmail, newStaff.accessKey);`
);

content = content.replace(
  /await setDoc\(doc\(db, 'personnel', `\$\{currentCompany\.id\}_\$\{cleanEmail\}`\), \{\s*([^}]+)\s*createdAt: serverTimestamp\(\)\s*\}\);/g,
  `await staffFacade.createStaff({ $1, id: \`\${currentCompany.id}_\${cleanEmail}\` });`
);
// Note: Create staff usually generates ID or we can pass it if the Facade supports it. If createStaff doesn't take ID in data, wait.
// Actually CreateStaffUseCase execute(staff: any).

content = content.replace(
  /const ghostUserRef = doc\(db, 'users', cleanEmail\);\s*await setDoc\(ghostUserRef, \{\s*([^}]+)\s*invitationDate: serverTimestamp\(\),\s*([^}]+)\s*\}, \{ merge: true \}\);/g,
  `await userFacade.createUser(cleanEmail, { $1 $2 });`
);

content = content.replace(
  /await setDoc\(doc\(db, 'companies', currentCompany\.id\), \{\s*memberEmails: arrayUnion\(cleanEmail\)\s*\}, \{ merge: true \}\);/g,
  `await companyFacade.addMemberEmail(currentCompany.id, cleanEmail);`
);

content = content.replace(
  /handleFirestoreError\(err, OperationType\.WRITE, 'personnel'\);/g,
  "console.error(err);"
);

// 9. Migrate Delete staff
content = content.replace(
  /await deleteDoc\(doc\(db, 'personnel', staffId\)\);/g,
  `await staffFacade.deleteStaff(staffId);`
);
content = content.replace(
  /await updateDoc\(doc\(db, 'personnel', staffId\), \{\s*status: 'inactive',\s*updatedAt: serverTimestamp\(\)\s*\}\);/g,
  `await staffFacade.updateStaff(staffId, { status: 'inactive' });`
);
content = content.replace(
  /handleFirestoreError\(err, OperationType\.DELETE, 'personnel'\);/g,
  "console.error(err);"
);

// 10. Migrate Leave Requests
content = content.replace(
  /await addDoc\(collection\(db, 'leave_requests'\), \{\s*([^}]+)\s*createdAt: serverTimestamp\(\)\s*\}\);/g,
  `await leaveRequestFacade.create({ $1 });`
);
content = content.replace(
  /handleFirestoreError\(err, OperationType\.WRITE, 'leave_requests'\);/g,
  "console.error(err);"
);

content = content.replace(
  /await updateDoc\(doc\(db, 'leave_requests', requestId\), \{\s*status, updatedAt: serverTimestamp\(\)\s*\}\);/g,
  `await leaveRequestFacade.update(requestId, { status });`
);
content = content.replace(
  /handleFirestoreError\(err, OperationType\.UPDATE, 'leave_requests'\);/g,
  "console.error(err);"
);

content = content.replace(
  /onClick=\{\(\) => deleteDoc\(doc\(db, 'leave_requests', req\.id\)\)\}/g,
  `onClick={() => leaveRequestFacade.delete(req.id)}`
);

// 11. Migrate Time Entries
content = content.replace(
  /await addDoc\(collection\(db, 'time_entries'\), \{\s*([^}]+)\s*createdAt: serverTimestamp\(\)\s*\}\);/g,
  `await timeEntryFacade.create({ $1 });`
);
content = content.replace(
  /handleFirestoreError\(err, OperationType\.WRITE, 'time_entries'\);/g,
  "console.error(err);"
);

content = content.replace(
  /onClick=\{\(\) => deleteDoc\(doc\(db, 'time_entries', entry\.id\)\)\}/g,
  `onClick={() => timeEntryFacade.delete(entry.id)}`
);

// 12. Migrate Salary Advances
content = content.replace(
  /await addDoc\(collection\(db, 'salary_advances'\), \{\s*([^}]+)\s*createdAt: serverTimestamp\(\)\s*\}\);/g,
  `await salaryAdvanceFacade.create({ $1 });`
);
content = content.replace(
  /handleFirestoreError\(err, OperationType\.WRITE, 'salary_advances'\);/g,
  "console.error(err);"
);

content = content.replace(
  /await updateDoc\(doc\(db, 'salary_advances', advanceId\), \{\s*status, updatedAt: serverTimestamp\(\)\s*\}\);/g,
  `await salaryAdvanceFacade.update(advanceId, { status });`
);

content = content.replace(
  /onClick=\{\(\) => deleteDoc\(doc\(db, 'salary_advances', advance\.id\)\)\}/g,
  `onClick={() => salaryAdvanceFacade.delete(advance.id)}`
);

// 13. Other updateDoc in Editing Permissions
content = content.replace(
  /await updateDoc\(doc\(db, 'personnel', editingPermissionsStaff\.id\), \{\s*permissions: editingPermissions,\s*updatedAt: serverTimestamp\(\)\s*\}\);/g,
  `await staffFacade.updateStaff(editingPermissionsStaff.id, { permissions: editingPermissions });`
);

fs.writeFileSync(modulePath, content);
console.log('PersonnelModule migrated.');
