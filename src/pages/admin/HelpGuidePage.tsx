import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserCheck, 
  BarChart3, 
  FileText, 
  BookOpen,
  ClipboardCheck,
  Settings,
  CheckCircle2,
  AlertCircle,
  Shield
} from "lucide-react";

// Import guide images
import guideSidebarUsers from "@/assets/guide-sidebar-users.png";
import guideAddUserButton from "@/assets/guide-add-user-button.png";
import guideEditButton from "@/assets/guide-edit-button.png";
import guideRunAnalysisButton from "@/assets/guide-run-analysis-button.png";

const GuideImage = ({ src, alt }: { src: string; alt: string }) => (
  <div className="my-4 rounded-lg border overflow-hidden bg-muted/30">
    <img src={src} alt={alt} className="w-full max-w-md mx-auto" />
    <p className="text-xs text-muted-foreground text-center py-2 bg-muted/50">{alt}</p>
  </div>
);

export default function AdminHelpGuidePage() {
  return (
    <DashboardLayout userName="Admin">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">How To Guide</h1>
          <p className="text-muted-foreground mt-1">
            Step-by-step instructions for managing your organization's training
          </p>
        </div>

        {/* Quick Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Getting Started Overview
            </CardTitle>
            <CardDescription>
              The basic workflow for managing employee training
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">1</Badge>
                <span><strong>Add Employees</strong> - Invite your staff members to the training platform</span>
              </li>
              <li className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">2</Badge>
                <span><strong>Assign Workforce Groups</strong> - Categorize each employee by their role type</span>
              </li>
              <li className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">3</Badge>
                <span><strong>Monitor Progress</strong> - Track who has completed their training</span>
              </li>
              <li className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">4</Badge>
                <span><strong>Review Reports</strong> - Analyze workforce compliance and identify gaps</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Detailed Guides */}
        <Accordion type="single" collapsible className="space-y-4">
          
          {/* Manage Users */}
          <AccordionItem value="manage-users" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">How to Add and Manage Employees</p>
                  <p className="text-sm text-muted-foreground font-normal">Invite staff and manage their accounts</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6">
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Adding New Employees</h4>
                  <ol className="space-y-3 text-muted-foreground">
                    <li className="flex flex-col gap-2">
                      <span>1. Go to <strong>Users</strong> in the left menu</span>
                      <GuideImage src={guideSidebarUsers} alt="Find Users in the left sidebar menu" />
                    </li>
                    <li className="flex flex-col gap-2">
                      <span>2. Click the <strong>Add User</strong> button</span>
                      <GuideImage src={guideAddUserButton} alt="Click the Add User button in the top right" />
                    </li>
                    <li>3. Enter the employee's email address, first name, and last name</li>
                    <li>4. Select their workforce group (for example: Clinical Staff, Administrative Staff)</li>
                    <li>5. Click <strong>Send Invitation</strong></li>
                    <li>6. The employee will receive an email with instructions to set up their account</li>
                  </ol>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Employee Status Types</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li><strong>Pending Assignment</strong> - New employee who has not been assigned a workforce group yet</li>
                    <li><strong>Active</strong> - Employee can access training materials and take quizzes</li>
                    <li><strong>Suspended</strong> - Account is temporarily disabled</li>
                  </ul>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-info mt-0.5" />
                    <p className="text-muted-foreground">
                      <strong>Tip:</strong> Employees must be assigned to a workforce group before they can start their training. This ensures they receive the appropriate content for their role.
                    </p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Assign Workforce Groups */}
          <AccordionItem value="workforce-groups" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <UserCheck className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">How to Assign Workforce Groups</p>
                  <p className="text-sm text-muted-foreground font-normal">Categorize employees by their role</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6">
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">What are Workforce Groups?</h4>
                  <p className="text-muted-foreground">
                    Workforce groups determine which training content an employee receives. Different roles have different HIPAA responsibilities, so their training is customized accordingly.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Available Workforce Groups</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li><strong>All Staff</strong> - Core training applicable to everyone in your organization</li>
                    <li><strong>Clinical Staff</strong> - Physicians, nurses, and clinical support personnel who handle patient care</li>
                    <li><strong>Administrative Staff</strong> - Billing, front desk, and administrative personnel who handle patient information</li>
                    <li><strong>Management and Leadership</strong> - Supervisors and executives responsible for compliance oversight</li>
                    <li><strong>IT and Security Personnel</strong> - Technical staff who manage systems containing protected health information</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Changing an Employee's Group</h4>
                  <ol className="space-y-3 text-muted-foreground">
                    <li>1. Go to <strong>Users</strong> in the left menu</li>
                    <li>2. Find the employee you want to update</li>
                    <li className="flex flex-col gap-2">
                      <span>3. Click the <strong>Edit</strong> button</span>
                      <GuideImage src={guideEditButton} alt="Click the Edit button to modify employee details" />
                    </li>
                    <li>4. Select a new workforce group</li>
                    <li>5. Click <strong>Save Changes</strong></li>
                  </ol>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Monitor Progress */}
          <AccordionItem value="monitor-progress" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">How to Monitor Training Progress</p>
                  <p className="text-sm text-muted-foreground font-normal">Track employee completion status</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6">
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Dashboard Overview</h4>
                  <p className="text-muted-foreground">
                    Your main dashboard shows a summary of your organization's training compliance, including how many employees have completed their training and overall pass rates.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">What You Can Track</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li><strong>Completion Rate</strong> - Percentage of employees who have finished all required training</li>
                    <li><strong>Quiz Scores</strong> - Average scores and individual results for each quiz</li>
                    <li><strong>Training Materials</strong> - Which educational content has been read</li>
                    <li><strong>Certificates</strong> - Valid certificates earned by employees</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Finding Individual Progress</h4>
                  <ol className="space-y-2 text-muted-foreground">
                    <li>1. Go to <strong>Users</strong> in the left menu</li>
                    <li>2. Find the employee you want to review</li>
                    <li>3. Click on their name to see their detailed training history</li>
                    <li>4. View their quiz attempts, scores, and completion dates</li>
                  </ol>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Workforce Analysis */}
          <AccordionItem value="workforce-analysis" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">How to Run Workforce Analysis</p>
                  <p className="text-sm text-muted-foreground font-normal">Get AI-powered insights on compliance gaps</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6">
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">What is Workforce Analysis?</h4>
                  <p className="text-muted-foreground">
                    The workforce analysis feature uses artificial intelligence to review your organization's training data and identify patterns, risks, and recommendations for improvement.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Running an Analysis</h4>
                  <ol className="space-y-3 text-muted-foreground">
                    <li>1. Go to your <strong>Dashboard</strong></li>
                    <li>2. Find the <strong>Workforce Analysis</strong> section</li>
                    <li className="flex flex-col gap-2">
                      <span>3. Click <strong>Run Analysis</strong></span>
                      <GuideImage src={guideRunAnalysisButton} alt="Click Run Analysis to start the AI-powered review" />
                    </li>
                    <li>4. Wait for the AI to process your data (this may take a few moments)</li>
                    <li>5. Review the findings and recommendations</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-medium mb-2">What the Analysis Shows</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li><strong>Risk Areas</strong> - HIPAA topics where employees are struggling</li>
                    <li><strong>Training Gaps</strong> - Employees who have not completed required training</li>
                    <li><strong>Recommendations</strong> - Suggested actions to improve compliance</li>
                    <li><strong>Trends</strong> - How your organization's performance is changing over time</li>
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Certificates */}
          <AccordionItem value="certificates" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">How to View and Manage Certificates</p>
                  <p className="text-sm text-muted-foreground font-normal">Track compliance documentation</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6">
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">What are Certificates?</h4>
                  <p className="text-muted-foreground">
                    When an employee passes all required quizzes, they receive a certificate of completion. These certificates serve as proof of training for compliance audits and are stored for the required retention period.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Certificate Information</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li><strong>Certificate Number</strong> - Unique identifier for audit purposes</li>
                    <li><strong>Issue Date</strong> - When the certificate was earned</li>
                    <li><strong>Valid Until</strong> - Expiration date (typically one year)</li>
                    <li><strong>Score</strong> - Final quiz score achieved</li>
                    <li><strong>HIPAA Citations</strong> - Specific regulations covered</li>
                  </ul>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-success mt-0.5" />
                    <p className="text-muted-foreground">
                      <strong>Compliance Note:</strong> All certificates are retained for six years as required by HIPAA regulations. This ensures you have documentation available for any audits.
                    </p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Training Materials */}
          <AccordionItem value="training-materials" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Understanding Training Materials</p>
                  <p className="text-sm text-muted-foreground font-normal">Educational content for your employees</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6">
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">What Training Materials are Available?</h4>
                  <p className="text-muted-foreground">
                    Training materials are educational content provided by the platform that explain HIPAA rules, best practices, and compliance requirements. These are customized for each workforce group.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">How Employees Use Training Materials</h4>
                  <ol className="space-y-2 text-muted-foreground">
                    <li>1. Employees log in to their training dashboard</li>
                    <li>2. They read through the assigned training materials</li>
                    <li>3. After reading, they mark the material as complete</li>
                    <li>4. Once all materials are read, they can take the quiz</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Viewing Available Content</h4>
                  <p className="text-muted-foreground">
                    Go to <strong>Training Materials</strong> to see what content has been made available to your organization. You can review the materials yourself to understand what your employees are learning.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>
    </DashboardLayout>
  );
}
