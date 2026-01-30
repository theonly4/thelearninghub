import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-4 py-12 md:px-6 md:py-16">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <article className="prose prose-slate dark:prose-invert mx-auto max-w-3xl">
          <h1>Privacy Policy</h1>
          <p className="lead">
            Last updated: January 30, 2026
          </p>

          <h2>1. Introduction</h2>
          <p>
            The Learning Hub ("we," "our," or "us") is committed to protecting your privacy. 
            This Privacy Policy explains how we collect, use, and safeguard your information 
            when you use our compliance learning platform.
          </p>

          <h2>2. Information We Collect</h2>
          <h3>2.1 Information You Provide</h3>
          <p>
            We collect information you provide directly to us, including:
          </p>
          <ul>
            <li>Work email address</li>
            <li>Name (first and last)</li>
            <li>Organization affiliation</li>
            <li>Role or job function</li>
            <li>Learning progress and quiz responses</li>
          </ul>

          <h3>2.2 Privacy-First Design</h3>
          <p>
            <strong>We only collect work email addresses. No sensitive or personal data 
            ever enters our system. Zero exposure, zero risk.</strong>
          </p>

          <h2>3. How We Use Your Information</h2>
          <p>
            We use the information we collect to:
          </p>
          <ul>
            <li>Provide and maintain our compliance learning services</li>
            <li>Track and report learning progress to your organization</li>
            <li>Issue certificates of completion</li>
            <li>Improve our platform and learning materials</li>
            <li>Communicate with you about your account</li>
          </ul>

          <h2>4. Data Retention</h2>
          <p>
            Learning records and certificates are retained for compliance audit purposes. 
            Your organization administrator can request data export or deletion in accordance 
            with applicable regulations.
          </p>

          <h2>5. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your 
            information against unauthorized access, alteration, disclosure, or destruction.
          </p>

          <h2>6. Your Rights</h2>
          <p>
            Depending on your jurisdiction, you may have rights regarding your personal data, 
            including the right to access, correct, or delete your information. Contact your 
            organization administrator or reach out to us directly.
          </p>

          <h2>7. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us through your 
            organization administrator or via our demo request form.
          </p>
        </article>
      </main>

      <Footer />
    </div>
  );
}
