import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts, type ErrorComponentProps,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";

import ogImage from "@/assets/niec-opengraph.JPG";
import appCss from "../styles.css?url";

const siteUrl = (
  (typeof process !== "undefined" && process.env?.VITE_SITE_URL) ||
  import.meta.env?.VITE_SITE_URL ||
  "https://niec-connect.dextrus.workers.dev"
).replace(/\/+$/, "");

const ogImageUrl =
  typeof ogImage === "string" && ogImage.startsWith("http")
    ? ogImage
    : `${siteUrl}${typeof ogImage === "string" && ogImage.startsWith("/") ? "" : "/"}${typeof ogImage === "string" ? ogImage : "niec-opengraph.jpg"}`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  const errorMessage = error instanceof Error ? error.message : String(error ?? "An unexpected error occurred");
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >Try again</button>
          <a href="/" className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">Home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NIEC — Nigeria Impact Economy Community" },
      { name: "description", content: "The membership community for Nigeria's impact investing ecosystem, powered by the Impact Investors Foundation." },
      { property: "og:site_name", content: "NIEC Connect" },
      { property: "og:title", content: "NIEC — Nigeria Impact Economy Community" },
      { property: "og:description", content: "The membership community for Nigeria's impact investing ecosystem, powered by the Impact Investors Foundation." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: ogImageUrl },
      { property: "og:image:secure_url", content: ogImageUrl },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1355" },
      { property: "og:image:height", content: "463" },
      { property: "og:image:alt", content: "NIEC — Nigeria Impact Economy Community" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "NIEC — Nigeria Impact Economy Community" },
      { name: "twitter:description", content: "The membership community for Nigeria's impact investing ecosystem, powered by the Impact Investors Foundation." },
      { name: "twitter:image", content: ogImageUrl },
      { name: "twitter:image:alt", content: "NIEC — Nigeria Impact Economy Community" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "alternate icon", type: "image/png", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
