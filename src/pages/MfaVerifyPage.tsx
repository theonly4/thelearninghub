import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Shield, Lock, Loader2, ArrowLeft, Mail, RefreshCw } from "lucide-react";

type MfaMethod = "totp" | "email";

export default function MfaVerifyPage() {
  const [searchParams] = useSearchParams();
  const methodParam = searchParams.get("method") as MfaMethod | null;

  const [verifyCode, setVerifyCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [factorId, setFactorId] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [mfaMethod, setMfaMethod] = useState<MfaMethod>("totp");
  const [codeSent, setCodeSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkMfaStatus();
  }, []);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const checkMfaStatus = async () => {
    try {
      setIsLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      setUserEmail(session.user.email || "");

      // Check current AAL level
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      // If already at aal2, check email MFA session or redirect to dashboard
      if (aalData?.currentLevel === 'aal2') {
        navigateByRole(session.user.id);
        return;
      }

      // Get user's mfa_method from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("mfa_method, email")
        .eq("user_id", session.user.id)
        .single();

      if (profile?.email) {
        setUserEmail(profile.email);
      }

      // Use method from URL param or profile
      const method = methodParam || profile?.mfa_method as MfaMethod || "totp";
      setMfaMethod(method);

      if (method === "totp") {
        // Get enrolled TOTP factors
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const verifiedFactors = factorsData?.totp?.filter(f => f.status === 'verified') || [];

        if (verifiedFactors.length === 0) {
          // No MFA enrolled, redirect to selection
          navigate("/mfa-select");
          return;
        }

        setFactorId(verifiedFactors[0].id);
      } else if (method === "email") {
        // Check if email MFA session is already valid
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
      }
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

  const handleSendEmailCode = async () => {
    setIsSendingCode(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mfa-email-ops`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: "send-code" }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to send code");
      }

      setCodeSent(true);
      setResendCountdown(60);
      toast({
        title: "Code Sent",
        description: `Verification code sent to ${userEmail}`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to Send Code",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyTotp = async () => {
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
      const { data: challengeData, error: challengeError } = 
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError) throw challengeError;

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

  const handleVerifyEmail = async () => {
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mfa-email-ops`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: "verify-code", code: verifyCode }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Verification failed");
      }

      toast({
        title: "Verified",
        description: "Identity confirmed. Welcome back!",
      });

      navigateByRole(session.user.id);
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid code. Please try again.",
        variant: "destructive",
      });
      setVerifyCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-submit when 6 digits are entered (TOTP only)
  useEffect(() => {
    if (verifyCode.length === 6 && !isVerifying && mfaMethod === "totp" && factorId) {
      handleVerifyTotp();
    }
  }, [verifyCode]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

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
                {mfaMethod === "totp" 
                  ? "Enter the code from your authenticator app"
                  : "Verify with a code sent to your email"}
              </p>
            </div>

            {/* MFA Verify Card */}
            <div className="rounded-xl border border-border bg-card p-8 shadow-lg space-y-6">
              {/* User Info */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  {mfaMethod === "totp" ? (
                    <Lock className="h-5 w-5 text-primary" />
                  ) : (
                    <Mail className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {mfaMethod === "totp" ? "Two-factor authentication" : "Email verification"}
                  </p>
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                </div>
              </div>

              {mfaMethod === "totp" ? (
                /* TOTP Verification */
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
                    onClick={handleVerifyTotp}
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
              ) : (
                /* Email Verification */
                <div className="space-y-4">
                  {!codeSent ? (
                    <>
                      <p className="text-sm text-center text-muted-foreground">
                        Click below to receive a verification code at your registered email.
                      </p>
                      <Button 
                        onClick={handleSendEmailCode} 
                        className="w-full"
                        disabled={isSendingCode}
                      >
                        {isSendingCode ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Verification Code
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-center text-muted-foreground">
                        Enter the 6-digit code sent to your email
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
                        onClick={handleVerifyEmail}
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

                      <div className="text-center">
                        <button
                          onClick={handleSendEmailCode}
                          disabled={resendCountdown > 0 || isSendingCode}
                          className="inline-flex items-center gap-2 text-sm text-accent hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          {resendCountdown > 0 
                            ? `Resend code in ${resendCountdown}s` 
                            : "Resend code"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Help Text */}
              <div className="text-center text-xs text-muted-foreground">
                {mfaMethod === "totp" ? (
                  <p>Having trouble? Make sure your device's time is synchronized.</p>
                ) : (
                  <p>Check your spam folder if you don't see the email.</p>
                )}
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
