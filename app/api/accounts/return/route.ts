import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();

    const {
      accountId,
      userId,
      returnLeague,
      returnFlexLeague,
      returnSoloLp,
      returnFlexLp,
    } = requestBody;

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

    // account_assignments tablosunun yapısını kontrol et
    const { data: tableInfo, error: tableError } = await supabaseAdmin
      .from("account_assignments")
      .select("*")
      .limit(1);

    if (tableError) {
      console.error("API: Tablo bilgisi alınırken hata:", tableError);
    } else {
      console.log("API: Tablo bilgisi:", tableInfo);
    }

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

    if (account.assigned_to !== userId) {
      return NextResponse.json(
        { error: "Bu hesap sizin tarafınızdan kiralanmamış" },
        { status: 403 }
      );
    }

    // 1. Hesabı güncelle
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from("game_accounts")
      .update({
        is_available: true,
        assigned_to: null,
        league: returnLeague,
        flex_league: returnFlexLeague,
        solo_lp: returnSoloLp,
        flex_lp: returnFlexLp,
      })
      .eq("id", accountId)
      .select();

    if (updateError) {
      console.error("API: Hesap güncelleme hatası:", updateError);
      return NextResponse.json(
        { error: "Hesap iade edilirken bir hata oluştu" },
        { status: 500 }
      );
    }

    // 2. Kiralama kaydını güncelle
    // Tablo yapısına göre alan adlarını ayarla
    const updateFields: any = {
      returned_at: new Date().toISOString(),
    };

    // Alan adlarını dinamik olarak belirle
    if (tableInfo && tableInfo.length > 0) {
      const fields = Object.keys(tableInfo[0]);

      if (fields.includes("league_at_return")) {
        updateFields.league_at_return = returnLeague;
      } else if (fields.includes("return_league")) {
        updateFields.return_league = returnLeague;
      }

      if (fields.includes("flex_league_at_return")) {
        updateFields.flex_league_at_return = returnFlexLeague;
      } else if (fields.includes("return_flex_league")) {
        updateFields.return_flex_league = returnFlexLeague;
      }

      if (fields.includes("solo_lp_at_return")) {
        updateFields.solo_lp_at_return = returnSoloLp;
      } else if (fields.includes("return_solo_lp")) {
        updateFields.return_solo_lp = returnSoloLp;
      }

      if (fields.includes("flex_lp_at_return")) {
        updateFields.flex_lp_at_return = returnFlexLp;
      } else if (fields.includes("return_flex_lp")) {
        updateFields.return_flex_lp = returnFlexLp;
      }
    } else {
      // Varsayılan alan adlarını kullan
      updateFields.league_at_return = returnLeague;
      updateFields.flex_league_at_return = returnFlexLeague;
      updateFields.solo_lp_at_return = returnSoloLp;
      updateFields.flex_lp_at_return = returnFlexLp;
    }

    const { data: assignmentData, error: assignmentError } = await supabaseAdmin
      .from("account_assignments")
      .update(updateFields)
      .eq("account_id", accountId)
      .is("returned_at", null)
      .eq("user_id", userId)
      .select();

    if (assignmentError) {
      console.error("API: Kiralama kaydı güncelleme hatası:", assignmentError);

      // Kiralama kaydını kontrol et
      const { data: checkAssignment, error: checkAssignmentError } =
        await supabaseAdmin
          .from("account_assignments")
          .select("*")
          .eq("account_id", accountId)
          .is("returned_at", null)
          .eq("user_id", userId);

      if (checkAssignmentError) {
        console.error(
          "API: Kiralama kaydı kontrol hatası:",
          checkAssignmentError
        );
      } else {
        console.log("API: Bulunan kiralama kayıtları:", checkAssignment);
      }

      return NextResponse.json(
        {
          error: "Kiralama kaydı güncellenirken bir hata oluştu",
          details: assignmentError.message,
          code: assignmentError.code,
        },
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
    }

    return NextResponse.json({
      success: true,
      message: "Hesap başarıyla iade edildi",
      account: updateData[0] || null,
    });
  } catch (error) {
    console.error("API: Genel hata:", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
