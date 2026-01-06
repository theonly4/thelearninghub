import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Dynamic CORS origin validation
function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const isAllowed = requestOrigin && (
    requestOrigin.endsWith('.lovableproject.com') ||
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

interface ManageEmployeeRequest {
  action: 'create' | 'reset_password' | 'delete';
  email?: string;
  firstName?: string;
  lastName?: string;
  workforceGroups?: string[];
  isContractor?: boolean;
  employeeUserId?: string;
}

// Generate a secure random password
function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  for (let i = 0; i < 16; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
}

Deno.serve(async (req) => {
  const requestOrigin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the calling user
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user is an org_admin
    const { data: roleData, error: roleError } = await authClient
      .from("user_roles")
      .select("role, organization_id")
      .eq("user_id", user.id)
      .eq("role", "org_admin")
      .single();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Only organization admins can manage employees" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminOrgId = roleData.organization_id;

    const body: ManageEmployeeRequest = await req.json();
    const { action, email, firstName, lastName, workforceGroups, isContractor, employeeUserId } = body;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // CREATE EMPLOYEE
    if (action === 'create') {
      if (!email || !firstName || !lastName) {
        return new Response(
          JSON.stringify({ error: "Email, first name, and last name are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tempPassword = generatePassword();

      // Create user account
      const { data: newUser, error: createUserError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName },
      });

      if (createUserError) {
        const errorCode = (createUserError as any).code;
        if (errorCode === "email_exists") {
          return new Response(
            JSON.stringify({ error: "An account with this email already exists" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        console.error("Create user error:", createUserError);
        return new Response(
          JSON.stringify({ error: "Failed to create employee account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete auto-created profile and create new one with correct org
      await adminClient.from("profiles").delete().eq("user_id", newUser.user.id);
      
      const { error: profileError } = await adminClient.from("profiles").insert({
        user_id: newUser.user.id,
        organization_id: adminOrgId,
        email,
        first_name: firstName,
        last_name: lastName,
        workforce_groups: workforceGroups || [],
        is_contractor: isContractor || false,
        status: workforceGroups && workforceGroups.length > 0 ? "active" : "pending_assignment",
      });

      if (profileError) {
        await adminClient.auth.admin.deleteUser(newUser.user.id);
        console.error("Profile error:", profileError);
        return new Response(
          JSON.stringify({ error: "Failed to create employee profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete auto-assigned role and assign workforce_user
      await adminClient.from("user_roles").delete().eq("user_id", newUser.user.id);
      
      const { error: roleInsertError } = await adminClient.from("user_roles").insert({
        user_id: newUser.user.id,
        organization_id: adminOrgId,
        role: "workforce_user",
      });

      if (roleInsertError) {
        await adminClient.from("profiles").delete().eq("user_id", newUser.user.id);
        await adminClient.auth.admin.deleteUser(newUser.user.id);
        console.error("Role error:", roleInsertError);
        return new Response(
          JSON.stringify({ error: "Failed to assign employee role" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Audit log
      await adminClient.from("audit_logs").insert({
        user_id: user.id,
        organization_id: adminOrgId,
        resource_type: "employee",
        resource_id: newUser.user.id,
        action: "create",
        metadata: { employee_email: email, created_by: user.email },
      });

      return new Response(
        JSON.stringify({
          success: true,
          employee: { id: newUser.user.id, email, firstName, lastName },
          temporaryPassword: tempPassword,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // RESET PASSWORD
    if (action === 'reset_password') {
      if (!employeeUserId) {
        return new Response(
          JSON.stringify({ error: "Employee user ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify employee belongs to admin's org
      const { data: empProfile, error: empError } = await adminClient
        .from("profiles")
        .select("organization_id, email")
        .eq("user_id", employeeUserId)
        .single();

      if (empError || !empProfile || empProfile.organization_id !== adminOrgId) {
        return new Response(
          JSON.stringify({ error: "Employee not found in your organization" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newPassword = generatePassword();

      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        employeeUserId,
        { password: newPassword }
      );

      if (updateError) {
        console.error("Password reset error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to reset password" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Audit log
      await adminClient.from("audit_logs").insert({
        user_id: user.id,
        organization_id: adminOrgId,
        resource_type: "employee",
        resource_id: employeeUserId,
        action: "password_reset",
        metadata: { employee_email: empProfile.email, reset_by: user.email },
      });

      return new Response(
        JSON.stringify({ success: true, newPassword, email: empProfile.email }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE EMPLOYEE
    if (action === 'delete') {
      if (!employeeUserId) {
        return new Response(
          JSON.stringify({ error: "Employee user ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify employee belongs to admin's org
      const { data: empProfile, error: empError } = await adminClient
        .from("profiles")
        .select("organization_id, email")
        .eq("user_id", employeeUserId)
        .single();

      if (empError || !empProfile || empProfile.organization_id !== adminOrgId) {
        return new Response(
          JSON.stringify({ error: "Employee not found in your organization" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Audit log before deletion
      await adminClient.from("audit_logs").insert({
        user_id: user.id,
        organization_id: adminOrgId,
        resource_type: "employee",
        resource_id: employeeUserId,
        action: "delete",
        metadata: { employee_email: empProfile.email, deleted_by: user.email },
      });

      // Delete user (cascades to profile and roles)
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(employeeUserId);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        return new Response(
          JSON.stringify({ error: "Failed to delete employee" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
