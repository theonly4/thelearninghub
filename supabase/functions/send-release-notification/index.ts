import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const allowedOrigins = [
  "https://lovable.dev",
  "https://lovable.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = allowedOrigins.some((o) => origin.startsWith(o)) ||
    origin.endsWith('.lovableproject.com') ||
    origin.endsWith('.lovable.app') ||
    origin.endsWith('.lovable.dev') ||
    origin === Deno.env.get("ALLOWED_ORIGIN");
  return {
    "Access-Control-Allow-Origin": allowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

interface ReleaseNotificationRequest {
  adminName: string;
  adminEmail: string;
  organizationName: string;
  contentType: "package" | "material";
  contentTitle: string;
  workforceGroup?: string;
  trainingYear?: number;
  loginUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  
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

    // Verify user has platform_owner role using service client (only platform owners can release content)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "platform_owner")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const {
      adminName,
      adminEmail,
      organizationName,
      contentType,
      contentTitle,
      workforceGroup,
      trainingYear,
      loginUrl,
    }: ReleaseNotificationRequest = await req.json();

    // Escape all user-controlled content to prevent XSS
    const safeAdminName = escapeHtml(adminName);
    const safeOrganizationName = escapeHtml(organizationName);
    const safeContentTitle = escapeHtml(contentTitle);
    const safeWorkforceGroup = workforceGroup ? escapeHtml(workforceGroup) : '';
    const safeLoginUrl = escapeHtml(loginUrl);
    const safeTrainingYear = trainingYear ? Number(trainingYear) : null;

    const contentLabel = contentType === "package" ? "Quiz Package" : "Training Material";
    const icon = contentType === "package" ? "📋" : "📚";

    const emailPayload = {
      from: "HIPAA Training <onboarding@resend.dev>",
      to: [adminEmail],
      subject: `New ${contentLabel} Released - ${safeContentTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Content Released</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px; padding: 32px; margin-bottom: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${icon} New Content Available</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">${safeOrganizationName}</p>
          </div>
          
          <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #059669;">Hello ${safeAdminName},</h2>
            <p style="margin: 0 0 16px 0;">Great news! New HIPAA compliance content has been released to your organization and is now available for assignment.</p>
            
            <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #10b981;">
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #059669;">${contentLabel} Details:</p>
              <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
                <li><strong>Title:</strong> ${safeContentTitle}</li>
                ${safeWorkforceGroup ? `<li><strong>Workforce Group:</strong> ${safeWorkforceGroup}</li>` : ''}
                ${safeTrainingYear ? `<li><strong>Training Year:</strong> ${safeTrainingYear}</li>` : ''}
              </ul>
            </div>
            
            <p style="margin: 0;">You can now assign this content to your employees through the admin dashboard.</p>
          </div>
          
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${safeLoginUrl}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Go to Dashboard</a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center; font-size: 12px; color: #6b7280;">
            <p style="margin: 0;">This is an automated notification from the HIPAA training platform.</p>
            <p style="margin: 8px 0 0 0;">Contact your platform administrator if you have questions.</p>
          </div>
        </body>
        </html>
      `,
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
      throw new Error(`Resend API error: ${errorText}`);
    }

    const emailResponse = await response.json();
    console.log("Release notification sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending release notification:", error);
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
