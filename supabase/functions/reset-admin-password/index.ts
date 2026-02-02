import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://lovableproject.com",
  ];
  
  const lovablePattern = /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/;
  
  let origin = "*";
  if (requestOrigin) {
    if (allowedOrigins.includes(requestOrigin) || lovablePattern.test(requestOrigin)) {
      origin = requestOrigin;
    }
  }
  
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

interface ResetPasswordRequest {
  userId: string;
  newPassword: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is platform owner
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "platform_owner")
      .single();

    if (!callerRole) {
      return new Response(
        JSON.stringify({ error: "Only platform owners can reset admin passwords" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, newPassword }: ResetPasswordRequest = await req.json();

    if (!userId || !newPassword) {
      return new Response(
        JSON.stringify({ error: "userId and newPassword are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify target user is an org_admin
    const { data: targetRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "org_admin")
      .single();

    if (!targetRole) {
      return new Response(
        JSON.stringify({ error: "Target user is not an organization admin" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reset the password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error resetting password:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to reset password. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the action
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("organization_id, email")
      .eq("user_id", userId)
      .single();

    if (targetProfile) {
      await supabaseAdmin.from("audit_logs").insert({
        user_id: caller.id,
        organization_id: targetProfile.organization_id,
        action: "reset_admin_password",
        resource_type: "user",
        resource_id: userId,
        metadata: { target_email: targetProfile.email }
      });

      // Send password reset notification email
      try {
        const { data: adminProfile } = await supabaseAdmin
          .from("profiles")
          .select("first_name, last_name")
          .eq("user_id", userId)
          .single();

        const { data: orgData } = await supabaseAdmin
          .from("organizations")
          .select("name")
          .eq("id", targetProfile.organization_id)
          .single();

        await fetch(`${supabaseUrl}/functions/v1/send-welcome-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            recipientName: adminProfile 
              ? `${adminProfile.first_name} ${adminProfile.last_name}` 
              : "Administrator",
            email: targetProfile.email,
            temporaryPassword: newPassword,
            organizationName: orgData?.name || "Your Organization",
            loginUrl: "https://learninghub.zone/login",
            isPasswordReset: true,
          }),
        });
        console.log("Password reset email sent to:", targetProfile.email);
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in reset-admin-password:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
