import { NextResponse } from 'next/server';

// VERCEL PRODUCTION CONFIGURATION
export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

const HF_API_KEY = process.env.HF_API_KEY;
const TARGET_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-fast-3d";

// GÜVENİLİR PROXY LİSTESİ (Cloudflare WAF engeline takılmayan alternatifler)
// İlk sıradaki doğrudan bağlantı başarısız olursa, sistem sırasıyla bu proxy'leri dener.
const ROUTING_URLS = [
  TARGET_URL, // 1. Rota: Doğrudan bağlantı denemesi
  `https://cors-anywhere.herokuapp.com/${TARGET_URL}`, // 2. Rota: Heroku tabanlı proxy
  `https://api.allorigins.win/raw?url=${encodeURIComponent(TARGET_URL)}` // 3. Rota: AllOrigins proxy
];

const MAX_RETRIES = 3; // Her rota için maksimum deneme sayısı

export async function POST(req: Request) {
  try {
    if (!HF_API_KEY) {
      console.error("[HERMES AI FATAL] HF_API_KEY ortam değişkeni bulunamadı.");
      return NextResponse.json({ error: "Sunucu yapılandırma hatası: API anahtarı eksik." }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "İstek hatası: Görsel linki eksik." }, { status: 400 });
    }

    // 1. Görseli Supabase'den Buffer Formatında İndirme
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      throw new Error(`Kaynak görsel okunamadı. Supabase HTTP Durumu: ${imgRes.status}`);
    }
    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Çoklu Rota (Multi-Route) Üretim Döngüsü
    // Sistem, çalışan bir bağlantı bulana kadar tanımlı rotaları sırayla test eder.
    for (let routeIndex = 0; routeIndex < ROUTING_URLS.length; routeIndex++) {
      const currentUrl = ROUTING_URLS[routeIndex];
      let attempt = 0;

      while (attempt < MAX_RETRIES) {
        attempt++;
        try {
          console.log(`[HERMES AI] Model üretimi deneniyor... Rota: ${routeIndex + 1}, Deneme: ${attempt}`);
          
          const hfRes = await fetch(currentUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${HF_API_KEY}`,
              "Content-Type": "image/png",
              "Accept": "*/*" // Proxy'lerin isteği reddetmemesi için genel kabul başlığı
            },
            body: buffer
          });

          // BAŞARILI DURUM: Model üretildi, GLB formatında istemciye iletiliyor
          if (hfRes.ok) {
             const glbBuffer = await hfRes.arrayBuffer();
             return new NextResponse(glbBuffer, {
                status: 200,
                headers: {
                  'Content-Type': 'model/gltf-binary',
                  'Cache-Control': 'public, s-maxage=86400',
                  'Content-Disposition': 'inline; filename="hermes-3d-model.glb"',
                  'Access-Control-Allow-Origin': '*' // CORS sorunlarını önlemek için eklendi
                }
             });
          }

          // Hata ayıklama için yanıtın metin halini okuyoruz
          const errText = await hfRes.text();
          let errData;
          try { errData = JSON.parse(errText); } catch (e) { errData = { error: errText }; }

          // MODEL YÜKLENİYOR (Cold-Start / 503) Durumu
          if (hfRes.status === 503) {
            const estimatedTime = errData.estimated_time || 15;
            if (attempt >= MAX_RETRIES) {
              console.warn(`[HERMES AI] Rota ${routeIndex + 1} üzerinde model uyandırılamadı. Bir sonraki rotaya geçiliyor...`);
              break; // Bu rotadaki deneme hakkı bitti, diğer rotaya (proxy'ye) geç.
            }
            console.warn(`[HERMES AI] Model uyku modunda. Bekleme süresi: ${estimatedTime}sn`);
            await new Promise(resolve => setTimeout(resolve, estimatedTime * 1000));
            continue; 
          }

          // Rota bazlı HTTP hatası alındığında döngüyü kır ve diğer rotayı dene
          console.error(`[HERMES AI] Rota ${routeIndex + 1} HTTP Hatası (${hfRes.status}):`, errData);
          break; 

        } catch (hfError: any) {
           // DNS Engeli (ENOTFOUND) veya Bağlantı Kopması durumunda yakalanacak blok
           console.error(`[HERMES AI] Rota ${routeIndex + 1} Bağlantı/Fetch Hatası:`, hfError.message);
           
           if (attempt >= MAX_RETRIES) {
             console.warn(`[HERMES AI] Rota ${routeIndex + 1} tamamen başarısız oldu.`);
             break; // Diğer rotaya geç
           }
           // Geçici ağ sorunlarına karşı kısa bir bekleme
           await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // Tüm rotalar denendi ve hiçbirinden başarılı sonuç alınamadıysa
    return NextResponse.json(
      { error: "Kritik Ağ Hatası: Tüm bağlantı rotaları denendi ancak 3D model sunucusuna ulaşılamadı. Lütfen daha sonra tekrar deneyin." }, 
      { status: 500 }
    );

  } catch (error: any) {
    console.error("[HERMES SOFTWARE A.Ş. FATAL ERROR]:", error);
    return NextResponse.json({ error: error.message || "Bilinmeyen Sunucu Hatası" }, { status: 500 });
  }
}