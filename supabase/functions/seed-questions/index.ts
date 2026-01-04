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
  const topicDesc = headerFields.findIndex((h) =>
    (h || "").toLowerCase().includes("description of topic"),
  );

  return {
    qNum: qNum === -1 ? 0 : qNum,
    scenario: scenario === -1 ? 1 : scenario,
    question: question === -1 ? 2 : question,
    options: options === -1 ? 3 : options,
    correct: correct === -1 ? 4 : correct,
    rationale: rationale === -1 ? 5 : rationale,
    hipaaSection: hipaaSection === -1 ? 6 : hipaaSection,
    workforceGroup: workforceGroup === -1 ? 7 : workforceGroup,
    hipaaRule: hipaaRule === -1 ? 8 : hipaaRule,
    topicName: topicName === -1 ? 9 : topicName,
    topicDesc: topicDesc === -1 ? 10 : topicDesc,
  };
}

function getField(fields: string[], idx: number): string {
  if (idx < 0) return "";
  return (fields[idx] ?? "").trim();
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role for seeding - this is a one-time operation
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    let { csv_content, csv_url } = body;

    // If csv_url provided, fetch the content
    if (csv_url && !csv_content) {
      console.log("Fetching CSV from URL:", csv_url);
      const csvResponse = await fetch(csv_url);
      if (!csvResponse.ok) {
        return new Response(JSON.stringify({ error: `Failed to fetch CSV: ${csvResponse.statusText}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      csv_content = await csvResponse.text();
      console.log(`Fetched ${csv_content.length} characters`);
    }

    if (!csv_content) {
      return new Response(JSON.stringify({ error: "No CSV content or URL provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const quizId = await ensureMasterQuizId(supabaseClient);

    const lines = csv_content.split("\n").filter((line: string) => line.trim());
    console.log(`Processing ${lines.length} lines`);

    const headerFields = parseCSVLine(lines[0]);
    console.log(`Header has ${headerFields.length} columns`);
    console.log("Headers:", headerFields.slice(0, 15));

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

    // Second pass: build all questions first
    const questionsToInsert: Record<string, unknown>[] = [];

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
        const optionsText = getField(fields, headerIndex.options);
        const options = extractOptions(optionsText);

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

        const rationale = cleanText(getField(fields, headerIndex.rationale));
        const hipaaSection = normalizeHipaaSection(getField(fields, headerIndex.hipaaSection));

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

        questionsToInsert.push({
          quiz_id: quizId,
          question_number: qNum,
          question_text: questionText,
          scenario: scenario || null,
          options,
          correct_answer: correctAnswer,
          rationale: rationale || "See HIPAA regulation for details.",
          hipaa_section: hipaaSection || "§ 164.000",
          hipaa_topic_id: hipaaTopicId,
        });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        results.errors.push(`Line ${i + 1}: ${errorMessage}`);
        results.skipped++;
      }
    }

    console.log(`Prepared ${questionsToInsert.length} questions for batch insert`);

    // Batch insert in chunks of 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < questionsToInsert.length; i += BATCH_SIZE) {
      const batch = questionsToInsert.slice(i, i + BATCH_SIZE);
      
      const { error: insertError } = await supabaseClient
        .from("quiz_questions")
        .upsert(batch, { onConflict: "quiz_id,question_number", ignoreDuplicates: false });

      if (insertError) {
        console.error(`Batch ${i / BATCH_SIZE + 1} error:`, insertError.message);
        results.errors.push(`Batch insert error: ${insertError.message}`);
        results.skipped += batch.length;
      } else {
        results.imported += batch.length;
        console.log(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} questions)`);
      }
    }

    console.log(
      `Import complete: ${results.imported} inserted, ${results.skipped} skipped`,
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
