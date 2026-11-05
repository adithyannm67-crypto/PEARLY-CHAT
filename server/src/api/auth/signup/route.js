import parseBody from "#utils/parseBody.js";
import supabase from "#config/supabase.js";
import HttpError from "#utils/HttpError.js";
import setAuthCookies from "#utils/setAuthCookies.js";
import checkRateLimit, { getClientKey } from "#utils/rateLimit.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    throw new HttpError(405, "Method not allowed");
  }

  checkRateLimit(getClientKey(req, "signup"));

  const body = await parseBody(req);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const name = String(body.name || "").trim();
  const username = String(body.username || "").trim().toLowerCase();

  if (!EMAIL_PATTERN.test(email) || !password) {
    throw new HttpError(400, "A valid email and password are required");
  }

  if (password.length < 8) {
    throw new HttpError(400, "Password must be at least 8 characters");
  }

  if (!name) {
    throw new HttpError(400, "Name is required");
  }

  if (!USERNAME_PATTERN.test(username)) {
    throw new HttpError(
      400,
      "Username must be 3-30 characters and contain only letters, numbers, or underscores",
    );
  }

  const { data: existingEmail } = await supabase.rpc("resolve_email_by_username", {
    p_username: username,
  });

  if (existingEmail) {
    throw new HttpError(409, "Username is already registered");
  }

  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, username },
      emailRedirectTo: `${clientUrl}/auth/callback`,
    },
  });

  if (error) {
    const message = error.message || "";
    if (/already|duplicate|unique|registered/i.test(message)) {
      throw new HttpError(409, "Email or username is already registered");
    }
    throw new HttpError(400, "Unable to create account. Please check your details.");
  }

  if (data.session) {
    setAuthCookies(res, data.session);
  }

  return {
    success: true,
    message: data.session
      ? "Signup successful!"
      : "Signup successful! Please verify your email.",
    user: data.user,
    session: data.session,
  };
}
