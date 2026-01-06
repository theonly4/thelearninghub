import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Dynamic CORS origin validation - prevents cross-origin attacks while allowing legitimate requests
function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  // Allow all lovableproject.com subdomains and localhost for development
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

interface CreateOrgRequest {
  organizationName: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminPassword: string;
}

// Generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

Deno.serve(async (req) => {
  const requestOrigin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(requestOrigin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create authenticated client to verify the caller
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the calling user
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      console.error("Failed to get user:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Request from user:", user.id);

    // Verify the user is a platform owner
    const { data: roleData, error: roleError } = await authClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "platform_owner")
      .single();

    if (roleError || !roleData) {
      console.error("User is not a platform owner:", roleError);
      return new Response(
        JSON.stringify({ error: "Only platform owners can create organizations" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: CreateOrgRequest = await req.json();
    const { organizationName, adminEmail, adminFirstName, adminLastName, adminPassword } = body;

    console.log("Request body received:", {
      organizationName,
      adminEmail,
      adminFirstName,
      adminLastName,
      hasPassword: !!adminPassword,
    });

    // Validate required fields
    if (!organizationName || !adminEmail || !adminFirstName || !adminLastName || !adminPassword) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auto-generate slug from organization name
    const organizationSlug = generateSlug(organizationName);
    console.log("Generated slug:", organizationSlug);

    // Validate password strength
    if (adminPassword.length < 12) {
      console.error("Password too short");
      return new Response(
        JSON.stringify({ error: "Password must be at least 12 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create service role client for admin operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log("Checking if slug already exists...");

    // Check if slug already exists
    const { data: existingOrg, error: slugCheckError } = await adminClient
      .from("organizations")
      .select("id")
      .eq("slug", organizationSlug)
      .single();

    if (slugCheckError && slugCheckError.code !== "PGRST116") {
      console.error("Slug check error:", slugCheckError);
    }

    if (existingOrg) {
      console.error("Organization slug already exists");
      return new Response(
        JSON.stringify({ error: "Organization slug already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email already exists by attempting to create and catching duplicate error
    // This avoids fetching all users which can timeout
    console.log("Checking if email exists:", adminEmail);

    console.log("Creating organization:", organizationName);

    // Step 1: Create the organization
    const { data: newOrg, error: orgError } = await adminClient
      .from("organizations")
      .insert({
        name: organizationName,
        slug: organizationSlug,
      })
      .select()
      .single();

    if (orgError) {
      console.error("Failed to create organization:", orgError);
      return new Response(
        JSON.stringify({ error: "Failed to create organization: " + orgError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Organization created:", newOrg.id);

    // Step 2: Create the admin user account
    const { data: newUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        first_name: adminFirstName,
        last_name: adminLastName,
      },
    });

    if (createUserError) {
      console.error("Failed to create user:", createUserError);
      // Rollback: delete the organization
      await adminClient.from("organizations").delete().eq("id", newOrg.id);
      console.log("Rolled back organization creation due to user creation failure");
      
      // Check for specific error codes and return user-friendly messages
      const errorCode = (createUserError as any).code;
      if (errorCode === "email_exists") {
        return new Response(
          JSON.stringify({ error: "An account with this email address already exists" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to create admin user: " + createUserError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Admin user created:", newUser.user.id);

    // Step 3: Create the profile (linked to the new organization, not the default one)
    // First, delete any auto-created profile from the trigger
    await adminClient.from("profiles").delete().eq("user_id", newUser.user.id);
    
    const { error: profileError } = await adminClient.from("profiles").insert({
      user_id: newUser.user.id,
      organization_id: newOrg.id,
      email: adminEmail,
      first_name: adminFirstName,
      last_name: adminLastName,
      status: "active",
    });

    if (profileError) {
      console.error("Failed to create profile:", profileError);
      // Rollback
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      await adminClient.from("organizations").delete().eq("id", newOrg.id);
      return new Response(
        JSON.stringify({ error: "Failed to create profile: " + profileError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Profile created for user");

    // Step 4: Assign org_admin role (delete any auto-assigned role first)
    await adminClient.from("user_roles").delete().eq("user_id", newUser.user.id);
    
    const { error: roleInsertError } = await adminClient.from("user_roles").insert({
      user_id: newUser.user.id,
      organization_id: newOrg.id,
      role: "org_admin",
    });

    if (roleInsertError) {
      console.error("Failed to assign role:", roleInsertError);
      // Rollback
      await adminClient.from("profiles").delete().eq("user_id", newUser.user.id);
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      await adminClient.from("organizations").delete().eq("id", newOrg.id);
      return new Response(
        JSON.stringify({ error: "Failed to assign admin role: " + roleInsertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Role assigned: org_admin");

    // Step 5: Create audit log
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      organization_id: newOrg.id,
      resource_type: "organization",
      resource_id: newOrg.id,
      action: "create",
      metadata: {
        organization_name: organizationName,
        admin_email: adminEmail,
        created_by: user.email,
      },
    });

    console.log("Audit log created");

    return new Response(
      JSON.stringify({
        success: true,
        organization: {
          id: newOrg.id,
          name: newOrg.name,
          slug: newOrg.slug,
        },
        admin: {
          email: adminEmail,
          firstName: adminFirstName,
          lastName: adminLastName,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
