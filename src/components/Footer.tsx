import { Logo } from "@/components/Logo";
import { HipaaLink, HIPAA_PARTS } from "@/components/HipaaLink";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

const footerLinks = {
  product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Security", href: "#security" },
    { label: "Roadmap", href: "#roadmap" },
  ],
  compliance: [
    { label: "45 CFR Part 160", href: HIPAA_PARTS.part160.url, external: true },
    { label: "45 CFR Part 162", href: HIPAA_PARTS.part162.url, external: true },
    { label: "45 CFR Part 164", href: HIPAA_PARTS.part164.url, external: true },
    { label: "OCR Guidance", href: "https://www.hhs.gov/hipaa/for-professionals/index.html", external: true },
  ],
  company: [
    { label: "About", href: "#about" },
    { label: "Contact", href: "#contact" },
    { label: "Careers", href: "#careers" },
    { label: "Partners", href: "#partners" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
    { label: "BAA Terms", href: "/baa" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container px-4 py-12 md:px-6 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Logo size="md" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Enterprise-grade HIPAA compliance training platform. 
              OCR-audit defensible. Legally evidentiary.
            </p>
            <p className="mt-6 text-xs text-muted-foreground">
              © {new Date().getFullYear()} HIPAA Sentinel. All rights reserved.
            </p>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">Product</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Compliance</h4>
            <ul className="space-y-2">
              {footerLinks.compliance.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                    {link.external && <ExternalLink className="h-3 w-3" />}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Compliance Notice */}
        <div className="mt-12 rounded-lg border border-border bg-card p-4">
          <p className="text-center text-xs text-muted-foreground">
            <strong>Compliance Notice:</strong> This platform does not store, process, 
            or transmit Protected Health Information (PHI). The platform provider is not 
            a Business Associate. All AI-generated content is for training guidance only 
            and does not constitute legal advice. System designed to be defensible in 
            OCR HIPAA audits per{" "}
            <a href={HIPAA_PARTS.part160.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">45 CFR Part 160</a>,{" "}
            <a href={HIPAA_PARTS.part162.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">162</a>, and{" "}
            <a href={HIPAA_PARTS.part164.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">164</a>.
          </p>
        </div>
      </div>
    </footer>
  );
}
