import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArrowLeft } from "lucide-react";

export default function TermsOfServicePage() {
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
          <h1>Terms of Service</h1>
          <p className="lead">
            Last updated: January 30, 2026
          </p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using The Learning Hub platform ("Service"), you agree to be 
            bound by these Terms of Service ("Terms"). If you do not agree to these Terms, 
            do not use the Service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            The Learning Hub provides a compliance learning platform that delivers role-based 
            learning materials and assessments for organizational workforce education.
          </p>

          <h2>3. User Accounts</h2>
          <p>
            Access to the Service requires an account created by your organization administrator. 
            You are responsible for maintaining the confidentiality of your account credentials 
            and for all activities that occur under your account.
          </p>

          <h2>4. Acceptable Use</h2>
          <p>
            You agree to use the Service only for lawful purposes and in accordance with 
            these Terms. You agree not to:
          </p>
          <ul>
            <li>Share your account credentials with others</li>
            <li>Attempt to circumvent any security measures</li>
            <li>Use the Service to distribute malware or harmful content</li>
            <li>Reproduce or redistribute learning materials without authorization</li>
          </ul>

          <h2>5. Intellectual Property</h2>
          <p>
            All content on the Service, including learning materials, quizzes, and platform 
            design, is owned by The Learning Hub or its licensors and is protected by 
            intellectual property laws.
          </p>

          <h2>6. Disclaimer</h2>
          <p>
            <strong>Compliance Notice: Content is for learning guidance only and does not 
            constitute legal advice.</strong> Organizations should consult qualified legal 
            counsel for specific compliance requirements.
          </p>

          <h2>7. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, The Learning Hub shall not be liable 
            for any indirect, incidental, special, consequential, or punitive damages 
            arising from your use of the Service.
          </p>

          <h2>8. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. We will notify users of material 
            changes through the platform or via email.
          </p>

          <h2>9. Contact</h2>
          <p>
            For questions about these Terms, please contact us through your organization 
            administrator or via our demo request form.
          </p>
        </article>
      </main>

      <Footer />
    </div>
  );
}
