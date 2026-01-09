import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Lock, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // The recovery link sets up a session automatically
      if (session) {
        setIsValidSession(true);
        // Check if user has MFA enabled
        await checkMfaFactors();
      } else {
        setIsValidSession(false);
      }
    };

    checkSession();

    // Listen for auth state changes (recovery link will trigger this)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsValidSession(true);
        await checkMfaFactors();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkMfaFactors = async () => {
    try {
      const { data: factorsData, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        console.error("Error checking MFA factors:", error);
        return;
      }
      
      // Check if user has verified TOTP factors
      const verifiedFactors = factorsData?.totp?.filter(f => f.status === 'verified') || [];
      if (verifiedFactors.length > 0) {
        setFactorId(verifiedFactors[0].id);
        // Check current AAL level
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalData?.currentLevel !== 'aal2') {
          setRequiresMfa(true);
        }
      }
    } catch (err) {
      console.error("MFA check error:", err);
    }
  };

  const handleMfaVerify = async () => {
    if (!factorId || mfaCode.length !== 6) return;
    
    setIsVerifyingMfa(true);
    try {
      // Create challenge if we don't have one
      let currentChallengeId = challengeId;
      if (!currentChallengeId) {
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId,
        });
        if (challengeError) throw challengeError;
        currentChallengeId = challengeData.id;
        setChallengeId(currentChallengeId);
      }

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: currentChallengeId,
        code: mfaCode,
      });

      if (verifyError) throw verifyError;

      // MFA verified, can now proceed with password reset
      setRequiresMfa(false);
      toast({
        title: "MFA verified",
        description: "You can now set your new password.",
      });
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid code. Please try again.",
        variant: "destructive",
      });
      setMfaCode("");
      // Reset challenge for retry
      setChallengeId(null);
    } finally {
      setIsVerifyingMfa(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        // Check if it's an AAL2 requirement error
        if (error.message.includes("AAL2") || error.message.includes("MFA")) {
          setRequiresMfa(true);
          await checkMfaFactors();
          toast({
            title: "MFA verification required",
            description: "Please verify your authenticator app to continue.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      setIsSuccess(true);
      toast({
        title: "Password updated",
        description: "Your password has been reset successfully.",
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Still checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Invalid or expired link
  if (isValidSession === false) {
    return (
      <div className="min-h-screen bg-gradient-hero">
        <div className="container flex min-h-screen flex-col items-center justify-center px-4 py-8 md:px-6">
          <div className="w-full max-w-md text-center">
            <div className="mb-6 inline-block">
              <Logo size="lg" />
            </div>
            <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
              <h1 className="text-xl font-bold">Invalid or expired link</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Button
                className="mt-6 w-full"
                onClick={() => navigate("/forgot-password")}
              >
                Request new link
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MFA verification required
  if (requiresMfa && factorId) {
    return (
      <div className="min-h-screen bg-gradient-hero">
        <div className="container flex min-h-screen flex-col items-center justify-center px-4 py-8 md:px-6">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <div className="mb-6 inline-block">
                <Logo size="lg" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Verify your identity
              </h1>
              <p className="mt-2 text-muted-foreground">
                Your account has MFA enabled. Enter your authenticator code to continue.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
              <div className="flex justify-center mb-6">
                <div className="rounded-full bg-primary/10 p-4">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={mfaCode}
                    onChange={(value) => setMfaCode(value)}
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
                  className="w-full"
                  onClick={handleMfaVerify}
                  disabled={mfaCode.length !== 6 || isVerifyingMfa}
                >
                  {isVerifyingMfa ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Continue"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container flex min-h-screen flex-col items-center justify-center px-4 py-8 md:px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-6 inline-block">
              <Logo size="lg" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Set new password
            </h1>
            <p className="mt-2 text-muted-foreground">
              Enter your new password below
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
            {isSuccess ? (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Password updated!</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Redirecting you to login...
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      minLength={6}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Updating..." : "Update password"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}