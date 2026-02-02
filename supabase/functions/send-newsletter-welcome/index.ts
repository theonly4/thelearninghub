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

interface NewsletterRequest {
  email: string;
}

function validateEmail(email: string): string | null {
  if (!email?.trim()) return "Email is required";
  if (email.length > 255) return "Email too long";
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return "Invalid email format";
  
  return null;
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
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      throw new Error("Email service not configured");
    }

    const { email }: NewsletterRequest = await req.json();

    // Validate input
    const validationError = validateEmail(email);
    if (validationError) {
      return new Response(
        JSON.stringify({ error: validationError }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const safeEmail = escapeHtml(trimmedEmail);

    // Store in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if email already exists
    const { data: existing } = await supabase
      .from("newsletter_subscribers")
      .select("id")
      .eq("email", trimmedEmail)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "This email is already subscribed" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Insert new subscriber
    const { error: insertError } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: trimmedEmail });

    if (insertError) {
      console.error("Error inserting subscriber:", insertError);
      throw new Error("Failed to subscribe");
    }

    // Send welcome email to subscriber
    const welcomeEmailPayload = {
      from: "The Learning Hub <support@learninghub.zone>",
      to: [trimmedEmail],
      subject: "Welcome to The Learning Hub Newsletter!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to The Learning Hub</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); border-radius: 12px; padding: 32px; margin-bottom: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to The Learning Hub!</h1>
          </div>
          
          <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #1e3a8a;">Thank you for subscribing!</h2>
            <p style="margin: 0 0 16px 0;">You're now signed up to receive updates about our compliance learning platform, including:</p>
            
            <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
              <li>New training materials and courses</li>
              <li>Compliance updates and best practices</li>
              <li>Product announcements and features</li>
              <li>Industry insights and tips</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="https://learninghub.zone" style="display: inline-block; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Visit The Learning Hub</a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center; font-size: 12px; color: #6b7280;">
            <p style="margin: 0;">You received this email because you subscribed to The Learning Hub newsletter.</p>
            <p style="margin: 8px 0 0 0;">© ${new Date().getFullYear()} The Learning Hub. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
    };

    const welcomeResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(welcomeEmailPayload),
    });

    if (!welcomeResponse.ok) {
      const errorText = await welcomeResponse.text();
      console.error("Resend API error (welcome):", errorText);
      // Don't throw - the subscription was successful, just email failed
    }

    // Send admin notification
    const adminEmailPayload = {
      from: "The Learning Hub <support@learninghub.zone>",
      to: ["support@learninghub.zone"],
      subject: "New Newsletter Subscriber",
      text: `New newsletter subscription:\n\nEmail: ${trimmedEmail}\nDate: ${new Date().toISOString()}`,
    };

    const adminResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(adminEmailPayload),
    });

    if (!adminResponse.ok) {
      const errorText = await adminResponse.text();
      console.error("Resend API error (admin notification):", errorText);
      // Don't throw - the subscription was successful
    }

    console.log("Newsletter subscription successful:", trimmedEmail);

    return new Response(
      JSON.stringify({ success: true, message: "Successfully subscribed to newsletter" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-newsletter-welcome function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to subscribe" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
