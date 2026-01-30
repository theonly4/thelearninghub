import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Dynamic CORS origin validation
function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const isAllowed = requestOrigin && (
    requestOrigin.endsWith('.lovableproject.com') ||
    requestOrigin.endsWith('.lovable.app') ||
    requestOrigin.endsWith('.lovable.dev') ||
    requestOrigin === 'https://lovable.dev' ||
    requestOrigin.startsWith('http://localhost:')
  );

  return {
    'Access-Control-Allow-Origin': isAllowed ? requestOrigin : '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// HTML entity encoding to prevent XSS in email templates
function escapeHtml(text: string): string {
  if (!text) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

interface WelcomeEmailRequest {
  recipientName: string;
  email: string;
  temporaryPassword: string;
  organizationName: string;
  loginUrl: string;
  isPasswordReset: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  const requestOrigin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(requestOrigin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user authentication
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify user has admin role using service client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["org_admin", "platform_owner"])
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const {
      recipientName,
      email,
      temporaryPassword,
      organizationName,
      loginUrl,
      isPasswordReset,
    }: WelcomeEmailRequest = await req.json();

    // Escape all user-controlled content to prevent XSS
    const safeRecipientName = escapeHtml(recipientName);
    const safeOrganizationName = escapeHtml(organizationName);
    const safeEmail = escapeHtml(email);
    const safeTemporaryPassword = escapeHtml(temporaryPassword);
    const safeLoginUrl = escapeHtml(loginUrl);

    const subject = isPasswordReset 
      ? "Your Password Has Been Reset - The Learning Hub"
      : "Welcome to The Learning Hub - Your Account Credentials";

    const headerTitle = isPasswordReset 
      ? "Password Reset"
      : "Welcome to The Learning Hub";

    const introText = isPasswordReset
      ? "Your password has been reset by your administrator. Please use the credentials below to log in:"
      : "Your account has been created. Please use the credentials below to log in:";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${headerTitle}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); border-radius: 12px; padding: 32px; margin-bottom: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${headerTitle}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">${safeOrganizationName}</p>
        </div>
        
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #1e3a8a;">Hello ${safeRecipientName},</h2>
          <p style="margin: 0 0 16px 0;">${introText}</p>
          
          <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #3b82f6;">
            <p style="margin: 0 0 12px 0; font-weight: 600; color: #1e3a8a;">Your Login Credentials:</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 120px;">Login URL:</td>
                <td style="padding: 8px 0;"><a href="${safeLoginUrl}" style="color: #3b82f6; text-decoration: none;">${safeLoginUrl}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Email:</td>
                <td style="padding: 8px 0; font-weight: 500;">${safeEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Password:</td>
                <td style="padding: 8px 0; font-family: monospace; font-weight: 500; background: #f1f5f9; padding: 4px 8px; border-radius: 4px;">${safeTemporaryPassword}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px; margin: 16px 0;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              ⚠️ <strong>Important:</strong> Please log in and change your password immediately. You will also need to set up Multi-Factor Authentication (MFA) for security.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${safeLoginUrl}" style="display: inline-block; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Log In Now</a>
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center; font-size: 12px; color: #6b7280;">
          <p style="margin: 0;">This is an automated message from your organization's compliance learning system.</p>
          <p style="margin: 8px 0 0 0;">If you did not expect this email, please contact your administrator.</p>
        </div>
      </body>
      </html>
    `;

    const emailPayload = {
      from: "The Learning Hub <onboarding@resend.dev>",
      to: [email],
      subject,
      html: emailHtml,
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Resend API error: ${errorText}`);
    }

    const emailResponse = await response.json();
    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
