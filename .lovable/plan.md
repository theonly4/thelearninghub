

# Going Live: Clean Up Test Data and Production Checklist

This plan explains everything you need to do to prepare The Learning Hub for real customers.

---

## Safety Confirmations (Verified Before Execution)

### Protection for Platform Owner Account

| Item | Value | How It's Protected |
|------|-------|-------------------|
| Platform Owner Email | `yiplawcenter@protonmail.com` | Explicitly excluded by user_id in all queries |
| Platform Owner User ID | `c4ae35a6-7d30-4e1a-bc87-c7421f12a286` | Hardcoded exclusion in cleanup function |
| Platform Owner Org ID | `7c8683fe-0c0d-44f0-8129-d8ea700059c2` | Filtered by `organization_id !=` in all delete queries |
| Platform Owner Org Slug | `platform-owner` | Filtered by `slug != 'platform-owner'` for organizations |

### Auth User Deletion Safety

The backend cleanup function will use an **explicit allowlist** approach. Only these 8 specific emails will be deleted:

```text
ALLOWLIST (will be deleted):
1. thejurisdoctor@yahoo.com
2. test@email.com
3. tony.yip.jd@gmail.com
4. thejurisdoctor@gmail.com
5. yipchelsea1@gmail.com
6. tonyyipjd@proton.me
7. simoneyipper@gmail.com
8. theyips@live.com

PROTECTED (will NEVER be touched):
- yiplawcenter@protonmail.com
```

---

## What Test Data Currently Exists

### Organizations (5 test organizations to remove)

| Organization | Admin Email | Status |
|-------------|-------------|--------|
| ACME Healthcare | thejurisdoctor@yahoo.com | Test org |
| Health Co. | test@email.com | Test org |
| test org | tony.yip.jd@gmail.com | Test org |
| ABC Health | thejurisdoctor@gmail.com | Test org |
| SA clinic | yipchelsea1@gmail.com | Test org |

### User Accounts (8 test accounts to remove)

**Organization Admins (5 accounts):**

| Email | Organization | Role |
|-------|--------------|------|
| thejurisdoctor@yahoo.com | ACME Healthcare | org_admin |
| test@email.com | Health Co. | org_admin |
| tony.yip.jd@gmail.com | test org | org_admin |
| thejurisdoctor@gmail.com | ABC Health | org_admin |
| yipchelsea1@gmail.com | SA clinic | org_admin |

**Workforce Users (3 accounts):**

| Email | Organization | Role |
|-------|--------------|------|
| tonyyipjd@proton.me | Platform Owner Organization | workforce_user |
| simoneyipper@gmail.com | Platform Owner Organization | workforce_user |
| theyips@live.com | ACME Healthcare | workforce_user |

### Account to Keep (Platform Owner)

| Email | Organization | Role |
|-------|--------------|------|
| yiplawcenter@protonmail.com | Platform Owner Organization | platform_owner |

### Data to Keep (Your Production Content)

- Platform Owner account: yiplawcenter@protonmail.com (will NOT be deleted)
- 600 quiz questions in the Master Question Bank
- 208 HIPAA topics for categorizing questions
- 7 training materials (HIPAA courses for different workforce groups)
- 7 question packages for organizing quizzes
- 2 quizzes (Master Question Bank + Administrative Staff Set 1)

### Data to Delete (Test Activity)

- 40 audit log entries (test activity logs)
- 16 training assignments (test assignments)
- 7 content releases (test releases to organizations)
- 5 package releases (test package deployments)
- 6 subscriptions (test subscription records)

---

## Step-by-Step Instructions

### Step 1: Delete Test Data from the Database

Run database migration with explicit org_id and user_id filters to safely remove all test data.

**Filter Logic (ensures Platform Owner data is never touched):**

```text
-- For tables with organization_id:
DELETE FROM [table] WHERE organization_id != '7c8683fe-0c0d-44f0-8129-d8ea700059c2'

-- For user-specific tables:
DELETE FROM user_roles WHERE user_id != 'c4ae35a6-7d30-4e1a-bc87-c7421f12a286'
DELETE FROM profiles WHERE user_id != 'c4ae35a6-7d30-4e1a-bc87-c7421f12a286'

-- For organizations table:
DELETE FROM organizations WHERE slug != 'platform-owner'
```

**Deletion Order (respects foreign key relationships):**

