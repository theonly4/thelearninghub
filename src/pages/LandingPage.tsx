import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FeatureCard } from "@/components/FeatureCard";
import { WorkforceGroupBadge } from "@/components/WorkforceGroupBadge";
import { HipaaLink, HIPAA_PARTS } from "@/components/HipaaLink";
import { 
  Shield, 
  Users, 
  Brain, 
  FileCheck, 
  Lock, 
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Award,
  Clock,
  Building2,
  Scale,
  ExternalLink
} from "lucide-react";
import { WorkforceGroup } from "@/types/hipaa";

const features = [
  {
    icon: Users,
    title: "Role-Based Training",
    description: "Deliver targeted HIPAA education mapped to workforce groups: Clinical, Administrative, IT, Management, and All Staff.",
  },
  {
    icon: Brain,
    title: "AI Knowledge Analysis",
    description: "Controlled RAG-powered feedback identifies role-specific risk areas and cites specific HIPAA provisions.",
  },
  {
    icon: FileCheck,
    title: "OCR-Audit Defensible",
    description: "Every quiz, certificate, and training record is versioned, timestamped, and retained for 6 years.",
  },
  {
    icon: Lock,
    title: "Zero PHI Architecture",
    description: "Platform designed from the ground up to exclude Protected Health Information. No BAA required.",
  },
  {
    icon: BarChart3,
    title: "Compliance Reporting",
    description: "Generate reports by individual, workforce group, or organization. Export to PDF and Excel.",
  },
  {
    icon: Award,
    title: "Digital Certificates",
    description: "Issue legally defensible certificates proving workforce training adequacy with HIPAA citations.",
  },
];

const complianceFeatures = [
  { section: "45 CFR §160.103", label: "HIPAA Definitions and Applicability" },
  { section: "45 CFR §162.1002", label: "Administrative Transaction Standards" },
  { section: "45 CFR §164.530(b)(1)", label: "Workforce Training Requirements" },
  { section: "45 CFR §164.308(a)(5)", label: "Security Awareness and Training" },
  { section: "45 CFR §164.530(j)", label: "Documentation and 6-Year Retention" },
  { section: "45 CFR §164.312(b)", label: "Audit Controls and Logging" },
  { section: "45 CFR §164.312(d)", label: "Person/Entity Authentication (MFA)" },
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
              <Shield className="h-4 w-4" />
              Enterprise HIPAA Compliance Platform
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl animate-fade-in">
              HIPAA Training That's{" "}
              <span className="text-accent">OCR-Audit Defensible</span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl animate-fade-in" style={{ animationDelay: "100ms" }}>
              Multi-tenant SaaS platform enabling Covered Entities and Business 
              Associates to deliver role-appropriate HIPAA education with AI-assisted 
              knowledge gap analysis.
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

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-4xl gap-6 sm:grid-cols-3 animate-slide-up" style={{ animationDelay: "300ms" }}>
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="text-3xl font-bold text-accent">6 Years</div>
              <div className="mt-1 text-sm text-muted-foreground">Record Retention</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="text-3xl font-bold text-accent">100%</div>
              <div className="mt-1 text-sm text-muted-foreground">Zero PHI Architecture</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="text-3xl font-bold text-accent">45 CFR</div>
              <div className="mt-1 text-sm text-muted-foreground">Parts 160, 162 & 164</div>
            </div>
          </div>
        </div>
      </section>

      {/* Workforce Groups Section */}
      <section className="border-b border-border py-16 md:py-24" id="features">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Role-Based HIPAA Training
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Deliver targeted training to each workforce group. Quizzes are mapped 
              to specific roles, ensuring regulatory alignment with OCR expectations.
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
              Enterprise Compliance Features
            </h2>
            <p className="text-lg text-muted-foreground">
              Every feature maps to specific HIPAA controls in{" "}
              <a href={HIPAA_PARTS.part160.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">45 CFR Part 160</a>,{" "}
              <a href={HIPAA_PARTS.part162.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">162</a>, and{" "}
              <a href={HIPAA_PARTS.part164.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">164</a>.
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

      {/* Compliance Section */}
      <section className="border-y border-border bg-muted/30 py-16 md:py-24" id="compliance">
        <div className="container px-4 md:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-accent">
                <Scale className="h-4 w-4" />
                Regulatory Alignment
              </div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                Built on 45 CFR Parts 160, 162 & 164
              </h2>
              <p className="mb-6 text-lg text-muted-foreground">
                Every platform control is mapped to specific HIPAA regulations across all three parts. 
                Our Control-to-HIPAA Citation Matrix ensures complete audit defensibility.
              </p>
              
              {/* HIPAA Parts Links */}
              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                {Object.values(HIPAA_PARTS).map((part) => (
                  <a
                    key={part.title}
                    href={part.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-lg border border-border bg-card p-3 transition-all hover:border-accent/50 hover:bg-accent/5"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                      {part.title.replace("45 CFR ", "")}
                      <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {part.description}
                    </div>
                  </a>
                ))}
              </div>

              <ul className="space-y-3">
                {complianceFeatures.map((feature) => (
                  <li key={feature.section} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    <span className="text-sm">
                      <HipaaLink section={feature.section} showIcon={false}>
                        {feature.section}
                      </HipaaLink>
                      {" - "}{feature.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-accent/10 p-2.5 text-accent">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">Multi-Tenant Architecture</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Strict tenant isolation with organization_id on all tables. 
                  Row-level security ensures data separation between organizations.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-accent/10 p-2.5 text-accent">
                    <Clock className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">Immutable Version Control</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  All quizzes and knowledge documents are versioned and immutable 
                  once assigned. Proves exact content at time of completion.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-accent/10 p-2.5 text-accent">
                    <Lock className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">Mandatory MFA</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Person/Entity Authentication per{" "}
                  <HipaaLink section="45 CFR §164.312(d)" showIcon={false}>
                    §164.312(d)
                  </HipaaLink>. 
                  All users require multi-factor authentication.
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
              Ready for OCR-Audit Defensible Compliance?
            </h2>
            <p className="mb-8 text-white/80">
              Join organizations that trust HIPAA Sentinel for workforce training 
              that stands up to regulatory scrutiny.
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
