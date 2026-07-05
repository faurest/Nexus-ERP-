const fs = require('fs');

const path = 'src/core/di/DependencyProvider.tsx';
let content = fs.readFileSync(path, 'utf8');

const imports = `
import { PartnerGateway } from '../infrastructure/gateways/PartnerGateway';
import { ExpenseGateway } from '../infrastructure/gateways/ExpenseGateway';
import { PaymentGateway } from '../infrastructure/gateways/PaymentGateway';

import { CreatePartnerUseCase } from '../application/usecases/partners/CreatePartnerUseCase';
import { UpdatePartnerUseCase } from '../application/usecases/partners/UpdatePartnerUseCase';
import { DeletePartnerUseCase } from '../application/usecases/partners/DeletePartnerUseCase';
import { GetPartnerUseCase } from '../application/usecases/partners/GetPartnerUseCase';
import { ListPartnersUseCase } from '../application/usecases/partners/ListPartnersUseCase';
import { ObservePartnersUseCase } from '../application/usecases/partners/ObservePartnersUseCase';

import { CreateExpenseUseCase } from '../application/usecases/finance/CreateExpenseUseCase';
import { UpdateExpenseUseCase } from '../application/usecases/finance/UpdateExpenseUseCase';
import { DeleteExpenseUseCase } from '../application/usecases/finance/DeleteExpenseUseCase';
import { ObserveExpensesUseCase } from '../application/usecases/finance/ObserveExpensesUseCase';

import { CreatePaymentUseCase } from '../application/usecases/finance/CreatePaymentUseCase';
import { UpdatePaymentUseCase } from '../application/usecases/finance/UpdatePaymentUseCase';
import { DeletePaymentUseCase } from '../application/usecases/finance/DeletePaymentUseCase';
import { ObservePaymentsUseCase } from '../application/usecases/finance/ObservePaymentsUseCase';
`;

content = content.replace("import { FirebaseProjectRepository }", imports + "\nimport { FirebaseProjectRepository }");

const repos = `
    const partnerRepo = new FirebasePartnerRepository();
    const expenseRepo = new FirebaseExpenseRepository();
    const paymentRepo = new FirebasePaymentRepository();

    const partnerGateway = new PartnerGateway(partnerRepo);
    const expenseGateway = new ExpenseGateway(expenseRepo);
    const paymentGateway = new PaymentGateway(paymentRepo);
`;

content = content.replace("const projectRepo = new FirebaseProjectRepository();", "const projectRepo = new FirebaseProjectRepository();\n" + repos);

const facades = `
        partner: new PartnerFacade(
          new CreatePartnerUseCase(partnerGateway),
          new UpdatePartnerUseCase(partnerGateway),
          new DeletePartnerUseCase(partnerGateway),
          new GetPartnerUseCase(partnerGateway),
          new ListPartnersUseCase(partnerGateway),
          new ObservePartnersUseCase(partnerGateway)
        ),
        finance: new FinanceFacade(
          new CreateExpenseUseCase(expenseGateway),
          new UpdateExpenseUseCase(expenseGateway),
          new DeleteExpenseUseCase(expenseGateway),
          new ObserveExpensesUseCase(expenseGateway),
          new CreatePaymentUseCase(paymentGateway),
          new UpdatePaymentUseCase(paymentGateway),
          new DeletePaymentUseCase(paymentGateway),
          new ObservePaymentsUseCase(paymentGateway)
        ),
`;

content = content.replace("project: new ProjectFacade(createProject, listProjects, projectRepo, projectRepo),", "project: new ProjectFacade(createProject, listProjects, projectRepo, projectRepo),\n" + facades);

fs.writeFileSync(path, content, 'utf8');
