import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Dynamic CORS origin validation - prevents cross-origin attacks while allowing legitimate requests
function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigins = [
    Deno.env.get("ALLOWED_ORIGIN"),
    "https://yzuvyvtspdjmewuakpkn.lovableproject.com",
    "https://lovable.dev",
    "http://localhost:5173",
    "http://localhost:8080",
  ].filter(Boolean) as string[];

  const origin =
    requestOrigin &&
    allowedOrigins.some(
      (allowed) =>
        requestOrigin === allowed ||
        requestOrigin.endsWith(".lovable.dev") ||
        requestOrigin.endsWith(".lovableproject.com"),
    )
      ? requestOrigin
      : allowedOrigins[0] || "https://lovable.dev";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const MASTER_QUIZ_TITLE = "Master Question Bank";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

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
  const raw = (optionsText || "").replace(/\r?\n/g, " ").trim();
  if (!raw) {
    return [
      { label: "A", text: "" },
      { label: "B", text: "" },
      { label: "C", text: "" },
      { label: "D", text: "" },
    ];
  }

  // Robust parsing for common formats:
  //  - "A. ... B. ... C. ... D. ..."
  //  - "A) ... B) ..." etc
  const text = raw.replace(/\s+/g, " ");
  const markerRe = /(?:^|\s)([A-D])\s*[\.\)\:\-]\s*/g;
  const markers = Array.from(text.matchAll(markerRe));

  if (markers.length >= 4) {
    const opts: { label: string; text: string }[] = [];
    for (let i = 0; i < 4; i++) {
      const label = markers[i][1];
      const start = (markers[i].index ?? 0) + markers[i][0].length;
      const end = markers[i + 1]?.index ?? text.length;
      opts.push({ label, text: text.substring(start, end).trim() });
    }
    return opts;
  }

  // Fallback: try the original compact style "A. ...B. ...C. ...D. ..."
  const aIdx = text.indexOf("A.");
  const bIdx = text.indexOf("B.");
  const cIdx = text.indexOf("C.");
  const dIdx = text.indexOf("D.");

  if (aIdx !== -1 && bIdx !== -1 && cIdx !== -1 && dIdx !== -1) {
    return [
      { label: "A", text: text.substring(aIdx + 2, bIdx).trim() },
      { label: "B", text: text.substring(bIdx + 2, cIdx).trim() },
      { label: "C", text: text.substring(cIdx + 2, dIdx).trim() },
      { label: "D", text: text.substring(dIdx + 2).trim() },
    ];
  }

  return [
    { label: "A", text: "" },
    { label: "B", text: "" },
    { label: "C", text: "" },
    { label: "D", text: "" },
  ];
}

