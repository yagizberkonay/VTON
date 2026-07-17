import { NextResponse } from "next/server";
import { Client } from "@gradio/client";

export async function POST(request: Request) {
  try {
    const { personImageUrl, garmentImageUrl } = await request.json();

    if (!personImageUrl || !garmentImageUrl) {
      return NextResponse.json({ error: "Eksik parametre!" }, { status: 400 });
    }

    console.log("🖥️ [SERVER VTON] Hugging Face ile güvenli sunucu bağlantısı kuruluyor...");

    // Token artık SUNUCUDA çalışıyor, NEXT_PUBLIC_ olmasına gerek yok!
    // Vercel panelinde HF_TOKEN olarak kalabilir, garanti olsun diye ikisine de bakarız.
    const token = process.env.HF_TOKEN || process.env.NEXT_PUBLIC_HF_TOKEN;

    const app = await Client.connect("yisol/IDM-VTON", {
      hf_token: token,
    } as any);

    const result: any = await app.predict("/tryon", [
      { "background": personImageUrl, "layers": [], "composite": null },
      garmentImageUrl,
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