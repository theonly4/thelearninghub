

# Implementation Plan: Email Automation & URL Fixes

## Overview

Fix hardcoded login URLs and add automatic email notifications for admin account management.

---

## Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `manage-employee/index.ts` | Modify | Fix 2 hardcoded URLs (lines 250, 345) |
| `create-organization/index.ts` | Modify | Add welcome email after admin creation |
| `reset-admin-password/index.ts` | Modify | Add password reset notification email |

---

## Change 1: Fix Employee Email URLs

**File:** `supabase/functions/manage-employee/index.ts`

**Line 250** - Update new employee welcome email URL:
```text
Before: loginUrl: "https://thelearninghub.lovable.app/login"
After:  loginUrl: "https://learninghub.zone/login"
```

**Line 345** - Update employee password reset email URL:
```text
Before: loginUrl: "https://thelearninghub.lovable.app/login"
After:  loginUrl: "https://learninghub.zone/login"
```

---

## Change 2: Add Admin Welcome Email

**File:** `supabase/functions/create-organization/index.ts`

Insert after line 317 (after audit log), before the success response at line 319:

```typescript
// Step 7: Send welcome email to the new admin
try {
  await fetch(`${supabaseUrl}/functions/v1/send-welcome-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({
      recipientName: `${adminFirstName} ${adminLastName}`,
      email: adminEmail,
      temporaryPassword: adminPassword,
      organizationName: organizationName,
      loginUrl: "https://learninghub.zone/login",
      isPasswordReset: false,
    }),
  });
  console.log("Welcome email sent to admin:", adminEmail);
} catch (emailError) {
  console.error("Failed to send admin welcome email:", emailError);
}
```

---

## Change 3: Add Admin Password Reset Email

**File:** `supabase/functions/reset-admin-password/index.ts`

Insert after line 137 (after audit log), before the success response at line 139:

```typescript
// Send password reset notification email
try {
  const { data: adminProfile } = await supabaseAdmin
    .from("profiles")
    .select("first_name, last_name")
    .eq("user_id", userId)
    .single();

  const { data: orgData } = await supabaseAdmin
    .from("organizations")
    .select("name")
    .eq("id", targetProfile.organization_id)
    .single();

  await fetch(`${supabaseUrl}/functions/v1/send-welcome-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({
      recipientName: adminProfile 
        ? `${adminProfile.first_name} ${adminProfile.last_name}` 
        : "Administrator",
      email: targetProfile.email,
      temporaryPassword: newPassword,
      organizationName: orgData?.name || "Your Organization",
      loginUrl: "https://learninghub.zone/login",
      isPasswordReset: true,
    }),
  });
  console.log("Password reset email sent to:", targetProfile.email);
} catch (emailError) {
  console.error("Failed to send password reset email:", emailError);
}
```

---

## Email Flow After Implementation

| Scenario | Recipient | Sender | Login URL |
|----------|-----------|--------|-----------|
| Owner creates Admin | Admin | support@learninghub.zone | learninghub.zone/login |
| Owner resets Admin password | Admin | support@learninghub.zone | learninghub.zone/login |
| Admin creates Employee | Employee | support@learninghub.zone | learninghub.zone/login |
| Admin resets Employee password | Employee | support@learninghub.zone | learninghub.zone/login |

---

## Testing Recommendations

1. Create a new organization with admin - verify admin receives welcome email
2. Reset an admin's password - verify admin receives notification email  
3. Create a new employee - verify email contains `learninghub.zone/login` link
4. Reset an employee's password - verify email contains `learninghub.zone/login` link

