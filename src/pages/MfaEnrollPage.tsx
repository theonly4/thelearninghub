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
import { 
  Shield, 
  Smartphone, 
  Copy, 
  Check, 
  ArrowLeft, 
  Loader2, 
  Mail,
  RefreshCw
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type MfaMethod = "totp" | "email";

export default function MfaEnrollPage() {
  const [searchParams] = useSearchParams();
  const method = (searchParams.get("method") as MfaMethod) || "totp";

  // TOTP state
  const [totpUri, setTotpUri] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [factorId, setFactorId] = useState<string>("");
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  // Email state
  const [codeSent, setCodeSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Common state
  const [verifyCode, setVerifyCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (method === "totp") {
      enrollTotpMfa();
    } else {
      checkEmailStatus();
    }
  }, [method]);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const checkEmailStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", session.user.id)
        .single();

      setUserEmail(profile?.email || session.user.email || "");
    } catch (error) {
      console.error("Error checking email status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const enrollTotpMfa = async () => {
    try {
      setIsLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      // Check if user already has MFA enrolled
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactors = factorsData?.totp || [];
      
      // If verified factor exists, redirect to dashboard
      const verifiedFactor = totpFactors.find(f => f.status === 'verified');
      if (verifiedFactor) {
        navigateByRole(session.user.id);
        return;
      }

      // Unenroll ALL unverified factors to avoid name conflicts
      const unverifiedFactors = totpFactors.filter(f => (f as any).status === 'unverified');
      for (const factor of unverifiedFactors) {
        try {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        } catch (unenrollError) {
          console.warn("Failed to unenroll factor:", factor.id, unenrollError);
        }
      }

      // Enroll new TOTP factor
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'The Learning Hub',
        friendlyName: `TLH-${Date.now()}`,
      });

      if (error) throw error;

      if (!data) {
        throw new Error("No MFA enrollment data received");
      }

      const totpUriValue = data.totp.uri || 
        `otpauth://totp/The%20Learning%20Hub:${encodeURIComponent(session.user.email || 'user')}?secret=${data.totp.secret}&issuer=The%20Learning%20Hub`;
      
      setTotpUri(totpUriValue);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    } catch (error: any) {
      toast({
        title: "MFA Setup Error",
        description: error.message || "Failed to initialize MFA setup.",
        variant: "destructive",
      });
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

      // Update profile
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase
          .from('profiles')
          .update({ mfa_enabled: true, mfa_method: 'totp' })
          .eq('user_id', session.user.id);
      }

      toast({
        title: "MFA Enabled",
        description: "Your account is now protected with multi-factor authentication.",
      });

      navigateByRole(session?.user.id || "");
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
        title: "MFA Enabled",
        description: "Your account is now protected with email verification.",
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

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied",
      description: "Secret key copied to clipboard.",
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const switchToEmail = () => {
    navigate("/mfa-enroll?method=email");
  };

  const switchToTotp = () => {
    navigate("/mfa-enroll?method=totp");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Setting up MFA...</p>
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
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="mb-8 text-center">
              <div className="mb-6 inline-block">
                <Logo size="lg" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                {method === "totp" 
                  ? "Set Up Authenticator App" 
                  : "Set Up Email Verification"}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {method === "totp"
                  ? "Scan the QR code with your authenticator app"
                  : "We'll send a verification code to your email"}
              </p>
            </div>

            {/* MFA Setup Card */}
            <div className="rounded-xl border border-border bg-card p-8 shadow-lg space-y-6">
              {method === "totp" ? (
                <>
                  {/* Step 1: Scan QR Code */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                        1
                      </div>
                      <span>Scan this QR code with your authenticator app</span>
                    </div>
                    
                    {totpUri ? (
                      <div className="flex justify-center p-4 bg-white rounded-lg border border-border">
                        <QRCodeSVG value={totpUri} size={192} level="M" includeMargin={false} />
                      </div>
                    ) : (
                      <div className="flex justify-center p-4 bg-muted/50 rounded-lg border border-border">
                        <div className="w-48 h-48 flex items-center justify-center text-muted-foreground text-sm text-center">
                          <div>
                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                            Loading QR code...
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Smartphone className="h-3.5 w-3.5" />
                      <span>Works with Google Authenticator, Authy, Microsoft Authenticator</span>
                    </div>

                    <div className="border-t border-border pt-4">
                      <button
                        onClick={() => setShowSecret(!showSecret)}
                        className="text-sm text-accent hover:underline"
                      >
                        {showSecret ? "Hide secret key" : "Can't scan? Enter key manually"}
                      </button>
                      
                      {showSecret && (
                        <div className="mt-3 flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                          <code className="flex-1 text-xs font-mono break-all">{secret}</code>
                          <Button variant="ghost" size="icon" onClick={copySecret} className="shrink-0">
                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Enter Code */}
                  <div className="space-y-4 border-t border-border pt-6">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                        2
                      </div>
                      <span>Enter the 6-digit code from your app</span>
                    </div>

                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={verifyCode} onChange={setVerifyCode}>
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
                        "Verify and Complete Setup"
                      )}
                    </Button>
                  </div>

                  {/* Switch to email */}
                  <div className="border-t border-border pt-4 text-center">
                    <button onClick={switchToEmail} className="text-sm text-accent hover:underline">
                      Having trouble? Use email verification instead
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Email MFA Flow */}
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Email Verification</p>
                      <p className="text-xs text-muted-foreground">{userEmail}</p>
                    </div>
                  </div>

                  {!codeSent ? (
                    <div className="space-y-4">
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
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-center text-muted-foreground">
                        Enter the 6-digit code sent to your email
                      </p>

                      <div className="flex justify-center">
                        <InputOTP maxLength={6} value={verifyCode} onChange={setVerifyCode}>
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
                          "Verify Code"
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
                    </div>
                  )}

                  {/* Switch to TOTP */}
                  <div className="border-t border-border pt-4 text-center">
                    <button onClick={switchToTotp} className="text-sm text-accent hover:underline">
                      Prefer an authenticator app? Set it up instead
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Security Notice */}
            <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              <span>Multi-factor authentication required for compliance.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
