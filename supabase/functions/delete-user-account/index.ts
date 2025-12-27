import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to get their ID
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client to delete user
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Delete user's data first
    console.log("Deleting user data for:", user.id);
    
    // Get books uploaded by this user to delete related data first
    const { data: userBooks } = await supabaseAdmin
      .from("books")
      .select("id")
      .eq("uploaded_by", user.id);
    
    if (userBooks && userBooks.length > 0) {
      const bookIds = userBooks.map(b => b.id);
      
      // Delete all data related to these books
      await supabaseAdmin.from("reading_progress").delete().in("book_id", bookIds);
      await supabaseAdmin.from("favorites").delete().in("book_id", bookIds);
      await supabaseAdmin.from("book_annotations").delete().in("book_id", bookIds);
      await supabaseAdmin.from("book_bookmarks").delete().in("book_id", bookIds);
      await supabaseAdmin.from("book_reviews").delete().in("book_id", bookIds);
      await supabaseAdmin.from("reading_list_books").delete().in("book_id", bookIds);
      
      // Delete the books themselves
      await supabaseAdmin.from("books").delete().eq("uploaded_by", user.id);
    }
    
    // Delete user's own reading data
    await supabaseAdmin.from("reading_progress").delete().eq("user_id", user.id);
    await supabaseAdmin.from("favorites").delete().eq("user_id", user.id);
    await supabaseAdmin.from("book_annotations").delete().eq("user_id", user.id);
    await supabaseAdmin.from("book_bookmarks").delete().eq("user_id", user.id);
    await supabaseAdmin.from("book_reviews").delete().eq("user_id", user.id);
    await supabaseAdmin.from("notifications").delete().eq("user_id", user.id);
    await supabaseAdmin.from("user_settings").delete().eq("user_id", user.id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", user.id);
    await supabaseAdmin.from("activity_logs").delete().eq("user_id", user.id);
    await supabaseAdmin.from("push_subscriptions").delete().eq("user_id", user.id);
    await supabaseAdmin.from("content_reports").delete().eq("reporter_id", user.id);
    
    // Delete reading lists and their books
    const { data: lists } = await supabaseAdmin
      .from("reading_lists")
      .select("id")
      .eq("user_id", user.id);
    
    if (lists) {
      for (const list of lists) {
        await supabaseAdmin.from("reading_list_books").delete().eq("list_id", list.id);
        await supabaseAdmin.from("reading_list_followers").delete().eq("list_id", list.id);
      }
    }
    await supabaseAdmin.from("reading_lists").delete().eq("user_id", user.id);
    
    // Delete following relationships
    await supabaseAdmin.from("reading_list_followers").delete().eq("user_id", user.id);
    
    // Delete profile
    await supabaseAdmin.from("profiles").delete().eq("id", user.id);
    
    console.log("User data deleted successfully");

    // Delete user from auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      return new Response(
        JSON.stringify({ error: "Failed to delete user account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
