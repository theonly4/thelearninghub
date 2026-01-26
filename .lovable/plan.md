

# Plan: Automate Demo Request Submissions

## Overview

Replace the current `mailto:` link in `DemoPage.tsx` with a server-side Edge Function that automatically sends demo request notifications to the administrator via email using Resend. This eliminates the need for the user's email client and ensures reliable delivery.

## Current State

- Demo form at `/demo` collects: first name, last name, email, organization, role, workforce size, and optional message
- Currently uses `window.location.href = mailto:yiplawcenter@protonmail.com...` which relies on the user's local email client
- This approach is unreliable as it depends on the user's email client configuration

## Proposed Solution

```text
+------------------+     +------------------------+     +------------------+
|   Demo Form      | --> | send-demo-request      | --> | Resend API       |
|   (DemoPage.tsx) |     | Edge Function          |     | (admin email)    |
+------------------+     +------------------------+     +------------------+
```

---

## Detailed Steps

### 1. Frontend Changes (`DemoPage.tsx`)

**Modify `handleSubmit` function:**
- Remove the `window.location.href = mailto:...` line
- Implement a `fetch` call to the new `send-demo-request` Edge Function
- **Refinement 1:** Explicitly include `headers: {'Content-Type': 'application/json'}` in the fetch request options so the Edge Function can reliably parse the JSON body
- Send the form data as a JSON string in the request body
- Implement loading and error states to provide user feedback

**Updated fetch call structure:**
```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-demo-request`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData),
  }
);
```

**States to Handle:**
- `isLoading`: Show "Submitting..." on button, disable form
- Success: Navigate to existing confirmation screen
- Error: Show toast with error message

### 2. Backend: Edge Function (`send-demo-request`)

**Location:** `supabase/functions/send-demo-request/index.ts`

**Configuration:** Add to `supabase/config.toml`:
```toml
[functions.send-demo-request]
verify_jwt = false
```

**Input Validation (Refinement 2):**
- **Simple validation only** - no `escapeHtml()` or complex HTML escaping since the email is plain text
- Check for required fields (firstName, lastName, email, organization)
- Enforce maximum length constraints on text fields
- Use basic regex for email format validation
- Return 400 Bad Request if validation fails

**Request Payload:**
```typescript
interface DemoRequest {
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  role: string;
  workforceSize: string;
  message?: string;
}
```

**Email Sending:**
- Retrieve `RESEND_API_KEY` from environment (already configured)
- Construct plain text email body using validated form data
- Send to `yiplawcenter@protonmail.com`
- Set reply-to as the requester's email for easy follow-up

**Email Format (Simple Text):**
```
Subject: Demo Request from [First] [Last]

Demo Request Details
--------------------
Name: [First Name] [Last Name]
Email: [Email]
Organization: [Organization]
Role: [Role]
Workforce Size: [Size]
Message: [Message or N/A]

Reply directly to this email to respond to the requester.
```

### 3. Security Considerations

- **CORS:** Dynamic origin validation matching existing Edge Function pattern (whitelist Lovable domains, localhost, custom `ALLOWED_ORIGIN`)
- **API Key Protection:** `RESEND_API_KEY` stored securely in environment, never exposed client-side
- **Input Validation:** Simple validation (required fields, max length, email regex) prevents malformed data
- **No JWT Required:** Public endpoint for form submissions

---

## Deferred Features

| Item | Reason |
|------|--------|
| Requester confirmation email | Future enhancement |
| `demo_requests` database table | Future CRM functionality |
| Complex HTML email templates | Start simple, iterate later |

---

## Implementation Steps

| Step | Description | Estimate |
|------|-------------|----------|
| 1 | Create `send-demo-request` Edge Function with simple validation | 2-3 min |
| 2 | Add function config to `supabase/config.toml` | 1 min |
| 3 | Update `DemoPage.tsx` with fetch call and Content-Type header | 2-3 min |
| 4 | Test end-to-end | 1-2 min |
| **Total** | | **6-9 min** |

**Estimated Credits:** 2-3 credits

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/send-demo-request/index.ts` | Create |
| `supabase/config.toml` | Modify (add function config) |
| `src/pages/DemoPage.tsx` | Modify (replace mailto with fetch) |

---

## Technical Details

### Edge Function Validation Logic

```typescript
// Simple validation - no escapeHtml needed for plain text email
const validateRequest = (data: DemoRequest): string | null => {
  // Required fields
  if (!data.firstName?.trim()) return "First name is required";
  if (!data.lastName?.trim()) return "Last name is required";
  if (!data.email?.trim()) return "Email is required";
  if (!data.organization?.trim()) return "Organization is required";
  
  // Max length checks
  if (data.firstName.length > 100) return "First name too long";
  if (data.lastName.length > 100) return "Last name too long";
  if (data.email.length > 255) return "Email too long";
  if (data.organization.length > 200) return "Organization name too long";
  if (data.message && data.message.length > 2000) return "Message too long";
  
  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) return "Invalid email format";
  
  return null; // Valid
};
```

### Existing Resources Used

- `RESEND_API_KEY` - Already configured in project secrets
- CORS pattern from `send-assignment-email` Edge Function
- Existing loading/success states in `DemoPage.tsx`

