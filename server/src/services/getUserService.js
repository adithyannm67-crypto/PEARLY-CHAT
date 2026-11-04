import supabase from "../config/supabase.js";
export default async function createConnectionRequest(requestData) {
    const { data, error } = await supabase
        .from("connection_requests")
        .insert({
            ...requestData
        })

     

    if (error) {
        throw error;
    }

    return data;
}

