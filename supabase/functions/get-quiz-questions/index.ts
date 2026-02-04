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

interface QuestionPublic {
  id: string;
  quiz_id: string;
  question_number: number;
  scenario: string | null;
  question_text: string;
  options: { label: string; text: string }[];
  // correct_answer is intentionally excluded - answers are only revealed after quiz submission
  // rationale is intentionally excluded - revealed only after user answers each question
  hipaa_section: string;
  hipaa_topic_id: string | null;
  workforce_groups: string[];
}

interface ReleasedPackageResponse {
  package: {
    package_id: string;
    package_name: string;
    workforce_group: string;
    training_year: number;
    passing_score: number;
    max_attempts: number | null;
    attempts_used: number;
  } | null;
  questions: QuestionPublic[];
  training_status: {
    total_materials: number;
    completed_materials: number;
    materials_complete: boolean;
  };
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
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to access tables (bypasses RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Parse request body
    const body = await req.json();
    const { mode, question_ids, workforce_group } = body;

    // NEW MODE: Get released package for the authenticated user
    if (mode === "released_package_for_user") {
      return await handleReleasedPackageForUser(user.id, adminClient, corsHeaders);
    }

    // EXISTING MODE: Get questions by IDs (original functionality)
    return await handleGetQuestionsByIds(question_ids, workforce_group, user.id, adminClient, corsHeaders);

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// NEW: Handle released package lookup for user
async function handleReleasedPackageForUser(
  userId: string,
  adminClient: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    // 1. Get user profile
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("organization_id, workforce_groups")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Profile error:", profileError);
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const organizationId = profile.organization_id;
    const profileWorkforceGroups = (profile.workforce_groups || []) as string[];

    // 2. Check for active training assignment to get the correct workforce group
    const { data: activeAssignment } = await adminClient
      .from("training_assignments")
      .select("workforce_group")
      .eq("assigned_to", userId)
      .eq("organization_id", organizationId)
      .in("status", ["assigned", "in_progress"])
      .order("assigned_at", { ascending: false })
      .limit(1)
      .single();

    // Use assignment workforce group if available, otherwise fall back to profile's first group
    const resolvedWorkforceGroup = activeAssignment?.workforce_group || profileWorkforceGroups[0];

    if (!resolvedWorkforceGroup) {
      const response: ReleasedPackageResponse = {
        package: null,
        questions: [],
        training_status: { total_materials: 0, completed_materials: 0, materials_complete: false }
      };
      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Find released package for this org + workforce group
    const { data: packageRelease, error: releaseError } = await adminClient
      .from("package_releases")
      .select(`
        package_id,
        workforce_group,
        training_year,
        passing_score_override,
        max_attempts,
        question_packages (
          name
        )
      `)
      .eq("organization_id", organizationId)
      .eq("workforce_group", resolvedWorkforceGroup)
      .order("training_year", { ascending: false })
      .limit(1)
      .single();

    // 4. Get training materials completion status
    const { data: releasedMaterials } = await adminClient
      .from("content_releases")
      .select("content_id")
      .eq("organization_id", organizationId)
      .eq("content_type", "training_material");

    const releasedIds = releasedMaterials?.map((r: any) => r.content_id) || [];
    let totalMaterials = 0;
    let completedMaterials = 0;

    if (releasedIds.length > 0) {
      // Include materials that match EITHER the assigned workforce group OR all_staff
      const { data: materialsData } = await adminClient
        .from("training_materials")
        .select("id, workforce_groups")
        .in("id", releasedIds);

      // Filter to materials that apply to this user (specific group OR all_staff)
      const applicableMaterials = (materialsData || []).filter((m: any) => 
        m.workforce_groups?.includes(resolvedWorkforceGroup) || 
        m.workforce_groups?.includes("all_staff")
      );
      
      const materialIds = applicableMaterials.map((m: any) => m.id);
      totalMaterials = materialIds.length;

      if (materialIds.length > 0) {
        const { data: progressData } = await adminClient
          .from("user_training_progress")
          .select("material_id")
          .eq("user_id", userId)
          .in("material_id", materialIds);

        completedMaterials = progressData?.length || 0;
      }
    }

    const materialsComplete = completedMaterials >= totalMaterials && totalMaterials > 0;

    // If no package released
    if (releaseError && releaseError.code === "PGRST116") {
      const response: ReleasedPackageResponse = {
        package: null,
        questions: [],
        training_status: { total_materials: totalMaterials, completed_materials: completedMaterials, materials_complete: materialsComplete }
      };
      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (releaseError) {
      console.error("Package release error:", releaseError);
      throw releaseError;
    }

    // 5. Get questions for this package
    const { data: packageQuestions, error: questionsError } = await adminClient
      .from("package_questions")
      .select("question_id")
      .eq("package_id", packageRelease.package_id);

    if (questionsError) {
      console.error("Package questions error:", questionsError);
      throw questionsError;
    }

    const questionIds = packageQuestions?.map((pq: any) => pq.question_id) || [];

    // 6. Fetch question data - EXCLUDE correct_answer to prevent cheating
    // Correct answers are only returned by submit-quiz edge function after submission
    let questions: QuestionPublic[] = [];
    if (questionIds.length > 0) {
      const { data: questionsData, error: qError } = await adminClient
        .from("quiz_questions")
        .select(`
          id,
          quiz_id,
          question_number,
          scenario,
          question_text,
          options,
          hipaa_section,
          hipaa_topic_id,
          workforce_groups
        `)
        .in("id", questionIds);

      if (qError) {
        console.error("Quiz questions error:", qError);
        throw qError;
      }

      questions = (questionsData || [])
        .map((q: any) => ({
          id: q.id,
          quiz_id: q.quiz_id,
          question_number: q.question_number,
          scenario: q.scenario,
          question_text: q.question_text,
          options: q.options,
          // correct_answer and rationale intentionally excluded - revealed only after quiz submission
          hipaa_section: q.hipaa_section,
          hipaa_topic_id: q.hipaa_topic_id,
          workforce_groups: q.workforce_groups,
        }))
        .sort((a: any, b: any) => a.question_number - b.question_number);
    }

    // 7. Count previous quiz attempts for this user + package
    const { count: attemptsCount } = await adminClient
      .from("quiz_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("quiz_id", packageRelease.package_id);

    const attemptsUsed = attemptsCount || 0;
    const passingScore = packageRelease.passing_score_override || 80;
    const maxAttempts = packageRelease.max_attempts || null;

    const response: ReleasedPackageResponse = {
      package: {
        package_id: packageRelease.package_id,
        package_name: (packageRelease.question_packages as any)?.name || "HIPAA Assessment",
        workforce_group: packageRelease.workforce_group,
        training_year: packageRelease.training_year,
        passing_score: passingScore,
        max_attempts: maxAttempts,
        attempts_used: attemptsUsed,
      },
      questions,
      training_status: {
        total_materials: totalMaterials,
        completed_materials: completedMaterials,
        materials_complete: materialsComplete,
      },
    };

    console.log(`Returned released package for user ${userId}: ${response.package?.package_id || 'none'}, attempts: ${attemptsUsed}/${maxAttempts || 'unlimited'}`);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in handleReleasedPackageForUser:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch released package" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// EXISTING: Handle get questions by IDs
async function handleGetQuestionsByIds(
  question_ids: string[] | undefined,
  workforce_group: string | undefined,
  userId: string,
  adminClient: any,
  corsHeaders: Record<string, string>
): Promise<Response> {

  if (!question_ids || !Array.isArray(question_ids) || question_ids.length === 0) {
    return new Response(
      JSON.stringify({ error: "question_ids array is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Fetch questions - explicitly exclude correct_answer and rationale
  const { data: questions, error: questionsError } = await adminClient
    .from("quiz_questions")
    .select(`
      id,
      quiz_id,
      question_number,
      scenario,
      question_text,
      options,
      hipaa_section,
      hipaa_topic_id,
      workforce_groups
    `)
    .in("id", question_ids);

  if (questionsError) {
    console.error("Error fetching questions:", questionsError);
    return new Response(
      JSON.stringify({ error: "Failed to fetch questions" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Filter by workforce group if provided
  let filteredQuestions = questions || [];
  if (workforce_group) {
    filteredQuestions = filteredQuestions.filter((q: any) => 
      q.workforce_groups?.includes(workforce_group) || 
      q.workforce_groups?.includes("all_staff")
    );
  }

  // Map to public format without correct_answer and rationale
  const publicQuestions: QuestionPublic[] = filteredQuestions.map((q: any) => ({
    id: q.id,
    quiz_id: q.quiz_id,
    question_number: q.question_number,
    scenario: q.scenario,
    question_text: q.question_text,
    options: q.options,
    // correct_answer and rationale excluded - revealed only after quiz submission
    hipaa_section: q.hipaa_section,
    hipaa_topic_id: q.hipaa_topic_id,
    workforce_groups: q.workforce_groups,
  }));

  console.log(`Returned ${publicQuestions.length} questions for user ${userId}`);

  return new Response(
    JSON.stringify({ questions: publicQuestions }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
