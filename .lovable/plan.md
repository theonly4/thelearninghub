
## STATUS (what’s true right now)
- **RESEND_API_KEY secret:** Present in project secrets (I can confirm it exists, but **I cannot view or show the value** for security).
- **send-welcome-email deployment:** The `send-welcome-email` backend function is deployed and running.
- **Direct live test (from here):** Calling `/send-welcome-email` returned **401 `{ "error": "Authorization required" }`**, which means the request had **no user login token** attached (so the function correctly refused to run).
- **Most likely root cause of “nothing in Resend dashboard”:** The three “caller” functions (`create-organization`, `manage-employee`, `reset-admin-password`) currently call `send-welcome-email` with:
  - `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
  - BUT `send-welcome-email` expects a **real user JWT** so it can run `auth.getUser()` and verify role.
  - Result: `send-welcome-email` rejects before it ever calls Resend → **no emails show up in Resend**.

## 1-SENTENCE FIX
Change the internal fetches so they forward the **original request’s Authorization header (user JWT)** to `send-welcome-email` (instead of the service-role key), so `send-welcome-email` can authenticate + then actually call Resend.

## TEST RESULT (current)
- **Current test result:** `send-welcome-email` → **401 Authorization required** (because no user session token was included in the test call from here).

---

## Minimal-change implementation steps (kept to 1–2 credits)
### Step 1 — Fix auth header forwarding (3 files, tiny edits)
In each of these files, update the `fetch(.../send-welcome-email)` headers:

1) `supabase/functions/create-organization/index.ts`
- Replace:
  - `"Authorization": \`Bearer ${supabaseServiceKey}\``
- With:
  - `"Authorization": authHeader`

2) `supabase/functions/manage-employee/index.ts` (2 occurrences: create + reset_password)
- Replace:
  - `"Authorization": \`Bearer ${supabaseServiceKey}\``
- With:
  - `"Authorization": authHeader`

3) `supabase/functions/reset-admin-password/index.ts`
- Replace:
  - `"Authorization": \`Bearer ${supabaseServiceKey}\``
- With:
  - `"Authorization": authHeader`

Why this is minimal + correct:
- Those caller functions already validate the user and already have `authHeader`.
- `send-welcome-email` is explicitly designed to authenticate a user + role-check; forwarding the user JWT satisfies that design.

### Step 2 — (Optional but recommended, still tiny) Log non-200 responses
Right now those callers log “email sent” even if `send-welcome-email` returns 401/403/500.
Add a minimal `response.ok` check so failures are visible immediately in backend logs (no silent failures).

### Step 3 — Deploy
These backend functions will redeploy automatically after the code change.

### Step 4 — Live test (the fastest reliable confirmation)
Because the email function requires a user JWT, the test must be done while you’re logged in as a permitted role.

**Test A (preferred):** Trigger a real flow in the UI
- Log in as **platform owner**
- Create an organization (this triggers `create-organization` → `send-welcome-email`)
- Expected:
  - `send-welcome-email` logs include **“Welcome email sent successfully:”** with a Resend `id`
  - Email appears in **https://resend.com/emails**

**Test B (direct endpoint test):**
- After you’re logged in in the preview, I can re-run the `/send-welcome-email` call and expect **200** with `{ success: true, data: { id: ... } }`

### Step 5 — If it still doesn’t appear in Resend (only if needed)
- Confirm in Resend:
  - `learninghub.zone` is still **Verified**
  - the **API key scope** matches the `from` domain (`support@learninghub.zone`)
- If mismatch, Resend will reject sends (and we’ll see the error once Step 2 logging is in place).

---

## Expected outcome after fix
- `create-organization`, `manage-employee`, and `reset-admin-password` will successfully invoke `send-welcome-email`.
- `send-welcome-email` will pass auth + role checks, then call Resend, and emails will show in the Resend dashboard.
