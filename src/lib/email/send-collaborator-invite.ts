import { ui } from "@/lib/ui-id";

type SendInviteInput = {
  to: string;
  inviteUrl: string;
  formTitle: string;
  inviterName: string;
};

export type SendCollaboratorInviteResult =
  | { status: "sent" }
  | { status: "not_configured" }
  | { status: "failed"; detail?: string };

export function isCollaboratorEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim(),
  );
}

export async function sendCollaboratorInviteEmail(
  input: SendInviteInput,
): Promise<SendCollaboratorInviteResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  const subject = ui.collaboratorInviteEmailSubject(input.formTitle);
  const text = ui.collaboratorInviteEmailBody({
    inviterName: input.inviterName,
    formTitle: input.formTitle,
    inviteUrl: input.inviteUrl,
  });
  const html = `
    <div style="font-family: 'Segoe UI', system-ui, sans-serif; line-height: 1.5; color: #1c1917;">
      <p>${ui.collaboratorInviteEmailGreeting}</p>
      <p>${ui.collaboratorInviteEmailIntro(input.inviterName, input.formTitle)}</p>
      <p><a href="${input.inviteUrl}" style="color: #0f6e56; font-weight: 600;">${ui.collaboratorInviteEmailCta}</a></p>
      <p style="color: #57534e; font-size: 14px;">${ui.collaboratorInviteEmailFooter}</p>
      <p style="color: #57534e; font-size: 12px; word-break: break-all;">${input.inviteUrl}</p>
    </div>
  `.trim();

  if (!apiKey || !from) {
    console.info(
      "[collaborator-invite] Email not configured (set RESEND_API_KEY + EMAIL_FROM). Invite URL:",
      input.inviteUrl,
    );
    return { status: "not_configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("Resend API error:", response.status, body);
      let detail: string | undefined;
      try {
        const parsed = JSON.parse(body) as { message?: string };
        detail = parsed.message;
      } catch {
        detail = undefined;
      }
      return { status: "failed", detail };
    }

    return { status: "sent" };
  } catch (error) {
    console.error("Failed to send collaborator invite email:", error);
    return { status: "failed" };
  }
}
