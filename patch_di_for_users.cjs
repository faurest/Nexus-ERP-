const fs = require('fs');
const path = require('path');

const diPath = path.join(__dirname, 'src/core/di/DependencyProvider.tsx');
let code = fs.readFileSync(diPath, 'utf8');

const imports = `
import { FirebaseUserRepository } from '../infrastructure/firebase/FirebaseUserRepository';
import { UserFacade } from '../application/facades/UserFacade';
import { IUserFacade } from '../application/interfaces/IUserFacade';
import { CreateUserUseCase } from '../application/usecases/users/CreateUserUseCase';
import { GetUserByEmailUseCase } from '../application/usecases/users/GetUserByEmailUseCase';
import { RegisterUserWithoutLoginUseCase } from '../application/usecases/auth/RegisterUserWithoutLoginUseCase';
import { AddCompanyMemberEmailUseCase } from '../application/usecases/company/AddCompanyMemberEmailUseCase';
`;

code = code.replace("import { FirebaseProjectRepository }", imports + "\nimport { FirebaseProjectRepository }");

// Interface
code = code.replace("staff: IStaffFacade;", "user: IUserFacade;\n    staff: IStaffFacade;");

// Repo
code = code.replace("const salaryAdvanceRepo = new FirebaseSalaryAdvanceRepository();", "const salaryAdvanceRepo = new FirebaseSalaryAdvanceRepository();\n  const userRepo = new FirebaseUserRepository();");

// SessionFacade params: observeSession, refreshSession, syncProfile, login, loginWithGoogle, register, authGateway
// Now has registerWithoutLoginUseCase
code = code.replace(
  "new RegisterUseCase(authGateway), authGateway)",
  "new RegisterUseCase(authGateway),\n          new RegisterUserWithoutLoginUseCase(authGateway),\n          authGateway)"
);

// CompanyFacade params: Create, Update, Delete, Get, List, Observe
code = code.replace(
  "new ObserveCompanyUseCase(companyRepo))",
  "new ObserveCompanyUseCase(companyRepo),\n          new AddCompanyMemberEmailUseCase(companyRepo))"
);

// UserFacade instance
const userFacadeInit = `
        user: new UserFacade(
          new CreateUserUseCase(userRepo),
          new GetUserByEmailUseCase(userRepo)
        ),
`;
code = code.replace("staff: new StaffFacade", userFacadeInit + "        staff: new StaffFacade");

fs.writeFileSync(diPath, code);
console.log('DependencyProvider updated for users, session, company.');
