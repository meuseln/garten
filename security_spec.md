# Security Specification — Hof & Garten

## 1. Data Invariants
1. **Identity & Email Verification**: All read and write operations require `request.auth != null` and `request.auth.token.email_verified == true`.
2. **PII Isolation**: User email addresses and personal notes are stored exclusively in `/users/{userId}`, readable and writable only by `request.auth.uid == userId`. Shared presence/identity in `/homesteadMembers/{userId}` contains zero PII.
3. **Homestead Membership**: Only verified homestead members present in `/homesteadMembers/{request.auth.uid}` can read or write shared farm collections (`/areas`, `/plants`, `/plantings`, `/seeds`, `/animalGroups`, `/animalLogs`, `/feedStocks`, `/harvests`, `/recipes`, `/batches`, `/inventoryItems`, `/resources`, `/projects`, `/calendarEvents`, `/knowledgeEntries`, `/equipment`, `/financeEntries`, `/shoppingItems`, `/documents`, `/emergencyConfig`, `/pings`, `/auditLogs`).
4. **No Self-Assigned Admin Roles**: `/users/{userId}` and `/homesteadMembers/{userId}` strictly enforce `role == 'member'` and `displayName in ['Nico', 'Chris']` with matching `accentColor`.
5. **Immutable Audit Trail**: `/auditLogs/{logId}` is append-only (`allow update, delete: if false`), requires `actorUid == request.auth.uid`, and enforces server timestamp `createdAt == request.time`.
6. **Soft-Delete Recoverability**: Shared records use `archived: bool` (`soft delete`) so deleted items can be restored, and `delete` is restricted to verified members only for permanent cleanup or denied on audit logs.
7. **Temporal & Key Integrity**: Every create/update validates `keys().hasAll(...)` / `keys().hasOnly(...)` / `affectedKeys().hasOnly(...)` and server timestamps (`request.time`), with strict `.size()` limits on all strings and valid ID regex `^[a-zA-Z0-9_\\-]+$`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated List**: `list /areas` with `auth == null` -> DENIED.
2. **Unverified Email Write**: `create /areas/bed_1` with `auth.token.email_verified == false` -> DENIED.
3. **PII Cross-Read**: User Chris reads `/users/nico_uid` -> DENIED.
4. **Privilege Escalation**: User writes `/users/chris_uid` with `role: "admin"` -> DENIED.
5. **Shadow / Ghost Field**: User creates `/areas/bed_1` with extra `isVerified: true` -> DENIED.
6. **ID Poisoning**: User creates `/areas/../../invalid$id` or 200-char ID -> DENIED.
7. **Timestamp Forgery**: User creates `/areas/bed_1` with client-backdated `createdAt` (`!= request.time`) -> DENIED.
8. **Audit Log Tampering**: User attempts `update` or `delete` on `/auditLogs/log_1` -> DENIED.
9. **Identity Spoofing in Audit Log**: User Chris creates `/auditLogs/log_1` with `actorUid: "nico_uid"` -> DENIED.
10. **Blanket List Without Homestead Filter**: Query `/areas` without `where('homesteadId', '==', 'mellenbach-hof')` -> DENIED by `resource.data.homesteadId == 'mellenbach-hof'` rule evaluation.
11. **Oversized String DoS**: User creates `/plants/p1` with `title` > 200 chars -> DENIED.
12. **Immutable Ownership Tampering**: User updates `/areas/bed_1` changing `createdBy` or `createdAt` -> DENIED.