function extractCorrectAnswerLetter(correctAnswerText: string): string {
  const text = (correctAnswerText || "").trim().toUpperCase();
  if (!text) return "";

  // Common cases:
  // - "B. ..."
  // - "Answer: B"
  // - "B"
  const match = text.match(/\b([A-D])\b/);
  return match?.[1] ?? "";
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

type HeaderIndex = {
  qNum: number;
  scenario: number;
  question: number;
  options: number;
  correct: number;
  rationale: number;
  hipaaSection: number;
  workforceGroup: number;
  hipaaRule: number;
  topicName: number;
  topicDesc: number;
};

function findHeaderIndex(headerFields: string[], label: string): number {
  const target = label.trim().toLowerCase();
  return headerFields.findIndex((h) => (h || "").trim().toLowerCase() === target);
}

function buildHeaderIndex(headerFields: string[]): HeaderIndex {
  const qNum = findHeaderIndex(headerFields, "Q #");
  const scenario = findHeaderIndex(headerFields, "Scenario");
  const question = findHeaderIndex(headerFields, "Question");
  const options = findHeaderIndex(headerFields, "Options");
  const correct = findHeaderIndex(headerFields, "Correct Answer");
  const rationale = findHeaderIndex(headerFields, "Rationale");
  const hipaaSection = findHeaderIndex(headerFields, "HIPAA Section");
  const workforceGroup = findHeaderIndex(headerFields, "Workforce Group");
  const hipaaRule = findHeaderIndex(headerFields, "HIPAA Rule");
  const topicName = findHeaderIndex(headerFields, "HIPAA Topic Name");
  const topicDesc = headerFields.findIndex((h) => (h || "").toLowerCase().includes("description of topic"));

  // Sensible fallbacks based on the known export structure.
  return {
    qNum: qNum === -1 ? 0 : qNum,
    scenario: scenario === -1 ? 1 : scenario,
    question: question === -1 ? 3 : question,
    options: options === -1 ? 6 : options,
    correct: correct === -1 ? 11 : correct,
    rationale: rationale === -1 ? 23 : rationale,
    hipaaSection: hipaaSection === -1 ? 28 : hipaaSection,
    workforceGroup: workforceGroup === -1 ? 29 : workforceGroup,
    hipaaRule: hipaaRule === -1 ? 31 : hipaaRule,
    topicName: topicName === -1 ? 39 : topicName,
    topicDesc: topicDesc === -1 ? 49 : topicDesc,
  };
}

function getField(fields: string[], idx: number): string {
  if (idx < 0) return "";
  return (fields[idx] ?? "").trim();
}

function joinRange(fields: string[], start: number, endExclusive: number): string {
  if (start < 0) return "";

  const safeEnd = endExclusive > start ? Math.min(endExclusive, fields.length) : Math.min(start + 8, fields.length);

  return fields
    .slice(start, safeEnd)
    .map((v) => (v || "").trim())
    .filter(Boolean)
    .join(" ");
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
      workforce_groups: ["all_staff", "clinical", "administrative", "management", "it"],
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
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);

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
      return new Response(JSON.stringify({ error: "Only platform owners can import questions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    const headerIndex = buildHeaderIndex(headerFields);
    console.log("Detected header indexes:", headerIndex);

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

      const hipaaRule = cleanText(getField(fields, headerIndex.hipaaRule));
      const topicName = cleanText(getField(fields, headerIndex.topicName));
      const topicDesc = cleanText(getField(fields, headerIndex.topicDesc));

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
                description: topicDesc || topicName,
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

        const qNumRaw = getField(fields, headerIndex.qNum);
        const qNum = parseInt(qNumRaw, 10);
        if (isNaN(qNum)) {
          results.errors.push(`Line ${i + 1}: Invalid question number "${qNumRaw}"`);
          results.skipped++;
          continue;
        }

        const scenario = cleanText(getField(fields, headerIndex.scenario));

        const questionText = cleanText(getField(fields, headerIndex.question));

        const optionsRegionText = joinRange(fields, headerIndex.options, headerIndex.correct);
        let options = extractOptions(optionsRegionText);

        // If options were split into multiple columns without "A." labels, attempt to map the first 4 non-empty cells.
        if (options.every((o) => !o.text)) {
          const rawOptionCells = fields
            .slice(headerIndex.options, Math.min(headerIndex.correct, fields.length))
            .map((v) => cleanText(v || ""))
            .filter(Boolean);

          if (rawOptionCells.length >= 4) {
            options = [
              { label: "A", text: rawOptionCells[0] },
              { label: "B", text: rawOptionCells[1] },
              { label: "C", text: rawOptionCells[2] },
              { label: "D", text: rawOptionCells[3] },
            ];
          }
        }

        const correctAnswerText = cleanText(getField(fields, headerIndex.correct));
        let correctAnswer = extractCorrectAnswerLetter(correctAnswerText);

        if (!correctAnswer && correctAnswerText) {
          const normalized = correctAnswerText
            .toLowerCase()
            .replace(/^answer\s*[:\-]\s*/i, "")
            .replace(/^[A-D]\s*[\.\)\:\-]\s*/i, "")
            .trim();

          const matched = options.find((o) =>
            normalized && o.text ? o.text.toLowerCase().trim() === normalized : false,
          );
          if (matched) correctAnswer = matched.label;
        }

        const rationale = cleanText(joinRange(fields, headerIndex.rationale, headerIndex.hipaaSection));

        const hipaaSection = normalizeHipaaSection(getField(fields, headerIndex.hipaaSection));

        const workforceGroupText = cleanText(getField(fields, headerIndex.workforceGroup));
        const workforceGroup = workforceGroupText ? mapWorkforceGroup(workforceGroupText) : "all_staff";

        const hipaaRule = cleanText(getField(fields, headerIndex.hipaaRule));
        const topicName = cleanText(getField(fields, headerIndex.topicName));

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
          const { error: insertError } = await supabaseClient.from("quiz_questions").insert(questionData);

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

    console.log(`Import complete: ${results.imported} new, ${results.updated} updated, ${results.skipped} skipped`);
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

    // Ensure that only a generic error message is returned to the user
    return new Response(JSON.stringify({ error: "An error occurred while importing the CSV." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
