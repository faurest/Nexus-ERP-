const fs = require('fs');
const path = require('path');

const modulePath = path.join(__dirname, 'src/components/PersonnelModule.tsx');
let content = fs.readFileSync(modulePath, 'utf8');

const regex = /useEffect\(\(\) => \{\s*if \(!currentCompany\) return;\s*const fetchData = async \(\) => \{[\s\S]*?supabase\.removeChannel\(channel\);\s*\};\s*\}, \[currentCompany\]\);/g;

const newEffect = `  useEffect(() => {
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
        setSalaryAdvances(data.map(a => ({ ...a, staffId: a.staff_id || a.staffId, requestDate: a.request_date || a.requestDate, deductionMonth: a.deduction_month || a.deductionMonth } as SalaryAdvance)));
      });
      const unsubProjects = projectFacade.observeProjects(currentCompany.id, (data) => {
        setProjectsList(data.map(p => ({ ...p, clientId: p.client_id || p.clientId, companyId: p.company_id || p.companyId } as any)));
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
  }, [currentCompany]);`;

content = content.replace(regex, newEffect);
fs.writeFileSync(modulePath, content);
console.log('Final effect fixed.');
