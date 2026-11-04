import supabase from "#config/supabase.js";
import parseBody from "#utils/parseBody.js";
export default async function handler(req) {
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

  // Return user session data
  return new Object({
    success: true,
    message: "Signin successful!",
    session: data.session,
    user: data.user,
  });
}
