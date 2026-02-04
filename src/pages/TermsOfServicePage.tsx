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
            Version 1.0<br />
            Effective Date: January 28, 2026<br />
            Last Updated: January 28, 2026
          </p>
          <p>
            Welcome! These Terms of Service explain how you can use our learning platform. We've written them in plain language to make them easy to understand.
          </p>

          <h2>1. About This Agreement</h2>
          <p>
            These Terms of Service ("Terms") are a legal agreement between you (the "Customer" or "you") and The Learning Hub Ltd. ("we," "us," or "our"). By subscribing to or using our learning platform (the "Service"), you agree to these Terms.
          </p>
          <p>Key points:</p>
          <ul>
            <li>If you're signing up on behalf of a company, you confirm you have authority to bind that company to these Terms</li>
            <li>If you don't agree with these Terms, please don't use our Service</li>
            <li>These Terms apply to all users of our Service</li>
          </ul>

          <h2>2. What We Provide</h2>
          <p>
            Our Service provides an interactive online learning platform with text-based learning courses, quizzes, completion tracking and reporting, password reset support, and learning schedule notifications. We do not store your payment information (handled by Stripe), provide downloadable copies of learning materials, or offer phone support or live learning sessions.
          </p>

          <h2>3. Your Subscription</h2>
          <h3>How Subscriptions Work</h3>
          <p>
            <strong>Subscription Tiers:</strong> We offer different subscription plans based on the number of employees at your company. Your monthly fee depends on which tier you select.
          </p>
          <p>
            <strong>Billing:</strong> You'll be charged monthly through Stripe, our payment processor. Billing happens automatically on the same day each month. Your subscription continues month-to-month until you cancel.
          </p>
          <p>
            <strong>Renewal Notifications:</strong> We will send email reminders at least 3 days before each monthly renewal to the email address on file.
          </p>
          <p>
            <strong>Cancellation:</strong> You can cancel anytime with no minimum commitment required. To cancel, email us at support@learninghub.zone. When you cancel, access to the Service ends at the end of your current billing period. No refunds are provided for partial months or unused time.
          </p>

          <h3>Important Washington State Requirement</h3>
          <p>
            Before you subscribe, we clearly disclose: (1) the monthly subscription price, (2) that your subscription automatically renews each month, (3) how to cancel your subscription (as described above), and (4) that cancellation can be done online through the same method you used to sign up.
          </p>

          <h3>What Happens After Cancellation</h3>
          <p>When your subscription ends:</p>
          <ul>
            <li>Your employees lose access to all learning materials and quizzes at the end of your current billing period</li>
            <li>You will have 30 days after termination to request and download completion reports for all your employees</li>
            <li>We'll provide completion reports in PDF format within 10 business days of your request</li>
            <li>We don't charge for completion report requests</li>
            <li>After 30 days, all data associated with your account will be permanently deleted</li>
          </ul>

          <h2>4. Account Registration and Access</h2>
          <h3>Creating Your Account</h3>
          <p>
            To use our Service, you need to: (1) provide a valid work email address, (2) create a secure password, and (3) be at least 18 years old. Your email address is the only personal information we collect during registration.
          </p>

          <h3>Account Security</h3>
          <p>
            You are responsible for keeping your login credentials confidential, all activity that happens under your account, and notifying us immediately if you suspect unauthorized access.
          </p>
          <p>
            <strong>Employee Accounts:</strong> Each employee should have their own login credentials. Sharing login credentials between employees is prohibited as this helps us track completion accurately and maintain security.
          </p>

          <h2>5. Acceptable Use</h2>
          <h3>What You Can Do</h3>
          <p>You may use our Service to train your employees using our platform, track employee learning progress, and access completion reports.</p>

          <h3>What You Cannot Do</h3>
          <p>You agree NOT to:</p>
          <ul>
            <li>Share login credentials with people outside your organization, or copy, reproduce, or redistribute our learning materials or quizzes</li>
            <li>Use automated tools (bots, scrapers) to access our Service, or attempt to hack, disrupt, or damage our Service</li>
            <li>Remove or alter any copyright notices or trademarks</li>
            <li>Use our Service for any illegal purpose, or reverse engineer or attempt to extract our source code</li>
          </ul>
          <p>
            <strong>Why these rules matter:</strong> Our learning materials and quizzes are copyrighted intellectual property. Unauthorized copying or distribution violates our rights and these Terms.
          </p>

          <h2>6. Intellectual Property Rights</h2>
          <h3>What We Own</h3>
          <p>All content on our Service belongs to us, including learning text and materials, quiz questions and answers, platform design and functionality, and our company name, logo, and trademarks.</p>
          <p>
            <strong>Copyright Notice:</strong> All learning materials and quizzes are protected by U.S. copyright law. Copyright © 2026 The Learning Hub. All rights reserved.
          </p>

          <h3>Your License to Use Our Content</h3>
          <p>
            We grant you a limited license to: (1) access and view our learning materials through your subscription, (2) allow your employees to complete learning courses and quizzes, and (3) view and download completion reports.
          </p>
          <p>
            This license is non-exclusive (we can license to others), non-transferable (you can't give it to someone else), limited to the duration of your active subscription, and only for your internal business learning purposes.
          </p>

          <h3>What You Don't Get</h3>
          <p>
            You do NOT have the right to: (1) download, save, or store learning materials offline, (2) copy or reproduce our content in any format, (3) create derivative works based on our materials, or (4) share our content with anyone outside your organization.
          </p>
          <p>
            <strong>Completion Reports:</strong> Completion reports you have downloaded remain your property for your internal business purposes. All other content access terminates immediately upon cancellation.
          </p>

          <h2>7. Privacy and Data</h2>
          <p>
            We collect minimal personal information (email addresses, usage data showing which courses employees complete and quiz scores, and technical logs including login times and IP addresses for security purposes) as described in our Privacy Policy.
          </p>
          <p>
            We use your information only to provide the Service, send password reset emails and learning schedule notifications, generate completion reports, and maintain platform security. We do not sell your information to third parties, use your information for marketing purposes, or use cookies or tracking technologies on our Service.
          </p>
          <p>
            <strong>Data Storage and Security:</strong> All data is stored securely in the United States using industry-standard encryption. Stripe handles all payment processing; we never see or store your credit card information.
          </p>
          <p>
            <strong>Data Retention:</strong> We retain completion reports for 7 years after subscription termination to comply with business record requirements. All other personal data is deleted 30 days after termination unless we are legally required to retain it.
          </p>
          <p>
            <strong>California and Other State Privacy Rights:</strong> We do not sell personal information to third parties. California residents have additional rights under the California Consumer Privacy Act (CCPA), Colorado residents under the Colorado Privacy Act (CPA), and Washington residents under Washington state privacy laws. See our Privacy Policy for complete details on your rights.
          </p>
          <p>
            To exercise any privacy rights or request information about your data, contact us at support@learninghub.zone.
          </p>

          <h2>8. Payment Terms</h2>
          <h3>Payment Processing</h3>
          <p>
            All payments are processed securely through Stripe, Inc. ("Stripe"), our third-party payment processor. We never receive or store your credit card information. Stripe's terms and conditions also apply to your payment (available at stripe.com).
          </p>
          <p>
            For billing inquiries or subscription questions, contact us at support@learninghub.zone. For payment processing issues such as declined cards or fraud alerts, contact Stripe at stripe.com/support.
          </p>

          <h3>Monthly Charges</h3>
          <p>
            Your credit card will be charged automatically each month on your subscription date. You authorize these recurring charges by subscribing. If a payment fails, we'll notify you by email and may suspend your account until payment is received.
          </p>

          <h3>No Refunds</h3>
          <p>
            All subscription fees are non-refundable. This includes partial month charges, unused subscription time after cancellation, and dissatisfaction with the Service. We incur costs for hosting and platform maintenance as soon as your subscription begins.
          </p>

          <h3>Price Changes</h3>
          <p>
            We may change our subscription prices at any time. If we do, we'll notify you by email at least 30 days before the new price takes effect. The new price will apply starting with your next billing cycle after the notice period. You can cancel before the new price takes effect if you don't agree to the increase.
          </p>

          <h2>9. Service Availability and Support</h2>
          <h3>Service Availability</h3>
          <p>
            We strive to keep our Service available 24/7, but we provide the Service "as is" and "as available." We don't guarantee the Service will always be available. We may need to perform maintenance (we'll try to do this during off-peak hours) and may experience unexpected downtime due to technical issues. We're not responsible for interruptions caused by circumstances beyond our reasonable control.
          </p>

          <h3>Support We Provide</h3>
          <p>
            We provide support for password reset requests, learning schedule notifications, general questions about using the Service, and technical issues preventing access.
          </p>
          <p>
            <strong>Response time:</strong> We aim to respond to support requests within 48 business hours (excluding weekends and federal holidays).
          </p>
          <p>
            We do NOT provide: Phone support, custom learning content creation, one-on-one employee learning, or after-hours emergency support.
          </p>

          <h2>10. Warranties and Disclaimers</h2>
          <h3>Our Limited Warranty</h3>
          <p>
            We warrant that: (1) we have the legal right to provide this Service, and (2) our Service will substantially perform as described in our marketing materials. Beyond this limited warranty, we make no other promises.
          </p>

          <h3>Disclaimer of Other Warranties</h3>
          <p>
            <strong>TO THE MAXIMUM EXTENT PERMITTED BY WASHINGTON LAW, WE PROVIDE THE SERVICE "AS IS" AND "AS AVAILABLE" WITHOUT ANY OTHER WARRANTIES, EXPRESS OR IMPLIED.</strong>
          </p>
          <p>
            This means we specifically disclaim any warranty that the Service will be error-free or uninterrupted, any warranty of merchantability (that it's suitable for general use), any warranty of fitness for a particular purpose (that it meets your specific needs), and any warranty that all information is accurate, complete, or current.
          </p>

          <h3>Your Responsibility for Compliance</h3>
          <p>
            You remain solely responsible for ensuring our learning materials meet your specific industry compliance requirements. We recommend having materials reviewed by your legal counsel. If learning materials contain factually incorrect information, we will correct material errors when brought to our attention, but we're not liable for compliance violations resulting from such errors.
          </p>

          <h3>What You Accept</h3>
          <p>By using our Service, you acknowledge there may be errors or interruptions in the Service, learning materials may contain typographical errors, and quiz questions may occasionally have errors.</p>

          <h2>11. Limitation of Liability</h2>
          <p>This section limits what you can sue us for and how much you can recover. Please read it carefully.</p>

          <h3>Dollar Limit on Our Liability</h3>
          <p>
            <strong>TO THE MAXIMUM EXTENT PERMITTED BY WASHINGTON LAW, OUR TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING FROM OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE TOTAL AMOUNT YOU PAID US IN THE 12 MONTHS BEFORE THE CLAIM AROSE.</strong>
          </p>

          <h3>Types of Damages We're Not Liable For</h3>
          <p><strong>WE ARE NOT LIABLE FOR:</strong></p>
          <ul>
            <li>Lost profits or revenue</li>
            <li>Lost business opportunities</li>
            <li>Lost data (beyond what we agreed to store)</li>
            <li>Costs of substitute services</li>
            <li>Indirect, incidental, or consequential damages</li>
            <li>Punitive or exemplary damages</li>
          </ul>
          <p>This limitation applies even if we knew these damages were possible.</p>

          <h3>What We ARE Liable For</h3>
          <p>
            Nothing in these Terms limits our liability for death or personal injury caused by our negligence, fraud or fraudulent misrepresentation, gross negligence or willful misconduct, or any other liability that cannot be excluded by Washington law.
          </p>

          <h3>Your Responsibilities</h3>
          <p>
            You are responsible for ensuring our learning meets your company's compliance requirements, verifying employee completion and understanding, any business decisions made based on learning completion, and backing up any completion reports you need for compliance purposes.
          </p>

          <h2>12. Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold us harmless from any claims, damages, or costs (including reasonable attorneys' fees) arising from: (1) your willful misconduct or gross negligence in violating these Terms, (2) your willful misconduct or gross negligence in violating any law or regulation, (3) your violation of any third-party rights, (4) your employees' use of the Service where you had actual knowledge or should have known of their violations, or (5) unauthorized access to the Service through your account due to your failure to maintain reasonable security.
          </p>

          <h2>13. Changes to These Terms</h2>
          <h3>How We Make Changes</h3>
          <p>
            We may update these Terms from time to time. When we do, we'll post the updated Terms on our website, update the "Last Updated" date at the top, and increment the version number. For material changes, we'll notify you by email at least 30 days before they take effect.
          </p>

          <h3>Material Changes Defined</h3>
          <p>
            Material changes include modifications to pricing, cancellation terms, limitation of liability, data usage, intellectual property rights, or dispute resolution procedures.
          </p>

          <h3>Your Options</h3>
          <p>
            If you don't agree with the changes, you can cancel your subscription before the changes take effect with no penalty. If you continue using the Service after the changes take effect, you accept the new Terms.
          </p>

          <h2>14. Termination</h2>
          <h3>You Can Cancel Anytime</h3>
          <p>As stated in Section 3, you can cancel your subscription at any time for any reason.</p>

          <h3>We Can Suspend or Terminate Your Account</h3>
          <p>
            We may suspend or terminate your account if: (1) you violate these Terms (especially Section 5 on Acceptable Use), (2) you fail to pay your subscription fees, (3) you provide false information, (4) we're required to do so by law, or (5) we discontinue the Service entirely (we'll give you 30 days' notice and a pro-rated refund for any unused portion of your current billing period).
          </p>

          <h3>What Happens After Termination</h3>
          <p>
            When your account is terminated for any reason: (1) you lose access to the Service at the end of your current billing period, (2) you remain responsible for any fees owed, (3) Sections 6 (Intellectual Property), 10 (Disclaimers), 11 (Limitation of Liability), 12 (Indemnification), and 15 (General Terms) continue to apply, and (4) you can still request completion reports as described in Section 3.
          </p>

          <h2>15. General Terms</h2>
          <h3>Entire Agreement</h3>
          <p>
            These Terms, together with our Privacy Policy, constitute the entire agreement between you and us regarding the Service. They replace any prior agreements or understandings.
          </p>

          <h3>Governing Law and Jurisdiction</h3>
          <p>
            These Terms are governed by the laws of the State of Washington, United States, without regard to conflict of law principles. Any legal disputes must be resolved in the state or federal courts located in Washington. You consent to the exclusive jurisdiction of these courts.
          </p>

          <h3>Dispute Resolution</h3>
          <p>
            Before filing a lawsuit, you must contact us at support@learninghub.zone to try to resolve the dispute informally. We'll try to resolve it within 60 days. If we can't resolve it informally, either party may proceed with legal action in the courts specified above.
          </p>

          <h3>Waiver</h3>
          <p>If we don't enforce a provision of these Terms, it doesn't mean we waive our right to enforce it later.</p>

          <h3>Severability</h3>
          <p>If any part of these Terms is found to be unenforceable, the rest remains in full effect.</p>

          <h3>Assignment</h3>
          <p>
            You may not assign or transfer these Terms or your account to anyone else without our written consent. We may assign these Terms to any successor to or acquirer of our business.
          </p>

          <h3>Force Majeure</h3>
          <p>
            We're not liable for delays or failures to perform due to circumstances beyond our reasonable control, including but not limited to natural disasters, war, terrorism, pandemics, government actions, government-mandated shutdowns, public health emergencies, internet service provider failures, or other force majeure events.
          </p>

          <h3>No Third-Party Beneficiaries</h3>
          <p>These Terms are only between you and us. No one else has any rights under these Terms.</p>

          <h3>Notices</h3>
          <p>
            To contact us about these Terms, see Section 16 below. We'll send notices to the email address associated with your account. It's your responsibility to keep your email address current. Notices are effective 24 hours after sending.
          </p>

          <h2>16. Contact Us</h2>
          <p>If you have questions about these Terms, please contact us:</p>
          <p>Email: support@learninghub.zone</p>
          <p>Business Hours: 9:00 AM to 4:00 PM Pacific Standard Time</p>

          <h2>Acknowledgment</h2>
          <p>By clicking "I Agree" or by using our Service, you acknowledge that:</p>
          <ul>
            <li>You have read and understood these Terms of Service</li>
            <li>You agree to be bound by these Terms</li>
            <li>If signing up for a company, you have authority to bind that company to these Terms</li>
            <li>You are at least 18 years old</li>
          </ul>
          <p>Thank you for using The Learning Hub!</p>
          <p><em>This document is effective as of the date listed at the top and supersedes all prior versions.</em></p>
        </article>
      </main>

      <Footer />
    </div>
  );
}
