import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedQuestion {
  question_number: number;
  scenario: string;
  question_text: string;
  options: string;
  correct_answer: string;
  rationale: string;
  hipaa_section: string;
  workforce_group: string;
  hipaa_rule: string;
  hipaa_topic_name: string;
  topic_description: string;
}

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
  
  // Split by option patterns (A. B. C. D.)
  const patterns = [
    /A\.\s*/,
    /B\.\s*/,
    /C\.\s*/,
    /D\.\s*/,
  ];
  
  // Find positions of each option
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
  
  // Fallback: return empty array if parsing fails
  return [
    { label: "A", text: "" },
    { label: "B", text: "" },
    { label: "C", text: "" },
    { label: "D", text: "" },
  ];
}

function extractCorrectAnswerLetter(correctAnswerText: string): string {
  // The correct answer column contains the full answer text, starting with the letter
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

    // Verify user is platform owner
    const { data: { user }, error: authError } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (authError || !user) {
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
      
      // Find non-empty fields for hipaa_rule and hipaa_topic_name
      // Based on CSV structure, columns vary due to merged cells
      // We need to find the actual values
      const allFields = fields.join("|");
      
      // Extract HIPAA Rule (Privacy Rule, Security Rule, or Admin Requirement)
      let hipaaRule = "";
      if (allFields.includes("Privacy Rule")) hipaaRule = "Privacy Rule";
      else if (allFields.includes("Security Rule")) hipaaRule = "Security Rule";
      else if (allFields.includes("Admin")) hipaaRule = "Administrative Requirement";
      
      // Find HIPAA Topic Name - it's usually after the rule
      const ruleIndex = fields.findIndex(f => f.includes("Rule") || f.includes("Requirement"));
      let topicName = "";
      let topicDesc = "";
      
      for (let j = ruleIndex + 1; j < fields.length; j++) {
        const field = fields[j].trim();
        if (field && !field.includes("§") && field.length > 2 && field.length < 100) {
          if (!topicName) {
            topicName = field;
          } else if (!topicDesc) {
            topicDesc = field;
            break;
          }
        }
      }
      
      if (hipaaRule && topicName) {
        const key = `${hipaaRule}|${topicName}`;
        if (!topicMap.has(key)) {
          // Check if exists
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

    // Second pass: import questions
    for (let i = 1; i < lines.length; i++) {
      try {
        const fields = parseCSVLine(lines[i]);
        
        // Extract question number
        const qNum = parseInt(fields[0], 10);
        if (isNaN(qNum)) {
          results.errors.push(`Line ${i + 1}: Invalid question number`);
          results.skipped++;
          continue;
        }

        // Extract scenario (column 1-2, may span multiple)
        let scenario = cleanText(fields[1] || "");
        if (fields[2] && !fields[2].includes("?")) {
          scenario += " " + cleanText(fields[2]);
        }

        // Extract question text - look for field with "?"
        let questionText = "";
        let optionsStartIdx = 0;
        for (let j = 2; j < Math.min(fields.length, 10); j++) {
          if (fields[j] && fields[j].includes("?")) {
            questionText = cleanText(fields[j]);
            optionsStartIdx = j + 1;
            break;
          }
        }

        // Extract options - look for field with "A." and "B."
        let optionsText = "";
        for (let j = optionsStartIdx; j < fields.length; j++) {
          if (fields[j] && fields[j].includes("A.") && fields[j].includes("B.")) {
            optionsText = fields[j];
            break;
          }
        }
        const options = extractOptions(optionsText);

        // Extract correct answer - look for field that starts with letter and matches an option
        let correctAnswer = "";
        for (let j = 0; j < fields.length; j++) {
          const field = fields[j].trim();
          if (field && (field.startsWith("A.") || field.startsWith("B.") || field.startsWith("C.") || field.startsWith("D."))) {
            // Check if this is a standalone correct answer (not the options field)
            if (!field.includes("A.") || field.indexOf("A.") === 0) {
              if (field.length < optionsText.length / 2) {
                correctAnswer = extractCorrectAnswerLetter(field);
                break;
              }
            }
          }
        }

        // If still not found, look more carefully
        if (!correctAnswer) {
          for (let j = 0; j < fields.length; j++) {
            const field = fields[j].trim();
            if (field.length > 5 && field.length < 200) {
              if (field.startsWith("A.") && !field.includes("B.")) {
                correctAnswer = "A";
                break;
              } else if (field.startsWith("B.") && !field.includes("C.")) {
                correctAnswer = "B";
                break;
              } else if (field.startsWith("C.") && !field.includes("D.")) {
                correctAnswer = "C";
                break;
              } else if (field.startsWith("D.") && !field.includes("A.")) {
                correctAnswer = "D";
                break;
              }
            }
          }
        }

        // Extract rationale - usually a longer explanatory text
        let rationale = "";
        for (let j = 0; j < fields.length; j++) {
          const field = fields[j].trim();
          if (field.length > 50 && !field.includes("A.") && !field.includes("Scenario") && !field.includes("?")) {
            if (!field.includes("§") && !field.startsWith("Privacy") && !field.startsWith("Security")) {
              rationale = cleanText(field);
              break;
            }
          }
        }

        // Extract HIPAA section (§ reference)
        let hipaaSection = "";
        for (const field of fields) {
          const match = field.match(/§\s*\d+\.\d+(\s*\([a-z0-9]+\))*(\([a-z]+\))*/i);
          if (match) {
            hipaaSection = match[0];
            break;
          }
        }

        // Extract workforce group
        let workforceGroup = "all_staff";
        const allText = fields.join(" ");
        workforceGroup = mapWorkforceGroup(allText);

        // Extract HIPAA Rule and Topic
        let hipaaRule = "";
        if (allText.includes("Privacy Rule")) hipaaRule = "Privacy Rule";
        else if (allText.includes("Security Rule")) hipaaRule = "Security Rule";
        else if (allText.includes("Admin")) hipaaRule = "Administrative Requirement";

        let topicName = "";
        const ruleIndex = fields.findIndex(f => f.includes("Rule") || f.includes("Requirement"));
        for (let j = ruleIndex + 1; j < fields.length; j++) {
          const field = fields[j].trim();
          if (field && !field.includes("§") && field.length > 2 && field.length < 100) {
            topicName = field;
            break;
          }
        }

        const topicKey = `${hipaaRule}|${topicName}`;
        const hipaaTopicId = topicMap.get(topicKey) || null;

        if (!questionText || !correctAnswer || options.every(o => !o.text)) {
          results.errors.push(`Q${qNum}: Missing required fields (question, answer, or options)`);
          results.skipped++;
          continue;
        }

        const questionData = {
          quiz_id: null,
          question_number: qNum,
          question_text: questionText,
          scenario: scenario || null,
          options: options,
          correct_answer: correctAnswer,
          rationale: rationale || "See HIPAA regulation for details.",
          hipaa_section: hipaaSection || "§ 164.000",
          hipaa_topic_id: hipaaTopicId,
        };

        // Check if exists
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
            results.errors.push(`Q${qNum}: ${updateError.message}`);
            results.skipped++;
          } else {
            results.updated++;
          }
        } else {
          const { error: insertError } = await supabaseClient
            .from("quiz_questions")
            .insert(questionData);

          if (insertError) {
            results.errors.push(`Q${qNum}: ${insertError.message}`);
            results.skipped++;
          } else {
            results.imported++;
          }
        }

        // Log progress every 50 questions
        if (qNum % 50 === 0) {
          console.log(`Processed ${qNum} questions...`);
        }

      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        results.errors.push(`Line ${i + 1}: ${errorMessage}`);
        results.skipped++;
      }
    }

    console.log(`Import complete: ${results.imported} new, ${results.updated} updated, ${results.skipped} skipped`);

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
