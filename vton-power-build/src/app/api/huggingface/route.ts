import { NextResponse } from 'next/server';

// VERCEL ÜRETİM ORTAMI (PRODUCTION) İÇİN EDGE RUNTIME
// Bu satır, Vercel üzerinde API'nin global uç sunucularda çalışmasını sağlar.
export const runtime = 'edge';

const HF_API_KEY = process.env.HF_API_KEY;
const MODEL_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-fast-3d";
const MAX_RETRIES = 3;

export async function POST(req: Request) {
  try {
    if (!HF_API_KEY) {
      return NextResponse.json({ error: "API anahtarı eksik." }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "Görsel linki eksik." }, { status: 400 });
    }

    // Supabase'den görseli indir
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error("Kaynak görsel okunamadı.");
    const arrayBuffer = await imgRes.arrayBuffer();

    // Üretim Döngüsü
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
          body: arrayBuffer
        });

        // Başarılı GLB Teslimatı
        if (hfRes.ok) {
          const glbBuffer = await hfRes.arrayBuffer();
          return new NextResponse(glbBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'model/gltf-binary',
              'Cache-Control': 'public, s-maxage=86400'
            }
          });
        }

        const errText = await hfRes.text();
        let errData;
        try { errData = JSON.parse(errText); } catch (e) { errData = { error: errText }; }

        // Model Cold-start (Uyku Modu) Yönetimi
        if (hfRes.status === 503) {
          const estimatedTime = errData.estimated_time || 15;
          if (attempt >= MAX_RETRIES) throw new Error("Model uyandırılamadı.");
          await new Promise(resolve => setTimeout(resolve, estimatedTime * 1000));
          continue;
        }

        throw new Error(errData.error || "Bilinmeyen Üretim Hatası");
      } catch (hfError: any) {
        if (attempt >= MAX_RETRIES) throw hfError;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    return NextResponse.json({ error: "Üretim tamamlanamadı." }, { status: 500 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}