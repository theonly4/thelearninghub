import { useState, useRef } from "react";
import { PlatformOwnerLayout } from "@/components/PlatformOwnerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileJson, CheckCircle, AlertCircle, Loader2, Download, FileImage, Wand2, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  topics_created: number;
  updated?: number;
  total?: number;
}

interface ExtractionResult {
  extracted: number;
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
  
  // CSV import state
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<ImportResult | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  
  // Image extraction state
  const [extracting, setExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionResults, setExtractionResults] = useState<ExtractionResult[]>([]);
  const [totalStats, setTotalStats] = useState({ imported: 0, skipped: 0, topics_created: 0, errors: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvImporting(true);
    setCsvResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to import questions");
        setCsvImporting(false);
        return;
      }

      // Read CSV file content
      const csvContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      toast.info("Processing 600 questions... This may take a minute.");

      const response = await supabase.functions.invoke("import-csv-questions", {
        body: { csv_content: csvContent },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setCsvResult(response.data);
      
      const data = response.data;
      if (data.imported > 0 || data.updated > 0) {
        toast.success(`Successfully imported ${data.imported} new questions and updated ${data.updated || 0} existing questions`);
      }
      
      if (data.errors && data.errors.length > 0) {
        toast.warning(`${data.skipped} questions were skipped due to errors`);
      }
    } catch (error: any) {
      console.error("CSV Import error:", error);
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setCsvImporting(false);
    }
  };

  const handleImageFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter(f => 
      f.type.startsWith("image/") || f.name.endsWith(".jpg") || f.name.endsWith(".png") || f.name.endsWith(".jpeg")
    );

    if (imageFiles.length === 0) {
      toast.error("Please select image files (JPG, PNG)");
      return;
    }

    // Sort files by name to maintain order
    imageFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    setExtracting(true);
    setExtractionProgress(0);
    setExtractionResults([]);
    setTotalStats({ imported: 0, skipped: 0, topics_created: 0, errors: 0 });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("You must be logged in to extract questions");
      setExtracting(false);
      return;
    }

    let totalImported = 0;
    let totalSkipped = 0;
    let totalTopics = 0;
    let totalErrors = 0;

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      setExtractionProgress(Math.round(((i + 1) / imageFiles.length) * 100));

