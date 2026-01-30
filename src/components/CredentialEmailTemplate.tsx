import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CredentialEmailTemplateProps {
  recipientName: string;
  email: string;
  password: string;
  isPasswordReset?: boolean;
  organizationName?: string;
  expiryDays?: number;
}

export function CredentialEmailTemplate({
  recipientName,
  email,
  password,
  isPasswordReset = false,
  organizationName,
  expiryDays = 7,
}: CredentialEmailTemplateProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  const loginUrl = `${window.location.origin}/login`;
  
  const emailSubject = isPasswordReset
    ? "Your The Learning Hub Password Has Been Reset"
    : "Welcome to The Learning Hub - Your Account Credentials";
  
  const emailBody = isPasswordReset
    ? `Hi ${recipientName},

Your password has been reset for The Learning Hub${organizationName ? ` (${organizationName})` : ""}.

Please use the following credentials to log in:

Login URL: ${loginUrl}
Email: ${email}
Temporary Password: ${password}

IMPORTANT: This temporary password will expire in ${expiryDays} days. Please log in and change your password as soon as possible.

After logging in:
1. You will be prompted to set a new password
2. Choose a strong password that you haven't used before
3. Set up Multi-Factor Authentication (MFA) for additional security

If you did not request this password reset, please contact your administrator immediately.

Best regards,
The Learning Hub Team`
    : `Hi ${recipientName},

Welcome to The Learning Hub${organizationName ? ` - ${organizationName}` : ""}!

Your account has been created. Please use the following credentials to log in:

Login URL: ${loginUrl}
Email: ${email}
Temporary Password: ${password}

IMPORTANT: This temporary password will expire in ${expiryDays} days. Please log in and change your password as soon as possible.

After logging in:
1. You will be prompted to set a new password
2. Choose a strong password that you haven't used before
3. Set up Multi-Factor Authentication (MFA) for additional security
4. Complete your required compliance learning

If you have any questions, please contact your administrator.

Best regards,
The Learning Hub Team`;

  const copyEmailTemplate = async () => {
    try {
      await navigator.clipboard.writeText(emailBody);
      setCopied(true);
      toast({ title: "Email template copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({ 
        title: "Failed to copy", 
        description: "Please select and copy the text manually",
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Email Template
        </Label>
        <Button
          variant="outline"
          size="sm"
          onClick={copyEmailTemplate}
          className="gap-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-success" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy Email
            </>
          )}
        </Button>
      </div>
      <div className="text-xs text-muted-foreground mb-1">
        Subject: <span className="font-medium">{emailSubject}</span>
      </div>
      <Textarea
        value={emailBody}
        readOnly
        className="font-mono text-xs h-48 bg-muted resize-none"
      />
      <p className="text-xs text-muted-foreground">
        Copy and paste this into your email client to send credentials securely.
      </p>
    </div>
  );
}
