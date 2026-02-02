

# Plan: Set Up Resend Email Integration with learninghub.zone

## Overview

Update the email system to use your verified domain (`learninghub.zone`) and add new functionality for newsletter signups and admin notifications. All emails will be sent from `support@learninghub.zone`.

---

## Current State

| Component | Status | Issue |
|-----------|--------|-------|
| RESEND_API_KEY | Configured | May need update with new key |
| send-welcome-email | Exists | Uses `onboarding@resend.dev` |
| send-assignment-email | Exists | Uses `onboarding@resend.dev` + "HIPAA" branding |
| send-demo-request | Exists | Uses `onboarding@resend.dev` |
| Newsletter signup | Does not exist | Needs to be created |
| Admin notifications | Partial | Demo requests go to admin, but others don't |

---

## Implementation Plan

### Step 1: Update RESEND_API_KEY Secret

Your new API key will be securely stored in project secrets (encrypted, not in code).

### Step 2: Update Existing Email Functions

**All 3 functions need the `from` address updated:**

| Function | Current From | Updated From |
|----------|-------------|--------------|
| send-welcome-email | `The Learning Hub <onboarding@resend.dev>` | `The Learning Hub <support@learninghub.zone>` |
| send-assignment-email | `HIPAA Training <onboarding@resend.dev>` | `The Learning Hub <support@learninghub.zone>` |
| send-demo-request | `The Learning Hub <onboarding@resend.dev>` | `The Learning Hub <support@learninghub.zone>` |

**Additional fixes for send-assignment-email:**
- Replace "HIPAA Compliance Training" with "The Learning Hub"
- Replace "HIPAA compliance training" with "compliance learning"

### Step 3: Create Newsletter Signup System

**New database table:** `newsletter_subscribers`
```text
+------------------------+
| newsletter_subscribers |
+------------------------+
| id (uuid, PK)          |
| email (text, unique)   |
| created_at             |
| confirmed_at           |
+------------------------+
```

**New edge function:** `send-newsletter-welcome`
- Sends welcome email to new subscribers
- Notifies admin of new signup

**New UI component:** Newsletter signup form in Footer

### Step 4: Add Admin Notification System

**New edge function:** `send-admin-notification`
- Centralized function for all admin alerts
- Sends to `support@learninghub.zone`

**Triggers admin notifications for:**
1. New newsletter signups
2. Password reset requests
3. Demo/contact form submissions

---

## Email Workflows After Implementation

```text
NEW ACCOUNT CREATED
Admin creates employee → manage-employee → send-welcome-email
                                          (from: support@learninghub.zone)
                                                    ↓
                                          Employee receives credentials

TRAINING ASSIGNED  
Admin assigns training → TrainingAssignmentDialog → send-assignment-email
                                                    (from: support@learninghub.zone)
                                                              ↓
                                                    Employee receives notification

NEWSLETTER SIGNUP
User submits email → send-newsletter-welcome → User receives welcome email
                                             → Admin receives notification at support@

DEMO REQUEST
User submits form → send-demo-request → Admin receives demo request at support@
                                       (from: support@learninghub.zone)
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/send-welcome-email/index.ts` | Modify | Update from address to support@ |
| `supabase/functions/send-assignment-email/index.ts` | Modify | Update from address + fix branding |
| `supabase/functions/send-demo-request/index.ts` | Modify | Update from address + recipient to support@ |
| `supabase/functions/send-newsletter-welcome/index.ts` | Create | Welcome email for newsletter signups |
| `supabase/functions/send-admin-notification/index.ts` | Create | Centralized admin alerts |
| `supabase/config.toml` | Modify | Add new function configs |
| `src/components/NewsletterSignup.tsx` | Create | Newsletter form component |
| `src/components/Footer.tsx` | Modify | Add newsletter signup |
| Database migration | Create | Add newsletter_subscribers table |

---

## Detailed Changes

### 1. send-welcome-email (Line 183)
```typescript
// Before
from: "The Learning Hub <onboarding@resend.dev>"

// After  
from: "The Learning Hub <support@learninghub.zone>"
```

### 2. send-assignment-email (Multiple lines)
```typescript
// Line 128: Update from address
from: "The Learning Hub <support@learninghub.zone>"

// Line 130: Update subject
subject: `New Learning Assignment - Due ${formattedDueDate}`

// Line 141: Update header
<h1>The Learning Hub</h1>

// Line 147: Update text
"You have been assigned new compliance learning..."

// Line 166: Update footer
"compliance learning system"
```

### 3. send-demo-request (Lines 103-104)
```typescript
// Update from address
from: "The Learning Hub <support@learninghub.zone>"

// Update recipient (currently yiplawcenter@protonmail.com)
to: ["support@learninghub.zone"]
```

### 4. New: send-newsletter-welcome
- Accept email address
- Validate email format  
- Send branded welcome email to subscriber from `support@learninghub.zone`
- Call send-admin-notification with "new_signup" type
- Store in newsletter_subscribers table

### 5. New: send-admin-notification
- Accept notification type and data payload
- Support types: `new_signup`, `password_reset`, `demo_request`
- Send formatted email to `support@learninghub.zone`
- Used by other functions for centralized notifications

### 6. Newsletter UI Component
- Email input field with submit button
- Success/error toast messages
- Placed in Footer component

---

## Security Considerations

1. **API Key Storage**: Stored encrypted in project secrets, never in code
2. **Email Validation**: All inputs validated before sending
3. **CORS**: All functions use dynamic origin validation
4. **No JWT for public forms**: Newsletter and demo requests are public endpoints

---

## Estimated Implementation

| Step | Time Estimate |
|------|--------------|
| Update RESEND_API_KEY secret | 1 min |
| Update 3 existing email functions | 3 min |
| Create newsletter_subscribers table | 1 min |
| Create send-newsletter-welcome function | 3 min |
| Create send-admin-notification function | 3 min |
| Create NewsletterSignup component | 2 min |
| Update Footer with newsletter | 1 min |
| Update config.toml | 1 min |
| **Total** | **~15 min** |

**Estimated Credits:** 3-4 credits

---

## Testing Recommendations

After implementation:
1. Create a test employee account → verify welcome email arrives from support@learninghub.zone
2. Submit newsletter signup → verify welcome email and admin notification
3. Submit demo request → verify admin receives notification at support@learninghub.zone
4. Assign training to employee → verify assignment email with correct branding

