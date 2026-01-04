import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProgressProvider } from "@/contexts/ProgressContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ProgressProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/help" element={<AdminHelpGuidePage />} />
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/dashboard/quizzes" element={<QuizzesPage />} />
            <Route path="/dashboard/quiz/:quizId" element={<QuizPage />} />
            <Route path="/dashboard/training" element={<TrainingMaterialsPage />} />
            <Route path="/dashboard/training/:materialId" element={<TrainingMaterialPage />} />
            <Route path="/pending-setup" element={<PendingSetupPage />} />
            
            {/* Platform Owner Routes */}
            <Route path="/platform" element={<PlatformDashboard />} />
            <Route path="/platform/questions" element={<QuestionBankPage />} />
            <Route path="/platform/import" element={<ImportQuestionsPage />} />
            <Route path="/platform/seed" element={<SeedQuestionsPage />} />
            <Route path="/platform/materials" element={<TrainingMaterialsManagerPage />} />
            <Route path="/platform/releases" element={<ContentReleasesPage />} />
            <Route path="/platform/organizations" element={<OrganizationsPage />} />
            <Route path="/platform/distribution" element={<QuestionDistributionPage />} />
            <Route path="/platform/packages" element={<PackageManagerPage />} />
            <Route path="/platform/help" element={<PlatformHelpGuidePage />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ProgressProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
