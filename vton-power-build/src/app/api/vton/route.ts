import { NextResponse } from "next/server";
import { Client } from "@gradio/client";

export async function POST(request: Request) {
  try {
    const { personImageUrl, garmentImageUrl } = await request.json();

    if (!personImageUrl || !garmentImageUrl) {
      return NextResponse.json({ error: "Eksik parametre!" }, { status: 400 });
    }

    console.log("🖥️ [SERVER VTON] Hugging Face ile güvenli sunucu bağlantısı kuruluyor...");

    const fetchAsBlob = async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Görsel sunucuya çekilemedi: " + url);
      return await res.blob();
    };

    const humanBlob = await fetchAsBlob(personImageUrl);
    const clothBlob = await fetchAsBlob(garmentImageUrl);

    const token = process.env.HF_TOKEN || process.env.NEXT_PUBLIC_HF_TOKEN;

    const app = await Client.connect("yisol/IDM-VTON", {
      hf_token: token,
    } as any);

    // 🔥 Katı Kimlik Koruması ve Anti-Beautification
    const result: any = await app.predict("/tryon", [
      { "background": humanBlob, "layers": [], "composite": null },
      clothBlob,
      "photorealistic fashion garment, exact original facial features, unchanged bone structure, natural skin texture, unedited micro-expressions, zero beautification",
      true, false, 30, 42,
    ]);

    let finalImageUrl = "";
    if (result?.data && Array.isArray(result.data)) {
      finalImageUrl = result.data[0]?.url || result.data[0];
    } else if (Array.isArray(result)) {
      finalImageUrl = result[0]?.url || result[0];
    }

    if (!finalImageUrl || finalImageUrl === "undefined") {
      return NextResponse.json({ error: "Yayındaki AI motoru görsel üretemedi." }, { status: 500 });
    }

    console.log("🖥️ [SERVER VTON] Görsel üretildi, sunucuya indiriliyor: ", finalImageUrl);

    // 🔥 CORS ÇÖZÜMÜ: Görseli sunucuda indirip Base64'e çeviriyoruz
    const imageResponse = await fetch(finalImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Hugging Face'ten görsel indirilemedi! Durum: ${imageResponse.status}`);
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const base64String = `data:${mimeType};base64,${buffer.toString('base64')}`;

    console.log("🖥️ [SERVER VTON] Görsel başarıyla Base64 yapıldı ve tarayıcıya yollanıyor!");
    
    // Tarayıcıya URL değil, doğrudan Base64 metnini veriyoruz
    return NextResponse.json({ resultImageBase64: base64String });

  } catch (error: any) {
    console.error("💥 [SERVER VTON HATA]:", error);
    return NextResponse.json({ error: error.message || "Sunucu içi VTON hatası" }, { status: 500 });
  }
}