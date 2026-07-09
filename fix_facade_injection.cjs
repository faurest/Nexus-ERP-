const fs = require('fs');
const path = require('path');

const modulePath = path.join(__dirname, 'src/components/PersonnelModule.tsx');
let content = fs.readFileSync(modulePath, 'utf8');

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
  } = useDependencies().facades;\n`;

content = content.replace(
  "export default function PersonnelModule({ user }: { user?: any }) {",
  "export default function PersonnelModule({ user }: { user?: any }) {\n" + facadeExt
);

fs.writeFileSync(modulePath, content);
console.log('Facade injection fixed.');
