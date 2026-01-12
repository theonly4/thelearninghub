import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { WorkforceGroup } from "@/types/hipaa";

interface UserProfile {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  organizationName: string;
  workforceGroups: WorkforceGroup[];
  isLoading: boolean;
}

export function useUserProfile(): UserProfile {
  const [profile, setProfile] = useState<UserProfile>({
    firstName: "",
    lastName: "",
    fullName: "",
    email: "",
    organizationName: "",
    workforceGroups: [],
    isLoading: true,
  });

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setProfile(prev => ({ ...prev, isLoading: false }));
          return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select(`
            first_name,
            last_name,
            email,
            workforce_groups,
            organization_id,
            organizations (
              name
            )
          `)
          .eq('user_id', user.id)
          .single();

        if (profileData) {
          const firstName = profileData.first_name || "";
          const lastName = profileData.last_name || "";
          setProfile({
            firstName,
            lastName,
            fullName: `${firstName} ${lastName}`.trim() || "User",
            email: profileData.email || user.email || "",
            organizationName: (profileData.organizations as { name: string } | null)?.name || "",
            workforceGroups: (profileData.workforce_groups || []) as WorkforceGroup[],
            isLoading: false,
          });
        } else {
          setProfile(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setProfile(prev => ({ ...prev, isLoading: false }));
      }
    }

    fetchUserProfile();
  }, []);

  return profile;
}
