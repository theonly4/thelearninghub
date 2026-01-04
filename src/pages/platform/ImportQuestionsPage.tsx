import { useState } from "react";
import { PlatformOwnerLayout } from "@/components/PlatformOwnerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, FileJson, CheckCircle, AlertCircle, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  topics_created: number;
}

const sampleQuestion = {
  question_number: 1,
  scenario: "Dr. Chen is treating Mr. Davies, a patient recovering from a stroke.",
  question_text: "Which rule governs the degree of information Dr. Chen is entitled to receive?",
  option_a: "The disclosure must be limited to the minimum necessary amount.",
  option_b: "The minimum necessary requirement does not apply to disclosures for treatment.",
  option_c: "The minimum necessary requirement applies only if authorization is obtained.",
  option_d: "The disclosure must be limited only to information created within the facility.",
  correct_answer: "B",
  rationale: "The minimum necessary standard is explicitly exempt for treatment purposes.",
  hipaa_section: "§ 164.502",
  workforce_group: "Clinical Staff",
  hipaa_rule: "Privacy Rule",
  hipaa_topic_name: "Minimum Necessary",
  topic_description: "Requirement to limit workforce uses of PHI to the minimum necessary and to define role-based access.",
};

export default function ImportQuestionsPage() {
  const [jsonInput, setJsonInput] = useState("");
  const [createTopics, setCreateTopics] = useState(true);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonInput(content);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      toast.error("Please provide JSON data to import");
      return;
    }

    let questions;
    try {
      questions = JSON.parse(jsonInput);
      if (!Array.isArray(questions)) {
        questions = [questions];
      }
    } catch (err) {
      toast.error("Invalid JSON format. Please check your input.");
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to import questions");
        return;
      }

      const response = await supabase.functions.invoke("import-questions", {
        body: {
          questions,
          create_topics: createTopics,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setResult(response.data);
      
      if (response.data.imported > 0) {
        toast.success(`Successfully imported ${response.data.imported} questions`);
      }
      
      if (response.data.errors.length > 0) {
        toast.warning(`${response.data.skipped} questions were skipped due to errors`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const downloadSampleTemplate = () => {
    const template = [sampleQuestion];
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "question_import_template.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PlatformOwnerLayout userName="Admin">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Import Questions</h2>
          <p className="text-muted-foreground">
            Bulk import questions from JSON format into the question bank.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Import Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Data
              </CardTitle>
              <CardDescription>
                Upload a JSON file or paste JSON data containing questions to import.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button variant="outline" asChild>
                  <label className="cursor-pointer">
                    <FileJson className="h-4 w-4 mr-2" />
                    Upload JSON File
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </Button>
                <Button variant="ghost" size="sm" onClick={downloadSampleTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="json-input">JSON Data</Label>
                <Textarea
                  id="json-input"
                  placeholder='[{"question_number": 1, "scenario": "...", ...}]'
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  className="font-mono text-sm min-h-[300px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="create-topics"
                  checked={createTopics}
                  onCheckedChange={setCreateTopics}
                />
                <Label htmlFor="create-topics">
                  Auto-create HIPAA topics from question data
                </Label>
              </div>

              <Button
                onClick={handleImport}
                disabled={importing || !jsonInput.trim()}
                className="w-full"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Questions
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results / Instructions */}
          <div className="space-y-6">
            {result && (
              <Alert variant={result.errors.length > 0 ? "default" : "default"}>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Import Complete</AlertTitle>
                <AlertDescription>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="default">{result.imported} imported</Badge>
                    {result.skipped > 0 && (
                      <Badge variant="destructive">{result.skipped} skipped</Badge>
                    )}
                    {result.topics_created > 0 && (
                      <Badge variant="secondary">{result.topics_created} topics created</Badge>
                    )}
                  </div>
                  {result.errors.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="font-medium text-sm">Errors:</p>
                      <ul className="text-sm space-y-1 max-h-[200px] overflow-y-auto">
                        {result.errors.slice(0, 10).map((err, i) => (
                          <li key={i} className="text-destructive">{err}</li>
                        ))}
                        {result.errors.length > 10 && (
                          <li className="text-muted-foreground">
                            ... and {result.errors.length - 10} more errors
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle>JSON Format</CardTitle>
                <CardDescription>
                  Each question should have the following fields:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
{JSON.stringify(sampleQuestion, null, 2)}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Required Fields</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2">
                  <li><code className="bg-muted px-1 rounded">question_number</code> - Sequential number</li>
                  <li><code className="bg-muted px-1 rounded">question_text</code> - The question itself</li>
                  <li><code className="bg-muted px-1 rounded">option_a/b/c/d</code> - Four answer options</li>
                  <li><code className="bg-muted px-1 rounded">correct_answer</code> - Letter A, B, C, or D</li>
                  <li><code className="bg-muted px-1 rounded">rationale</code> - Explanation of correct answer</li>
                  <li><code className="bg-muted px-1 rounded">hipaa_section</code> - HIPAA citation reference</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-4">
                  Optional: <code className="bg-muted px-1 rounded">scenario</code>, 
                  <code className="bg-muted px-1 rounded">workforce_group</code>, 
                  <code className="bg-muted px-1 rounded">hipaa_rule</code>, 
                  <code className="bg-muted px-1 rounded">hipaa_topic_name</code>, 
                  <code className="bg-muted px-1 rounded">topic_description</code>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PlatformOwnerLayout>
  );
}
