import { NextResponse } from 'next/server';

// VERCEL 60 SANİYE LİMİTİ (1GB RAM NODE.JS SUNUCUSU)
export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

const HF_API_KEY = process.env.HF_API_KEY;

// KORUMA 1: ÇİFT YÖNLÜ ROTA MİMARİSİ (AUTO-FAILOVER)
const DIRECT_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-fast-3d";
const PROXY_URL = `https://corsproxy.io/?${encodeURIComponent(DIRECT_URL)}`;

const MAX_RETRIES = 3;

export async function POST(req: Request) {
  try {
    if (!HF_API_KEY) return NextResponse.json({ error: "API anahtarı eksik." }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { imageUrl } = body;

    if (!imageUrl) return NextResponse.json({ error: "Görsel linki eksik." }, { status: 400 });

    // 1. Supabase'den Görseli İndir (Node.js Buffer)
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error("Kaynak görsel okunamadı.");
    
    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Üretim Döngüsü
    let attempt = 0;
    let currentUrl = DIRECT_URL; // Önce doğrudan rotayı dene

    while (attempt < MAX_RETRIES) {
      attempt++;
      try {
        const hfRes = await fetch(currentUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${HF_API_KEY}`,
            "Content-Type": "image/png"
          },
          body: buffer
        });

        // a) Başarılı GLB Üretimi
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

        // b) Model Yükleniyor (Cold-start 503 Hatası)
        if (hfRes.status === 503) {
          const estimatedTime = errData.estimated_time || 15;
          if (attempt >= MAX_RETRIES) throw new Error("Model uyandırılamadı.");
          
          console.warn(`[HERMES AI] Model yükleniyor. Deneme ${attempt}. Bekleniyor: ${estimatedTime}s`);
          await new Promise(resolve => setTimeout(resolve, estimatedTime * 1000));
          continue;
        }

        throw new Error(errData.error || `Hugging Face Hatası (HTTP ${hfRes.status})`);

      } catch (hfError: any) {
        
        // KORUMA 2: DNS ENGELİ TESPİTİ VE FAILOVER (YEDEK TÜNEL)
        const isDnsError = hfError.message?.includes('fetch failed') || hfError.message?.includes('ENOTFOUND');
        
        if (isDnsError && currentUrl === DIRECT_URL) {
          console.warn(`[HERMES AI WARN] Ağ/DNS Engeli Tespit Edildi! İstek proxy tüneline devrediliyor (Failover)...`);
          currentUrl = PROXY_URL; // Rotayı anında değiştir
          attempt--; // Kullanıcının hakkını yakma, aynı denemeyi proxy ile baştan yap
          continue; 
        }

        if (attempt >= MAX_RETRIES) throw hfError;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return NextResponse.json({ error: "Sistem yoğunluğu nedeniyle üretim tamamlanamadı." }, { status: 500 });

  } catch (error: any) {
    console.error("[HERMES AI API FATAL]:", error);
    return NextResponse.json({ error: error.message || "Bilinmeyen Sunucu Hatası" }, { status: 500 });
  }
}