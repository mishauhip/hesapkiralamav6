import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: "Hesap ID gereklidir" },
        { status: 400 }
      );
    }

    // Supabase istemcisini oluştur (server-side)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: "Service role key bulunamadı" },
        { status: 500 }
      );
    }

    // Supabase admin istemcisini oluştur
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Hesabın durumunu kontrol et
    const { data: account, error: accountError } = await supabaseAdmin
      .from("game_accounts")
      .select("is_available, assigned_to")
      .eq("id", accountId)
      .single();

    if (accountError) {
      console.error("API: Hesap bilgileri alınırken hata:", accountError);
      return NextResponse.json(
        { error: "Hesap bilgileri alınırken bir hata oluştu" },
        { status: 500 }
      );
    }

    if (account.is_available) {
      return NextResponse.json(
        { error: "Bu hesap zaten müsait durumda" },
        { status: 400 }
      );
    }

    // Hesabı güncelle
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from("game_accounts")
      .update({
        is_available: true,
        assigned_to: null,
      })
      .eq("id", accountId)
      .select();

    if (updateError) {
      console.error("API: Hesap güncelleme hatası:", updateError);
      return NextResponse.json(
        { error: "Hesap serbest bırakılırken bir hata oluştu" },
        { status: 500 }
      );
    }

    // Kiralama kaydını güncelle
    const { data: assignmentData, error: assignmentError } = await supabaseAdmin
      .from("account_assignments")
      .update({
        returned_at: new Date().toISOString(),
        // Hesap admin tarafından serbest bırakıldığında lig bilgilerini değiştirmiyoruz
        // Böylece hesabın mevcut lig bilgileri korunur
      })
      .eq("account_id", accountId)
      .is("returned_at", null)
      .eq("user_id", account.assigned_to)
      .select();

    if (assignmentError) {
      console.error("API: Kiralama kaydı güncelleme hatası:", assignmentError);
      return NextResponse.json(
        { error: "Kiralama kaydı güncellenirken bir hata oluştu" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Hesap başarıyla serbest bırakıldı",
      account: updateData[0] || null,
    });
  } catch (error) {
    console.error("API: Genel hata:", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
