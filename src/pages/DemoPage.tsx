import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft,
  Building2,
  Users,
  CheckCircle2
} from "lucide-react";

export default function DemoPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    organization: "",
    role: "",
    workforceSize: "",
    message: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-demo-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit demo request');
      }

      setIsSubmitted(true);
      toast({
        title: "Demo Request Submitted",
        description: "We'll be in touch within 24 hours.",
      });
    } catch (error: any) {
      console.error('Demo request error:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-hero">
        <div className="container flex min-h-screen flex-col items-center justify-center px-4 py-8 md:px-6">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <CheckCircle2 className="h-8 w-8 text-accent" />
            </div>
            <h1 className="mb-4 text-2xl font-bold">Demo Request Received</h1>
            <p className="mb-8 text-muted-foreground">
              Thank you for your interest in HIPAA Learning Hub. Our team will contact 
              you within 24 hours to schedule your personalized demo.
            </p>
            <Link to="/">
              <Button>
                Return to Homepage
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container flex min-h-screen flex-col px-4 py-8 md:px-6">
        {/* Back Link */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="grid w-full max-w-5xl gap-12 lg:grid-cols-2">
            {/* Left Column - Info */}
            <div className="flex flex-col justify-center">
              <Logo size="lg" className="mb-8" />
              <h1 className="mb-4 text-3xl font-bold tracking-tight">
                See HIPAA Learning Hub in Action
              </h1>
              <p className="mb-8 text-lg text-muted-foreground">
                Schedule a personalized demo to see how our platform delivers 
                OCR-audit defensible HIPAA compliance training.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-accent/10 p-2.5 text-accent">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Multi-Tenant Platform</h3>
                    <p className="text-sm text-muted-foreground">
                      See how organizations manage workforce training with 
                      strict tenant isolation.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-accent/10 p-2.5 text-accent">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Role-Based Training</h3>
                    <p className="text-sm text-muted-foreground">
                      Explore how quizzes are mapped to workforce groups for 
                      regulatory alignment.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Form */}
            <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
              <h2 className="mb-6 text-xl font-semibold">Request a Demo</h2>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization">Organization name</Label>
                  <Input
                    id="organization"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Your role</Label>
                  <Select 
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compliance">Compliance Officer</SelectItem>
                      <SelectItem value="privacy">Privacy Officer</SelectItem>
                      <SelectItem value="security">Security Officer</SelectItem>
                      <SelectItem value="hr">HR / Training Manager</SelectItem>
                      <SelectItem value="executive">Executive Leadership</SelectItem>
                      <SelectItem value="it">IT Administrator</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workforceSize">Workforce size</Label>
                  <Select
                    value={formData.workforceSize}
                    onValueChange={(value) => setFormData({ ...formData, workforceSize: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select workforce size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-50">1-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="501-1000">501-1,000 employees</SelectItem>
                      <SelectItem value="1001+">1,001+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Additional information (optional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us about your compliance training needs..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={3}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? "Submitting..." : "Request Demo"}
                </Button>
              </form>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                By submitting this form, you agree to our{" "}
                <Link to="/privacy" className="text-accent hover:underline">
                  Privacy Policy
                </Link>
                {" "}and{" "}
                <Link to="/terms" className="text-accent hover:underline">
                  Terms of Service
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
