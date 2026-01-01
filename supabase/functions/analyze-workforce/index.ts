import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisRequest {
  userId?: string;
  workforceGroup?: string;
  analyzeAll?: boolean;
  organizationId: string;
}

interface WrongAnswer {
  questionId: string;
  hipaaSection: string;
  questionText: string;
}

interface EmployeeAnalysis {
  userId: string;
  userName: string;
  email: string;
  workforceGroup: string;
  totalQuizAttempts: number;
  totalWrongAnswers: number;
  weaknessesByTopic: Record<string, number>;
  aiAnalysis?: {
    riskAreas: Array<{
      topic: string;
      errorRate: number;
      severity: "high" | "medium" | "low";
      recommendation: string;
    }>;
    overallAssessment: string;
    remediation: string[];
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { userId, workforceGroup, analyzeAll, organizationId }: AnalysisRequest = await req.json();

    console.log("Analyze workforce request:", { userId, workforceGroup, analyzeAll, organizationId });

    // Build query for profiles based on filters
    let profilesQuery = supabase
      .from("profiles")
      .select("user_id, first_name, last_name, email, workforce_group")
      .eq("organization_id", organizationId);

    if (userId) {
      profilesQuery = profilesQuery.eq("user_id", userId);
    } else if (workforceGroup) {
      profilesQuery = profilesQuery.eq("workforce_group", workforceGroup);
    }
    // If analyzeAll is true, we don't add additional filters

    const { data: profiles, error: profilesError } = await profilesQuery;

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw new Error("Failed to fetch employee profiles");
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ error: "No employees found matching criteria" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${profiles.length} employees to analyze`);

    // Fetch quiz attempts for all matching users
    const userIds = profiles.map((p) => p.user_id);
    const { data: quizAttempts, error: attemptsError } = await supabase
      .from("quiz_attempts")
      .select("user_id, quiz_id, answers, score, total_questions, passed")
      .in("user_id", userIds)
      .eq("organization_id", organizationId);

    if (attemptsError) {
      console.error("Error fetching quiz attempts:", attemptsError);
      throw new Error("Failed to fetch quiz attempts");
    }

    // Fetch all quiz questions for mapping wrong answers to topics
    const { data: quizQuestions, error: questionsError } = await supabase
      .from("quiz_questions")
      .select("id, quiz_id, question_text, hipaa_section, question_number");

    if (questionsError) {
      console.error("Error fetching quiz questions:", questionsError);
      throw new Error("Failed to fetch quiz questions");
    }

    // Create a map of question IDs to their HIPAA sections
    const questionMap = new Map(
      quizQuestions?.map((q) => [q.id, { hipaaSection: q.hipaa_section, questionText: q.question_text }]) || []
    );

    // Aggregate data per employee
    const employeeAnalyses: EmployeeAnalysis[] = [];

    for (const profile of profiles) {
      const userAttempts = quizAttempts?.filter((a) => a.user_id === profile.user_id) || [];
      
      if (userAttempts.length === 0) {
        // No quiz data for this employee
        employeeAnalyses.push({
          userId: profile.user_id,
          userName: `${profile.first_name} ${profile.last_name}`,
          email: profile.email,
          workforceGroup: profile.workforce_group || "unassigned",
          totalQuizAttempts: 0,
          totalWrongAnswers: 0,
          weaknessesByTopic: {},
        });
        continue;
      }

      // Aggregate wrong answers by HIPAA topic
      const weaknessesByTopic: Record<string, number> = {};
      let totalWrongAnswers = 0;

      for (const attempt of userAttempts) {
        // answers is stored as JSONB array of { questionId, selectedAnswer, correct }
        const answers = attempt.answers as Array<{ questionId: string; selectedAnswer: string; correct: boolean }>;
        
        for (const answer of answers) {
          if (!answer.correct) {
            totalWrongAnswers++;
            const questionInfo = questionMap.get(answer.questionId);
            if (questionInfo) {
              const topic = questionInfo.hipaaSection || "General HIPAA";
              weaknessesByTopic[topic] = (weaknessesByTopic[topic] || 0) + 1;
            }
          }
        }
      }

      employeeAnalyses.push({
        userId: profile.user_id,
        userName: `${profile.first_name} ${profile.last_name}`,
        email: profile.email,
        workforceGroup: profile.workforce_group || "unassigned",
        totalQuizAttempts: userAttempts.length,
        totalWrongAnswers,
        weaknessesByTopic,
      });
    }

    // Filter to employees with actual quiz data for AI analysis
    const employeesWithData = employeeAnalyses.filter((e) => e.totalQuizAttempts > 0 && e.totalWrongAnswers > 0);

    if (employeesWithData.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No quiz data available for analysis",
          analyses: employeeAnalyses,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending ${employeesWithData.length} employees with quiz data to AI for analysis`);

