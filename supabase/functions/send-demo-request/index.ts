import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

interface DemoRequest {
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  role: string;
  workforceSize: string;
  message?: string;
}

function validateRequest(data: DemoRequest): string | null {
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
  if (data.role && data.role.length > 100) return "Role too long";
  if (data.workforceSize && data.workforceSize.length > 50) return "Workforce size too long";
  if (data.message && data.message.length > 2000) return "Message too long";

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) return "Invalid email format";

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

    const data: DemoRequest = await req.json();

    // Validate input
    const validationError = validateRequest(data);
    if (validationError) {
      return new Response(
        JSON.stringify({ error: validationError }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build plain text email body
    const emailBody = `Demo Request Details
--------------------
Name: ${data.firstName.trim()} ${data.lastName.trim()}
Email: ${data.email.trim()}
Organization: ${data.organization.trim()}
Role: ${data.role?.trim() || "Not specified"}
Workforce Size: ${data.workforceSize?.trim() || "Not specified"}
Message: ${data.message?.trim() || "N/A"}

Reply directly to this email to respond to the requester.`;

    const emailPayload = {
      from: "The Learning Hub <onboarding@resend.dev>",
      to: ["yiplawcenter@protonmail.com"],
      reply_to: data.email.trim(),
      subject: `Demo Request from ${data.firstName.trim()} ${data.lastName.trim()}`,
      text: emailBody,
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
    console.log("Demo request email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Demo request submitted successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-demo-request function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to submit demo request" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
