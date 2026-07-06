import { NextResponse } from 'next/server';

// HERMES SOFTWARE A.Ş. - PRODUCTION SERVERLESS CONFIGURATION
export const maxDuration = 60; // 60 Saniye İşlem İzni
export const dynamic = 'force-dynamic';

const HF_API_KEY = process.env.HF_API_KEY;
const MODEL_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-fast-3d";
const MAX_RETRIES = 3;

export async function POST(req: Request) {
  try {
    if (!HF_API_KEY) {
      return NextResponse.json({ error: "Sunucu yapılandırma hatası: API anahtarı eksik." }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "İstek hatası: Görsel linki (imageUrl) eksik." }, { status: 400 });
    }

    // 1. GÖRSELİ SUPABASE'DEN İNDİRME (Node.js Buffer)
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      throw new Error(`Kaynak görsel okunamadı. Supabase HTTP Status: ${imgRes.status}`);
    }
    
    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. HUGGING FACE DOĞRUDAN ÜRETİM DÖNGÜSÜ (PROXY YOK)
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

        // BAŞARILI SONUÇ: GLB Binary Formatında Teslimat
        if (hfRes.ok) {
          const glbBuffer = await hfRes.arrayBuffer();
          return new NextResponse(glbBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'model/gltf-binary',
              'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
              'Content-Disposition': 'inline; filename="hermes-3d-model.glb"'
            }
          });
        }

        const errText = await hfRes.text();
        let errData;
        try { errData = JSON.parse(errText); } catch (e) { errData = { error: errText }; }

        // MODEL COLD-START (Uyku Modu - 503 Hatası) YÖNETİMİ
        if (hfRes.status === 503) {
          const estimatedTime = errData.estimated_time || 15;
          if (attempt >= MAX_RETRIES) {
            throw new Error(`Sunucular tam kapasitede. Model uyandırılamadı. Maksimum deneme aşıldı.`);
          }
          
          console.warn(`[HERMES SOFTWARE A.Ş.] Model yükleniyor. Deneme ${attempt}/${MAX_RETRIES}. Bekleme: ${estimatedTime}sn`);
          await new Promise(resolve => setTimeout(resolve, estimatedTime * 1000));
          continue;
        }

        // DİĞER API HATALARI
        throw new Error(errData.error || `Hugging Face API Hatası (HTTP ${hfRes.status})`);

      } catch (hfError: any) {
        if (attempt >= MAX_RETRIES) {
          throw hfError;
        }
        // Hata durumunda 2 saniye bekleyip yeniden dene
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return NextResponse.json({ error: "İşlem süresi aşıldı, üretim tamamlanamadı." }, { status: 500 });

  } catch (error: any) {
    console.error("[HERMES SOFTWARE A.Ş. FATAL ERROR]:", error);
    return NextResponse.json({ error: error.message || "Bilinmeyen Sunucu Hatası" }, { status: 500 });
  }
}