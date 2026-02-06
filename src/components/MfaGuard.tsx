import { useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface MfaGuardProps {
  children: ReactNode;
}

export function MfaGuard({ children }: MfaGuardProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkMfaStatus();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkMfaStatus();
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkMfaStatus = async () => {
    try {
      setIsChecking(true);

      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      // Check current AAL level for TOTP
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      // If at aal2, user is fully authenticated with TOTP MFA
      if (aalData?.currentLevel === 'aal2') {
        setIsAuthorized(true);
        setIsChecking(false);
        return;
      }

      // Check user's mfa_method from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("mfa_method, mfa_enabled")
        .eq("user_id", session.user.id)
        .single();

      // If user has email MFA method set, check email MFA session
      if (profile?.mfa_method === "email") {
        try {
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
            setIsAuthorized(true);
            setIsChecking(false);
            return;
          }
        } catch (error) {
          console.error("Error checking email MFA session:", error);
        }
        
        // Email MFA not verified, redirect to verify
        navigate("/mfa-verify?method=email");
        return;
      }

      // Check if user has TOTP factors enrolled
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = factorsData?.totp?.filter(f => f.status === 'verified') || [];

      if (verifiedFactors.length > 0) {
        // Has TOTP MFA but needs to verify
        navigate("/mfa-verify");
      } else if (profile?.mfa_method === null || !profile?.mfa_enabled) {
        // No MFA method set, redirect to selection
        navigate("/mfa-select");
      } else {
        // Fallback to enroll
        navigate("/mfa-enroll");
      }
    } catch (error) {
      console.error("MFA check error:", error);
      navigate("/login");
    } finally {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
