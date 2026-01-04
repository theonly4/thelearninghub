import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  
  // Clean up the text
  let text = optionsText.replace(/\r?\n/g, " ").trim();
  
  // Find positions of each option - options are formatted as "A. text.B. text.C. text.D. text."
  // or "A. textB. textC. textD. text"
  const aMatch = text.match(/A\.\s*/);
  const bMatch = text.match(/B\.\s*/);
  const cMatch = text.match(/C\.\s*/);
  const dMatch = text.match(/D\.\s*/);
  
  if (aMatch && bMatch && cMatch && dMatch) {
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
  }
  
  return [
    { label: "A", text: "" },
    { label: "B", text: "" },
    { label: "C", text: "" },
    { label: "D", text: "" },
  ];
}

function extractCorrectAnswerLetter(correctAnswerText: string): string {
  const text = correctAnswerText.trim();
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
  return text
    .replace(/�/g, "'")
    .replace(/�/g, "-")
    .replace(/�/g, '"')
    .replace(/�/g, '"')
    .replace(/Scenario:\s*/i, "")
    .trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user client with auth header to verify user
    const userClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { global: { headers: { Authorization: authHeader } } }
    );
    
    // Verify user is platform owner
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      console.log("Auth error:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
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

    const lines = csv_content.split("\n").filter((line: string) => line.trim());
    console.log(`Processing ${lines.length} lines`);

    // Parse the header to understand column positions
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
      
      // Based on CSV structure, find non-empty fields
      // Column indices based on header: Q#=0, Scenario=1, Question=3, Options=6, Correct Answer=11
      // HIPAA Section=26, Workforce Group=27, HIPAA Rule=29, HIPAA Topic Name=36, Description=45
      
      let hipaaRule = "";
      let topicName = "";
      let topicDesc = "";
      
      // Find HIPAA Rule (usually around column 29)
      for (let j = 25; j < Math.min(fields.length, 40); j++) {
        const field = fields[j].trim();
        if (field === "Privacy Rule" || field === "Security Rule" || field.includes("Administrative")) {
          hipaaRule = field;
          break;
        }
      }
      
      // Find HIPAA Topic Name (usually around column 36)
      for (let j = 32; j < Math.min(fields.length, 50); j++) {
        const field = fields[j].trim();
        if (field && !field.includes("§") && !field.includes("Rule") && field.length > 2 && field.length < 80) {
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
            const { data: newTopic, error: topicError } = await supabaseClient
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

    // Second pass: import questions with fixed column mapping
    for (let i = 1; i < lines.length; i++) {
      try {
        const fields = parseCSVLine(lines[i]);
        
        // Column 0: Question Number
        const qNum = parseInt(fields[0], 10);
        if (isNaN(qNum)) {
          results.errors.push(`Line ${i + 1}: Invalid question number "${fields[0]}"`);
          results.skipped++;
          continue;
        }

        // Column 1: Scenario
        const scenario = cleanText(fields[1] || "");

        // Column 3: Question (index 3 because column 2 is often empty)
        let questionText = "";
        for (let j = 2; j < 6; j++) {
          if (fields[j] && fields[j].includes("?")) {
            questionText = cleanText(fields[j]);
            break;
          }
        }

        // Column 6: Options (look for field with A. and B.)
        let optionsText = "";
        for (let j = 5; j < 12; j++) {
          if (fields[j] && fields[j].includes("A.") && fields[j].includes("B.")) {
            optionsText = fields[j];
            break;
          }
        }
        const options = extractOptions(optionsText);

        // Column 11: Correct Answer (look for field starting with A., B., C., or D.)
        let correctAnswer = "";
        for (let j = 10; j < 25; j++) {
          const field = (fields[j] || "").trim();
          if (field && field.length > 2 && field.length < 300) {
            // Check if it starts with A., B., C., or D. but is NOT the full options field
            if ((field.startsWith("A.") || field.startsWith("B.") || field.startsWith("C.") || field.startsWith("D."))) {
              // Make sure this isn't the options field by checking it doesn't have all 4 options
              if (!(field.includes("A.") && field.includes("B.") && field.includes("C.") && field.includes("D."))) {
                correctAnswer = extractCorrectAnswerLetter(field);
                break;
              }
            }
          }
        }

        // Column 22+: Rationale (find long text that's not options)
        let rationale = "";
        for (let j = 20; j < Math.min(fields.length, 30); j++) {
          const field = (fields[j] || "").trim();
          if (field.length > 30 && !field.includes("A.") && !field.includes("§") && !field.includes("Rule")) {
            rationale = cleanText(field);
            break;
          }
        }

        // Column 26: HIPAA Section (§ reference)
        let hipaaSection = "";
        for (let j = 24; j < Math.min(fields.length, 32); j++) {
          const field = (fields[j] || "").trim();
          if (field.includes("§")) {
            hipaaSection = field;
            break;
          }
        }

        // Column 27: Workforce Group
        let workforceGroup = "all_staff";
        for (let j = 26; j < Math.min(fields.length, 32); j++) {
          const field = (fields[j] || "").trim();
          if (field && (field.toLowerCase().includes("staff") || field.toLowerCase().includes("clinical") || 
              field.toLowerCase().includes("admin") || field.toLowerCase().includes("management") || 
              field.toLowerCase().includes("it"))) {
            workforceGroup = mapWorkforceGroup(field);
            break;
          }
        }

        // Find HIPAA Rule and Topic for linking
        let hipaaRule = "";
        for (let j = 28; j < Math.min(fields.length, 40); j++) {
          const field = (fields[j] || "").trim();
          if (field === "Privacy Rule" || field === "Security Rule" || field.includes("Administrative")) {
            hipaaRule = field;
            break;
          }
        }

        let topicName = "";
        for (let j = 34; j < Math.min(fields.length, 50); j++) {
          const field = (fields[j] || "").trim();
          if (field && !field.includes("§") && !field.includes("Rule") && field.length > 2 && field.length < 80) {
            topicName = field;
            break;
          }
        }

        const topicKey = `${hipaaRule}|${topicName}`;
        const hipaaTopicId = topicMap.get(topicKey) || null;

        // Validate required fields
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
        
        if (options.every(o => !o.text)) {
          results.errors.push(`Q${qNum}: Missing options`);
          results.skipped++;
          continue;
        }

        const questionData = {
          quiz_id: null as string | null,
          question_number: qNum,
          question_text: questionText,
          scenario: scenario || null,
          options: options,
          correct_answer: correctAnswer,
          rationale: rationale || "See HIPAA regulation for details.",
          hipaa_section: hipaaSection || "§ 164.000",
          hipaa_topic_id: hipaaTopicId,
        };

        // Check if question already exists
        const { data: existing } = await supabaseClient
          .from("quiz_questions")
          .select("id")
          .eq("question_number", qNum)
          .is("quiz_id", null)
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

        // Log progress every 50 questions
        if (qNum % 50 === 0) {
          console.log(`Processed ${qNum} questions... (imported: ${results.imported}, updated: ${results.updated}, skipped: ${results.skipped})`);
        }

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
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
