import { DashboardLayout } from "@/components/DashboardLayout";
import { useUserProfile } from "@/hooks/useUserProfile";
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
  CheckCircle2,
  AlertCircle,
  Shield,
  CalendarClock
} from "lucide-react";

export default function AdminHelpGuidePage() {
  const { fullName } = useUserProfile();
  
  return (
    <DashboardLayout userRole="org_admin" userName={fullName || "Admin"}>
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
                <span><strong>Add Employees</strong> - Create accounts for your staff members on the training platform</span>
              </li>
              <li className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">2</Badge>
                <span><strong>Assign Workforce Groups</strong> - Categorize employees by their role type when adding them</span>
              </li>
              <li className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">3</Badge>
                <span><strong>Assign Training with Deadline</strong> - Set a completion deadline for individual employees</span>
              </li>
              <li className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">4</Badge>
                <span><strong>Monitor Progress</strong> - Track who has completed their training and met deadlines</span>
              </li>
              <li className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">5</Badge>
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
                    <li>1. Go to <strong>Users</strong> in the left sidebar menu</li>
                    <li>2. Click the <strong>Add Employee</strong> button in the top right corner</li>
                    <li>3. Enter the employee's first name, last name, and email address</li>
                    <li>4. Select their workforce group(s) - for example: Clinical Staff, Administrative Staff, or All Staff</li>
                    <li>5. Optionally, check "This employee is a contractor" if applicable</li>
                    <li>6. Click <strong>Add Employee</strong> to create the account</li>
                    <li>7. A temporary password will be displayed along with a ready-to-use email template</li>
                    <li>8. Click <strong>Copy Email</strong> to copy the email template with login instructions</li>
                    <li>9. Paste the email into your email client and send it to the employee</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Resetting an Employee's Password</h4>
                  <ol className="space-y-2 text-muted-foreground">
                    <li>1. Find the employee in the Users list</li>
                    <li>2. Click the <strong>key icon</strong> in the Actions column</li>
                    <li>3. A new temporary password will be generated with an email template</li>
                    <li>4. Click <strong>Copy Email</strong> to copy the password reset notification</li>
                    <li>5. Send the email to the employee through your email client</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Deleting an Employee</h4>
                  <ol className="space-y-2 text-muted-foreground">
                    <li>1. Find the employee in the Users list</li>
                    <li>2. Click the <strong>trash icon</strong> in the Actions column</li>
                    <li>3. Confirm the deletion - this permanently removes the employee and all their training records</li>
                  </ol>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Employee Status Types</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li><strong>Pending</strong> - Employee has been created but has not yet logged in or been assigned training</li>
                    <li><strong>Active</strong> - Employee can access training materials and take quizzes</li>
                    <li><strong>Suspended</strong> - Account is temporarily disabled</li>
                  </ul>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-info mt-0.5" />
                    <p className="text-muted-foreground">
                      <strong>Important:</strong> Temporary passwords expire in 7 days. Make sure employees log in and set a new password promptly.
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
                  <h4 className="font-medium mb-2">What Are Workforce Groups?</h4>
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
                  <h4 className="font-medium mb-2">Assigning Workforce Groups</h4>
                  <p className="text-muted-foreground mb-2">
                    Workforce groups are assigned when you create a new employee account:
                  </p>
                  <ol className="space-y-2 text-muted-foreground">
                    <li>1. Click <strong>Add Employee</strong> to open the new employee form</li>
                    <li>2. Enter the employee's details (name and email)</li>
                    <li>3. In the <strong>Workforce Groups</strong> section, check one or more groups that apply</li>
                    <li>4. Click <strong>Add Employee</strong> to save</li>
                  </ol>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-info mt-0.5" />
                    <p className="text-muted-foreground">
                      <strong>Note:</strong> Employees can belong to multiple workforce groups. For example, a nurse manager might be assigned to both "Clinical Staff" and "Management and Leadership."
                    </p>
                  </div>
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
                  <ol className="space-y-2 text-muted-foreground">
                    <li>1. Go to your <strong>Dashboard</strong></li>
                    <li>2. Find the <strong>Workforce Analysis</strong> section</li>
                    <li>3. Click the <strong>Run Analysis</strong> button</li>
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

          {/* Assign Training */}
          <AccordionItem value="assign-training" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CalendarClock className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">How to Assign Training with Deadlines</p>
                  <p className="text-sm text-muted-foreground font-normal">Set completion deadlines for employees</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6">
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">What is Training Assignment?</h4>
                  <p className="text-muted-foreground">
                    Training assignment allows you to officially assign training materials and quizzes to individual employees, with a specific completion deadline. Employees will see their deadline prominently displayed and receive alerts as the deadline approaches.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Assigning Training to an Employee</h4>
                  <ol className="space-y-3 text-muted-foreground">
                    <li>1. Go to <strong>Users</strong> in the left menu</li>
                    <li>2. Find the employee you want to assign training to</li>
                    <li>3. Click the <strong>book icon</strong> in the Actions column (this is the Assign Training button)</li>
                    <li>4. Review the employee's workforce groups and available content</li>
                    <li>5. Choose a <strong>Completion Deadline</strong> using the date picker</li>
                    <li>6. Add any optional notes or instructions</li>
                    <li>7. Click <strong>Assign Training</strong></li>
                  </ol>
                </div>

                <div className="p-3 bg-muted rounded-lg mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-info mt-0.5" />
                    <p className="text-muted-foreground">
                      <strong>Note:</strong> The Assign Training button is only available for employees who have a workforce group assigned. If the button is disabled, first assign the employee to a workforce group.
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">What Employees See</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li><strong>Deadline Banner</strong> - A prominent display showing the completion deadline</li>
                    <li><strong>Days Remaining</strong> - A countdown to the deadline</li>
                    <li><strong>Overdue Warning</strong> - Red alert if the deadline has passed</li>
                    <li><strong>Progress Tracker</strong> - Visual progress through training materials</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">After Assignment</h4>
                  <p className="text-muted-foreground">
                    Once training is assigned, employees must complete all training materials before the quiz is unlocked. When they finish the materials, the quiz becomes available automatically. Passing the quiz generates their compliance certificate.
                  </p>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                    <p className="text-muted-foreground">
                      <strong>Tip:</strong> Set reasonable deadlines that give employees enough time to complete all materials. Consider workload and scheduling when choosing dates.
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
                    Training materials are educational content provided by the platform that explain HIPAA rules, best practices, and compliance requirements. These are customized for each workforce group and include key points, HIPAA citations (linked to official sources), and structured sections.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">How Employees Use Training Materials</h4>
                  <ol className="space-y-2 text-muted-foreground">
                    <li>1. Employees log in and see their assigned training with deadline</li>
                    <li>2. They work through each training material section by section</li>
                    <li>3. Key points highlight the most important takeaways</li>
                    <li>4. HIPAA citations link to the official regulations for reference</li>
                    <li>5. After completing all sections, they mark the material complete</li>
                    <li>6. Once all materials are complete, the quiz is automatically unlocked</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Viewing Available Content</h4>
                  <p className="text-muted-foreground">
                    Go to <strong>Knowledge Base</strong> to see what content has been made available to your organization. You can review the materials yourself to understand what your employees are learning.
                  </p>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-info mt-0.5" />
                    <p className="text-muted-foreground">
                      <strong>Note:</strong> All HIPAA section references are automatically linked to the Cornell Law Legal Information Institute, allowing employees to read the full regulatory text for deeper understanding.
                    </p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>
    </DashboardLayout>
  );
}
