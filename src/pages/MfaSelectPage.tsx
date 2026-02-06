import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  Smartphone, 
  Mail, 
  ArrowLeft, 
  Loader2,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

type MfaMethod = "totp" | "email";

interface MethodOption {
  id: MfaMethod;
  icon: typeof Smartphone;
  title: string;
  description: string;
  badge: string;
  badgeVariant: "primary" | "secondary";
}

const methodOptions: MethodOption[] = [
  {
    id: "totp",
    icon: Smartphone,
    title: "Authenticator App",
    description: "Use Google Authenticator, Authy, or similar apps to generate secure codes.",
    badge: "Most Secure",
    badgeVariant: "primary",
  },
  {
    id: "email",
    icon: Mail,
    title: "Email Code",
    description: "Receive a one-time code at your registered work email address.",
    badge: "Convenient",
    badgeVariant: "secondary",
  },
];

export default function MfaSelectPage() {
  const [selectedMethod, setSelectedMethod] = useState<MfaMethod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      // Check if user already has MFA set up
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      // If already at aal2, go to dashboard
      if (aalData?.currentLevel === 'aal2') {
        navigateByRole(session.user.id);
        return;
      }

      // Check for TOTP factors
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = factorsData?.totp?.filter(f => f.status === 'verified') || [];

      if (verifiedFactors.length > 0) {
        // Has TOTP, go to verify
        navigate("/mfa-verify");
        return;
      }

      // Check if user has mfa_method set in profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("mfa_method")
        .eq("user_id", session.user.id)
        .single();

      if (profile?.mfa_method === "email") {
        // Check if email MFA session is valid
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mfa-email-ops`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ action: "check-session" }),
          }
        );
        const result = await response.json();
        if (result.verified) {
          navigateByRole(session.user.id);
          return;
        }
        // Has email MFA but not verified, go to verify
        navigate("/mfa-verify?method=email");
        return;
      }
    } catch (error) {
      console.error("Error checking MFA status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateByRole = async (userId: string) => {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleData?.role === "platform_owner") {
      navigate("/platform");
    } else if (roleData?.role === "org_admin") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };

  const handleMethodSelect = (method: MfaMethod) => {
    setSelectedMethod(method);
  };

  const handleContinue = async () => {
    if (!selectedMethod) return;

    setIsSubmitting(true);
    try {
      navigate(`/mfa-enroll?method=${selectedMethod}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Checking security status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container flex min-h-screen flex-col px-4 py-8 md:px-6">
        {/* Back Link */}
        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Sign out and go back
        </button>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-xl">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="mb-6 inline-block">
                <Logo size="lg" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Choose Your Security Method
              </h1>
              <p className="mt-2 text-muted-foreground">
                Protect your account with multi-factor authentication
              </p>
            </div>

            {/* Method Selection Cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              {methodOptions.map((option) => {
                const isSelected = selectedMethod === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleMethodSelect(option.id)}
                    className={cn(
                      "relative rounded-xl border-2 bg-card p-6 text-left transition-all hover:shadow-md",
                      isSelected
                        ? "border-primary shadow-md"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute right-3 top-3">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                    )}

                    {/* Badge */}
                    <div
                      className={cn(
                        "mb-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                        option.badgeVariant === "primary"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {option.badgeVariant === "primary" && (
                        <Sparkles className="h-3 w-3" />
                      )}
                      {option.badge}
                    </div>

                    {/* Icon */}
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                      <option.icon className="h-6 w-6 text-foreground" />
                    </div>

                    {/* Content */}
                    <h3 className="mb-2 text-lg font-semibold">{option.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Continue Button */}
            <div className="mt-6">
              <button
                onClick={handleContinue}
                disabled={!selectedMethod || isSubmitting}
                className={cn(
                  "w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors",
                  !selectedMethod || isSubmitting
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-primary/90"
                )}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Continuing...
                  </span>
                ) : (
                  "Continue with Selected Method"
                )}
              </button>
            </div>

            {/* Security Notice */}
            <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              <span>
                Multi-factor authentication is required for compliance and account security.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
