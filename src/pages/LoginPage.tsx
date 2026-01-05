import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Eye, 
  EyeOff, 
  Shield, 
  Lock,
  ArrowLeft
} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for auth changes (sync callback only)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user?.email ?? null);
    });

    // Initialize from existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const navigateByRole = async (userId: string) => {
    // Check MFA status first
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    
    // Check if user has MFA factors enrolled
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const verifiedFactors = factorsData?.totp?.filter(f => f.status === 'verified') || [];

    // If at aal1 and has verified factors, need to verify
    if (aalData?.currentLevel === 'aal1' && verifiedFactors.length > 0) {
      navigate("/mfa-verify");
      return;
    }

    // If at aal1 and no verified factors, need to enroll
    if (aalData?.currentLevel === 'aal1' && verifiedFactors.length === 0) {
      navigate("/mfa-enroll");
      return;
    }

    // Fully authenticated with MFA (aal2), navigate by role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    const role = roleData?.role;
    if (role === "platform_owner") {
      navigate("/platform");
      return;
    }
    if (role === "org_admin") {
      navigate("/admin");
      return;
    }

    // Default: workforce user experience
    navigate("/dashboard");
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setSessionEmail(null);
        return;
      }

      await navigateByRole(session.user.id);
    } catch (error: any) {
      toast({
        title: "Couldn't load your account",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setSessionEmail(null);
      toast({
        title: "Signed out",
        description: "You can now sign in or sign up with a different account.",
      });
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Validation Error",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });

        if (error) throw error;

        if (data.user) {
          toast({
            title: "Account created",
            description:
              "Please check your email to confirm your account, or sign in if auto-confirm is enabled.",
          });
        }
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back",
          description: "Verifying your identity...",
        });

        // Redirect to MFA flow
        if (data.session) {
          await navigateByRole(data.session.user.id);
        }
      }
    } catch (error: any) {
      toast({
        title: "Authentication Error",
        description: error.message || "Failed to authenticate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="mb-8 text-center">
              <div className="mb-6 inline-block">
                <Logo size="lg" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                {isSignUp ? "Create your account" : "Sign in to your account"}
              </h1>
              <p className="mt-2 text-muted-foreground">
                Access your HIPAA compliance training portal
              </p>
            </div>

            {/* Login Form */}
            <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
              {sessionEmail ? (
                <div className="space-y-6">
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-sm font-medium">You’re already signed in</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Signed in as{" "}
                      <span className="font-medium text-foreground">
                        {sessionEmail}
                      </span>
                      . To create your Platform Owner account, sign out first.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      type="button"
                      onClick={handleContinue}
                      disabled={isLoading}
                    >
                      Continue
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSignOut}
                      disabled={isLoading}
                    >
                      Sign out
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    After signing out, use <span className="font-medium">Sign up</span>
                    {" "}
                    to create the first account (it becomes the Platform Owner).
                  </p>
                </div>
              ) : (
                <>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@organization.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        {!isSignUp && (
                          <Link
                            to="/forgot-password"
                            className="text-sm text-accent hover:underline"
                          >
                            Forgot password?
                          </Link>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder={
                            isSignUp
                              ? "Create a password (min 6 chars)"
                              : "Enter your password"
                          }
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete={isSignUp ? "new-password" : "current-password"}
                          required
                          minLength={6}
                          className="pr-10"
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

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading
                        ? isSignUp
                          ? "Creating account..."
                          : "Signing in..."
                        : isSignUp
                          ? "Create account"
                          : "Sign in"}
                    </Button>
                  </form>

                  {/* Toggle Sign Up / Sign In */}
                  <div className="mt-4 text-center text-sm">
                    {isSignUp ? (
                      <p className="text-muted-foreground">
                        Already have an account?{" "}
                        <button
                          onClick={() => setIsSignUp(false)}
                          className="text-accent hover:underline"
                        >
                          Sign in
                        </button>
                      </p>
                    ) : (
                      <p className="text-muted-foreground">
                        Need an account?{" "}
                        <button
                          onClick={() => setIsSignUp(true)}
                          className="text-accent hover:underline"
                        >
                          Sign up
                        </button>
                      </p>
                    )}
                  </div>

                  {/* MFA Notice */}
                  <div className="mt-6 rounded-lg border border-accent/20 bg-accent/5 p-4">
                    <div className="flex items-start gap-3">
                      <Lock className="mt-0.5 h-4 w-4 text-accent" />
                      <div>
                        <p className="text-sm font-medium text-accent">
                          Multi-Factor Authentication Required
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Per 45 CFR §164.312(d), all users must complete MFA
                          verification.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
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