    // Call Lovable AI for analysis
    const aiPrompt = buildAIPrompt(employeesWithData);
    
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a HIPAA compliance training analyst. Analyze employee quiz performance data and identify specific weakness areas based on their incorrect answers. 
            
Your response MUST be valid JSON with this exact structure:
{
  "employeeAnalyses": [
    {
      "userId": "string",
      "riskAreas": [
        {
          "topic": "HIPAA section name",
          "errorRate": number (0-100),
          "severity": "high" | "medium" | "low",
          "recommendation": "specific remediation action"
        }
      ],
      "overallAssessment": "brief assessment of compliance readiness",
      "remediation": ["specific action 1", "specific action 2"]
    }
  ],
  "organizationSummary": {
    "highestRiskTopics": ["topic1", "topic2"],
    "overallComplianceRisk": "high" | "medium" | "low",
    "priorityActions": ["action1", "action2"]
  }
}

Severity guidelines:
- high: >50% error rate on a topic, or errors on critical security/privacy topics
- medium: 25-50% error rate
- low: <25% error rate

Always cite specific HIPAA sections (e.g., §164.308, §164.312) in recommendations.`,
          },
          {
            role: "user",
            content: aiPrompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent/deterministic output
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    console.log("AI response received:", aiContent?.substring(0, 200));

    let parsedAnalysis;
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = aiContent;
      if (aiContent.includes("```json")) {
        jsonStr = aiContent.split("```json")[1].split("```")[0].trim();
      } else if (aiContent.includes("```")) {
        jsonStr = aiContent.split("```")[1].split("```")[0].trim();
      }
      parsedAnalysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Return data without AI enhancement if parsing fails
      return new Response(
        JSON.stringify({
          success: true,
          analyses: employeeAnalyses,
          aiAnalysisError: "Failed to parse AI response",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Merge AI analysis back into employee data
    for (const employee of employeeAnalyses) {
      const aiEmployeeData = parsedAnalysis.employeeAnalyses?.find(
        (a: { userId: string }) => a.userId === employee.userId
      );
      if (aiEmployeeData) {
        employee.aiAnalysis = {
          riskAreas: aiEmployeeData.riskAreas || [],
          overallAssessment: aiEmployeeData.overallAssessment || "",
          remediation: aiEmployeeData.remediation || [],
        };
      }
    }

    // Log to audit trail
    await supabase.from("audit_logs").insert({
      user_id: userIds[0], // Use first user as the actor (admin)
      organization_id: organizationId,
      resource_type: "workforce_analysis",
      action: "ai_analysis_completed",
      metadata: {
        analyzedCount: employeesWithData.length,
        workforceGroup: workforceGroup || "all",
        timestamp: new Date().toISOString(),
      },
    });

    console.log("Analysis complete, returning results");

    return new Response(
      JSON.stringify({
        success: true,
        analyses: employeeAnalyses,
        organizationSummary: parsedAnalysis.organizationSummary,
        analyzedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-workforce:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildAIPrompt(employees: EmployeeAnalysis[]): string {
  const employeeData = employees.map((e) => ({
    userId: e.userId,
    name: e.userName,
    workforceGroup: e.workforceGroup,
    quizAttempts: e.totalQuizAttempts,
    wrongAnswers: e.totalWrongAnswers,
    weaknessesByTopic: e.weaknessesByTopic,
  }));

  return `Analyze the following employee HIPAA quiz performance data and identify weakness areas for each employee.

Employee Data:
${JSON.stringify(employeeData, null, 2)}

For each employee, calculate error rates per topic (wrong answers in topic / total questions attempted in that topic area, estimated from the data) and identify their top 3 weakness areas. Provide specific, actionable remediation recommendations citing relevant HIPAA sections.

Also provide an organization-wide summary identifying the highest-risk topics across all employees and priority actions for the compliance team.`;
}
