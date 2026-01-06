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
  rationale: string;
  hipaa_section: string;
  hipaa_topic_id: string | null;
  workforce_groups: string[];
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

    // Parse request body
    const { question_ids, workforce_group } = await req.json();

    if (!question_ids || !Array.isArray(question_ids) || question_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "question_ids array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to access quiz questions (bypasses RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch questions - explicitly exclude correct_answer
    const { data: questions, error: questionsError } = await adminClient
      .from("quiz_questions")
      .select(`
        id,
        quiz_id,
        question_number,
        scenario,
        question_text,
        options,
        rationale,
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

    // Map to public format without correct_answer
    const publicQuestions: QuestionPublic[] = filteredQuestions.map((q: any) => ({
      id: q.id,
      quiz_id: q.quiz_id,
      question_number: q.question_number,
      scenario: q.scenario,
      question_text: q.question_text,
      options: q.options,
      rationale: q.rationale,
      hipaa_section: q.hipaa_section,
      hipaa_topic_id: q.hipaa_topic_id,
      workforce_groups: q.workforce_groups,
    }));

    console.log(`Returned ${publicQuestions.length} questions for user ${user.id}`);

    return new Response(
      JSON.stringify({ questions: publicQuestions }),
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
