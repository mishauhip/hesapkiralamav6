import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requiresVIP } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const { accountId, userId } = await request.json();

    if (!accountId || !userId) {
      return NextResponse.json(
        { error: "Hesap ID ve Kullanıcı ID gereklidir" },
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
      .select(
        "is_available, league, flex_league, solo_lp, flex_lp, is_vip_only"
      )
      .eq("id", accountId)
      .single();

    if (accountError) {
      console.error("API: Hesap bilgileri alınırken hata:", accountError);
      return NextResponse.json(
        { error: "Hesap bilgileri alınırken bir hata oluştu" },
        { status: 500 }
      );
    }

    if (!account.is_available) {
      return NextResponse.json(
        { error: "Bu hesap zaten kiralanmış durumda" },
        { status: 400 }
      );
    }

    // Kullanıcının rolünü kontrol et
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("API: Kullanıcı bilgileri alınırken hata:", userError);
      return NextResponse.json(
        { error: "Kullanıcı bilgileri alınırken bir hata oluştu" },
        { status: 500 }
      );
    }

    // VIP gerektiren hesap için normal kullanıcı kontrolü
    if (account.is_vip_only && userData.role !== "VIP") {
      return NextResponse.json(
        { error: "Bu hesabı kiralamak için VIP üye olmanız gerekiyor" },
        { status: 403 }
      );
    }

    // 1. Hesabı güncelle
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from("game_accounts")
      .update({
        is_available: false,
        assigned_to: userId,
      })
      .eq("id", accountId)
      .select();

    if (updateError) {
      console.error("API: Hesap güncelleme hatası:", updateError);
      return NextResponse.json(
        { error: "Hesap kiralanırken bir hata oluştu" },
        { status: 500 }
      );
    }

    // 2. Kiralama kaydı oluştur
    const { data: assignmentData, error: assignmentError } = await supabaseAdmin
      .from("account_assignments")
      .insert({
        user_id: userId,
        account_id: accountId,
        assigned_at: new Date().toISOString(),
        // Başlangıç ligi olarak hesabın mevcut ligini kaydediyoruz
        initial_league: account.league,
        initial_flex_league: account.flex_league || "Unranked",
        initial_solo_lp: account.solo_lp || 0,
        initial_flex_lp: account.flex_lp || 0,
      })
      .select();

    if (assignmentError) {
      console.error("API: Kiralama kaydı hatası:", assignmentError);
      return NextResponse.json(
        { error: "Kiralama kaydı oluşturulurken bir hata oluştu" },
        { status: 500 }
      );
    }

    // 3. Hesabın güncel durumunu kontrol et
    const { data: checkData, error: checkError } = await supabaseAdmin
      .from("game_accounts")
      .select("*")
      .eq("id", accountId)
      .single();

    if (checkError) {
      console.error("API: Hesap kontrol hatası:", checkError);
    } else {
      console.log("API: Hesabın güncel durumu:", checkData);
    }

    return NextResponse.json({
      success: true,
      message: "Hesap başarıyla kiralandı",
      account: updateData[0] || null,
    });
  } catch (error) {
    console.error("API: Genel hata:", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
