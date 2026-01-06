import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { UserRole } from "@/types/hipaa";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

function routeForRole(role: UserRole | null): string {
  if (role === "platform_owner") return "/platform";
  if (role === "org_admin") return "/admin";
  if (role === "workforce_user") return "/dashboard";
  return "/login";
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setIsChecking(true);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate("/login", { replace: true, state: { from: location.pathname } });
          return;
        }

        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error) {
          console.error("RoleGuard role lookup error:", error);
          navigate("/login", { replace: true });
          return;
        }

        const role = (data?.role ?? null) as UserRole | null;
        if (!role || !allowedRoles.includes(role)) {
          navigate(routeForRole(role), { replace: true });
          return;
        }

        if (!cancelled) setIsChecking(false);
      } catch (e) {
        console.error("RoleGuard error:", e);
        navigate("/login", { replace: true });
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [allowedRoles, location.pathname, navigate]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Checking permissions…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
