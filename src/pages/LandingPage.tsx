import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FeatureCard } from "@/components/FeatureCard";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Users, 
  Brain, 
  FileCheck, 
  BarChart3,
  ArrowRight,
  Award,
  BookOpen,
  Sparkles,
  GraduationCap,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Role-Based Learning Paths",
    description: "Tailored learning for each team member based on their role and responsibilities.",
  },
  {
    icon: Brain,
    title: "Smart Knowledge Analysis",
    description: "AI-powered feedback helps identify knowledge gaps and provides personalized recommendations for each learner.",
    comingSoon: true,
  },
  {
    icon: BookOpen,
    title: "Expert-Curated Content",
    description: "Learning materials developed by compliance experts and updated regularly to reflect current requirements.",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description: "Monitor team completion rates, identify areas needing attention, and generate comprehensive reports.",
  },
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
              Compliance Learning Platform
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl animate-fade-in">
              Compliance Learning Your{" "}
              <span className="text-accent">Team Will Actually Complete</span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl animate-fade-in" style={{ animationDelay: "100ms" }}>
              Effective, role-specific learning that prepares your workforce to handle 
              protected or sensitive information with confidence. Built for organizations 
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
              Learning Designed for Every Role
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Not everyone needs the same learning. Our role-based approach ensures each 
              team member learns exactly what they need to know for their specific responsibilities.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 md:py-24">
        <div className="container px-4 md:px-6">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Everything You Need for Effective Learning
            </h2>
            <p className="text-lg text-muted-foreground">
              A complete platform designed to make compliance learning straightforward, 
              trackable, and genuinely educational.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {features.map((feature, index) => (
              <div key={feature.title} className="relative">
                {feature.comingSoon && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-2 -right-2 z-10 bg-accent/10 text-accent border-accent/20"
                  >
                    Coming Soon
                  </Badge>
                )}
                <FeatureCard
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  delay={index * 100}
                  className={feature.comingSoon ? "opacity-80" : ""}
                />
              </div>
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
              A clear path from onboarding to completion. No confusion, no wasted time.
            </p>
          </div>
          
          <div className="mx-auto max-w-3xl">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white text-xl font-bold">
                  1
                </div>
                <h3 className="mb-2 text-lg font-semibold">Assign Roles</h3>
                <p className="text-sm text-muted-foreground">
                  Admins assign each team member to their appropriate workforce group for targeted learning.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white text-xl font-bold">
                  2
                </div>
                <h3 className="mb-2 text-lg font-semibold">Complete Learning</h3>
                <p className="text-sm text-muted-foreground">
                  Team members work through role-specific materials at their own pace, then take quizzes.
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
              Built for Compliance
            </div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Learning You Can Trust
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Our platform was designed for organizations that take compliance seriously. 
              Every learning module is expert-curated, regularly updated, and built 
              to meet the highest standards of workforce education.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-6">
                <Shield className="mx-auto mb-3 h-8 w-8 text-accent" />
                <h3 className="mb-1 font-semibold">Privacy-First Design</h3>
                <p className="text-sm text-muted-foreground">
                  We only collect work email addresses. No sensitive or personal data ever enters our system. Zero exposure, zero risk.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <FileCheck className="mx-auto mb-3 h-8 w-8 text-accent" />
                <h3 className="mb-1 font-semibold">Complete Records</h3>
                <p className="text-sm text-muted-foreground">
                  Every learning activity is documented and retained for your records.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <Award className="mx-auto mb-3 h-8 w-8 text-accent" />
                <h3 className="mb-1 font-semibold">Verifiable Credentials</h3>
                <p className="text-sm text-muted-foreground">
                  Digital certificates that prove your workforce is properly educated.
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
              Ready to Elevate Your Compliance Learning?
            </h2>
            <p className="mb-8 text-white/80">
              See how The Learning Hub can help your organization build a 
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
