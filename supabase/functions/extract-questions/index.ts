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

interface ExtractedQuestion {
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

interface ExtractRequest {
  image_base64: string;
  page_number: number;
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
      description: "Imported question bank (AI extraction).",
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

async function extractQuestionsFromImage(imageBase64: string): Promise<ExtractedQuestion[]> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const prompt = `You are a data extraction assistant. Extract ALL questions from this HIPAA quiz table image.

For EACH question row visible in the table, extract these fields exactly:
- question_number: The Q# number (integer)
- scenario: The full scenario text from the Scenario column (without "Scenario:" prefix)
- question_text: The actual question being asked (from the Question column)
- option_a: Option A text (just the content after "A.")
- option_b: Option B text (just the content after "B.")
- option_c: Option C text (just the content after "C.")
- option_d: Option D text (just the content after "D.")
- correct_answer: The letter of the correct answer (A, B, C, or D) - shown in bold in the Correct Answer column
- rationale: The explanation from the Rationale column
- hipaa_section: The CFR section reference (e.g., "§ 164.502")
- workforce_group: The workforce group(s) (e.g., "Clinical Staff", "Admin/Billing Staff", "IT", "Management", "All Staff")
- hipaa_rule: The HIPAA rule name (e.g., "Privacy Rule", "Security Rule")
- hipaa_topic_name: The topic name from the HIPAA Topic column
- topic_description: The description from the Description of Topic column

IMPORTANT:
- Extract EVERY question visible in the image
- Look for bolded text in the Correct Answer column to determine the correct answer letter
- Clean up any line breaks within text fields
- Do not use em-dashes, use regular hyphens
- Write out acronyms fully

Return a JSON array of objects. Return ONLY the JSON array, no markdown or explanation.`;

  const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableApiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Lovable AI API error:", error);
    throw new Error(`Lovable AI API error: ${response.status}`);
  }

  const data = await response.json();
  const textContent = data.choices?.[0]?.message?.content;

  if (!textContent) {
    console.error("No content in AI response:", JSON.stringify(data));
    return [];
  }

  try {
    let jsonText = textContent.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonText);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    console.error("Failed to parse AI response:", textContent);
    throw new Error(`Failed to parse extracted questions: ${e}`);
  }
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

    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "platform_owner")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Only platform owners can extract questions" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body: ExtractRequest = await req.json();
    const { image_base64, page_number } = body;

    if (!image_base64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing page ${page_number}...`);

    const quizId = await ensureMasterQuizId(supabaseClient);

    const extractedQuestions = await extractQuestionsFromImage(image_base64);
    console.log(`Extracted ${extractedQuestions.length} questions from page ${page_number}`);

    const results = {
      extracted: extractedQuestions.length,
      imported: 0,
      skipped: 0,
      errors: [] as string[],
      topics_created: 0,
    };

    const topicMap = new Map<string, string>();

    for (const q of extractedQuestions) {
      if (q.hipaa_topic_name && q.hipaa_rule) {
        const key = `${q.hipaa_rule}|${q.hipaa_topic_name}`;
        if (!topicMap.has(key)) {
          const { data: existing } = await supabaseClient
            .from("hipaa_topics")
            .select("id")
            .eq("rule_name", q.hipaa_rule)
            .eq("topic_name", q.hipaa_topic_name)
            .maybeSingle();

          if (existing) {
            topicMap.set(key, existing.id);
          } else {
            const { data: newTopic, error: topicError } = await supabaseClient
              .from("hipaa_topics")
              .insert({
                rule_name: q.hipaa_rule,
                topic_name: q.hipaa_topic_name,
                description: q.topic_description || "",
              })
              .select("id")
              .single();

            if (topicError) {
              console.error(`Failed to create topic: ${topicError.message}`);
            } else if (newTopic) {
              topicMap.set(key, newTopic.id);
              results.topics_created++;
            }
          }
        }
      }
    }

    for (const q of extractedQuestions) {
      try {
        let correctAnswer = (q.correct_answer || "").toString().trim().toUpperCase();
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
          quiz_id: quizId,
          question_number: q.question_number,
          question_text: (q.question_text || "").trim(),
          scenario: (q.scenario || "").trim() || null,
          options: [
            { label: "A", text: (q.option_a || "").trim() },
            { label: "B", text: (q.option_b || "").trim() },
            { label: "C", text: (q.option_c || "").trim() },
            { label: "D", text: (q.option_d || "").trim() },
          ],
          correct_answer: correctAnswer,
          rationale: (q.rationale || "").trim(),
          hipaa_section: (q.hipaa_section || "").trim(),
          hipaa_topic_id: hipaaTopicId,
        };

        const { data: existingQuestion } = await supabaseClient
          .from("quiz_questions")
          .select("id")
          .eq("question_number", q.question_number)
          .eq("quiz_id", quizId)
          .maybeSingle();

        if (existingQuestion) {
          const { error: updateError } = await supabaseClient
            .from("quiz_questions")
            .update(questionData)
            .eq("id", existingQuestion.id);

          if (updateError) {
            results.errors.push(`Question ${q.question_number}: ${updateError.message}`);
            results.skipped++;
          } else {
            results.imported++;
          }
        } else {
          const { error: insertError } = await supabaseClient
            .from("quiz_questions")
            .insert(questionData);

          if (insertError) {
            results.errors.push(`Question ${q.question_number}: ${insertError.message}`);
            results.skipped++;
          } else {
            results.imported++;
          }
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
    console.error("Error in extract-questions:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
