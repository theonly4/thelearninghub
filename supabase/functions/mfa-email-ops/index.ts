import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Security constants
const CODE_EXPIRY_MINUTES = 10;
const MAX_CODES_PER_PERIOD = 3;
const RATE_LIMIT_PERIOD_MINUTES = 10;
const MAX_ATTEMPTS_PER_CODE = 5;
const SESSION_EXPIRY_HOURS = 8;

interface MfaEmailRequest {
  action: "send-code" | "verify-code" | "check-session";
  code?: string;
}

// Generate a random 6-digit code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash a code using SHA-256
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create client with user's JWT for auth validation
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { action, code }: MfaEmailRequest = await req.json();

    if (action === "send-code") {
      // Rate limiting: Check how many codes sent in the last N minutes
      const rateLimitCutoff = new Date(
        Date.now() - RATE_LIMIT_PERIOD_MINUTES * 60 * 1000
      ).toISOString();

      const { count } = await supabaseAdmin
        .from("mfa_email_codes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", rateLimitCutoff);

      if (count !== null && count >= MAX_CODES_PER_PERIOD) {
        return new Response(
          JSON.stringify({
            error: "rate_limited",
            message: `Please wait before requesting another code. Maximum ${MAX_CODES_PER_PERIOD} codes per ${RATE_LIMIT_PERIOD_MINUTES} minutes.`,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate and store new code
      const newCode = generateCode();
      const codeHash = await hashCode(newCode);
      const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000).toISOString();

      // Invalidate any existing unused codes for this user
      await supabaseAdmin
        .from("mfa_email_codes")
        .update({ used: true })
        .eq("user_id", user.id)
        .eq("used", false);

      // Store new code
      const { error: insertError } = await supabaseAdmin
        .from("mfa_email_codes")
        .insert({
          user_id: user.id,
          code_hash: codeHash,
          expires_at: expiresAt,
        });

      if (insertError) {
        console.error("Error storing code:", insertError);
        throw new Error("Failed to generate verification code");
      }

      // Get user's profile for name
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("first_name, email")
        .eq("user_id", user.id)
        .single();

      const userName = profile?.first_name || "User";
      const userEmail = profile?.email || user.email;

      // Send email with code
      if (!resendApiKey) {
        console.error("RESEND_API_KEY not configured");
        throw new Error("Email service not configured");
      }

      const resend = new Resend(resendApiKey);

      const { error: emailError } = await resend.emails.send({
        from: "The Learning Hub <noreply@thelearninghub.lovable.app>",
        to: [userEmail!],
        subject: "Your Verification Code - The Learning Hub",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                      <td style="padding: 40px 32px; text-align: center;">
                        <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: #18181b;">
                          Your Verification Code
                        </h1>
                        <p style="margin: 0 0 24px 0; font-size: 16px; color: #52525b; line-height: 1.5;">
                          Hello ${userName},
                        </p>
                        <p style="margin: 0 0 24px 0; font-size: 16px; color: #52525b; line-height: 1.5;">
                          Your one-time verification code is:
                        </p>
                        <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
                          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #18181b; font-family: monospace;">
                            ${newCode}
                          </span>
                        </div>
                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #71717a;">
                          This code expires in ${CODE_EXPIRY_MINUTES} minutes.
                        </p>
                        <p style="margin: 0; font-size: 14px; color: #71717a;">
                          If you didn't request this code, you can safely ignore this email.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 24px 32px; border-top: 1px solid #e4e4e7; text-align: center;">
                        <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                          The Learning Hub | Compliance Learning Platform
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });

      if (emailError) {
        console.error("Email send error:", emailError);
        throw new Error("Failed to send verification email");
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Verification code sent to your email",
          expiresIn: CODE_EXPIRY_MINUTES * 60,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify-code") {
      if (!code || code.length !== 6) {
        return new Response(
          JSON.stringify({ error: "invalid_code", message: "Please enter a 6-digit code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get the latest unused code for this user
      const { data: codeRecord, error: fetchError } = await supabaseAdmin
        .from("mfa_email_codes")
        .select("*")
        .eq("user_id", user.id)
        .eq("used", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !codeRecord) {
        return new Response(
          JSON.stringify({
            error: "no_code",
            message: "No verification code found. Please request a new one.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if code has expired
      if (new Date(codeRecord.expires_at) < new Date()) {
        await supabaseAdmin
          .from("mfa_email_codes")
          .update({ used: true })
          .eq("id", codeRecord.id);

        return new Response(
          JSON.stringify({
            error: "code_expired",
            message: "This code has expired. Please request a new one.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check attempt limit
      if (codeRecord.attempts >= MAX_ATTEMPTS_PER_CODE) {
        await supabaseAdmin
          .from("mfa_email_codes")
          .update({ used: true })
          .eq("id", codeRecord.id);

        return new Response(
          JSON.stringify({
            error: "too_many_attempts",
            message: "Too many failed attempts. Please request a new code.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the code
      const submittedHash = await hashCode(code);
      if (submittedHash !== codeRecord.code_hash) {
        // Increment attempt counter
        await supabaseAdmin
          .from("mfa_email_codes")
          .update({ attempts: codeRecord.attempts + 1 })
          .eq("id", codeRecord.id);

        const remainingAttempts = MAX_ATTEMPTS_PER_CODE - codeRecord.attempts - 1;

        return new Response(
          JSON.stringify({
            error: "invalid_code",
            message: `Incorrect code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? "s" : ""} remaining.`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Code is valid - mark as used
      await supabaseAdmin
        .from("mfa_email_codes")
        .update({ used: true })
        .eq("id", codeRecord.id);

      // Get current session ID
      const { data: sessionData } = await supabaseUser.auth.getSession();
      const sessionId = sessionData?.session?.access_token || user.id;

      // Create email MFA session
      const sessionExpiresAt = new Date(
        Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000
      ).toISOString();

      // Upsert session (in case user re-verifies)
      await supabaseAdmin.from("mfa_email_sessions").upsert(
        {
          user_id: user.id,
          session_id: sessionId,
          expires_at: sessionExpiresAt,
          verified_at: new Date().toISOString(),
        },
        { onConflict: "user_id,session_id" }
      );

      // Update profile to set mfa_method to 'email' if not already set
      await supabaseAdmin
        .from("profiles")
        .update({ mfa_method: "email", mfa_enabled: true })
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Verification successful",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "check-session") {
      // Get current session
      const { data: sessionData } = await supabaseUser.auth.getSession();
      const sessionId = sessionData?.session?.access_token || user.id;

      // Check for valid email MFA session
      const { data: mfaSession } = await supabaseAdmin
        .from("mfa_email_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("session_id", sessionId)
        .gte("expires_at", new Date().toISOString())
        .single();

      return new Response(
        JSON.stringify({
          verified: !!mfaSession,
          expiresAt: mfaSession?.expires_at || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "invalid_action", message: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("MFA email ops error:", error);
    return new Response(
      JSON.stringify({ error: "server_error", message: error.message || "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
