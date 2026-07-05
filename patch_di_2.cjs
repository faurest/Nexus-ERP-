const fs = require('fs');
const path = 'src/core/di/DependencyProvider.tsx';
let content = fs.readFileSync(path, 'utf8');

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

content = content.replace("project: new ProjectFacade(createProject, null, null, null, listProjects, null),", "project: new ProjectFacade(createProject, null, null, null, listProjects, null),\n" + facades);

fs.writeFileSync(path, content, 'utf8');
