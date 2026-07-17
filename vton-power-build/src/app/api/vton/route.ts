import { NextResponse } from "next/server";
import { Client } from "@gradio/client";

export async function POST(request: Request) {
  try {
    const { personImageUrl, garmentImageUrl } = await request.json();

    if (!personImageUrl || !garmentImageUrl) {
      return NextResponse.json({ error: "Eksik parametre!" }, { status: 400 });
    }

    console.log("🖥️ [SERVER VTON] Hugging Face ile güvenli sunucu bağlantısı kuruluyor...");

    // 🔥 ÇÖZÜM: Sunucuda da tıpkı tarayıcıdaki gibi görselleri "Dosya (Blob)" formatına çevirmeliyiz!
    const fetchAsBlob = async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Görsel sunucuya çekilemedi: " + url);
      return await res.blob();
    };

    // Görselleri Gradio'nun anlayacağı formata paketliyoruz
    const humanBlob = await fetchAsBlob(personImageUrl);
    const clothBlob = await fetchAsBlob(garmentImageUrl);

    const token = process.env.HF_TOKEN || process.env.NEXT_PUBLIC_HF_TOKEN;

    const app = await Client.connect("yisol/IDM-VTON", {
      hf_token: token,
    } as any);

    // 🔥 Katı Kimlik Koruması: Anti-Beautification ve yapısal bozulmaları engelleyen kesin prompt
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

    console.log("🖥️ [SERVER VTON] Görsel başarıyla üretildi:", finalImageUrl);
    return NextResponse.json({ imageUrl: finalImageUrl });

  } catch (error: any) {
    console.error("💥 [SERVER VTON HATA]:", error);
    return NextResponse.json({ error: error.message || "Sunucu içi VTON hatası" }, { status: 500 });
  }
}