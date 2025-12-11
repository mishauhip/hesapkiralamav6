// app/api/admin/accounts/[id]/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ← Promise!
) {
  const { id: accountId } = await params; // ← await

  if (!accountId) {
    return NextResponse.json(
      { error: "Hesap ID'si gereklidir" },
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

  /* Hesabın uygunluk durumunu kontrol et */
  const { data: account, error: accountError } = await supabase
    .from("game_accounts")
    .select("is_available")
    .eq("id", accountId)
    .single();

  if (accountError) {
    return NextResponse.json(
      { error: "Hesap bilgileri alınırken bir hata oluştu" },
      { status: 500 }
    );
  }

  if (!account?.is_available) {
    return NextResponse.json(
      {
        error:
          "Bu hesap şu anda kiralanmış durumda. Önce hesabın iade edilmesi gerekiyor.",
      },
      { status: 400 }
    );
  }

  /* Kiralama geçmişini sil */
  const { error: historyError } = await supabase
    .from("account_assignments")
    .delete()
    .eq("account_id", accountId);

  if (historyError) {
    return NextResponse.json(
      { error: "Kiralama geçmişi silinirken bir hata oluştu" },
      { status: 500 }
    );
  }

  /* Hesabı sil */
  const { error: deleteError } = await supabase
    .from("game_accounts")
    .delete()
    .eq("id", accountId);

  if (deleteError) {
    return NextResponse.json(
      { error: "Hesap silinirken bir hata oluştu" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
