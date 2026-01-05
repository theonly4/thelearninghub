import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Shield, Lock, Loader2, ArrowLeft } from "lucide-react";

export default function MfaVerifyPage() {
  const [verifyCode, setVerifyCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [factorId, setFactorId] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    try {
      setIsLoading(true);
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      setUserEmail(session.user.email || "");

      // Check current AAL level
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      // If already at aal2, redirect to dashboard
      if (aalData?.currentLevel === 'aal2') {
        navigateByRole(session.user.id);
        return;
      }

      // Get enrolled factors
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = factorsData?.totp?.filter(f => f.status === 'verified') || [];

      if (verifiedFactors.length === 0) {
        // No MFA enrolled, redirect to enrollment
        navigate("/mfa-enroll");
        return;
      }

      // Use the first verified factor
      setFactorId(verifiedFactors[0].id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to check MFA status.",
        variant: "destructive",
      });
      navigate("/login");
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

  const handleVerify = async () => {
    if (verifyCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      // Challenge the factor
      const { data: challengeData, error: challengeError } = 
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError) throw challengeError;

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });

      if (verifyError) throw verifyError;

      toast({
        title: "Verified",
        description: "Identity confirmed. Welcome back!",
      });

      // Navigate to dashboard based on role
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigateByRole(session.user.id);
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
      setVerifyCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  // Auto-submit when 6 digits are entered
  useEffect(() => {
    if (verifyCode.length === 6 && !isVerifying && factorId) {
      handleVerify();
    }
  }, [verifyCode]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Checking authentication...</p>
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
          Use a different account
        </button>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="mb-8 text-center">
              <div className="mb-6 inline-block">
                <Logo size="lg" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Verify Your Identity
              </h1>
              <p className="mt-2 text-muted-foreground">
                Enter the code from your authenticator app
              </p>
            </div>

            {/* MFA Verify Card */}
            <div className="rounded-xl border border-border bg-card p-8 shadow-lg space-y-6">
              {/* User Info */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Two-factor authentication</p>
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                </div>
              </div>

              {/* OTP Input */}
              <div className="space-y-4">
                <p className="text-sm text-center text-muted-foreground">
                  Open your authenticator app and enter the 6-digit code
                </p>

                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={verifyCode}
                    onChange={setVerifyCode}
                    disabled={isVerifying}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  onClick={handleVerify}
                  className="w-full"
                  disabled={verifyCode.length !== 6 || isVerifying}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify"
                  )}
                </Button>
              </div>

              {/* Help Text */}
              <div className="text-center text-xs text-muted-foreground">
                <p>
                  Having trouble? Make sure your device's time is synchronized.
                </p>
              </div>
            </div>

            {/* Security Notice */}
            <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              <span>
                Protected by enterprise-grade security. All sessions are audited.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
