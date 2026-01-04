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
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check user role and redirect appropriately
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();

        if (roleData?.role === "platform_owner") {
          navigate("/platform");
        } else if (roleData?.role === "org_admin") {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          // Defer role check to avoid deadlock
          setTimeout(async () => {
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id)
              .single();

            if (roleData?.role === "platform_owner") {
              navigate("/platform");
            } else if (roleData?.role === "org_admin") {
              navigate("/admin");
            } else {
              navigate("/dashboard");
            }
          }, 0);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

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
            description: "Please check your email to confirm your account, or sign in if auto-confirm is enabled.",
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
          description: "You have successfully signed in.",
        });
      }
    } catch (error: any) {
      console.error("Auth error:", error);
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
                      placeholder={isSignUp ? "Create a password (min 6 chars)" : "Enter your password"}
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
                    ? (isSignUp ? "Creating account..." : "Signing in...") 
                    : (isSignUp ? "Create account" : "Sign in")
                  }
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
                      Per 45 CFR §164.312(d), all users must complete MFA verification.
                    </p>
                  </div>
                </div>
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
