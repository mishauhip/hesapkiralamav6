import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // İstek gövdesini al
    const body = await request.json();
    const { email, password, role } = body;

    // Kullanıcı bilgilerini doğrula
    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, şifre ve rol gereklidir' },
        { status: 400 }
      );
    }

    // Supabase istemcisini oluştur (server-side)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Service role key bulunamadı' },
        { status: 500 }
      );
    }

    // Supabase admin istemcisini oluştur
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Kullanıcıyı oluştur
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    // Kullanıcı tablosuna rol bilgisini ekle
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        role,
      });

    if (dbError) {
      return NextResponse.json(
        { error: dbError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, user: authData.user });
  } catch (error) {
    console.error('Kullanıcı oluşturma hatası:', error);
    return NextResponse.json(
      { error: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
