import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, AlertTriangle, CheckCircle2, Users, User, ChevronDown, ChevronUp, Info } from "lucide-react";
import { WorkforceGroup, WORKFORCE_GROUP_LABELS } from "@/types/hipaa";
import { WorkforceGroupBadge } from "@/components/WorkforceGroupBadge";
import { toast } from "sonner";

interface RiskArea {
  topic: string;
  errorRate: number;
  severity: "high" | "medium" | "low";
  recommendation: string;
}

interface EmployeeAnalysis {
  userId: string;
  userName: string;
  email: string;
  workforceGroup: string;
  totalQuizAttempts: number;
  totalWrongAnswers: number;
  weaknessesByTopic: Record<string, number>;
  aiAnalysis?: {
    riskAreas: RiskArea[];
    overallAssessment: string;
    remediation: string[];
  };
}

interface OrganizationSummary {
  highestRiskTopics: string[];
  overallComplianceRisk: "high" | "medium" | "low";
  priorityActions: string[];
}

interface AnalysisResult {
  success: boolean;
  analyses: EmployeeAnalysis[];
  organizationSummary?: OrganizationSummary;
  analyzedAt: string;
  message?: string;
  error?: string;
}

interface Employee {
  id: string;
  name: string;
  workforceGroup: WorkforceGroup;
}

// Demo analysis result for demonstration purposes
const demoAnalysisResult: AnalysisResult = {
  success: true,
  analyzedAt: new Date().toISOString(),
  organizationSummary: {
    highestRiskTopics: ["§164.308 - Administrative Safeguards", "§164.530 - Administrative Requirements"],
    overallComplianceRisk: "medium",
    priorityActions: [
      "Schedule refresher training on administrative safeguards for IT and Administrative staff",
      "Review breach notification procedures with all workforce groups",
      "Conduct targeted training on minimum necessary standard for Clinical staff"
    ]
  },
  analyses: [
    {
      userId: "demo-1",
      userName: "Sarah Johnson",
      email: "sarah.johnson@example.com",
      workforceGroup: "clinical",
      totalQuizAttempts: 3,
      totalWrongAnswers: 8,
      weaknessesByTopic: {
        "§164.502 - Minimum Necessary": 3,
        "§164.524 - Access Rights": 2,
        "§164.530 - Administrative Requirements": 3
      },
      aiAnalysis: {
        riskAreas: [
          { topic: "§164.502 - Minimum Necessary Standard", errorRate: 40, severity: "medium", recommendation: "Review minimum necessary requirements for clinical disclosures per §164.502(b)" },
          { topic: "§164.530 - Administrative Requirements", errorRate: 35, severity: "medium", recommendation: "Complete training module on administrative requirements and documentation" }
        ],
        overallAssessment: "Employee shows moderate understanding of HIPAA requirements with specific gaps in minimum necessary standard application.",
        remediation: ["Assign Minimum Necessary training module", "Schedule 1:1 review of clinical disclosure scenarios"]
      }
    },
    {
      userId: "demo-2",
      userName: "Michael Chen",
      email: "michael.chen@example.com",
      workforceGroup: "it",
      totalQuizAttempts: 2,
      totalWrongAnswers: 12,
      weaknessesByTopic: {
        "§164.308 - Administrative Safeguards": 5,
        "§164.312 - Technical Safeguards": 4,
        "§164.314 - Organizational Requirements": 3
      },
      aiAnalysis: {
        riskAreas: [
          { topic: "§164.308 - Administrative Safeguards", errorRate: 55, severity: "high", recommendation: "Immediate review of security management process and risk analysis requirements" },
          { topic: "§164.312 - Technical Safeguards", errorRate: 45, severity: "medium", recommendation: "Complete access control and audit control training modules" }
        ],
        overallAssessment: "Critical gaps identified in understanding of administrative and technical safeguards. Priority remediation required.",
        remediation: ["Assign Security Rule training immediately", "Review technical safeguards implementation with IT manager", "Complete risk analysis simulation exercise"]
      }
    }
  ]
};

