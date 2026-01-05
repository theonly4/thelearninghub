import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Dynamic CORS origin validation
function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigins = [
    Deno.env.get('ALLOWED_ORIGIN'),
    'https://yzuvyvtspdjmewuakpkn.lovableproject.com',
    'https://lovable.dev',
    'http://localhost:5173',
    'http://localhost:8080',
  ].filter(Boolean) as string[];

  const origin = requestOrigin && allowedOrigins.some(allowed => 
    requestOrigin === allowed || requestOrigin.endsWith('.lovable.dev') || requestOrigin.endsWith('.lovableproject.com')
  ) ? requestOrigin : allowedOrigins[0] || 'https://lovable.dev';

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

interface CompleteTrainingRequest {
  material_id: string;
}

serve(async (req) => {
  const requestOrigin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(requestOrigin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User ${user.id} requesting training completion`);

    // Parse request body
    const body: CompleteTrainingRequest = await req.json();
    const { material_id } = body;

    if (!material_id) {
      return new Response(
        JSON.stringify({ error: 'material_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's profile and organization
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, workforce_groups')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the training material exists
    const { data: material, error: materialError } = await supabaseAdmin
      .from('training_materials')
      .select('id, version, workforce_groups, title')
      .eq('id', material_id)
      .single();

    if (materialError || !material) {
      console.error('Training material not found:', materialError);
      return new Response(
        JSON.stringify({ error: 'Training material not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has an active training assignment for this workforce group
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('training_assignments')
      .select('id, workforce_group, status')
      .eq('assigned_to', user.id)
      .eq('organization_id', profile.organization_id)
      .in('status', ['assigned', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (assignmentError) {
      console.error('Error checking assignment:', assignmentError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify training assignment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is allowed to complete this material
    // Either they have an active assignment or their profile workforce groups include the material's groups
    const userWorkforceGroups = profile.workforce_groups || [];
    const materialWorkforceGroups = material.workforce_groups || [];
    
    const hasMatchingGroup = userWorkforceGroups.some((group: string) => 
      materialWorkforceGroups.includes(group)
    );

    const hasActiveAssignment = assignment && materialWorkforceGroups.includes(assignment.workforce_group);

    if (!hasMatchingGroup && !hasActiveAssignment) {
      console.error('User not authorized for this material');
      return new Response(
        JSON.stringify({ error: 'Not authorized to complete this training material' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already completed (prevent duplicates)
    const { data: existingProgress } = await supabaseAdmin
      .from('user_training_progress')
      .select('id')
      .eq('user_id', user.id)
      .eq('material_id', material_id)
      .maybeSingle();

    if (existingProgress) {
      console.log('Material already completed by user');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Material already completed',
          already_completed: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert the training progress record using service role (bypasses RLS)
    const { data: progressRecord, error: insertError } = await supabaseAdmin
      .from('user_training_progress')
      .insert({
        user_id: user.id,
        organization_id: profile.organization_id,
        material_id: material_id,
        version_at_completion: material.version,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert progress:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to record training progress' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Training progress recorded for user ${user.id}, material ${material_id}`);

    // Create audit log entry
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        organization_id: profile.organization_id,
        action: 'training_material_completed',
        resource_type: 'training_material',
        resource_id: material_id,
        metadata: {
          material_title: material.title,
          version_completed: material.version,
          completed_at: new Date().toISOString(),
        },
      });

    // Check if all materials for the assignment are complete
    if (assignment) {
      // Get all materials for this workforce group
      const { data: allMaterials } = await supabaseAdmin
        .from('training_materials')
        .select('id')
        .contains('workforce_groups', [assignment.workforce_group]);

      const totalMaterials = allMaterials?.length || 0;

      // Get completed materials count
      const { count: completedCount } = await supabaseAdmin
        .from('user_training_progress')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('organization_id', profile.organization_id);

      const allComplete = completedCount && completedCount >= totalMaterials;

      if (allComplete && assignment.status !== 'completed') {
        // Update assignment status to completed
        await supabaseAdmin
          .from('training_assignments')
          .update({ 
            status: 'completed', 
            completed_at: new Date().toISOString() 
          })
          .eq('id', assignment.id);

        console.log(`Training assignment ${assignment.id} marked as completed`);
      } else if (assignment.status === 'assigned') {
        // Update to in_progress
        await supabaseAdmin
          .from('training_assignments')
          .update({ status: 'in_progress' })
          .eq('id', assignment.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Training material completed successfully',
        progress_id: progressRecord.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
