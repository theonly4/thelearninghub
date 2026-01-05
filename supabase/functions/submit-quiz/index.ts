import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Dynamic CORS origin validation - prevents cross-origin attacks while allowing legitimate requests
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

interface SubmittedAnswer {
  questionId: string;
  selectedOption: string;
  timeSpent: number;
}

interface QuizSubmission {
  quizId: string;
  answers: SubmittedAnswer[];
  workforceGroup: string;
}

serve(async (req) => {
  const requestOrigin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(requestOrigin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user's JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User ${user.id} submitting quiz`);

    // Parse the request body
    const submission: QuizSubmission = await req.json();
    const { quizId, answers, workforceGroup } = submission;

    if (!quizId || !answers || !Array.isArray(answers) || !workforceGroup) {
      console.error('Invalid submission data:', { quizId, answersLength: answers?.length, workforceGroup });
      return new Response(
        JSON.stringify({ error: 'Invalid submission data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's profile to verify organization and workforce group
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, workforce_groups')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the quiz from database
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .select('id, title, passing_score, version, hipaa_citations')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      console.error('Quiz error:', quizError);
      return new Response(
        JSON.stringify({ error: 'Quiz not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing quiz: ${quiz.title}`);

    // Fetch quiz questions from database with correct answers
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, question_number, correct_answer, hipaa_section')
      .eq('quiz_id', quizId)
      .order('question_number', { ascending: true });

    if (questionsError || !questions || questions.length === 0) {
      console.error('Questions error:', questionsError);
      return new Response(
        JSON.stringify({ error: 'Quiz questions not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${questions.length} questions for quiz`);

    // Validate submission integrity
    if (answers.length !== questions.length) {
      console.error(`Answer count mismatch: ${answers.length} answers for ${questions.length} questions`);
      return new Response(
        JSON.stringify({ error: 'Incomplete quiz submission - answer count mismatch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Server-side scoring - THIS IS THE CRITICAL SECURITY FIX
    // We verify each answer against the stored correct_answer in the database
    let correctCount = 0;
    const gradedAnswers = [];

    for (const answer of answers) {
      const question = questions.find(q => q.id === answer.questionId);
      if (!question) {
        console.error(`Question not found: ${answer.questionId}`);
        return new Response(
          JSON.stringify({ error: `Invalid question ID: ${answer.questionId}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Server-side correctness validation
      const isCorrect = answer.selectedOption === question.correct_answer;
      if (isCorrect) {
        correctCount++;
      }

      gradedAnswers.push({
        questionId: answer.questionId,
        selectedOption: answer.selectedOption,
        timeSpent: answer.timeSpent,
        isCorrect,
        hipaaSection: question.hipaa_section
      });
    }

    // Calculate score server-side
    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= quiz.passing_score;

    console.log(`Quiz scored: ${score}% (${correctCount}/${questions.length}), passed: ${passed}`);

    // Check for minimum time threshold (anti-cheating measure)
    const totalTimeSpent = answers.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
    const minTimeThreshold = questions.length * 5; // Minimum 5 seconds per question
    
    if (totalTimeSpent < minTimeThreshold) {
      console.warn(`Suspicious submission: Total time ${totalTimeSpent}s is below threshold ${minTimeThreshold}s`);
      // We still process but log for audit purposes
    }

    // Create quiz attempt record in database
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('quiz_attempts')
      .insert({
        user_id: user.id,
        organization_id: profile.organization_id,
        quiz_id: quizId,
        workforce_group_at_time: workforceGroup,
        started_at: new Date(Date.now() - (totalTimeSpent * 1000)).toISOString(),
        completed_at: new Date().toISOString(),
        score,
        total_questions: questions.length,
        answers: gradedAnswers,
        passed
      })
      .select('id')
      .single();

    if (attemptError) {
      console.error('Failed to record quiz attempt:', attemptError);
      return new Response(
        JSON.stringify({ error: 'Failed to record quiz attempt' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Quiz attempt recorded: ${attempt.id}`);

    // If passed, generate certificate SERVER-SIDE
    let certificate = null;
    if (passed) {
      // Generate unique certificate number
      const certNumber = `HIPAA-${workforceGroup.toUpperCase().slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`;
      
      // Certificate valid for 1 year
      const validUntil = new Date();
      validUntil.setFullYear(validUntil.getFullYear() + 1);

      const { data: cert, error: certError } = await supabaseAdmin
        .from('certificates')
        .insert({
          user_id: user.id,
          organization_id: profile.organization_id,
          quiz_attempt_id: attempt.id,
          workforce_group: workforceGroup,
          score,
          certificate_number: certNumber,
          valid_until: validUntil.toISOString(),
          hipaa_citations: quiz.hipaa_citations || []
        })
        .select('id, certificate_number, valid_until')
        .single();

      if (certError) {
        console.error('Failed to generate certificate:', certError);
        // Don't fail the request, just log the error
      } else {
        certificate = cert;
        console.log(`Certificate generated: ${cert.certificate_number}`);
      }
    }

    // Create audit log entry
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        organization_id: profile.organization_id,
        resource_type: 'quiz_attempt',
        resource_id: attempt.id,
        action: 'quiz_submitted',
        metadata: {
          quiz_id: quizId,
          quiz_title: quiz.title,
          score,
          passed,
          total_questions: questions.length,
          correct_count: correctCount,
          total_time_spent: totalTimeSpent,
          workforce_group: workforceGroup,
          certificate_generated: !!certificate
        }
      });

    // Return the server-calculated results
    return new Response(
      JSON.stringify({
        success: true,
        attemptId: attempt.id,
        score,
        passed,
        correctCount,
        totalQuestions: questions.length,
        passingScore: quiz.passing_score,
        certificate,
        gradedAnswers: gradedAnswers.map(a => ({
          questionId: a.questionId,
          isCorrect: a.isCorrect,
          hipaaSection: a.hipaaSection
        }))
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in submit-quiz:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
