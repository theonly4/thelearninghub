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
import { Shield, Smartphone, Copy, Check, ArrowLeft, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function MfaEnrollPage() {
  const [totpUri, setTotpUri] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [factorId, setFactorId] = useState<string>("");
  const [verifyCode, setVerifyCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    enrollMfa();
  }, []);

  const enrollMfa = async () => {
    try {
      setIsLoading(true);
      
      // Check if user is authenticated
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
        navigate("/dashboard");
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

      // Enroll new TOTP factor with unique friendly name to avoid conflicts
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'HIPAA Learning Hub',
        friendlyName: `HIPAA-${Date.now()}`,
      });

      if (error) throw error;

      if (!data) {
        throw new Error("No MFA enrollment data received");
      }

      // Build the TOTP URI for QR code generation
      // Format: otpauth://totp/LABEL?secret=SECRET&issuer=ISSUER
      const totpUriValue = data.totp.uri || 
        `otpauth://totp/HIPAA%20Learning%20Hub:${encodeURIComponent(session.user.email || 'user')}?secret=${data.totp.secret}&issuer=HIPAA%20Learning%20Hub`;
      
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

      // Update profile to mark MFA as enabled
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase
          .from('profiles')
          .update({ mfa_enabled: true })
          .eq('user_id', session.user.id);
      }

      toast({
        title: "MFA Enabled",
        description: "Your account is now protected with multi-factor authentication.",
      });

      // Navigate to dashboard based on role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session?.user.id)
        .maybeSingle();

      if (roleData?.role === "platform_owner") {
        navigate("/platform");
      } else if (roleData?.role === "org_admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
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
                Set Up Multi-Factor Authentication
              </h1>
              <p className="mt-2 text-muted-foreground">
                Scan the QR code with your authenticator app
              </p>
            </div>

            {/* MFA Setup Card */}
            <div className="rounded-xl border border-border bg-card p-8 shadow-lg space-y-6">
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
                    <QRCodeSVG
                      value={totpUri}
                      size={192}
                      level="M"
                      includeMargin={false}
                    />
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

                {/* Compatible Apps */}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Works with Google Authenticator, Authy, Microsoft Authenticator</span>
                </div>

                {/* Manual Entry Option */}
                <div className="border-t border-border pt-4">
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-sm text-accent hover:underline"
                  >
                    {showSecret ? "Hide secret key" : "Can't scan? Enter key manually"}
                  </button>
                  
                  {showSecret && (
                    <div className="mt-3 flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <code className="flex-1 text-xs font-mono break-all">
                        {secret}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={copySecret}
                        className="shrink-0"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
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
                  <InputOTP
                    maxLength={6}
                    value={verifyCode}
                    onChange={setVerifyCode}
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
                    "Verify and Complete Setup"
                  )}
                </Button>
              </div>
            </div>

            {/* Security Notice */}
            <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              <span>
                Required per 45 CFR §164.312(d) for HIPAA compliance.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
