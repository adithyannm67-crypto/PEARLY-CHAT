import  parseBody  from "#utils/parseBody.js";
import supabase from "#config/supabase.js";
export default async function handler(req, res) {
  if (req.method !== "POST") {
    throw new Error("Method not allowed. Only POST requests are accepted.");
  }

  const { email, password, name, username } = await parseBody(req);

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  // Validate password length
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  // Use Supabase signUp
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name || "",
        username: username || "",
      },
      emailRedirectTo: `${process.env.BASE_URL || "http://localhost:5000"}/auth/callback`,
    },
  });

  if (error) {
    let errorMessage = "Signup failed";

    switch (error.message) {
      case "User already registered":
        errorMessage = "An account with this email already exists";
        break;
      case "Password too short":
        errorMessage = "Password must be at least 8 characters";
        break;
      case "Invalid email":
        errorMessage = "Please enter a valid email address";
        break;
      case "Email is already confirmed":
        errorMessage = "Email is already confirmed. Please try logging in.";
        break;
      default:
        errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }

  // If email confirmation is disabled Supabase returns a session, which
  // lets the client establish a browser session immediately.
  return {
    success: true,
    message: "Signup successful!",
    user: data.user,
    session: data.session,
  };
};