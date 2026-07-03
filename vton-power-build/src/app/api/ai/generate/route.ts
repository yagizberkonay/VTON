import { NextResponse } from "next/server";
import { generateVTON } from "@/lib/ai-pipeline";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { personImage, garmentImage } = body;

    if (!personImage || !garmentImage) {
      return NextResponse.json({ error: "Eksik görsel." }, { status: 400 });
    }

    const resultUrl = await generateVTON(personImage, garmentImage);
    return NextResponse.json({ success: true, resultUrl });

  } catch (error: any) {
    // BURASI KRİTİK: Hatayı Object olmaktan çıkarıp saf String'e (Metne) çeviriyoruz.
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error("/// API ROUTE GERÇEK HATA /// ->", errorMessage);
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}