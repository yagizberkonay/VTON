import { NextResponse } from "next/server";
import { scrapeProductImage } from "@/lib/scraper-engine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "Lütfen bir link girin." }, { status: 400 });
    }

    const imageUrl = await scrapeProductImage(url);

    if (!imageUrl) {
      return NextResponse.json({ error: "Bu linkten ürün görseli çekilemedi." }, { status: 404 });
    }

    // Başarılıysa görselin linkini frontend'e yolluyoruz
    return NextResponse.json({ success: true, imageUrl });
  } catch (error) {
    return NextResponse.json({ error: "Sunucu hatası oluştu." }, { status: 500 });
  }
}