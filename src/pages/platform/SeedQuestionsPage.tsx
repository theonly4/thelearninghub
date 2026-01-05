import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2, Database } from "lucide-react";
import { PlatformOwnerLayout } from "@/components/PlatformOwnerLayout";
import { supabase } from "@/integrations/supabase/client";

interface SeedResult {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  topics_created: number;
  errors: string[];
}

export default function SeedQuestionsPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleSeedQuestions = async () => {
    setIsSeeding(true);
    setError(null);
    setResult(null);
    setProgress(10);

    try {
      // Get the current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("Not authenticated. Please sign in again.");
      }

      // Fetch the CSV from the public folder
      const csvResponse = await fetch("/data/questions.csv");
      if (!csvResponse.ok) {
        throw new Error("Could not load questions.csv from public folder");
      }
      
      setProgress(30);
      const csvContent = await csvResponse.text();
      console.log(`Loaded CSV with ${csvContent.length} characters`);
      
      setProgress(50);

      // Call the edge function with auth header
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seed-questions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ csv_content: csvContent }),
        }
      );

      setProgress(90);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Seeding failed");
      }

      const data = await response.json();
      setResult(data);
      setProgress(100);
    } catch (err) {
      console.error("Seed error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <PlatformOwnerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Seed Question Bank</h1>
          <p className="text-muted-foreground mt-2">
            One-time import of all 600 questions from the cleaned CSV file.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Import Questions from CSV
            </CardTitle>
            <CardDescription>
              This will import all questions from /data/questions.csv into the master question bank.
              Existing questions with the same number will be updated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleSeedQuestions}
              disabled={isSeeding}
              size="lg"
              className="w-full"
            >
              {isSeeding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Seeding Database...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Seed 600 Questions
                </>
              )}
            </Button>

            {isSeeding && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground text-center">
                  {progress < 30 && "Loading CSV file..."}
                  {progress >= 30 && progress < 50 && "Parsing content..."}
                  {progress >= 50 && progress < 90 && "Importing questions..."}
                  {progress >= 90 && "Finishing up..."}
                </p>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-700 dark:text-green-300">
                  Import Complete!
                </AlertTitle>
                <AlertDescription className="text-green-600 dark:text-green-400">
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>Total processed: {result.total}</div>
                    <div>New imports: {result.imported}</div>
                    <div>Updated: {result.updated}</div>
                    <div>Skipped: {result.skipped}</div>
                    <div>Topics created: {result.topics_created}</div>
                  </div>
                  {result.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium">Errors ({result.errors.length}):</p>
                      <ul className="text-sm list-disc list-inside max-h-40 overflow-auto">
                        {result.errors.slice(0, 20).map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                        {result.errors.length > 20 && (
                          <li>...and {result.errors.length - 20} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </PlatformOwnerLayout>
  );
}