export function WorkforceAnalysisPanel() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisType, setAnalysisType] = useState<"all" | "group" | "individual">("all");
  const [selectedGroup, setSelectedGroup] = useState<WorkforceGroup | "">("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  // Fetch real employees from database on mount
  useEffect(() => {
    async function fetchData() {
      // Try to get organization and employees
      const { data: orgs } = await supabase.from("organizations").select("id").limit(1);
      
      if (orgs && orgs.length > 0) {
        setOrganizationId(orgs[0].id);
        
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, workforce_group")
          .eq("organization_id", orgs[0].id);
        
        if (profiles && profiles.length > 0) {
          setEmployees(profiles.map(p => ({
            id: p.user_id,
            name: `${p.first_name} ${p.last_name}`,
            workforceGroup: (p.workforce_group || "all_staff") as WorkforceGroup
          })));
        }
      }
    }
    fetchData();
  }, []);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setIsDemo(false);

    // If no real data exists, show demo results
    if (!organizationId) {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      setAnalysisResult(demoAnalysisResult);
      setIsDemo(true);
      setIsAnalyzing(false);
      toast.success("Demo analysis complete! (No real employee data available)");
      return;
    }

    try {
      const requestBody: {
        organizationId: string;
        analyzeAll?: boolean;
        workforceGroup?: string;
        userId?: string;
      } = {
        organizationId,
      };

      if (analysisType === "all") {
        requestBody.analyzeAll = true;
      } else if (analysisType === "group" && selectedGroup) {
        requestBody.workforceGroup = selectedGroup;
      } else if (analysisType === "individual" && selectedEmployee) {
        requestBody.userId = selectedEmployee;
      }

      const { data, error } = await supabase.functions.invoke("analyze-workforce", {
        body: requestBody,
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Rate limit exceeded. Please try again in a few minutes.");
        } else if (data.error.includes("credits")) {
          toast.error("AI credits exhausted. Please contact your administrator.");
        } else {
          toast.error(data.error);
        }
        return;
      }

      setAnalysisResult(data);
      toast.success("Analysis complete!");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to run analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: "high" | "medium" | "low") => {
    switch (severity) {
      case "high":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium":
        return "bg-warning/10 text-warning border-warning/20";
      case "low":
        return "bg-success/10 text-success border-success/20";
    }
  };

  const getRiskBadgeVariant = (risk: "high" | "medium" | "low") => {
    switch (risk) {
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      case "low":
        return "default";
    }
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>AI Workforce Analysis</CardTitle>
            <CardDescription>
              Identify employee weakness areas based on quiz performance
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Analysis Options */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Analysis Scope</label>
            <Select
              value={analysisType}
              onValueChange={(value: "all" | "group" | "individual") => {
                setAnalysisType(value);
                setSelectedGroup("");
                setSelectedEmployee("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Entire Workforce
                  </div>
                </SelectItem>
                <SelectItem value="group">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    By Workforce Group
                  </div>
                </SelectItem>
                <SelectItem value="individual">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Individual Employee
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {analysisType === "group" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Workforce Group</label>
              <Select
                value={selectedGroup}
                onValueChange={(value: WorkforceGroup) => setSelectedGroup(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(WORKFORCE_GROUP_LABELS) as WorkforceGroup[]).map((group) => (
                    <SelectItem key={group} value={group}>
                      {WORKFORCE_GROUP_LABELS[group]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {analysisType === "individual" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Employee</label>
              <Select
                value={selectedEmployee}
                onValueChange={setSelectedEmployee}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {(employees.length > 0 ? employees : [
                    { id: "demo-1", name: "Sarah Johnson", workforceGroup: "clinical" as WorkforceGroup },
                    { id: "demo-2", name: "Michael Chen", workforceGroup: "it" as WorkforceGroup },
                  ]).map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-end">
            <Button
              onClick={handleAnalyze}
              disabled={
                isAnalyzing ||
                (analysisType === "group" && !selectedGroup) ||
                (analysisType === "individual" && !selectedEmployee)
              }
              className="w-full gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Results */}
        {analysisResult && (
          <div className="space-y-6 pt-4 border-t">
            {/* Organization Summary */}
            {analysisResult.organizationSummary && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Organization Summary</h3>
                  <Badge variant={getRiskBadgeVariant(analysisResult.organizationSummary.overallComplianceRisk)}>
                    {analysisResult.organizationSummary.overallComplianceRisk.toUpperCase()} RISK
                  </Badge>
                </div>

                {analysisResult.organizationSummary.highestRiskTopics.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Highest Risk Topics:</p>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.organizationSummary.highestRiskTopics.map((topic, i) => (
                        <Badge key={i} variant="outline" className="bg-destructive/5">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {analysisResult.organizationSummary.priorityActions.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Priority Actions:</p>
                    <ul className="space-y-1">
                      {analysisResult.organizationSummary.priorityActions.map((action, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Employee Analysis Cards */}
            <div className="space-y-3">
              <h3 className="font-semibold">
                Employee Analysis ({analysisResult.analyses.length} employees)
              </h3>

              {analysisResult.analyses.map((employee) => (
                <div
                  key={employee.userId}
                  className="rounded-lg border bg-card overflow-hidden"
                >
                  {/* Employee Header */}
                  <button
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    onClick={() =>
                      setExpandedEmployee(
                        expandedEmployee === employee.userId ? null : employee.userId
                      )
                    }
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium text-left">{employee.userName}</p>
                        <p className="text-sm text-muted-foreground">{employee.email}</p>
                      </div>
                      <WorkforceGroupBadge
                        group={employee.workforceGroup as WorkforceGroup}
                        size="sm"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      {employee.totalQuizAttempts === 0 ? (
                        <Badge variant="secondary">No quiz data</Badge>
                      ) : employee.aiAnalysis?.riskAreas.some((r) => r.severity === "high") ? (
                        <Badge variant="destructive">Needs Attention</Badge>
                      ) : employee.aiAnalysis?.riskAreas.some((r) => r.severity === "medium") ? (
                        <Badge variant="secondary">Moderate Risk</Badge>
                      ) : (
                        <Badge variant="default">On Track</Badge>
                      )}
                      {expandedEmployee === employee.userId ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {expandedEmployee === employee.userId && (
                    <div className="border-t p-4 space-y-4 bg-muted/20">
                      {employee.totalQuizAttempts === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          This employee has not completed any quizzes yet.
                        </p>
                      ) : (
                        <>
                          {/* Stats */}
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="rounded-lg bg-background p-3">
                              <p className="text-2xl font-bold">{employee.totalQuizAttempts}</p>
                              <p className="text-xs text-muted-foreground">Quiz Attempts</p>
                            </div>
                            <div className="rounded-lg bg-background p-3">
                              <p className="text-2xl font-bold">{employee.totalWrongAnswers}</p>
                              <p className="text-xs text-muted-foreground">Wrong Answers</p>
                            </div>
                            <div className="rounded-lg bg-background p-3">
                              <p className="text-2xl font-bold">
                                {Object.keys(employee.weaknessesByTopic).length}
                              </p>
                              <p className="text-xs text-muted-foreground">Topic Areas</p>
                            </div>
                          </div>

                          {/* AI Analysis */}
                          {employee.aiAnalysis && (
                            <>
                              {/* Risk Areas */}
                              {employee.aiAnalysis.riskAreas.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium mb-2">Risk Areas</p>
                                  <div className="space-y-2">
                                    {employee.aiAnalysis.riskAreas.map((risk, i) => (
                                      <div
                                        key={i}
                                        className={`rounded-lg border p-3 ${getSeverityColor(risk.severity)}`}
                                      >
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="font-medium text-sm">{risk.topic}</span>
                                          <Badge
                                            variant="outline"
                                            className={getSeverityColor(risk.severity)}
                                          >
                                            {risk.errorRate}% error rate
                                          </Badge>
                                        </div>
                                        <p className="text-sm opacity-90">{risk.recommendation}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Overall Assessment */}
                              {employee.aiAnalysis.overallAssessment && (
                                <div>
                                  <p className="text-sm font-medium mb-2">Overall Assessment</p>
                                  <p className="text-sm text-muted-foreground bg-background rounded-lg p-3">
                                    {employee.aiAnalysis.overallAssessment}
                                  </p>
                                </div>
                              )}

                              {/* Remediation */}
                              {employee.aiAnalysis.remediation.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium mb-2">Recommended Actions</p>
                                  <ul className="space-y-1">
                                    {employee.aiAnalysis.remediation.map((action, i) => (
                                      <li key={i} className="text-sm flex items-start gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                        {action}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </>
                          )}

                          {/* Raw Topic Breakdown */}
                          {Object.keys(employee.weaknessesByTopic).length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">Errors by Topic</p>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(employee.weaknessesByTopic).map(([topic, count]) => (
                                  <Badge key={topic} variant="outline">
                                    {topic}: {count} errors
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Analysis Timestamp */}
            <p className="text-xs text-muted-foreground text-center">
              Analysis completed at {new Date(analysisResult.analyzedAt).toLocaleString()}
            </p>
          </div>
        )}

        {/* No Results Message */}
        {analysisResult?.message && !analysisResult.organizationSummary && (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{analysisResult.message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
