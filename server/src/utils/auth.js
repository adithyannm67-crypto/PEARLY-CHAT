import supabase from "#config/supabase.js";

// Verify JWT token from Supabase
async function verifyAuthToken(token) {
  if (!token) {
    return { user: null, error: "No token provided" };
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error) {
    return { user: null, error: error.message };
  }

  return { user: data.user, error: null };
}

// Check if user has profile
async function checkUserProfileExists(userId) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned, that's OK
      throw error;
    }

    return { exists: !!data, error: error?.message || null };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

// Generate sign-in link
async function generateSignInLink(email, redirectTo) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) throw error;
  return data;
}

module.exports = {
  verifyAuthToken,
  checkUserProfileExists,
  generateSignInLink,
};