import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    // Verify admin password
    if (action === "verify-password") {
      const { password } = await req.json();
      if (!password || typeof password !== "string" || password.length > 100) {
        return new Response(
          JSON.stringify({ error: "Invalid password" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Direct comparison with stored password
      const { data, error } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "admin_password")
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "Configuration error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const verified = data.value === password;
      return new Response(
        JSON.stringify({ verified }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all announcements (admin - include unpublished)
    if (action === "list-all") {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create announcement
    if (action === "create" && req.method === "POST") {
      const body = await req.json();
      const { title, description, banner_url, button_label, button_link, is_published } = body;

      if (!title || typeof title !== "string" || title.length > 200) {
        return new Response(
          JSON.stringify({ error: "Invalid title" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("announcements")
        .insert({
          title: title.trim(),
          description: description?.trim() || null,
          banner_url: banner_url || null,
          button_label: button_label?.trim() || null,
          button_link: button_link?.trim() || null,
          is_published: is_published ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update announcement
    if (action === "update" && req.method === "POST") {
      const body = await req.json();
      const { id, title, description, banner_url, button_label, button_link, is_published } = body;

      if (!id) {
        return new Response(
          JSON.stringify({ error: "Missing id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("announcements")
        .update({
          title: title?.trim(),
          description: description?.trim() || null,
          banner_url: banner_url || null,
          button_label: button_label?.trim() || null,
          button_link: button_link?.trim() || null,
          is_published: is_published ?? true,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete announcement
    if (action === "delete" && req.method === "POST") {
      const { id } = await req.json();
      if (!id) {
        return new Response(
          JSON.stringify({ error: "Missing id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upload banner
    if (action === "upload-banner" && req.method === "POST") {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      if (!file) {
        return new Response(
          JSON.stringify({ error: "No file provided" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const arrayBuffer = await file.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("announcement-banners")
        .upload(fileName, arrayBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("announcement-banners")
        .getPublicUrl(fileName);

      return new Response(
        JSON.stringify({ url: urlData.publicUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
