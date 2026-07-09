const fs = require('fs');
const path = require('path');

// 1. Fix CompanyFacade
const cfPath = path.join(__dirname, 'src/core/application/facades/CompanyFacade.ts');
let cfContent = fs.readFileSync(cfPath, 'utf8');
cfContent = cfContent.replace(
  'private observeCompaniesUseCase: any',
  'private observeCompaniesUseCase: any,\n    private addCompanyMemberEmailUseCase: AddCompanyMemberEmailUseCase'
);
fs.writeFileSync(cfPath, cfContent);

// 2. Fix FirebaseCompanyRepository
const fcrPath = path.join(__dirname, 'src/core/infrastructure/firebase/FirebaseCompanyRepository.ts');
let fcrContent = fs.readFileSync(fcrPath, 'utf8');

// Ensure imports for arrayUnion, handleFirestoreError, OperationType
if (!fcrContent.includes('arrayUnion')) {
  fcrContent = "import { arrayUnion } from 'firebase/firestore';\n" + fcrContent;
}
if (!fcrContent.includes('handleFirestoreError')) {
  fcrContent = "import { handleFirestoreError, OperationType } from '../../../lib/firebase';\n" + fcrContent;
}
// Fix collectionName -> 'companies'
fcrContent = fcrContent.replace(/this\.collectionName/g, "'companies'");
fs.writeFileSync(fcrPath, fcrContent);

// 3. Fix FirebaseUserRepository
const furPath = path.join(__dirname, 'src/core/infrastructure/firebase/FirebaseUserRepository.ts');
let furContent = fs.readFileSync(furPath, 'utf8');
furContent = furContent.replace('../../../../lib/firebase', '../../../lib/firebase');
fs.writeFileSync(furPath, furContent);

console.log('Fixed type errors.');
