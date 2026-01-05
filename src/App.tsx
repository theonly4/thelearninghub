import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProgressProvider } from "@/contexts/ProgressContext";
import { MfaGuard } from "@/components/MfaGuard";
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
            <Route path="/admin" element={<MfaGuard><AdminDashboard /></MfaGuard>} />
            <Route path="/admin/users" element={<MfaGuard><UsersPage /></MfaGuard>} />
            <Route path="/admin/reports" element={<MfaGuard><ReportsPage /></MfaGuard>} />
            <Route path="/admin/help" element={<MfaGuard><AdminHelpGuidePage /></MfaGuard>} />
            
            {/* Protected User Dashboard Routes */}
            <Route path="/dashboard" element={<MfaGuard><UserDashboard /></MfaGuard>} />
            <Route path="/dashboard/quizzes" element={<MfaGuard><QuizzesPage /></MfaGuard>} />
            <Route path="/dashboard/quiz/:quizId" element={<MfaGuard><QuizPage /></MfaGuard>} />
            <Route path="/dashboard/training" element={<MfaGuard><TrainingMaterialsPage /></MfaGuard>} />
            <Route path="/dashboard/training/:materialId" element={<MfaGuard><TrainingMaterialPage /></MfaGuard>} />
            
            {/* Protected Employee Training Routes */}
            <Route path="/employee/training" element={<MfaGuard><EmployeeTrainingPage /></MfaGuard>} />
            
            {/* Protected Platform Owner Routes */}
            <Route path="/platform" element={<MfaGuard><PlatformDashboard /></MfaGuard>} />
            <Route path="/platform/questions" element={<MfaGuard><QuestionBankPage /></MfaGuard>} />
            <Route path="/platform/import" element={<MfaGuard><ImportQuestionsPage /></MfaGuard>} />
            <Route path="/platform/seed" element={<MfaGuard><SeedQuestionsPage /></MfaGuard>} />
            <Route path="/platform/materials" element={<MfaGuard><TrainingMaterialsManagerPage /></MfaGuard>} />
            <Route path="/platform/releases" element={<MfaGuard><ContentReleasesPage /></MfaGuard>} />
            <Route path="/platform/organizations" element={<MfaGuard><OrganizationsPage /></MfaGuard>} />
            <Route path="/platform/distribution" element={<MfaGuard><QuestionDistributionPage /></MfaGuard>} />
            <Route path="/platform/packages" element={<MfaGuard><PackageManagerPage /></MfaGuard>} />
            <Route path="/platform/help" element={<MfaGuard><PlatformHelpGuidePage /></MfaGuard>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ProgressProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
