const fs = require('fs');
const path = require('path');

const domains = [
  { name: 'Customer', folder: 'customers' },
  { name: 'Company', folder: 'companies' },
  { name: 'Staff', folder: 'staff' },
  { name: 'Invoice', folder: 'invoices' },
  { name: 'Product', folder: 'products' },
  { name: 'Notification', folder: 'notifications' },
];

const actions = [
  { name: 'Create', method: (d) => `create${d}`, arg: `data: any`, call: `data` },
  { name: 'Update', method: (d) => `update${d}`, arg: `id: string, data: any`, call: `id, data` },
  { name: 'Delete', method: (d) => `delete${d}`, arg: `id: string`, call: `id` },
  { name: 'Get', method: (d) => `get${d}ById`, arg: `id: string`, call: `id` },
  { name: 'List', method: (d) => d === 'Company' ? `getCompanies` : (d === 'Notification' ? `getNotifications` : `get${d}s`), arg: (d) => d === 'Company' ? `companyId?: string` : (d === 'Notification' ? `companyId: string, userId?: string` : `companyId: string`), call: (d) => d === 'Company' ? `` : (d === 'Notification' ? `companyId, userId` : `companyId`) },
  { name: 'Observe', method: (d) => d === 'Company' ? `subscribeToCompanies` : (d === 'Notification' ? `subscribeToNotifications` : `subscribeTo${d}s`), arg: (d) => d === 'Company' ? `callback: (data: any[]) => void` : (d === 'Notification' ? `companyId: string, userId: string, callback: (data: any[]) => void` : `companyId: string, callback: (data: any[]) => void`), call: (d) => d === 'Company' ? `callback` : (d === 'Notification' ? `companyId, userId, callback` : `companyId, callback`) },
];

for (const domain of domains) {
  const dir = path.join(__dirname, 'src/core/application/usecases', domain.folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  for (const action of actions) {
    const ucName = `${action.name}${domain.name}UseCase`;
    const repoName = `I${domain.name}Repository`;
    const repoFile = `../../../domain/repositories/${repoName}`;
    const methodName = action.method(domain.name);
    
    let argStr = typeof action.arg === 'function' ? action.arg(domain.name) : action.arg;
    let callStr = typeof action.call === 'function' ? action.call(domain.name) : action.call;

    // fix for ListCompany which takes no args in IC
    if (ucName === 'ListCompanyUseCase') argStr = '';
    // actually, let's look at Facade interfaces!
    
    let executeRet = `Promise<any>`;
    if (action.name === 'Delete' || action.name === 'Update') executeRet = `Promise<void>`;
    if (action.name === 'List') executeRet = `Promise<any[]>`;
    if (action.name === 'Create') executeRet = `Promise<string>`;
    if (action.name === 'Observe') executeRet = `() => void`;
    
    const content = `import { ${repoName} } from '${repoFile}';\n\nexport class ${ucName} {\n  constructor(private repository: ${repoName}) {}\n  ${action.name === 'Observe' ? '' : 'async '}execute(${argStr}): ${executeRet} {\n    return this.repository.${methodName}(${callStr});\n  }\n}\n`;
    
    fs.writeFileSync(path.join(dir, `${ucName}.ts`), content);
  }
}

const storageDir = path.join(__dirname, 'src/core/application/usecases/storage');
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

const storageUcs = [
  { name: 'UploadFileUseCase', arg: 'path: string, file: any', call: 'path, file' },
  { name: 'DeleteFileUseCase', arg: 'path: string', call: 'path' },
  { name: 'GetFileUrlUseCase', arg: 'path: string', call: 'path' },
  { name: 'ListFilesUseCase', arg: 'path: string', call: 'path' },
];

for (const uc of storageUcs) {
  let content = `import { IStorageRepository } from '../../../domain/repositories/IStorageRepository';\n\nexport class ${uc.name} {\n  constructor(private repository: IStorageRepository) {}\n  async execute(${uc.arg}): Promise<any> {\n    return this.repository.${uc.name.replace('UseCase', '').charAt(0).toLowerCase() + uc.name.replace('UseCase', '').slice(1)}(${uc.call});\n  }\n}\n`;
  fs.writeFileSync(path.join(storageDir, `${uc.name}.ts`), content);
}
