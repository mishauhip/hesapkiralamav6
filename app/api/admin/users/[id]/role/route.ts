import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;
  
  if (!userId) {
    return NextResponse.json(
      { error: "Kullanıcı ID'si gereklidir" },
      { status: 400 }
    );
  }
  
  // Request body'den rol bilgisini al
  const { role } = await req.json();
  
  if (!role || !['ADMIN', 'USER', 'VIP'].includes(role)) {
    return NextResponse.json(
      { error: "Geçerli bir rol belirtilmelidir" },
      { status: 400 }
    );
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: "Supabase yapılandırması eksik" },
      { status: 500 }
    );
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Kullanıcının rolünü güncelle
  const { error: updateError } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId);
  
  if (updateError) {
    return NextResponse.json(
      { error: "Kullanıcı rolü güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
  
  return NextResponse.json({ success: true });
}
