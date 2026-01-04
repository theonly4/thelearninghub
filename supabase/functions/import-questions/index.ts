import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MASTER_QUIZ_TITLE = "Master Question Bank";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

interface QuestionImport {
  question_number: number;
  scenario: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  rationale: string;
  hipaa_section: string;
  workforce_group: string;
  hipaa_rule: string;
  hipaa_topic_name: string;
  topic_description: string;
}

interface ImportRequest {
  questions: QuestionImport[];
  quiz_id?: string;
  create_topics: boolean;
}

async function ensureMasterQuizId(supabaseClient: SupabaseClient): Promise<string> {
  const { data: existing } = await supabaseClient
    .from("quizzes")
    .select("id")
    .eq("title", MASTER_QUIZ_TITLE)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const today = new Date().toISOString().split("T")[0];

  const { data: created, error } = await supabaseClient
    .from("quizzes")
    .insert({
      title: MASTER_QUIZ_TITLE,
      description: "Imported question bank (JSON).",
      sequence_number: 1,
      workforce_groups: [
        "all_staff",
        "clinical",
        "administrative",
        "management",
        "it",
      ],
      passing_score: 80,
      version: 1,
      effective_date: today,
      hipaa_citations: [],
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(error?.message || "Failed to create master quiz");
  }

  return created.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: authError?.message || "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check platform owner role
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "platform_owner")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Only platform owners can import questions" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body: ImportRequest = await req.json();
    const { questions, quiz_id, create_topics } = body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return new Response(JSON.stringify({ error: "No questions provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetQuizId = quiz_id || (await ensureMasterQuizId(supabaseClient));

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
      topics_created: 0,
    };

    // Process topics first if create_topics is true
    const topicMap = new Map<string, string>();

    if (create_topics) {
      const uniqueTopics = new Map<
        string,
        { rule_name: string; topic_name: string; description: string }
      >();

      for (const q of questions) {
        if (q.hipaa_topic_name && q.hipaa_rule) {
          const key = `${q.hipaa_rule}|${q.hipaa_topic_name}`;
          if (!uniqueTopics.has(key)) {
            uniqueTopics.set(key, {
              rule_name: q.hipaa_rule,
              topic_name: q.hipaa_topic_name,
              description: q.topic_description || "",
            });
          }
        }
      }

      for (const [key, topic] of uniqueTopics) {
        const { data: existing } = await supabaseClient
          .from("hipaa_topics")
          .select("id")
          .eq("rule_name", topic.rule_name)
          .eq("topic_name", topic.topic_name)
          .maybeSingle();

        if (existing) {
          topicMap.set(key, existing.id);
        } else {
          const { data: newTopic, error: topicError } = await supabaseClient
            .from("hipaa_topics")
            .insert(topic)
            .select("id")
            .single();

          if (topicError) {
            results.errors.push(
              `Failed to create topic ${topic.topic_name}: ${topicError.message}`,
            );
          } else if (newTopic) {
            topicMap.set(key, newTopic.id);
            results.topics_created++;
          }
        }
      }
    } else {
      const { data: existingTopics } = await supabaseClient
        .from("hipaa_topics")
        .select("id, rule_name, topic_name");

      if (existingTopics) {
        for (const t of existingTopics) {
          topicMap.set(`${t.rule_name}|${t.topic_name}`, t.id);
        }
      }
    }

    for (const q of questions) {
      try {
        let correctAnswer = q.correct_answer.trim().toUpperCase();
        if (correctAnswer.length > 1) {
          correctAnswer = correctAnswer.charAt(0);
        }
        if (!/[ABCD]/.test(correctAnswer)) {
          results.errors.push(
            `Question ${q.question_number}: Invalid correct answer "${q.correct_answer}"`,
          );
          results.skipped++;
          continue;
        }

        const topicKey = `${q.hipaa_rule}|${q.hipaa_topic_name}`;
        const hipaaTopicId = topicMap.get(topicKey) || null;

        const questionData = {
          quiz_id: targetQuizId,
          question_number: q.question_number,
          question_text: q.question_text.trim(),
          scenario: q.scenario?.trim() || null,
          options: [
            { label: "A", text: q.option_a.trim() },
            { label: "B", text: q.option_b.trim() },
            { label: "C", text: q.option_c.trim() },
            { label: "D", text: q.option_d.trim() },
          ],
          correct_answer: correctAnswer,
          rationale: q.rationale.trim(),
          hipaa_section: q.hipaa_section.trim(),
          hipaa_topic_id: hipaaTopicId,
        };

        const { error: insertError } = await supabaseClient
          .from("quiz_questions")
          .insert(questionData);

        if (insertError) {
          results.errors.push(`Question ${q.question_number}: ${insertError.message}`);
          results.skipped++;
        } else {
          results.imported++;
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        results.errors.push(`Question ${q.question_number}: ${errorMessage}`);
        results.skipped++;
      }
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
