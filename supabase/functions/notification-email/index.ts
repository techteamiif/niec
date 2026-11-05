import { createClient } from "npm:@supabase/supabase-js@2.105.4";

type NotificationWebhookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: {
    id?: string;
    recipient_id?: string;
    type?: string;
    title?: string;
    message?: string;
    link?: string | null;
  };
};

function hasValidSecret(received: string | null, expected: string) {
  if (!received) return false;
  const encoder = new TextEncoder();
  const receivedBytes = encoder.encode(received);
  const expectedBytes = encoder.encode(expected);
  if (receivedBytes.length !== expectedBytes.length) return false;
  let difference = 0;
  for (let i = 0; i < receivedBytes.length; i++) {
    difference |= receivedBytes[i] ^ expectedBytes[i];
  }
  return difference === 0;
}

function isEmailWorthy(type: string, title: string) {
  if (type === "post_reply") return title !== "Someone liked your post";
  return ["event_reminder", "admin_message", "tier_upgrade"].includes(type);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}

function buildActivityUrl(link: string | null | undefined, appUrl: string) {
  if (!link) return null;
  const baseUrl = new URL(appUrl);
  if (baseUrl.protocol !== "https:" && baseUrl.protocol !== "http:") {
    throw new Error("APP_URL must use HTTP or HTTPS");
  }
  const url = new URL(link, baseUrl);
  if (url.origin !== baseUrl.origin) {
    throw new Error("Notification links must stay on the application domain");
  }
  return url.toString();
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const webhookSecret = Deno.env.get("NOTIFICATION_EMAIL_WEBHOOK_SECRET");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  const appUrl = Deno.env.get("APP_URL");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!webhookSecret || !resendApiKey || !fromEmail || !appUrl || !supabaseUrl || !serviceRoleKey) {
    console.error("[notification-email] Required function secrets are not configured");
    return new Response("Email function is not configured", { status: 503 });
  }
  if (!hasValidSecret(request.headers.get("x-notification-webhook-secret"), webhookSecret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: NotificationWebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON payload", { status: 400 });
  }

  const notification = payload.record;
  if (
    payload.type !== "INSERT" ||
    payload.table !== "notifications" ||
    payload.schema !== "public" ||
    typeof notification?.id !== "string" ||
    typeof notification.recipient_id !== "string" ||
    typeof notification.type !== "string" ||
    typeof notification.title !== "string"
  ) {
    return new Response("Unsupported or invalid notification event", { status: 400 });
  }

  if (!isEmailWorthy(notification.type, notification.title)) {
    return new Response("Ignored notification type", { status: 200 });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: recipient, error: recipientError } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", notification.recipient_id)
      .maybeSingle();
    if (recipientError) throw recipientError;
    if (!recipient?.email) throw new Error("Notification recipient has no email address");

    const activityUrl = buildActivityUrl(notification.link, appUrl);
    const title = escapeHtml(notification.title);
    const message = escapeHtml(notification.message ?? "");
    const html = [
      '<div style="font-family:Arial,Helvetica,sans-serif;color:#12261f;max-width:600px;margin:0 auto;padding:24px">',
      '<div style="border-bottom:3px solid #c9a227;padding-bottom:12px">',
      '<p style="margin:0;color:#c9a227;font-size:11px;letter-spacing:1.5px;text-transform:uppercase">NIEC Connect</p>',
      `<h1 style="margin:8px 0 0;color:#0b4f3a;font-size:22px">${title}</h1>`,
      "</div>",
      `<p style="font-size:15px;line-height:1.6;white-space:pre-wrap">${message}</p>`,
      activityUrl
        ? `<p><a href="${escapeHtml(activityUrl)}" style="display:inline-block;background:#0b4f3a;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none">View activity</a></p>`
        : "",
      '<p style="margin-top:24px;color:#7a8a83;font-size:12px">You received this email because of activity in your NIEC account.</p>',
      "</div>",
    ].join("");
    const text = [
      notification.title,
      "",
      notification.message ?? "",
      activityUrl ? `\nView activity: ${activityUrl}` : "",
      "\nYou received this email because of activity in your NIEC account.",
    ].join("\n");

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `notification/${notification.id}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipient.email],
        subject: notification.title,
        html,
        text,
      }),
    });
    if (!emailResponse.ok) {
      const responseBody = await emailResponse.text();
      console.error("[notification-email] Resend rejected email", emailResponse.status, responseBody);
      return new Response("Email delivery failed", { status: 502 });
    }

    return new Response("Email sent", { status: 200 });
  } catch (error) {
    console.error("[notification-email] Email delivery failed", error);
    return new Response("Email delivery failed", { status: 500 });
  }
});