      try {
        // Convert file to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix
            const base64Data = result.split(",")[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Call extraction API
        const response = await supabase.functions.invoke("extract-questions", {
          body: {
            image_base64: base64,
            page_number: i + 1,
          },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const result = response.data as ExtractionResult;
        setExtractionResults(prev => [...prev, result]);

        totalImported += result.imported;
        totalSkipped += result.skipped;
        totalTopics += result.topics_created;
        totalErrors += result.errors.length;

        setTotalStats({
          imported: totalImported,
          skipped: totalSkipped,
          topics_created: totalTopics,
          errors: totalErrors,
        });

      } catch (error) {
        console.error(`Error processing page ${i + 1}:`, error);
        totalErrors++;
        setTotalStats(prev => ({ ...prev, errors: prev.errors + 1 }));
      }
    }

    setExtracting(false);
    
    if (totalImported > 0) {
      toast.success(`Successfully imported ${totalImported} questions from ${imageFiles.length} pages`);
    } else {
      toast.error("No questions were imported. Check the errors below.");
    }
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
            Bulk import questions into the master question bank.
          </p>
        </div>

        <Tabs defaultValue="csv" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="csv" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              CSV Import
            </TabsTrigger>
            <TabsTrigger value="images" className="gap-2">
              <Wand2 className="h-4 w-4" />
              AI Extraction
            </TabsTrigger>
            <TabsTrigger value="json" className="gap-2">
              <FileJson className="h-4 w-4" />
              JSON Import
            </TabsTrigger>
          </TabsList>

          {/* CSV Import Tab */}
          <TabsContent value="csv" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Import from CSV
                  </CardTitle>
                  <CardDescription>
                    Upload a CSV file exported from your Excel spreadsheet containing the question table.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Select your CSV file with all 600 questions
                    </p>
                    <Button
                      variant="default"
                      onClick={() => csvFileInputRef.current?.click()}
                      disabled={csvImporting}
                      size="lg"
                    >
                      {csvImporting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importing Questions...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Select CSV File
                        </>
                      )}
                    </Button>
                    <input
                      ref={csvFileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleCsvImport}
                    />
                  </div>

                  {csvImporting && (
                    <Alert>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <AlertTitle>Processing...</AlertTitle>
                      <AlertDescription>
                        Importing 600 questions and creating HIPAA topics. This may take 1-2 minutes.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                {csvResult && (
                  <Alert variant={csvResult.errors && csvResult.errors.length > 0 ? "default" : "default"}>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Import Complete</AlertTitle>
                    <AlertDescription>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="default">{csvResult.imported} imported</Badge>
                        {csvResult.updated && csvResult.updated > 0 && (
                          <Badge variant="secondary">{csvResult.updated} updated</Badge>
                        )}
                        {csvResult.skipped > 0 && (
                          <Badge variant="destructive">{csvResult.skipped} skipped</Badge>
                        )}
                        {csvResult.topics_created > 0 && (
                          <Badge variant="outline">{csvResult.topics_created} topics created</Badge>
                        )}
                      </div>
                      {csvResult.errors && csvResult.errors.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="font-medium text-sm">Errors:</p>
                          <ul className="text-sm space-y-1 max-h-[200px] overflow-y-auto">
                            {csvResult.errors.slice(0, 10).map((err, i) => (
                              <li key={i} className="text-destructive">{err}</li>
                            ))}
                            {csvResult.errors.length > 10 && (
                              <li className="text-muted-foreground">
                                ... and {csvResult.errors.length - 10} more errors
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
                    <CardTitle>Instructions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p>1. Open your Word document with the question table</p>
                    <p>2. Select the entire table (click inside, then Ctrl+A)</p>
                    <p>3. Copy and paste into Excel</p>
                    <p>4. Save as CSV (File → Save As → CSV format)</p>
                    <p>5. Upload the CSV file here</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* AI Image Extraction Tab */}
          <TabsContent value="images" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileImage className="h-5 w-5" />
                    Extract from Page Images
                  </CardTitle>
                  <CardDescription>
                    Upload screenshots or images of your question table pages. AI will automatically extract and import all questions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <FileImage className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Select all page images from your document (JPG, PNG format)
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={extracting}
                    >
                      {extracting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Select Page Images
                        </>
                      )}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageFilesUpload}
                    />
                  </div>

                  {extracting && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Processing pages...</span>
                        <span>{extractionProgress}%</span>
                      </div>
                      <Progress value={extractionProgress} className="h-2" />
                    </div>
                  )}

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>How to prepare images</AlertTitle>
                    <AlertDescription className="text-sm space-y-2">
                      <p>1. Open your Word document</p>
                      <p>2. Save each page as an image (File → Export → Save as Image), or take screenshots</p>
                      <p>3. Upload all page images here</p>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <div className="space-y-6">
                {(totalStats.imported > 0 || totalStats.errors > 0) && (
                  <Alert variant={totalStats.errors > 0 ? "default" : "default"}>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Extraction {extracting ? "Progress" : "Complete"}</AlertTitle>
                    <AlertDescription>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="default">{totalStats.imported} imported</Badge>
                        {totalStats.skipped > 0 && (
                          <Badge variant="destructive">{totalStats.skipped} skipped</Badge>
                        )}
                        {totalStats.topics_created > 0 && (
                          <Badge variant="secondary">{totalStats.topics_created} topics created</Badge>
                        )}
                        {totalStats.errors > 0 && (
                          <Badge variant="outline">{totalStats.errors} errors</Badge>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {extractionResults.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Extraction Log</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-[300px] overflow-y-auto space-y-2 text-sm">
                        {extractionResults.map((result, i) => (
                          <div key={i} className="flex items-center gap-2 text-muted-foreground">
                            {result.imported > 0 ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                            )}
                            <span>
                              Page {i + 1}: {result.extracted} extracted, {result.imported} imported
                              {result.errors.length > 0 && ` (${result.errors.length} errors)`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* JSON Import Tab */}
          <TabsContent value="json" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Import from JSON
                  </CardTitle>
                  <CardDescription>
                    Upload a JSON file or paste JSON data containing questions.
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
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PlatformOwnerLayout>
  );
}
