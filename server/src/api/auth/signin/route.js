import parseBody from "#utils/parseBody.js";
import supabase from "#config/supabase.js";
import HttpError from "#utils/HttpError.js";
import setAuthCookies from "#utils/setAuthCookies.js";
import checkRateLimit, { getClientKey } from "#utils/rateLimit.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    throw new HttpError(405, "Method not allowed");
  }

  checkRateLimit(getClientKey(req, "signin"));

  const { email, identifier, password } = await parseBody(req);
  const loginIdentifier = (identifier || email || "").trim();

  if (!loginIdentifier || !password) {
    throw new HttpError(400, "Email or username and password are required");
  }

  let emailToUse = loginIdentifier;

  if (!loginIdentifier.includes("@")) {
    const username = loginIdentifier.toLowerCase();
    const { data, error } = await supabase.rpc("resolve_email_by_username", {
      p_username: username,
    });

    if (error || !data) {
      throw new HttpError(401, "Invalid username or password");
    }

    emailToUse = data;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailToUse,
    password,
  });

  if (error || !data.session) {
    // Email not confirmed is safe to reveal - Supabase only returns this
    // when the email exists but hasn't been verified yet
    if (error?.code === "email_not_confirmed") {
      throw new HttpError(
        401,
        "Please confirm your email address before signing in. Check your inbox for a confirmation link.",
      );
    }
    throw new HttpError(401, "Invalid username or password");
  }

  setAuthCookies(res, data.session);

  return {
    success: true,
    message: "Signin successful!",
    user: data.user,
    session: data.session,
  };
}
