import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { UserRole } from "@/types/hipaa";

interface UseUserRoleResult {
  role: UserRole | null;
  isPlatformOwner: boolean;
  isOrgAdmin: boolean;
  isWorkforceUser: boolean;
  isLoading: boolean;
}

export function useUserRole(): UseUserRoleResult {
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching user role:", error);
          setIsLoading(false);
          return;
        }

        setRole((data?.role as UserRole) || null);
      } catch (err) {
        console.error("Unexpected error in useUserRole:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRole();
  }, []);

  return {
    role,
    isPlatformOwner: role === "platform_owner",
    isOrgAdmin: role === "org_admin",
    isWorkforceUser: role === "workforce_user",
    isLoading,
  };
}
