import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/notification-email-webhook")({
  server: {
    handlers: {
      POST: async () => {
        return new Response(
          "Notification emails are handled by the Supabase notification-email Edge Function.",
          { status: 410 },
        );
      },
    },
  },
});
