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
  quizId?: string;       // Traditional quiz ID (from quizzes table)
  packageId?: string;    // Package ID (from question_packages table)
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
    const { quizId, packageId, answers, workforceGroup } = submission;

    if ((!quizId && !packageId) || !answers || !Array.isArray(answers) || !workforceGroup) {
      console.error('Invalid submission data:', { quizId, packageId, answersLength: answers?.length, workforceGroup });
      return new Response(
        JSON.stringify({ error: 'Invalid submission data - quizId or packageId required' }),
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

    let quizTitle = "HIPAA Assessment";
    let passingScore = 80;
    let maxAttempts: number | null = null;
    let hipaa_citations: string[] = [];
    let questions: { id: string; question_number: number; question_text: string; options: { label: string; text: string }[]; correct_answer: string; hipaa_section: string; rationale: string }[] = [];
    let quizIdForRecord: string;

    // Handle package-based submission (new flow)
    if (packageId) {
      console.log(`Processing package-based submission for package: ${packageId}`);

      // Fetch the package details including workforce_group and sequence_number
      const { data: packageData, error: packageError } = await supabaseAdmin
        .from('question_packages')
        .select('id, name, workforce_group, sequence_number')
        .eq('id', packageId)
        .single();

      if (packageError || !packageData) {
        console.error('Package error:', packageError);
        return new Response(
          JSON.stringify({ error: 'Question package not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      quizTitle = packageData.name;

      // Fetch package release for this org to get passing_score_override and max_attempts
      const { data: packageRelease } = await supabaseAdmin
        .from('package_releases')
        .select('passing_score_override, max_attempts')
        .eq('package_id', packageId)
        .eq('organization_id', profile.organization_id)
        .single();

      if (packageRelease) {
        if (packageRelease.passing_score_override) {
          passingScore = packageRelease.passing_score_override;
        }
        maxAttempts = packageRelease.max_attempts;
      }

      // Check max attempts if configured
      if (maxAttempts !== null) {
        const { count: existingAttempts } = await supabaseAdmin
          .from('quiz_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('quiz_id', packageId);

        if (existingAttempts !== null && existingAttempts >= maxAttempts) {
          console.log(`User ${user.id} has reached max attempts (${existingAttempts}/${maxAttempts}) for package ${packageId}`);
          return new Response(
            JSON.stringify({ 
              error: 'Maximum attempts reached', 
              message: 'You have used all available attempts for this quiz. Please contact your administrator for assistance.',
              attempts_used: existingAttempts,
              max_attempts: maxAttempts
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Check if a quizzes record already exists for this package
      const { data: existingQuiz, error: quizCheckError } = await supabaseAdmin
        .from('quizzes')
        .select('id')
        .eq('id', packageId)
        .maybeSingle();

      if (quizCheckError) {
        console.error('Error checking for existing quiz:', quizCheckError);
      }

      // If no quizzes record exists, create one using the package ID
      if (!existingQuiz) {
        console.log(`Creating quizzes record for package: ${packageId}`);
        
        const { error: quizInsertError } = await supabaseAdmin
          .from('quizzes')
          .insert({
            id: packageId, // Use package ID as quiz ID
            title: packageData.name,
            description: `Auto-generated from question package: ${packageData.name}`,
            workforce_groups: [packageData.workforce_group],
            passing_score: 80,
            sequence_number: packageData.sequence_number,
            effective_date: new Date().toISOString().split('T')[0],
            status: 'published',
            version: 1,
            hipaa_citations: []
          });

        if (quizInsertError) {
          console.error('Failed to create quizzes record:', quizInsertError);
          return new Response(
            JSON.stringify({ error: 'Failed to initialize quiz record' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Quizzes record created successfully for package: ${packageId}`);
      }

      quizIdForRecord = packageId; // Use package ID as the quiz ID for recording

      // Fetch questions linked to this package
      const { data: packageQuestions, error: pqError } = await supabaseAdmin
        .from('package_questions')
        .select('question_id')
        .eq('package_id', packageId);

      if (pqError || !packageQuestions || packageQuestions.length === 0) {
        console.error('Package questions error:', pqError);
        return new Response(
          JSON.stringify({ error: 'No questions found in package' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const questionIds = packageQuestions.map(pq => pq.question_id);

      // Fetch question details with correct answers, rationale, AND question text for audit trail
      const { data: questionsData, error: questionsError } = await supabaseAdmin
        .from('quiz_questions')
        .select('id, question_number, question_text, options, correct_answer, hipaa_section, rationale')
        .in('id', questionIds)
        .order('question_number', { ascending: true });

      if (questionsError || !questionsData || questionsData.length === 0) {
        console.error('Questions error:', questionsError);
        return new Response(
          JSON.stringify({ error: 'Questions not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      questions = questionsData;
      
      // Collect unique HIPAA sections as citations
      hipaa_citations = [...new Set(questions.map(q => q.hipaa_section))];

    } else if (quizId) {
      // Handle traditional quiz-based submission (legacy flow)
      console.log(`Processing traditional quiz submission for quiz: ${quizId}`);

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

      quizTitle = quiz.title;
      passingScore = quiz.passing_score;
      hipaa_citations = quiz.hipaa_citations || [];
      quizIdForRecord = quizId;

      // Fetch quiz questions from database with correct answers, rationale, AND question text
      const { data: questionsData, error: questionsError } = await supabaseAdmin
        .from('quiz_questions')
        .select('id, question_number, question_text, options, correct_answer, hipaa_section, rationale')
        .eq('quiz_id', quizId)
        .order('question_number', { ascending: true });

      if (questionsError || !questionsData || questionsData.length === 0) {
        console.error('Questions error:', questionsError);
        return new Response(
          JSON.stringify({ error: 'Quiz questions not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      questions = questionsData;
    }

    console.log(`Processing quiz: ${quizTitle} with ${questions.length} questions`);

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

      // Look up the full text for both selected and correct answers
      const selectedOptionData = question.options?.find((opt: { label: string; text: string }) => opt.label === answer.selectedOption);
      const selectedAnswerText = selectedOptionData?.text || answer.selectedOption;
      const correctOptionData = question.options?.find((opt: { label: string; text: string }) => opt.label === question.correct_answer);
      const correctAnswerText = correctOptionData?.text || question.correct_answer;

      gradedAnswers.push({
        questionId: answer.questionId,
        question_text: question.question_text,
        selected_answer: selectedAnswerText,
        correct_answer: correctAnswerText,
        selected_option_letter: answer.selectedOption,
        correct_option_letter: question.correct_answer,
        is_correct: isCorrect,
        timeSpent: answer.timeSpent,
        hipaaSection: question.hipaa_section,
        rationale: question.rationale
      });
    }

    // Calculate score server-side
    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= passingScore;

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
        quiz_id: quizIdForRecord!,
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
          hipaa_citations: hipaa_citations
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
          quiz_id: quizIdForRecord!,
          quiz_title: quizTitle,
          package_id: packageId || null,
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
        passingScore,
        certificate,
        gradedAnswers: gradedAnswers.map(a => ({
          questionId: a.questionId,
          is_correct: a.is_correct,
          correct_answer: a.correct_answer,
          hipaaSection: a.hipaaSection,
          rationale: a.rationale
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
