# Clearspace 3.0 — Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Strict Private Workspace Isolation**: Every document under `/users/{userId}` and its subcollections belongs exclusively to `userId`. Only an authenticated, email-verified user whose `request.auth.uid == userId` may read, list, create, update, or delete records within their tree.
2. **Identity Integrity**: Every document contains `userId` matching `request.auth.uid` on creation and immutable (`incoming().userId == existing().userId`) on update.
3. **Path Variable Hardening**: Every single-document path ID (`userId`, `taskId`, `blockId`, `areaId`, etc.) must satisfy `^[a-zA-Z0-9_\-]+$` and length `<= 128`.
4. **Temporal Integrity**: `createdAt` must equal `request.time` on create and remain immutable on update. `updatedAt` must equal `request.time` on both create and update.
5. **Anti-Update-Gap & Strict Keys**: Every `create` checks `keys().hasAll(...)` and `keys().hasOnly(...)`. Every `update` validates the full incoming document via `isValid[Entity](incoming())` AND restricts modified fields using `incoming().diff(existing()).affectedKeys().hasOnly(...)`.
6. **Bounded Payloads**: All strings have explicit `.size()` bounds; all lists (`topics`, `milestones`, `tags`, `blocks`, `doodleStrokes`, `recurringWeekdays`) have strict `.size() <= MAX` limits.

## 2. "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Cross-Tenant Read**: User B attempts `get(/users/userA/tasks/task1)`.
2. **Cross-Tenant List**: User B attempts `list(/users/userA/tasks)`.
3. **Identity Spoofing on Create**: User A creates `/users/userA/tasks/t1` with `userId: "userB"`.
4. **Shadow Field Injection (Ghost Field)**: User A creates `/users/userA/tasks/t1` with extra `isAdmin: true`.
5. **Unverified Email Write**: Authenticated user with `email_verified: false` writes `/users/userA/tasks/t1`.
6. **Path ID Poisoning**: User A writes `/users/userA/tasks/invalid..id!@#`.
7. **Temporal Forgery (Client Timestamp)**: User A creates a task with `createdAt: Timestamp(2020-01-01)` instead of `request.time`.
8. **Immutable Ownership Mutation**: User A updates `/users/userA/tasks/t1` changing `userId` or `createdAt`.
9. **Value Poisoning / Type Mismatch**: User A updates `durationMinutes` on a schedule block to a string `"90"` or negative number `-10`.
10. **Oversized String Exhaustion**: User A creates a journal entry with `content` > 10,000 characters.
11. **Unbounded Array Exhaustion**: User A creates a `DailyTemplate` with 200 blocks (exceeding max 40).
12. **PII Leak via Blanket Root Query**: User B queries `list(/users)` or `get(/users/userA)` to harvest email addresses.
