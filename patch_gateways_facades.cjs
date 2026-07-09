const fs = require('fs');
const path = require('path');

// Update AuthGateway
let authGatewayPath = path.join(__dirname, 'src/core/infrastructure/gateways/AuthGateway.ts');
let authGatewayContent = fs.readFileSync(authGatewayPath, 'utf8');
if (!authGatewayContent.includes('registerWithoutLogin')) {
  // We need to import registerUserWithoutLogin from lib/firebase
  // Actually lib/firebase has registerUserWithoutLogin
  const importLine = `import { registerUserWithoutLogin } from '../../../lib/firebase';\n`;
  authGatewayContent = importLine + authGatewayContent;
  
  const method = `
  async registerWithoutLogin(email: string, pass: string): Promise<any> {
    return registerUserWithoutLogin(email, pass);
  }
`;
  authGatewayContent = authGatewayContent.replace(/}\s*$/, method + '}\n');
  fs.writeFileSync(authGatewayPath, authGatewayContent);
}

// Update ISessionFacade
let iSessionFacadePath = path.join(__dirname, 'src/core/application/interfaces/ISessionFacade.ts');
let iSessionFacadeContent = fs.readFileSync(iSessionFacadePath, 'utf8');
if (!iSessionFacadeContent.includes('registerWithoutLogin')) {
  iSessionFacadeContent = iSessionFacadeContent.replace(/}\s*$/, `  registerWithoutLogin(email: string, pass: string): Promise<any>;\n}\n`);
  fs.writeFileSync(iSessionFacadePath, iSessionFacadeContent);
}

// Update SessionFacade
let sessionFacadePath = path.join(__dirname, 'src/core/application/facades/SessionFacade.ts');
let sessionFacadeContent = fs.readFileSync(sessionFacadePath, 'utf8');
if (!sessionFacadeContent.includes('registerWithoutLogin')) {
  sessionFacadeContent = `import { RegisterUserWithoutLoginUseCase } from '../usecases/auth/RegisterUserWithoutLoginUseCase';\n` + sessionFacadeContent;
  
  sessionFacadeContent = sessionFacadeContent.replace(
    'private registerUseCase: RegisterUseCase,',
    'private registerUseCase: RegisterUseCase,\n    private registerUserWithoutLoginUseCase: RegisterUserWithoutLoginUseCase,'
  );
  
  const method = `
  async registerWithoutLogin(email: string, pass: string): Promise<any> {
    return this.registerUserWithoutLoginUseCase.execute(email, pass);
  }
`;
  sessionFacadeContent = sessionFacadeContent.replace(/}\s*$/, method + '}\n');
  fs.writeFileSync(sessionFacadePath, sessionFacadeContent);
}

// Update ICompanyRepository
let iCompanyRepoPath = path.join(__dirname, 'src/core/domain/repositories/ICompanyRepository.ts');
let iCompanyRepoContent = fs.readFileSync(iCompanyRepoPath, 'utf8');
if (!iCompanyRepoContent.includes('addMemberEmail')) {
  iCompanyRepoContent = iCompanyRepoContent.replace(/}\s*$/, `  addMemberEmail(companyId: string, email: string): Promise<void>;\n}\n`);
  fs.writeFileSync(iCompanyRepoPath, iCompanyRepoContent);
}

// Update FirebaseCompanyRepository
let fbCompanyRepoPath = path.join(__dirname, 'src/core/infrastructure/firebase/FirebaseCompanyRepository.ts');
let fbCompanyRepoContent = fs.readFileSync(fbCompanyRepoPath, 'utf8');
if (!fbCompanyRepoContent.includes('addMemberEmail')) {
  // Ensure arrayUnion is imported
  if (!fbCompanyRepoContent.includes('arrayUnion')) {
    fbCompanyRepoContent = fbCompanyRepoContent.replace('serverTimestamp', 'serverTimestamp, arrayUnion');
  }
  const method = `
  async addMemberEmail(companyId: string, email: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, companyId);
      await updateDoc(docRef, {
        memberEmails: arrayUnion(email),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, this.collectionName);
      throw error;
    }
  }
`;
  fbCompanyRepoContent = fbCompanyRepoContent.replace(/}\s*$/, method + '}\n');
  fs.writeFileSync(fbCompanyRepoPath, fbCompanyRepoContent);
}

// Create AddCompanyMemberEmailUseCase
const usecasePath = path.join(__dirname, 'src/core/application/usecases/company/AddCompanyMemberEmailUseCase.ts');
const usecaseContent = `
import { ICompanyRepository } from '../../../domain/repositories/ICompanyRepository';
export class AddCompanyMemberEmailUseCase {
  constructor(private repository: ICompanyRepository) {}
  async execute(companyId: string, email: string): Promise<void> {
    return this.repository.addMemberEmail(companyId, email);
  }
}
`;
fs.mkdirSync(path.dirname(usecasePath), { recursive: true });
fs.writeFileSync(usecasePath, usecaseContent.trim() + '\n');

// Update ICompanyFacade
let iCompanyFacadePath = path.join(__dirname, 'src/core/application/interfaces/ICompanyFacade.ts');
let iCompanyFacadeContent = fs.readFileSync(iCompanyFacadePath, 'utf8');
if (!iCompanyFacadeContent.includes('addMemberEmail')) {
  iCompanyFacadeContent = iCompanyFacadeContent.replace(/}\s*$/, `  addMemberEmail(companyId: string, email: string): Promise<void>;\n}\n`);
  fs.writeFileSync(iCompanyFacadePath, iCompanyFacadeContent);
}

// Update CompanyFacade
let companyFacadePath = path.join(__dirname, 'src/core/application/facades/CompanyFacade.ts');
let companyFacadeContent = fs.readFileSync(companyFacadePath, 'utf8');
if (!companyFacadeContent.includes('addMemberEmail')) {
  companyFacadeContent = `import { AddCompanyMemberEmailUseCase } from '../usecases/company/AddCompanyMemberEmailUseCase';\n` + companyFacadeContent;
  
  companyFacadeContent = companyFacadeContent.replace(
    'private observeCompanyUseCase: any',
    'private observeCompanyUseCase: any,\n    private addCompanyMemberEmailUseCase: AddCompanyMemberEmailUseCase'
  );
  
  const method = `
  async addMemberEmail(companyId: string, email: string): Promise<void> {
    return this.addCompanyMemberEmailUseCase.execute(companyId, email);
  }
`;
  companyFacadeContent = companyFacadeContent.replace(/}\s*$/, method + '}\n');
  fs.writeFileSync(companyFacadePath, companyFacadeContent);
}

console.log('Facades and Gateways patched.');
