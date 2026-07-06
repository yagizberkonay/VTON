import { NextResponse } from 'next/server';

// 1. KORUMA: EDGE'DEN ÇIKIŞ VE GÜÇLENDİRME
// Edge komutunu sildik. Artık Vercel'in 1GB RAM'li ana sunucularını kullanacağız (GLB dosyası belleğe sığacak).
// Ayrıca Vercel'in 10 saniyelik zaman aşımı limitini, modelin rahat üretilmesi için 60 saniyeye çıkarıyoruz:
export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

const HF_API_KEY = process.env.HF_API_KEY;
const MODEL_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-fast-3d";
const MAX_RETRIES = 3;

export async function POST(req: Request) {
  try {
    if (!HF_API_KEY) {
      return NextResponse.json({ error: "Sunucu hatası: API anahtarı eksik." }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "Görsel linki eksik." }, { status: 400 });
    }

    // 2. Supabase'den Görseli İndir ve Standart Node.js Belleğine (Buffer) Al
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error("Kaynak görsel (Supabase) okunamadı.");
    
    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer); // Edge yerine standart Node.js bellek yönetimi (Hafıza dostudur)

    // 3. Hugging Face Üretim Döngüsü
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      attempt++;
      try {
        const hfRes = await fetch(MODEL_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${HF_API_KEY}`,
            "Content-Type": "image/png"
          },
          body: buffer
        });

        // a) Başarılı Yanıt (GLB Dosyası)
        if (hfRes.ok) {
          const glbBuffer = await hfRes.arrayBuffer();
          return new NextResponse(glbBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'model/gltf-binary',
              'Cache-Control': 'public, s-maxage=86400',
              'Content-Disposition': 'inline; filename="hermes-3d-model.glb"'
            }
          });
        }

        // b) Hata Analizi
        const errText = await hfRes.text();
        let errData;
        try { errData = JSON.parse(errText); } catch (e) { errData = { error: errText }; }

        // c) Model Yükleniyor (Cold-start 503 Uyku Modu)
        if (hfRes.status === 503) {
          const estimatedTime = errData.estimated_time || 15;
          if (attempt >= MAX_RETRIES) throw new Error("Hugging Face sunucuları çok yoğun, model uyanmadı.");
          
          console.warn(`[HERMES AI] Model yükleniyor. Deneme ${attempt}. Bekleniyor: ${estimatedTime}s`);
          await new Promise(resolve => setTimeout(resolve, estimatedTime * 1000));
          continue;
        }

        // HF kendi içinde patlarsa (Örn: resmi beğenmezse) hatayı yakala
        throw new Error(errData.error || `Hugging Face Hatası (HTTP ${hfRes.status})`);

      } catch (hfError: any) {
        if (attempt >= MAX_RETRIES) throw hfError;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return NextResponse.json({ error: "Sistem yoğunluğu nedeniyle üretim tamamlanamadı." }, { status: 500 });

  } catch (error: any) {
    console.error("[HERMES AI API FATAL]:", error);
    // Vercel'in gizli "internal error" mesajı yerine bizim gerçek hatamız görünsün
    return NextResponse.json({ error: error.message || "Bilinmeyen Sunucu Hatası" }, { status: 500 });
  }
}