1. DELETE FROM audit_logs WHERE organization_id != '7c8683fe-...'
2. DELETE FROM training_assignments WHERE organization_id != '7c8683fe-...'
3. DELETE FROM content_releases WHERE organization_id != '7c8683fe-...'
4. DELETE FROM package_releases WHERE organization_id != '7c8683fe-...'
5. DELETE FROM user_training_progress WHERE organization_id != '7c8683fe-...'
6. DELETE FROM quiz_attempts WHERE organization_id != '7c8683fe-...'
7. DELETE FROM certificates WHERE organization_id != '7c8683fe-...'
8. DELETE FROM subscriptions WHERE organization_id != '7c8683fe-...'
9. DELETE FROM user_roles WHERE user_id != 'c4ae35a6-...'
10. DELETE FROM profiles WHERE user_id != 'c4ae35a6-...'
11. DELETE FROM organizations WHERE slug != 'platform-owner'

### Step 2: Delete Test Auth Users

Create a one-time backend function `cleanup-test-users` with explicit safety:

**Safety Measures in the Function:**

```text
1. PROTECTED_EMAIL constant = 'yiplawcenter@protonmail.com'
   - Function refuses to delete this email under any circumstances

2. ALLOWLIST array contains only these 8 emails:
   - thejurisdoctor@yahoo.com
   - test@email.com
   - tony.yip.jd@gmail.com
   - thejurisdoctor@gmail.com
   - yipchelsea1@gmail.com
   - tonyyipjd@proton.me
   - simoneyipper@gmail.com
   - theyips@live.com

3. Double-check before each deletion:
   - Verify email is in ALLOWLIST
   - Verify email is NOT the PROTECTED_EMAIL

4. Log every action for audit trail
```

### Step 3: Update Legal Pages

Update support email in both legal documents from `learninghubsupport@proton.me` to `support@learninghub.zone`.

**Terms of Service (4 locations):**

| Line | Section | Current | New |
|------|---------|---------|-----|
| 59 | Section 3 (Cancellation) | learninghubsupport@proton.me | support@learninghub.zone |
| 147 | Section 7 (Privacy Rights) | learninghubsupport@proton.me | support@learninghub.zone |
| 156 | Section 8 (Billing) | learninghubsupport@proton.me | support@learninghub.zone |
| 291 | Section 15 (Dispute Resolution) | learninghubsupport@proton.me | support@learninghub.zone |
| 320 | Section 16 (Contact Us) | learninghubsupport@proton.me | support@learninghub.zone |

**Privacy Policy (3 locations):**

| Line | Section | Current | New |
|------|---------|---------|-----|
| 39 | Section 1 (Contact Details) | learninghubsupport@proton.me | support@learninghub.zone |
| 206 | Section 12 (Exercise Rights) | learninghubsupport@proton.me | support@learninghub.zone |
| 251 | Section 15 (Questions) | learninghubsupport@proton.me | support@learninghub.zone |

### Step 4: Verify Email Configuration

Already working correctly:

- **Transactional emails**: Sent from `support@learninghub.zone` via Resend
- **Self-service password reset**: Uses built-in system from `no-reply@auth.lovable.cloud`

### Step 5: Final Production Checklist

| Item | Status | Notes |
|------|--------|-------|
| Platform Owner Login | Ready | yiplawcenter@protonmail.com |
| Quiz Questions | Ready | 600 questions imported |
| Training Materials | Ready | 7 courses for all workforce groups |
| Question Packages | Ready | 7 packages organized |
| Email Sending | Ready | Resend configured with learninghub.zone |
| MFA Requirement | Ready | TOTP-based MFA is mandatory |
| Terms of Service | Update needed | Change email to support@learninghub.zone |
| Privacy Policy | Update needed | Change email to support@learninghub.zone |
| Production Domain | Ready | **learninghub.zone** |

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| Database migration | Create | Delete test data with safe org_id/user_id filters |
| `supabase/functions/cleanup-test-users/index.ts` | Create | Delete 8 specific test auth users (allowlist approach) |
| `src/pages/TermsOfServicePage.tsx` | Modify | Update 5 email references to support@learninghub.zone |
| `src/pages/PrivacyPolicyPage.tsx` | Modify | Update 3 email references to support@learninghub.zone |

---

## After Going Live

Once the cleanup is complete:

1. **Create your first real organization** using the "Create Organization" feature as platform owner
2. **Assign question packages** to the new organization
3. **The organization admin** will receive a welcome email from `support@learninghub.zone`
4. **They can add employees** who will receive their own welcome emails with credentials

Your platform will be clean and ready for real customers at **learninghub.zone**.

