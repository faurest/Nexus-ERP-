# Security Specification - Internal Resources & Stock History

## 1. Data Invariants
- An internal resource must belong to a valid company.
- A stock history record must belong to a valid company and reference a valid product ID.
- Access to internal resources and stock history is restricted to company members with admin-like roles (owners, etc.).

## 2. The "Dirty Dozen" Payloads (Red Team Test Cases)

### InternalResource
1. **Identity Spoofing**: Attempt to create a resource with a `companyId` the user doesn't belong to.
2. **Ghost Field Injection**: Adding `isVerified: true` to the resource data.
3. **Invalid Type**: Setting `type` to "Alien Spaceship".
4. **Invalid Status**: Setting `status` to "Destroyed".
5. **ID Poisoning**: Using a 2KB string as a document ID.
6. **Immutable Field Break**: Attempting to change `companyId` during an update.

### StockHistory
7. **Fake Author**: Attempt to set `authorName` to something else than the user's name/ID (though rules might just check member status).
8. **Invalid Flow**: Setting `type` to "MAGIC_INCREASE".
9. **Negative Quantity**: Setting `quantity` to -100.
10. **Orphaned Record**: Creating a history for a non-existent company.
11. **Future Stock**: Setting `createdAt` to a future timestamp.
12. **Unauthorized List**: A random user attempting to list all stock history for a company.

## 3. Test Cases (Conceptual)
- All "Dirty Dozen" payloads must return `PERMISSION_DENIED`.
- Authorized members must be able to `read` and `write` (with validation).
