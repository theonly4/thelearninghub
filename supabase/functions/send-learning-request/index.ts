import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LearningRequestPayload {
  workforceGroups: string[];
}

const WORKFORCE_GROUP_LABELS: Record<string, string> = {
  all_staff: "All Staff",
  clinical: "Clinical Staff",
  administrative: "Administrative Staff",
  management: "Management & Leadership",
  it: "IT/Security Personnel",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user from the JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Invalid token");
    }

    // Get user profile and organization
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name, email, organization_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found");
    }

    // Get organization name
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", profile.organization_id)
      .single();

    if (orgError || !org) {
      throw new Error("Organization not found");
    }

    const { workforceGroups }: LearningRequestPayload = await req.json();

    if (!workforceGroups || workforceGroups.length === 0) {
      throw new Error("No workforce groups selected");
    }

    const groupLabels = workforceGroups.map(g => WORKFORCE_GROUP_LABELS[g] || g);
    const currentDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a5f, #2d5a87); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef; }
            .footer { background: #1e3a5f; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; }
            .groups-list { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .group-item { padding: 8px 12px; background: #e7f3ff; border-radius: 4px; margin: 5px 0; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Learning Content Request</h1>
            </div>
            <div class="content">
              <p><strong>Organization:</strong> ${org.name}</p>
              <p><strong>Requested by:</strong> ${profile.first_name} ${profile.last_name}</p>
              <p><strong>Email:</strong> ${profile.email}</p>
              <p><strong>Date:</strong> ${currentDate}</p>
              
              <div class="groups-list">
                <p><strong>Requested content for:</strong></p>
                ${groupLabels.map(g => `<span class="group-item">${g}</span>`).join(" ")}
              </div>
            </div>
            <div class="footer">
              <p>The Learning Hub | learninghub.zone</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "The Learning Hub <support@learninghub.zone>",
      to: ["yiplawcenter@protonmail.com"],
      subject: `Learning Content Request from ${org.name}`,
      html: emailHtml,
    });

    console.log("Learning request email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Request sent successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-learning-request:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
