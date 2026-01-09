import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProgressProvider } from "@/contexts/ProgressContext";
import { MfaGuard } from "@/components/MfaGuard";
import { RoleGuard } from "@/components/RoleGuard";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import MfaEnrollPage from "./pages/MfaEnrollPage";
import MfaVerifyPage from "./pages/MfaVerifyPage";
import DemoPage from "./pages/DemoPage";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import QuizPage from "./pages/QuizPage";
import QuizzesPage from "./pages/QuizzesPage";
import TrainingMaterialsPage from "./pages/TrainingMaterialsPage";
import TrainingMaterialPage from "./pages/TrainingMaterialPage";
import UsersPage from "./pages/admin/UsersPage";
import PendingSetupPage from "./pages/PendingSetupPage";
import NotFound from "./pages/NotFound";

// Platform Owner Pages
import PlatformDashboard from "./pages/platform/PlatformDashboard";
import QuestionBankPage from "./pages/platform/QuestionBankPage";
import ImportQuestionsPage from "./pages/platform/ImportQuestionsPage";
import TrainingMaterialsManagerPage from "./pages/platform/TrainingMaterialsManagerPage";
import ContentReleasesPage from "./pages/platform/ContentReleasesPage";
import OrganizationsPage from "./pages/platform/OrganizationsPage";
import SeedQuestionsPage from "./pages/platform/SeedQuestionsPage";
import QuestionDistributionPage from "./pages/platform/QuestionDistributionPage";
import PackageManagerPage from "./pages/platform/PackageManagerPage";
import PlatformHelpGuidePage from "./pages/platform/HelpGuidePage";

// Admin Pages
import AdminHelpGuidePage from "./pages/admin/HelpGuidePage";
import ReportsPage from "./pages/admin/ReportsPage";

// Employee Pages
import EmployeeTrainingPage from "./pages/employee/TrainingPage";
import HistoryPage from "./pages/employee/HistoryPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ProgressProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/mfa-enroll" element={<MfaEnrollPage />} />
            <Route path="/mfa-verify" element={<MfaVerifyPage />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/pending-setup" element={<PendingSetupPage />} />
            
            {/* Protected Admin Routes */}
            <Route
              path="/admin"
              element={
                <MfaGuard>
                  <RoleGuard allowedRoles={["org_admin"]}>
                    <AdminDashboard />
                  </RoleGuard>
                </MfaGuard>
              }
            />
            <Route
              path="/admin/users"
              element={
                <MfaGuard>
                  <RoleGuard allowedRoles={["org_admin"]}>
                    <UsersPage />
                  </RoleGuard>
                </MfaGuard>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <MfaGuard>
                  <RoleGuard allowedRoles={["org_admin"]}>
                    <ReportsPage />
                  </RoleGuard>
                </MfaGuard>
              }
            />
            <Route
              path="/admin/help"
              element={
                <MfaGuard>
                  <RoleGuard allowedRoles={["org_admin"]}>
                    <AdminHelpGuidePage />
                  </RoleGuard>
                </MfaGuard>
              }
            />

            {/* Protected User Dashboard Routes */}
            <Route
              path="/dashboard"
              element={
                <MfaGuard>
                  <RoleGuard allowedRoles={["workforce_user"]}>
                    <UserDashboard />
                  </RoleGuard>
                </MfaGuard>
              }
            />
            <Route
              path="/dashboard/quizzes"
              element={
                <MfaGuard>
                  <RoleGuard allowedRoles={["workforce_user"]}>
                    <QuizzesPage />
                  </RoleGuard>
                </MfaGuard>
              }
            />
            <Route
              path="/dashboard/quiz/:quizId"
              element={
                <MfaGuard>
                  <RoleGuard allowedRoles={["workforce_user"]}>
                    <QuizPage />
                  </RoleGuard>
                </MfaGuard>
              }
            />
            <Route
              path="/dashboard/training"
              element={
                <MfaGuard>
                  <RoleGuard allowedRoles={["workforce_user"]}>
                    <TrainingMaterialsPage />
                  </RoleGuard>
                </MfaGuard>
              }
            />
            <Route
              path="/dashboard/training/:materialId"
              element={
                <MfaGuard>
                  <RoleGuard allowedRoles={["workforce_user"]}>
                    <TrainingMaterialPage />
                  </RoleGuard>
                </MfaGuard>
              }
            />

            {/* Protected Employee Training Routes */}
            <Route
              path="/employee/training"
              element={
                <MfaGuard>
                  <RoleGuard allowedRoles={["workforce_user"]}>
                    <EmployeeTrainingPage />
                  </RoleGuard>
                </MfaGuard>
              }
            />
            <Route
              path="/dashboard/history"
              element={
                <MfaGuard>
                  <RoleGuard allowedRoles={["workforce_user"]}>
                    <HistoryPage />
                  </RoleGuard>
                </MfaGuard>
              }
            />

            {/* Protected Platform Owner Routes */}
            <Route
              path="/platform"
              element={
                <MfaGuard>
                  <RoleGuard allowedRoles={["platform_owner"]}>
                    <PlatformDashboard />
                  </RoleGuard>
                </MfaGuard>
              }
            />
            <Route
              path="/platform/questions"
              element={
                <MfaGuard>
                  <RoleGuard allowedRoles={["platform_owner"]}>
                    <QuestionBankPage />
                  </RoleGuard>
                </MfaGuard>
              }
            />
            <Route
              path="/platform/import"
              element={
                <MfaGuard>
                  <RoleGuard allowedRoles={["platform_owner"]}>
                    <ImportQuestionsPage />
                  </RoleGuard>
                </MfaGuard>
              }
            />
            <Route
              path="/platform/seed"
              element={
                <MfaGuard>
                  <RoleGuard allowedRoles={["platform_owner"]}>
                    <SeedQuestionsPage />
                  </RoleGuard>
                </MfaGuard>
              }
            />
            <Route
              path="/platform/materials"
              element={
                <MfaGuard>
                  <RoleGuard allowedRoles={["platform_owner"]}>
                    <TrainingMaterialsManagerPage />
                  </RoleGuard>
                </MfaGuard>
              }
            />
            <Route
              path="/platform/releases"
              element={
                <MfaGuard>
                  <RoleGuard allowedRoles={["platform_owner"]}>
                    <ContentReleasesPage />
                  </RoleGuard>
                </MfaGuard>
              }
            />
            <Route
              path="/platform/organizations"
              element={
                <MfaGuard>
                  <RoleGuard allowedRoles={["platform_owner"]}>
                    <OrganizationsPage />
                  </RoleGuard>
                </MfaGuard>
              }
            />
            <Route
              path="/platform/distribution"
              element={
                <MfaGuard>
                  <RoleGuard allowedRoles={["platform_owner"]}>
                    <QuestionDistributionPage />
                  </RoleGuard>
                </MfaGuard>
              }
            />
            <Route
              path="/platform/packages"
              element={
                <MfaGuard>
                  <RoleGuard allowedRoles={["platform_owner"]}>
                    <PackageManagerPage />
                  </RoleGuard>
                </MfaGuard>
              }
            />
            <Route
              path="/platform/help"
              element={
                <MfaGuard>
                  <RoleGuard allowedRoles={["platform_owner"]}>
                    <PlatformHelpGuidePage />
                  </RoleGuard>
                </MfaGuard>
              }
            />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ProgressProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
