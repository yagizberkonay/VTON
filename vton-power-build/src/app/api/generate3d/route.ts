import { NextResponse } from 'next/server';

export const maxDuration = 300; 
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "Görsel linki eksik." }, { status: 400 });
    }

    console.log("[HERMES AI] Modal API'sine istek atılıyor...");
    
    const MODAL_URL = "https://yagizberkonay--hermes-triposr-api-triposrapi-generate.modal.run"; 
    
    const res = await fetch(MODAL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageUrl })
    });

    if (!res.ok) {
        throw new Error(`Modal API Hatası: Sunucu yanıt vermedi (Kod: ${res.status})`);
    }

    const glbBuffer = await res.arrayBuffer();
    console.log("[HERMES AI] 3D Model başarıyla teslim alındı!");

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