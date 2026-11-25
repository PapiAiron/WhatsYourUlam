# Security Specification: Smart Meal Planner Firestore Rules

## Data Invariants
1. Every document under `/users/{uid}` (including `plans`, `meals`, `grocery`, and `priceOverrides`) belongs exclusively to `uid` when `request.auth.token.email_verified == true`.
2. Unverified users (`email_verified == false`) cannot read or write any user document, plan, recipe, or price book.
3. Users cannot modify their own `quota` or `createdAt` fields on `/users/{uid}` after creation, nor escalate privileges.
4. Subcollections `meals/{mealId}` and `grocery/{itemId}` require the parent plan `/users/{uid}/plans/{planId}` to exist.
5. `shares/{shareId}` allows single-document `get` by unguessable ID (no `list` queries), contains zero PII, and only the `ownerUid` can create or delete their share snapshot.
6. Global `recipes`, `prices`, and `config` can only be written by verified admins.
7. `testimonials` can only be read publicly when `resource.data.approved == true`.
8. `feedback` and `waitlist` allow constrained public creation with strict field allowlists and string length limits, and can only be read by admins.

## Dirty Dozen Adversarial Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated read of `/users/u1`.
2. Unverified (`email_verified: false`) user read or write of `/users/u1/plans/p1`.
3. Cross-user read of `/users/victim/plans/p1` by authenticated verified user `attacker`.
4. Shadow field injection on `/users/u1` create (`{ uid: "u1", ..., isAdmin: true }`).
5. Self-quota tampering on `/users/u1` update (`quota: { plansUsed: 0 }`).
6. Creating `/users/u1/plans/p1` with `uid: "other_user"`.
7. Poisoned oversized document ID (>128 chars or invalid characters) on `/users/u1/plans/...`.
8. Updating `/users/u1/plans/p1/grocery/g1` with disallowed field (`lineTotalMinor: 0`).
9. Orphaned meal creation when parent `/users/u1/plans/missing` does not exist.
10. Listing `/shares` collection (`getDocs(collection(db, 'shares'))`).
11. Spoofed admin email with `email_verified: false` attempting write to `/prices/PH_NCR_egg`.
12. Reading unapproved testimonial (`/testimonials/t1` where `approved == false`) as non-admin.
