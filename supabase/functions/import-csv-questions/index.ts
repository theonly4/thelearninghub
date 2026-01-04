import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MASTER_QUIZ_TITLE = "Master Question Bank";

type SupabaseClient = ReturnType<typeof createClient>;

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function extractOptions(optionsText: string): { label: string; text: string }[] {
  const options: { label: string; text: string }[] = [];

  const text = optionsText.replace(/\r?\n/g, " ").trim();

  // Expected formats:
  //  - "A. ...B. ...C. ...D. ..."
  //  - "A. ...B. ..." (rarely truncated)
  const aIdx = text.indexOf("A.");
  const bIdx = text.indexOf("B.");
  const cIdx = text.indexOf("C.");
  const dIdx = text.indexOf("D.");

  if (aIdx !== -1 && bIdx !== -1 && cIdx !== -1 && dIdx !== -1) {
    options.push({ label: "A", text: text.substring(aIdx + 2, bIdx).trim() });
    options.push({ label: "B", text: text.substring(bIdx + 2, cIdx).trim() });
    options.push({ label: "C", text: text.substring(cIdx + 2, dIdx).trim() });
    options.push({ label: "D", text: text.substring(dIdx + 2).trim() });
    return options;
  }

  return [
    { label: "A", text: "" },
    { label: "B", text: "" },
    { label: "C", text: "" },
    { label: "D", text: "" },
  ];
}

function extractCorrectAnswerLetter(correctAnswerText: string): string {
  const text = correctAnswerText.trim().toUpperCase();
  if (text.startsWith("A")) return "A";
  if (text.startsWith("B")) return "B";
  if (text.startsWith("C")) return "C";
  if (text.startsWith("D")) return "D";
  return "";
}

function mapWorkforceGroup(groupText: string): string {
  const text = groupText.toLowerCase();
  if (text.includes("clinical")) return "clinical";
  if (text.includes("admin") || text.includes("billing")) return "administrative";
  if (text.includes("management") || text.includes("leadership")) return "management";
  if (text.includes("it") || text.includes("security") || text.includes("technical")) return "it";
  return "all_staff";
}

function cleanText(text: string): string {
  const t = (text || "").replace(/\r?\n/g, " ");

  // The CSV frequently contains the Unicode replacement character (\uFFFD) in place of punctuation.
  // We do a few safe normalizations.
  return t
    .replace(/\uFFFD\s*(\d)/g, "§ $1")
    .replace(/\uFFFD/g, "'")
    .replace(/\s+/g, " ")
    .replace(/Scenario:\s*/i, "")
    .trim();
}

function normalizeHipaaSection(text: string): string {
  const t = cleanText(text);
  if (!t) return "";
  // Normalize leading section markers
  return t.replace(/^[^0-9A-Za-z]*\s*(\d)/, "§ $1");
}

