import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PROTECTED EMAIL - WILL NEVER BE DELETED UNDER ANY CIRCUMSTANCES
const PROTECTED_EMAIL = 'yiplawcenter@protonmail.com';

// EXPLICIT ALLOWLIST - Only these 8 specific test emails will be deleted
const ALLOWLIST_EMAILS = [
  'thejurisdoctor@yahoo.com',
  'test@email.com',
  'tony.yip.jd@gmail.com',
  'thejurisdoctor@gmail.com',
  'yipchelsea1@gmail.com',
  'tonyyipjd@proton.me',
  'simoneyipper@gmail.com',
  'theyips@live.com',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const results: { email: string; status: string; error?: string }[] = [];

    // Get all auth users
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    console.log(`Found ${authUsers.users.length} total auth users`);

    for (const user of authUsers.users) {
      const email = user.email?.toLowerCase();
      
      if (!email) {
        console.log(`Skipping user ${user.id} - no email`);
        continue;
      }

      // SAFETY CHECK 1: Never delete the protected email
      if (email === PROTECTED_EMAIL.toLowerCase()) {
        console.log(`PROTECTED: Skipping ${email} - this is the platform owner`);
        results.push({ email, status: 'PROTECTED - Platform Owner' });
        continue;
      }

      // SAFETY CHECK 2: Only delete emails in the allowlist
      if (!ALLOWLIST_EMAILS.map(e => e.toLowerCase()).includes(email)) {
        console.log(`SKIPPED: ${email} - not in allowlist`);
        results.push({ email, status: 'SKIPPED - Not in allowlist' });
        continue;
      }

      // SAFETY CHECK 3: Double-check it's not the protected email (redundant but safe)
      if (email === PROTECTED_EMAIL.toLowerCase()) {
        console.log(`BLOCKED: Attempted to delete protected email ${email}`);
        results.push({ email, status: 'BLOCKED - Protected email' });
        continue;
      }

      // Delete the user
      console.log(`DELETING: ${email}`);
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (deleteError) {
        console.error(`Failed to delete ${email}: ${deleteError.message}`);
        results.push({ email, status: 'FAILED', error: deleteError.message });
      } else {
        console.log(`DELETED: ${email}`);
        results.push({ email, status: 'DELETED' });
      }
    }

    // Summary
    const deleted = results.filter(r => r.status === 'DELETED').length;
    const protected_ = results.filter(r => r.status.includes('PROTECTED')).length;
    const skipped = results.filter(r => r.status.includes('SKIPPED')).length;
    const failed = results.filter(r => r.status === 'FAILED').length;

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          deleted,
          protected: protected_,
          skipped,
          failed,
          total: authUsers.users.length,
        },
        details: results,
        safetyConfirmation: {
          protectedEmail: PROTECTED_EMAIL,
          allowlistUsed: true,
          allowlistEmails: ALLOWLIST_EMAILS,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Cleanup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        safetyNote: `The protected email ${PROTECTED_EMAIL} was never touched.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
