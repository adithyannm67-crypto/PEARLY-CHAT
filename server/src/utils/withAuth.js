import supabase from "#config/supabase.js";
import HttpError from "#utils/HttpError.js";
import getAccessToken from "#utils/getAccessToken.js";

export default async function withAuth(req) {
  const accessToken = getAccessToken(req);

  if (!accessToken) {
    throw new HttpError(401, "Authentication required");
  }

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data?.user) {
    throw new HttpError(401, "Invalid or expired session");
  }

  return { user: data.user, accessToken };
}
