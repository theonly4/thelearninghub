import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://lovableproject.com",
  ];
  
  // Add pattern matching for lovable subdomains
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

interface UpdateAdminRequest {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
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
        JSON.stringify({ error: "Only platform owners can update admin accounts" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, firstName, lastName, email }: UpdateAdminRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current profile data for audit log
    const { data: currentProfile } = await supabaseAdmin
      .from("profiles")
      .select("organization_id, email, first_name, last_name")
      .eq("user_id", userId)
      .single();

    if (!currentProfile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // If email is changing, update auth.users FIRST
    if (email && email !== currentProfile.email) {
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { 
          email: email,
          user_metadata: {
            first_name: firstName || currentProfile.first_name,
            last_name: lastName || currentProfile.last_name,
          }
        }
      );

      if (authUpdateError) {
        console.error("Error updating auth user:", authUpdateError);
        return new Response(
          JSON.stringify({ error: `Failed to update email: ${authUpdateError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update profile
    const profileUpdates: Record<string, string> = {};
    if (firstName) profileUpdates.first_name = firstName;
    if (lastName) profileUpdates.last_name = lastName;
    if (email) profileUpdates.email = email;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdates)
        .eq("user_id", userId);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        // If we updated auth email but profile failed, try to rollback
        if (email && email !== currentProfile.email) {
          await supabaseAdmin.auth.admin.updateUserById(userId, { email: currentProfile.email });
        }
        return new Response(
          JSON.stringify({ error: `Failed to update profile: ${profileError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Log the action
    await supabaseAdmin.from("audit_logs").insert({
      user_id: caller.id,
      organization_id: currentProfile.organization_id,
      action: "update_admin_account",
      resource_type: "user",
      resource_id: userId,
      metadata: { 
        old_email: currentProfile.email,
        new_email: email || currentProfile.email,
        old_first_name: currentProfile.first_name,
        new_first_name: firstName || currentProfile.first_name,
        old_last_name: currentProfile.last_name,
        new_last_name: lastName || currentProfile.last_name,
      }
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in update-admin-account:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
