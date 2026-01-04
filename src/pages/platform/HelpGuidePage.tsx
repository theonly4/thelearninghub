import { PlatformOwnerLayout } from "@/components/PlatformOwnerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Package, 
  Send, 
  Building2, 
  FileQuestion, 
  BookOpen, 
  Users,
  Settings,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function HelpGuidePage() {
  return (
    <PlatformOwnerLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">How To Guide</h1>
          <p className="text-muted-foreground mt-1">
            Step-by-step instructions for managing your training platform
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
              The basic workflow for setting up training for a new customer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">1</Badge>
                <span><strong>Upload Questions</strong> - Import your question bank using the CSV import feature</span>
              </li>
              <li className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">2</Badge>
                <span><strong>Create Packages</strong> - Bundle 25 questions into training packages for each workforce group</span>
              </li>
              <li className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">3</Badge>
                <span><strong>Add Organization</strong> - Create a new customer organization in the system</span>
              </li>
              <li className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">4</Badge>
                <span><strong>Release Packages</strong> - Assign question packages to the customer for their training year</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Detailed Guides */}
        <Accordion type="single" collapsible className="space-y-4">
          
          {/* Upload Questions */}
          <AccordionItem value="upload-csv" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">How to Upload Questions Using CSV File</p>
                  <p className="text-sm text-muted-foreground font-normal">Import bulk questions from a spreadsheet</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6">
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Before You Start</h4>
                  <p className="text-muted-foreground">
                    Make sure your CSV file has these columns: Question Number, Scenario (optional), Question Text, Options (A through D), Correct Answer, Rationale, HIPAA Section, and Workforce Groups.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Step-by-Step Instructions</h4>
                  <ol className="space-y-2 text-muted-foreground">
                    <li>1. Go to <strong>Question Bank</strong> in the left menu</li>
                    <li>2. Click the <strong>Import CSV</strong> button at the top right</li>
                    <li>3. Select your CSV file from your computer</li>
                    <li>4. Review the preview to make sure the data looks correct</li>
                    <li>5. Click <strong>Import Questions</strong> to add them to your question bank</li>
                    <li>6. The system will automatically create any new HIPAA topics that do not already exist</li>
                  </ol>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                    <p className="text-muted-foreground">
                      <strong>Tip:</strong> If you are copying from Excel, save as CSV (Comma Separated Values) format first. Remove any merged cells or special formatting before exporting.
                    </p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Package Questions */}
          <AccordionItem value="create-packages" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">How to Create Question Packages</p>
                  <p className="text-sm text-muted-foreground font-normal">Bundle questions into training sets</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6">
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">What is a Question Package?</h4>
                  <p className="text-muted-foreground">
                    A question package is a set of 25 questions bundled together for a specific workforce group (such as Clinical Staff or Administrative Staff). Each package is used for one training year.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Step-by-Step Instructions</h4>
                  <ol className="space-y-2 text-muted-foreground">
                    <li>1. Go to <strong>Question Packages</strong> in the left menu</li>
                    <li>2. Click the <strong>Create Package</strong> button</li>
                    <li>3. Select the <strong>Workforce Group</strong> this package is for</li>
                    <li>4. Enter a name for the package (for example: Clinical Staff - Year 1)</li>
                    <li>5. Add a description if you want (this is optional)</li>
                    <li>6. Click <strong>Create Package with 25 Random Questions</strong></li>
                    <li>7. The system will automatically select 25 questions that have not been used in other packages for this workforce group</li>
                  </ol>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-info mt-0.5" />
                    <p className="text-muted-foreground">
                      <strong>Note:</strong> You need at least 25 available questions for the workforce group before you can create a package. Questions already used in packages for that group will not be selected again.
                    </p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Release Packages */}
          <AccordionItem value="release-packages" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Send className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">How to Release Packages to Customers</p>
                  <p className="text-sm text-muted-foreground font-normal">Assign training packages to organizations</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6">
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">What Does Releasing Mean?</h4>
                  <p className="text-muted-foreground">
                    When you release a package to a customer organization, their employees can access those questions for their annual training. You control which packages each customer receives.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Step-by-Step Instructions</h4>
                  <ol className="space-y-2 text-muted-foreground">
                    <li>1. Go to <strong>Question Packages</strong> in the left menu</li>
                    <li>2. Find the package you want to release</li>
                    <li>3. Click the <strong>Release</strong> button (paper airplane icon) on that package</li>
                    <li>4. Select the <strong>Organization</strong> you want to release it to</li>
                    <li>5. Enter the <strong>Training Year</strong> (for example: 2025)</li>
                    <li>6. Add any notes about this release (this is optional)</li>
                    <li>7. Click <strong>Release Package</strong></li>
                  </ol>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-success mt-0.5" />
                    <p className="text-muted-foreground">
                      <strong>Good to know:</strong> You can track all your releases in the <strong>Content Releases</strong> and <strong>Question Distribution</strong> pages. This creates a permanent record for compliance audits.
                    </p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Manage Organizations */}
          <AccordionItem value="manage-orgs" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">How to Manage Customer Organizations</p>
                  <p className="text-sm text-muted-foreground font-normal">Add and view customer accounts</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6">
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Viewing Organizations</h4>
                  <p className="text-muted-foreground">
                    Go to <strong>Organizations</strong> in the left menu to see all your customer organizations. You can see how many users each organization has and how many packages have been released to them.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">What You Can See for Each Organization</h4>
                  <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Organization name and identifier</li>
                    <li>Total number of users</li>
                    <li>Number of question packages released</li>
                    <li>Number of quizzes and training materials available</li>
                    <li>When the organization was created</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Viewing Release Details</h4>
                  <p className="text-muted-foreground">
                    Click the <strong>View</strong> button next to any organization to see all content that has been released to them, including packages, quizzes, and training materials.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Question Bank */}
          <AccordionItem value="question-bank" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">How to Edit and Manage the Question Bank</p>
                  <p className="text-sm text-muted-foreground font-normal">View, edit, and add individual questions</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6">
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Viewing Questions</h4>
                  <p className="text-muted-foreground">
                    Go to <strong>Question Bank</strong> to see all questions in your system. You can search by text, filter by HIPAA topic, and page through results.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Editing a Question</h4>
                  <ol className="space-y-2 text-muted-foreground">
                    <li>1. Find the question you want to edit</li>
                    <li>2. Click the <strong>Edit</strong> button (pencil icon)</li>
                    <li>3. Update the question text, answer options, correct answer, rationale, or workforce groups</li>
                    <li>4. Click <strong>Save Changes</strong></li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Adding a New Question</h4>
                  <ol className="space-y-2 text-muted-foreground">
                    <li>1. Click <strong>Add Question</strong> at the top of the Question Bank page</li>
                    <li>2. Fill in all required fields: question text, four answer options, correct answer, rationale, and HIPAA section</li>
                    <li>3. Select which workforce groups this question applies to</li>
                    <li>4. Click <strong>Create Question</strong></li>
                  </ol>
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
                  <p className="font-medium">How to Manage Training Materials</p>
                  <p className="text-sm text-muted-foreground font-normal">Create and distribute educational content</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6">
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">What are Training Materials?</h4>
                  <p className="text-muted-foreground">
                    Training materials are educational content that employees read before taking quizzes. They explain HIPAA rules and best practices in plain language.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Managing Training Materials</h4>
                  <ol className="space-y-2 text-muted-foreground">
                    <li>1. Go to <strong>Training Materials</strong> in the left menu</li>
                    <li>2. Click <strong>Add Material</strong> to create new content</li>
                    <li>3. Enter the title, description, and content sections</li>
                    <li>4. Select which workforce groups this material is for</li>
                    <li>5. Add relevant HIPAA citations</li>
                    <li>6. Click <strong>Save</strong></li>
                  </ol>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-info mt-0.5" />
                    <p className="text-muted-foreground">
                      <strong>Tip:</strong> Training materials can be released to specific organizations using the Content Releases feature, similar to how you release question packages.
                    </p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Content Distribution Tracking */}
          <AccordionItem value="distribution" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <RefreshCw className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">How to Track Question Distribution</p>
                  <p className="text-sm text-muted-foreground font-normal">Monitor which questions went to which customers</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6">
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Why Track Distribution?</h4>
                  <p className="text-muted-foreground">
                    For compliance audits, you need to prove which training content was delivered to each organization and when. The Question Distribution page provides this audit trail.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Using the Distribution Page</h4>
                  <ol className="space-y-2 text-muted-foreground">
                    <li>1. Go to <strong>Question Distribution</strong> in the left menu</li>
                    <li>2. See a summary of how many questions each organization has received</li>
                    <li>3. Filter by organization to see their specific questions</li>
                    <li>4. Each entry shows the question, release date, and source (individual or package)</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Audit Trail</h4>
                  <p className="text-muted-foreground">
                    Every release is permanently recorded with a timestamp. This information cannot be deleted and serves as evidence of your training delivery for regulatory compliance.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>
    </PlatformOwnerLayout>
  );
}