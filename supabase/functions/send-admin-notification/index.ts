import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAIL = "support@learninghub.zone";

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

type NotificationType = 'new_signup' | 'password_reset' | 'demo_request' | 'new_account';

interface AdminNotificationRequest {
  type: NotificationType;
  data: Record<string, any>;
}

function getSubject(type: NotificationType, data: Record<string, any>): string {
  switch (type) {
    case 'new_signup':
      return 'New Newsletter Subscriber';
    case 'password_reset':
      return `Password Reset Request - ${data.email || 'Unknown'}`;
    case 'demo_request':
      return `Demo Request from ${data.name || 'Unknown'}`;
    case 'new_account':
      return `New Account Created - ${data.email || 'Unknown'}`;
    default:
      return 'Admin Notification';
  }
}

function getEmailBody(type: NotificationType, data: Record<string, any>): string {
  const timestamp = new Date().toISOString();
  
  switch (type) {
    case 'new_signup':
      return `New newsletter subscription:

Email: ${data.email || 'Unknown'}
Date: ${timestamp}`;
    
    case 'password_reset':
      return `Password reset request:

Email: ${data.email || 'Unknown'}
User: ${data.name || 'Unknown'}
Date: ${timestamp}`;
    
    case 'demo_request':
      return `Demo request received:

Name: ${data.name || 'Unknown'}
Email: ${data.email || 'Unknown'}
Organization: ${data.organization || 'Not specified'}
Role: ${data.role || 'Not specified'}
Workforce Size: ${data.workforceSize || 'Not specified'}
Message: ${data.message || 'N/A'}
Date: ${timestamp}`;
    
    case 'new_account':
      return `New account created:

Email: ${data.email || 'Unknown'}
Name: ${data.name || 'Unknown'}
Organization: ${data.organization || 'Unknown'}
Role: ${data.role || 'Unknown'}
Date: ${timestamp}`;
    
    default:
      return `Admin notification:

Type: ${type}
Data: ${JSON.stringify(data, null, 2)}
Date: ${timestamp}`;
  }
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    // Optional authentication check - can be called internally or by admins
    const authHeader = req.headers.get("Authorization");
    
    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      // Verify user authentication if header provided
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

      // Verify user has admin role
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
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      throw new Error("Email service not configured");
    }

    const { type, data }: AdminNotificationRequest = await req.json();

    if (!type) {
      return new Response(
        JSON.stringify({ error: "Notification type is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const subject = getSubject(type, data);
    const body = getEmailBody(type, data);

    const emailPayload = {
      from: "The Learning Hub <support@learninghub.zone>",
      to: [ADMIN_EMAIL],
      subject,
      text: body,
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
      throw new Error(`Email service error: ${errorText}`);
    }

    const emailResponse = await response.json();
    console.log("Admin notification sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-admin-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send notification" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
