import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCops from "./tools/list-cops";
import listPosts from "./tools/list-posts";
import createPost from "./tools/create-post";
import listEvents from "./tools/list-events";
import rsvpEvent from "./tools/rsvp-event";
import listKnowledge from "./tools/list-knowledge";
import listDeals from "./tools/list-deals";
import getMyProfile from "./tools/get-my-profile";
import listNotifications from "./tools/list-notifications";

// The OAuth issuer must be the direct Supabase host; the project ref is inlined at build time.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "niec-connect",
  title: "NIEC Connect",
  version: "0.1.0",
  instructions:
    "Tools for NIEC Connect, the Nigeria Impact Economy Collective member platform. Read and post to the community feed, browse Communities of Practice, events, knowledge resources and Deal Room opportunities, RSVP to events, and read your profile and notifications. All tools act as the signed-in member and respect membership-tier access rules.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listCops,
    listPosts,
    createPost,
    listEvents,
    rsvpEvent,
    listKnowledge,
    listDeals,
    getMyProfile,
    listNotifications,
  ],
});
