import  parseBody  from "#utils/parseBody.js";
import supabase from "#config/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    throw new Error("Method not allowed. Only POST requests are accepted.");
  }

  const { email, password } = await parseBody(req);

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  // Use Supabase signInWithPassword
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Map common errors
    let errorMessage = "Authentication failed";

    switch (error.message) {
      case "Invalid login credentials":
        errorMessage = "Invalid email/username or password";
        break;
      case "Email not confirmed":
        errorMessage = "Please confirm your email address before logging in";
        break;
      case "User not found":
        errorMessage = "Invalid email/username or password";
        break;
      default:
        errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }

  // Set secure httpOnly cookie with session token
  if (data.session) {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    };

    // Set the token cookie
    res.setHeader("Set-Cookie", [
      `sb:token=${data.session.access_token}; HttpOnly; Secure; SameSite=lax; Max-Age=${cookieOptions.maxAge}; Path=/`,
    ]);
  }

  // Return user session data
  return {
    success: true,
    message: "Signin successful!",
    session: data.session,
    user: data.user,
  };
};