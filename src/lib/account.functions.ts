import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

export const deleteOwnAccount = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; confirmation: string }) => {
    if (!input || typeof input.password !== "string" || input.password.length === 0 || input.password.length > 1024) {
      throw new Error("Enter your current password to continue.");
    }
    if (input.confirmation !== "DELETE") {
      throw new Error('Type "DELETE" to confirm account deletion.');
    }
    return input;
  })
  .handler(async ({ data }) => {
    const authorization = getRequest().headers.get("authorization");
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new Error("Sign in again before deleting your account.");

    const supabaseUrl = process.env["SUPABASE_URL"];
    const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!supabaseUrl || !publishableKey) {
      throw new Error("Supabase is not configured for account deletion.");
    }

    const authClient = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    if (claimsError || !userId) throw new Error("Your session could not be verified. Sign in again.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !userData.user?.email) throw new Error("Could not verify the account email.");

    const { error: passwordError } = await authClient.auth.signInWithPassword({
      email: userData.user.email,
      password: data.password,
    });
    if (passwordError) throw new Error("The current password is incorrect.");

    const avatarBucket = supabaseAdmin.storage.from("avatars");
    const avatarPaths: string[] = [];
    for (let offset = 0; ; offset += 100) {
      const { data: files, error: listError } = await avatarBucket.list(userId, { limit: 100, offset });
      if (listError) throw new Error(`Could not prepare profile image deletion: ${listError.message}`);
      for (const file of files ?? []) {
        if (file.id) avatarPaths.push(`${userId}/${file.name}`);
      }
      if (!files || files.length < 100) break;
    }
    for (let index = 0; index < avatarPaths.length; index += 100) {
      const { error: storageError } = await avatarBucket.remove(avatarPaths.slice(index, index + 100));
      if (storageError) throw new Error(`Could not remove profile images: ${storageError.message}`);
    }

    const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(token, "global");
    if (signOutError) throw new Error(`Could not revoke account sessions: ${signOutError.message}`);

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId, false);
    if (deleteError) throw new Error(`Could not delete the account: ${deleteError.message}`);

    return { deleted: true };
  });
