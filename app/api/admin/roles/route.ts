import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getUserRole } from "@/utils/supabase/queries";

export const dynamic = "force-dynamic";

// Helper to check if role exists in DB or is one of the defaults
const checkAdmin = async () => {
    const role = await getUserRole();
    return role === "admin";
};

export async function GET(req: NextRequest) {
  try {
    if (!await checkAdmin()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("roles")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
        // If table doesn't exist yet, return defaults for UI stability
        if (error.code === 'PGRST116' || error.message.includes('not found')) {
            return NextResponse.json({ 
                roles: [
                    { name: 'admin', description: 'Full access' },
                    { name: 'editor', description: 'Can edit' },
                    { name: 'viewer', description: 'Read only' }
                ],
                warning: "Roles table not found. Please run the SQL in supabase_schema.sql"
            });
        }
        throw error;
    }

    return NextResponse.json({ roles: data });
  } catch (error: any) {
    console.error("Roles GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!await checkAdmin()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, description, permissions } = await req.json();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("roles")
      .upsert({ name, description, permissions }, { onConflict: "name" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, role: data });
  } catch (error: any) {
    console.error("Roles POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
    try {
      if (!await checkAdmin()) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
  
      const { searchParams } = new URL(req.url);
      const id = searchParams.get("id");
      if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });
  
      const supabase = getServiceSupabase();
      const { error } = await supabase.from("roles").delete().eq("id", id);
  
      if (error) throw error;
  
      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error("Roles DELETE error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
