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

  if (!role || !["ADMIN", "USER", "VIP"].includes(role)) {
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ← Promise bekleniyor
) {
  const { id: userId } = await params;

  if (!userId) {
    return NextResponse.json(
      { error: "Kullanıcı ID'si gereklidir" },
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

  const { data: rented, error: rentedErr } = await supabase
    .from("game_accounts")
    .select("id")
    .eq("assigned_to", userId);

  if (rentedErr) {
    return NextResponse.json(
      { error: "Kiralanmış hesaplar kontrol edilirken bir hata oluştu" },
      { status: 500 }
    );
  }

  if (rented && rented.length > 0) {
    return NextResponse.json(
      {
        error:
          "Bu kullanıcının kiraladığı hesaplar var. Önce bu hesapları iade etmelisiniz.",
      },
      { status: 400 }
    );
  }

  const { error: assignmentsErr } = await supabase
    .from("account_assignments")
    .delete()
    .eq("user_id", userId);

  if (assignmentsErr) {
    return NextResponse.json(
      { error: "Kullanıcının kiralama geçmişi silinirken bir hata oluştu" },
      { status: 500 }
    );
  }

  /* ------------------------------------------------------------ *
   * 5) users tablosundan sil                                     *
   * ------------------------------------------------------------ */
  const { error: userErr } = await supabase
    .from("users")
    .delete()
    .eq("id", userId);

  if (userErr) {
    return NextResponse.json(
      { error: "Kullanıcı silinirken bir hata oluştu" },
      { status: 500 }
    );
  }

  /* ------------------------------------------------------------ *
   * 6) Auth servisinden sil                                      *
   * ------------------------------------------------------------ */
  const { error: authErr } = await supabase.auth.admin.deleteUser(userId);

  if (authErr) {
    return NextResponse.json(
      { error: "Kullanıcı kimlik bilgileri silinirken bir hata oluştu" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
