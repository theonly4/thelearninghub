import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FeatureCard } from "@/components/FeatureCard";
import { WorkforceGroupBadge } from "@/components/WorkforceGroupBadge";
import { 
  Shield, 
  Users, 
  Brain, 
  FileCheck, 
  BarChart3,
  ArrowRight,
  Award,
  BookOpen,
  Target,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import { WorkforceGroup } from "@/types/hipaa";

const features = [
  {
    icon: Users,
    title: "Role-Based Learning Paths",
    description: "Tailored training for each team member based on their role: Clinical, Administrative, IT, Management, and general staff.",
  },
  {
    icon: Brain,
    title: "Smart Knowledge Analysis",
    description: "AI-powered feedback helps identify knowledge gaps and provides personalized recommendations for each learner.",
  },
  {
    icon: Target,
    title: "Progressive Assessment",
    description: "Sequential quizzes ensure mastery of each topic before advancing. Immediate feedback reinforces learning.",
  },
  {
    icon: BookOpen,
    title: "Expert-Curated Content",
    description: "Training materials developed by compliance experts and updated regularly to reflect current requirements.",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description: "Monitor team completion rates, identify areas needing attention, and generate comprehensive reports.",
  },
  {
    icon: Award,
    title: "Completion Certificates",
    description: "Provide verifiable certificates that document training completion and demonstrate workforce competency.",
  },
];

const workforceGroups: WorkforceGroup[] = [
  "all_staff",
  "clinical",
  "administrative",
  "management",
  "it",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-hero">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/5 via-transparent to-transparent" />
        <div className="container relative px-4 py-20 md:px-6 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm text-accent">
              <GraduationCap className="h-4 w-4" />
              Healthcare Workforce Training
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl animate-fade-in">
              HIPAA Training Your{" "}
              <span className="text-accent">Team Will Actually Complete</span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl animate-fade-in" style={{ animationDelay: "100ms" }}>
              Effective, role-specific training that prepares your workforce to handle 
              protected health information with confidence. Built for healthcare organizations 
              that take compliance seriously.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in" style={{ animationDelay: "200ms" }}>
              <Link to="/demo">
                <Button size="lg" className="gap-2 px-8">
                  Request Demo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="px-8">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Workforce Groups Section */}
      <section className="border-b border-border py-16 md:py-24" id="features">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Training Designed for Every Role
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Not everyone needs the same training. Our role-based approach ensures each 
              team member learns exactly what they need to know for their specific responsibilities.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {workforceGroups.map((group) => (
                <WorkforceGroupBadge key={group} group={group} size="lg" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 md:py-24">
        <div className="container px-4 md:px-6">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Everything You Need for Effective Training
            </h2>
            <p className="text-lg text-muted-foreground">
              A complete platform designed to make HIPAA training straightforward, 
              trackable, and genuinely educational.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                delay={index * 100}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="border-y border-border bg-muted/30 py-16 md:py-24">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Simple, Structured Learning
            </h2>
            <p className="text-lg text-muted-foreground">
              A clear path from onboarding to certification. No confusion, no wasted time.
            </p>
          </div>
          
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white text-xl font-bold">
                  1
                </div>
                <h3 className="mb-2 text-lg font-semibold">Assign Roles</h3>
                <p className="text-sm text-muted-foreground">
                  Admins assign each team member to their appropriate workforce group for targeted training.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white text-xl font-bold">
                  2
                </div>
                <h3 className="mb-2 text-lg font-semibold">Complete Training</h3>
                <p className="text-sm text-muted-foreground">
                  Team members work through role-specific materials at their own pace, then take progressive quizzes.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white text-xl font-bold">
                  3
                </div>
                <h3 className="mb-2 text-lg font-semibold">Earn Certification</h3>
                <p className="text-sm text-muted-foreground">
                  Upon passing all quizzes, team members receive verifiable certificates documenting their training.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 md:py-24">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-accent">
              <Sparkles className="h-4 w-4" />
              Built for Healthcare
            </div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Training You Can Trust
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Our platform was designed specifically for healthcare organizations. 
              Every training module is expert-curated, regularly updated, and built 
              to meet the highest standards of workforce education.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-6">
                <Shield className="mx-auto mb-3 h-8 w-8 text-accent" />
                <h3 className="mb-1 font-semibold">Privacy-First Design</h3>
                <p className="text-sm text-muted-foreground">
                  No patient data ever enters our system. Zero PHI, zero risk.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <FileCheck className="mx-auto mb-3 h-8 w-8 text-accent" />
                <h3 className="mb-1 font-semibold">Complete Records</h3>
                <p className="text-sm text-muted-foreground">
                  Every training activity is documented and retained for your records.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <Award className="mx-auto mb-3 h-8 w-8 text-accent" />
                <h3 className="mb-1 font-semibold">Verifiable Credentials</h3>
                <p className="text-sm text-muted-foreground">
                  Digital certificates that prove your workforce is properly trained.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-primary p-8 text-center text-white md:p-12">
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">
              Ready to Elevate Your HIPAA Training?
            </h2>
            <p className="mb-8 text-white/80">
              See how HIPAA Sentinel can help your organization build a 
              knowledgeable, confident workforce.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/demo">
                <Button 
                  size="lg" 
                  className="gap-2 bg-accent text-white hover:bg-accent/90"
                >
                  Schedule a Demo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
