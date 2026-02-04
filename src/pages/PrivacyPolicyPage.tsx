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
          <h1>Privacy Statement</h1>
          <p className="lead">
            Version 2.0<br />
            Last Updated: January 2026
          </p>

          <h2>1. Who We Are and Scope</h2>
          <p>
            This Privacy Statement explains how we handle your personal information when you visit our website, request a demo, or subscribe to our learning services. This statement applies to users in the United States (including California), Canada, the European Union, the United Kingdom, and any other country where our services are used.
          </p>
          <p>When we handle personal information of individuals in:</p>
          <ul>
            <li>The EU or UK, we act as a controller under the General Data Protection Regulation (GDPR).</li>
            <li>Canada, we follow the principles in the Personal Information Protection and Electronic Documents Act (PIPEDA).</li>
            <li>California and other U.S. states with privacy laws, we aim to meet the requirements of the California Consumer Privacy Act (CCPA), California Privacy Rights Act (CPRA), and related laws.</li>
          </ul>
          <p>Contact details:</p>
          <ul>
            <li>Email: support@learninghub.zone</li>
          </ul>

          <h2>2. What Information We Collect</h2>
          <p>
            We collect only the personal information we need to provide our services and communicate with you.
          </p>
          <h3>Email address:</h3>
          <ul>
            <li>When you request a demo</li>
            <li>When you sign up as a customer</li>
            <li>When you contact us with questions or support requests</li>
          </ul>
          <h3>Automatic information:</h3>
          <p>
            Our website may collect standard technical information such as your IP address, browser type, and access times through cookies and similar technologies. Please see Section 14 (Cookies and Tracking) for more details.
          </p>
          <p>
            We do not intentionally collect sensitive information (such as health information, financial account details, or information about children) through this website.
          </p>

          <h2>3. How We Use Your Information</h2>
          <p>We use your email address and other information collected for the following purposes:</p>
          <ul>
            <li>To create and manage your account</li>
            <li>To help you access your account, including password reset or login assistance</li>
            <li>To send you information about upcoming learning material and service updates</li>
            <li>To respond to your questions and support requests</li>
            <li>To maintain and improve the security and performance of our services</li>
            <li>To comply with legal and regulatory obligations</li>
          </ul>
          <p><strong>We do not sell your personal information.</strong></p>
          <p>We do not use automated decision-making or profiling that produces legal or similarly significant effects.</p>

          <h2>4. Legal Bases for Processing (EU/UK)</h2>
          <p>If you are in the EU or UK, we rely on the following legal bases to process your personal information under the GDPR:</p>
          <ul>
            <li><strong>Performance of a contract:</strong> To provide our learning services, manage your subscription, and operate your account.</li>
            <li><strong>Legitimate interests:</strong> To improve our services, maintain security, and send you essential service-related communications.</li>
            <li><strong>Consent:</strong> When required by law (for example, for certain optional promotional emails or cookies).</li>
          </ul>
          <p>When we rely on consent, you can withdraw it at any time using the unsubscribe link or by contacting us.</p>

          <h2>5. Canada: How We Comply with PIPEDA and CASL</h2>
          <h3>PIPEDA (Privacy Law)</h3>
          <p>
            For individuals in Canada, we follow PIPEDA's principles, including accountability, identifying purposes, consent, limiting collection, limiting use and retention, safeguards, openness, access, and challenging compliance.
          </p>
          <p>In practice, this means:</p>
          <ul>
            <li>We clearly explain what we collect (your email and technical information), why we collect it (to run your account, deliver learning, and communicate with you), and who we share it with (service providers such as email, payment, and hosting providers).</li>
            <li>We limit collection to what is necessary for the purposes described.</li>
            <li>We only use or disclose your information for those purposes, unless you consent to something new or the law requires it.</li>
            <li>We keep your information only as long as needed to provide services and meet legal obligations.</li>
            <li>We use reasonable safeguards to protect your information.</li>
            <li>We are open about our privacy practices and will answer questions or handle complaints about how we manage your personal information.</li>
          </ul>
          <h3>CASL (Email Rules)</h3>
          <p>
            When we send commercial electronic messages (like emails about upcoming learning or new features) to individuals in Canada, we follow Canada's Anti-Spam Legislation (CASL).
          </p>
          <p>This means:</p>
          <ul>
            <li>We send these emails only where we have your consent (express or implied, as allowed by CASL).</li>
            <li>Each commercial email clearly identifies us and includes our contact information.</li>
            <li>Every such email includes an easy way to unsubscribe at no cost (for example, a link you can click).</li>
            <li>If you unsubscribe or tell us to stop, we will stop sending you these messages within the time allowed by CASL (no more than 10 business days).</li>
          </ul>

          <h2>6. Email Communications and Choices</h2>
          <p>We may send you emails to:</p>
          <ul>
            <li>Help you access or manage your account (including password resets)</li>
            <li>Provide information about your subscription and service changes</li>
            <li>Share learning materials, feature updates, or similar information</li>
            <li>Respond to your questions or requests</li>
          </ul>
          <p>
            You can opt out of non-essential emails (such as promotional or learning-schedule messages) at any time by using the unsubscribe link in the email or contacting us. We may continue to send you essential service messages even if you opt out of promotional emails.
          </p>

          <h2>7. Payment and Third-Party Services</h2>
          <p>We use Stripe to manage all subscription payments.</p>
          <ul>
            <li>We do not receive or store your credit card or other payment details on our systems.</li>
            <li>The payment processor collects and processes your payment information on its own systems, under its own privacy policy, which we encourage you to review.</li>
          </ul>
          <p>
            We also use trusted service providers to help us operate our website and services (for example, hosting, email delivery, and security). These providers may process your personal information only on our instructions and must protect it appropriately.
          </p>

          <h2>8. Data Sharing</h2>
          <p>We share your personal information only when necessary and with appropriate safeguards. We may share your information with:</p>
          <ul>
            <li>Service providers who help us operate the website, deliver emails, host data, provide analytics, or process payments</li>
            <li>Professional advisers (such as lawyers or accountants) where needed for legal, accounting, or business reasons</li>
            <li>Government authorities or law enforcement when we are required to do so by law or to protect our rights or the rights of others</li>
          </ul>
          <p>
            We do not sell your personal information or share it with third parties for their own independent marketing. If we ever need to use or share your information for a new purpose not described in this statement, we will update this statement and, where required, ask for your consent.
          </p>

          <h2>9. International Transfers</h2>
          <p>
            Our business, servers, or service providers may be located outside your state, province, or country, including in the United States. This means your personal information may be transferred to and processed in a country that may have different privacy laws than where you live.
          </p>

          <h2>10. How Long We Keep Your Information</h2>
          <p>We keep your personal information only for as long as needed to:</p>
          <ul>
            <li>Provide and support our services (typically for the duration of your active subscription)</li>
            <li>Meet our legal, tax, and accounting obligations (generally 3-7 years depending on applicable law)</li>
            <li>Resolve disputes and enforce our agreements</li>
          </ul>
          <p>
            When we no longer need your information, we will delete it or anonymize it, in line with our data retention practices and legal requirements.
          </p>

          <h2>11. Security</h2>
          <p>
            We use reasonable technical and organizational measures to protect your personal information from loss, misuse, and unauthorized access, disclosure, alteration, or destruction. These measures include encryption, access controls, secure servers, and regular security assessments.
          </p>
          <p>
            No system can be guaranteed to be perfectly secure, but we work to limit access to your information to people and service providers who need it for the purposes described in this statement.
          </p>
          <p>
            If we experience a data breach that affects your personal information, we will notify you and any relevant authorities as required by applicable law.
          </p>

          <h2>12. Your Privacy Rights</h2>
          <p>Your privacy rights depend on where you live, and we will make reasonable efforts to honor all valid requests.</p>
          
          <h3>EU/UK Rights</h3>
          <p>If you are in the EU or UK, you may have the right to:</p>
          <ul>
            <li>Access the personal information we hold about you</li>
            <li>Ask us to correct inaccurate or incomplete information</li>
            <li>Ask us to delete your information in certain situations</li>
            <li>Ask us to limit how we use your information in certain situations</li>
            <li>Object to certain types of processing, including some based on our legitimate interests</li>
            <li>Ask for your information in a portable format, where legally required</li>
          </ul>
          <p>You may also have the right to lodge a complaint with your local data protection authority.</p>

          <h3>Canada Rights</h3>
          <p>If you are in Canada, you may have the right to:</p>
          <ul>
            <li>Access the personal information we hold about you</li>
            <li>Ask us to correct or update your information if it is inaccurate or incomplete</li>
            <li>Ask questions or challenge how we handle your personal information</li>
          </ul>
          <p>
            You can also contact the Office of the Privacy Commissioner of Canada if you have concerns about how we manage your personal information.
          </p>

          <h3>California and Other U.S. State Rights</h3>
          <p>If the CCPA, CPRA, or similar state privacy laws apply to our business, residents of those states may have some or all of the following rights:</p>
          <ul>
            <li><strong>Right to know:</strong> Request details about the categories and specific pieces of personal information we have collected, used, disclosed, or sold in the preceding 12 months.</li>
            <li><strong>Right to delete:</strong> Ask us to delete certain personal information, subject to legal exceptions.</li>
            <li><strong>Right to correct:</strong> Request correction of inaccurate personal information.</li>
            <li><strong>Right to opt-out of sale/sharing:</strong> We do not sell or share personal information as those terms are defined under California law.</li>
            <li><strong>Right to non-discrimination:</strong> We will not discriminate against you for exercising your privacy rights.</li>
          </ul>
          <p>You may authorize an agent to submit requests on your behalf. We may require verification of the agent's authority to act on your behalf.</p>

          <h3>How to Exercise Your Rights</h3>
          <p>To exercise any of these rights, please contact us at: support@learninghub.zone and tell us:</p>
          <ul>
            <li>What you are asking for (for example, access, correction, deletion)</li>
            <li>The country or state where you live</li>
          </ul>
          <p>
            We may need to verify your identity before responding to your request. We will typically ask you to confirm information associated with your account (such as your email address) or provide additional identifying information.
          </p>
          <p>
            We will respond to verified requests within the timeframes required by applicable law (typically 30-45 days for GDPR, 30-45 days for CCPA/CPRA, and 30 days for PIPEDA).
          </p>

          <h2>13. Children's Privacy</h2>
          <p>
            Our services are intended for adults and are not directed to children under 16. We do not knowingly collect personal information from children under 16. If you believe a child has provided us with personal information, please contact us so we can delete it.
          </p>

          <h2>14. Cookies and Tracking Technologies</h2>
          <p>
            Our website may use cookies and similar tracking technologies to improve your experience, analyze usage, and provide essential functionality.
          </p>
          <p>Types of cookies we may use:</p>
          <ul>
            <li><strong>Essential cookies:</strong> Required for the website to function properly (e.g., login sessions).</li>
            <li><strong>Analytics cookies:</strong> Help us understand how visitors use our site.</li>
            <li><strong>Preference cookies:</strong> Remember your settings and preferences.</li>
          </ul>
          <p>You can control cookies through your browser settings. Note that disabling certain cookies may affect website functionality.</p>
          <p>
            <strong>Do Not Track:</strong> Our website does not currently respond to Do Not Track signals, as there is no industry standard for how to respond to such signals.
          </p>

          <h2>15. Changes to This Privacy Statement</h2>
          <p>
            We may update this Privacy Statement from time to time to reflect changes in our services, our practices, or the law.
          </p>
          <p>
            When we make material changes, we will update the version number and "Last Updated" date at the top of this statement and, where appropriate, provide additional notice (for example, by email or a notice on our website).
          </p>
          <p>
            We encourage you to review this Privacy Statement periodically to stay informed about how we protect your information.
          </p>

          <h2>Questions or concerns?</h2>
          <p>
            If you have any questions about this Privacy Statement or how we handle your personal information, please contact us at: support@learninghub.zone.
          </p>
        </article>
      </main>

      <Footer />
    </div>
  );
}
