import { NextResponse } from 'next/server';
import { Client } from "@gradio/client";

// Vercel zaman aşımı limiti (Modal'ın 3D'yi üretmesini beklemek için)
export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "Görsel linki eksik." }, { status: 400 });
    }

    console.log("[HERMES AI] Modal TripoSR sunucusuna bağlanılıyor...");
    
    // DİKKAT: Terminalden aldığın kendi Modal linkini buraya yapıştır!
    // (Aşağıdaki link örnek olarak senin daha önceki çıktına göre yazıldı, kontrol et)
    const MODAL_URL = "https://yagizberk--hermes-triposr-gradio.modal.run"; 
    
    // 1. Modal'a bağlan ve isteği at
    const client = await Client.connect(MODAL_URL);
    
    console.log("[HERMES AI] Görsel işleniyor, 3D model üretimi başladı...");
    
    // Gradio "predict" fonksiyonunu çağırıyoruz
    const result: any = await client.predict("/generate_3d", { 		
        image: imageUrl, 
    });

    // 2. Modal'ın ürettiği GLB dosyasının URL'sini al
    const glbUrl = result.data[0].url; 
    
    // 3. Frontend dosyayı indirebilsin diye Buffer'a çeviriyoruz
    const glbRes = await fetch(glbUrl);
    if (!glbRes.ok) throw new Error("Modal'dan GLB dosyası indirilemedi.");
    const glbBuffer = await glbRes.arrayBuffer();

    console.log("[HERMES AI] 3D Model başarıyla teslim edildi!");

    // 4. Frontend'e doğrudan 3D model dosyasını (Binary) gönderiyoruz
    return new NextResponse(glbBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Cache-Control': 'public, s-maxage=86400',
        'Content-Disposition': 'inline; filename="hermes-3d-model.glb"'
      }
    });

  } catch (error: any) {
    console.error("[HERMES AI FATAL ERROR]:", error);
    return NextResponse.json({ error: error.message || "3D üretim sistemi yanıt vermiyor." }, { status: 500 });
  }
}