import { NextResponse } from 'next/server';

// HERMES SOFTWARE A.Ş. - STRICT PRODUCTION CONFIGURATION
export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

const HF_API_KEY = process.env.HF_API_KEY;
const MODEL_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-fast-3d";
const MAX_RETRIES = 3;

export async function POST(req: Request) {
  try {
    // 1. API ANAHTARI KONTROLÜ
    if (!HF_API_KEY) {
      console.error("[HERMES AI FATAL] HF_API_KEY Vercel Environment Variables içine eklenmemiş!");
      return NextResponse.json({ error: "Sunucu yapılandırma hatası: API anahtarı eksik." }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "Görsel linki eksik." }, { status: 400 });
    }

    // 2. GÖRSELİ SUPABASE'DEN İNDİR
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error("Kaynak görsel (Supabase) okunamadı.");
    
    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. DOĞRUDAN HUGGING FACE BAĞLANTISI (PROXY YOK)
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      attempt++;
      try {
        console.log(`[HERMES AI] HF Doğrudan Bağlantı Deneniyor... Deneme: ${attempt}`);
        
        const hfRes = await fetch(MODEL_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${HF_API_KEY}`,
            "Content-Type": "image/png"
          },
          body: buffer
        });

        // BAŞARILI DURUM: GLB Modelini Frontend'e Gönder
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

        const errText = await hfRes.text();
        let errData;
        try { errData = JSON.parse(errText); } catch (e) { errData = { error: errText }; }

        // MODEL YÜKLENİYOR (503 Cold-Start)
        if (hfRes.status === 503) {
          const estimatedTime = errData.estimated_time || 15;
          if (attempt >= MAX_RETRIES) throw new Error("Model uyandırılamadı.");
          
          console.warn(`[HERMES AI] Model yükleniyor. Bekleme: ${estimatedTime}sn`);
          await new Promise(resolve => setTimeout(resolve, estimatedTime * 1000));
          continue;
        }

        throw new Error(errData.error || `Hugging Face Hatası (HTTP ${hfRes.status})`);

      } catch (hfError: any) {
        if (attempt >= MAX_RETRIES) throw hfError;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return NextResponse.json({ error: "Sistem yoğunluğu nedeniyle 3D üretim tamamlanamadı." }, { status: 500 });

  } catch (error: any) {
    console.error("[HERMES SOFTWARE A.Ş. FATAL ERROR]:", error);
    return NextResponse.json({ error: error.message || "Bilinmeyen Sunucu Hatası" }, { status: 500 });
  }
}