async function ensureMasterQuizId(supabaseClient: SupabaseClient): Promise<string> {
  const { data: existing, error } = await supabaseClient
    .from("quizzes")
    .select("id")
    .eq("title", MASTER_QUIZ_TITLE)
    .maybeSingle();

  if (error) {
    console.log("Quiz lookup error:", error.message);
  }

  if (existing?.id) return existing.id;

  const today = new Date().toISOString().split("T")[0];

  const { data: created, error: createError } = await supabaseClient
    .from("quizzes")
    .insert({
      title: MASTER_QUIZ_TITLE,
      description: "Imported question bank (CSV).",
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

  if (createError || !created) {
    throw new Error(createError?.message || "Failed to create master quiz");
  }

  console.log("Created master quiz:", created.id);
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

    // Verify user via auth API (do not rely on gateway JWT verification)
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      console.log("Auth error:", authError?.message);
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

    const body = await req.json();
    const { csv_content } = body;

    if (!csv_content) {
      return new Response(JSON.stringify({ error: "No CSV content provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const quizId = await ensureMasterQuizId(supabaseClient);

    const lines = csv_content.split("\n").filter((line: string) => line.trim());
    console.log(`Processing ${lines.length} lines`);

    const headerFields = parseCSVLine(lines[0]);
    console.log(`Header has ${headerFields.length} columns`);

    const results = {
      total: lines.length - 1,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
      topics_created: 0,
    };

    // First pass: create all unique HIPAA topics
    const topicMap = new Map<string, string>();

    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);

      let hipaaRule = "";
      let topicName = "";
      let topicDesc = "";

      for (let j = 25; j < Math.min(fields.length, 40); j++) {
        const field = fields[j].trim();
        if (
          field === "Privacy Rule" ||
          field === "Security Rule" ||
          field.includes("Administrative")
        ) {
          hipaaRule = field;
          break;
        }
      }

      for (let j = 32; j < Math.min(fields.length, 50); j++) {
        const field = fields[j].trim();
        if (
          field &&
          !field.includes("§") &&
          !field.includes("Rule") &&
          field.length > 2 &&
          field.length < 120
        ) {
          if (!topicName) {
            topicName = field;
          } else if (!topicDesc && field.length > topicName.length) {
            topicDesc = field;
            break;
          }
        }
      }

      if (hipaaRule && topicName) {
        const key = `${hipaaRule}|${topicName}`;
        if (!topicMap.has(key)) {
          const { data: existing } = await supabaseClient
            .from("hipaa_topics")
            .select("id")
            .eq("rule_name", hipaaRule)
            .eq("topic_name", topicName)
            .maybeSingle();

          if (existing) {
            topicMap.set(key, existing.id);
          } else {
            const { data: newTopic } = await supabaseClient
              .from("hipaa_topics")
              .insert({
                rule_name: hipaaRule,
                topic_name: topicName,
                description: cleanText(topicDesc) || topicName,
              })
              .select("id")
              .single();

            if (newTopic) {
              topicMap.set(key, newTopic.id);
              results.topics_created++;
            }
          }
        }
      }
    }

    console.log(`Created/found ${topicMap.size} HIPAA topics`);

    // Second pass: import questions
    for (let i = 1; i < lines.length; i++) {
      try {
        const fields = parseCSVLine(lines[i]);

        const qNum = parseInt(fields[0], 10);
        if (isNaN(qNum)) {
          results.errors.push(`Line ${i + 1}: Invalid question number "${fields[0]}"`);
          results.skipped++;
          continue;
        }

        const scenario = cleanText(fields[1] || "");

        let questionText = "";
        for (let j = 2; j < 6; j++) {
          if (fields[j] && fields[j].includes("?")) {
            questionText = cleanText(fields[j]);
            break;
          }
        }

        let optionsText = "";
        for (let j = 5; j < 12; j++) {
          if (fields[j] && fields[j].includes("A.") && fields[j].includes("B.")) {
            optionsText = fields[j];
            break;
          }
        }
        const options = extractOptions(optionsText);

        let correctAnswer = "";
        for (let j = 10; j < 25; j++) {
          const field = (fields[j] || "").trim();
          if (field && field.length > 2 && field.length < 300) {
            if (
              field.startsWith("A.") ||
              field.startsWith("B.") ||
              field.startsWith("C.") ||
              field.startsWith("D.")
            ) {
              if (
                !(
                  field.includes("A.") &&
                  field.includes("B.") &&
                  field.includes("C.") &&
                  field.includes("D.")
                )
              ) {
                correctAnswer = extractCorrectAnswerLetter(field);
                break;
              }
            }
          }
        }

        let rationale = "";
        for (let j = 20; j < Math.min(fields.length, 30); j++) {
          const field = (fields[j] || "").trim();
          if (
            field.length > 30 &&
            !field.includes("A.") &&
            !field.includes("Rule")
          ) {
            rationale = cleanText(field);
            break;
          }
        }

        let hipaaSection = "";
        for (let j = 24; j < Math.min(fields.length, 32); j++) {
          const field = (fields[j] || "").trim();
          if (field.includes("§") || field.includes("\uFFFD")) {
            hipaaSection = normalizeHipaaSection(field);
            break;
          }
        }

        let workforceGroup = "all_staff";
        for (let j = 26; j < Math.min(fields.length, 32); j++) {
          const field = (fields[j] || "").trim();
          if (
            field &&
            (field.toLowerCase().includes("staff") ||
              field.toLowerCase().includes("clinical") ||
              field.toLowerCase().includes("admin") ||
              field.toLowerCase().includes("management") ||
              field.toLowerCase().includes("it"))
          ) {
            workforceGroup = mapWorkforceGroup(field);
            break;
          }
        }

        let hipaaRule = "";
        for (let j = 28; j < Math.min(fields.length, 40); j++) {
          const field = (fields[j] || "").trim();
          if (
            field === "Privacy Rule" ||
            field === "Security Rule" ||
            field.includes("Administrative")
          ) {
            hipaaRule = field;
            break;
          }
        }

        let topicName = "";
        for (let j = 34; j < Math.min(fields.length, 50); j++) {
          const field = (fields[j] || "").trim();
          if (field && !field.includes("§") && !field.includes("Rule") && field.length > 2) {
            topicName = field;
            break;
          }
        }

        const topicKey = `${hipaaRule}|${topicName}`;
        const hipaaTopicId = topicMap.get(topicKey) || null;

        if (!questionText) {
          results.errors.push(`Q${qNum}: Missing question text`);
          results.skipped++;
          continue;
        }

        if (!correctAnswer) {
          results.errors.push(`Q${qNum}: Missing correct answer`);
          results.skipped++;
          continue;
        }

        if (options.every((o) => !o.text)) {
          results.errors.push(`Q${qNum}: Missing options`);
          results.skipped++;
          continue;
        }

        const questionData = {
          quiz_id: quizId,
          question_number: qNum,
          question_text: questionText,
          scenario: scenario || null,
          options,
          correct_answer: correctAnswer,
          rationale: rationale || "See HIPAA regulation for details.",
          hipaa_section: hipaaSection || "§ 164.000",
          hipaa_topic_id: hipaaTopicId,
        };

        const { data: existing } = await supabaseClient
          .from("quiz_questions")
          .select("id")
          .eq("question_number", qNum)
          .eq("quiz_id", quizId)
          .maybeSingle();

        if (existing) {
          const { error: updateError } = await supabaseClient
            .from("quiz_questions")
            .update(questionData)
            .eq("id", existing.id);

          if (updateError) {
            results.errors.push(`Q${qNum}: Update failed - ${updateError.message}`);
            results.skipped++;
          } else {
            results.updated++;
          }
        } else {
          const { error: insertError } = await supabaseClient
            .from("quiz_questions")
            .insert(questionData);

          if (insertError) {
            results.errors.push(`Q${qNum}: Insert failed - ${insertError.message}`);
            results.skipped++;
          } else {
            results.imported++;
          }
        }

        if (qNum % 50 === 0) {
          console.log(
            `Processed ${qNum} questions... (imported: ${results.imported}, updated: ${results.updated}, skipped: ${results.skipped})`,
          );
        }

        // silence unused var lint in case Deno uses it
        void workforceGroup;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        results.errors.push(`Line ${i + 1}: ${errorMessage}`);
        results.skipped++;
      }
    }

    console.log(
      `Import complete: ${results.imported} new, ${results.updated} updated, ${results.skipped} skipped`,
    );
    if (results.errors.length > 0) {
      console.log(`First 10 errors: ${results.errors.slice(0, 10).join("; ")}`);
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Import error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
