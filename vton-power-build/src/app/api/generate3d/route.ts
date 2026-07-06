import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();
    
    // Senin NVIDIA API anahtarın (Güvenlik için sadece sunucuda tutuyoruz)
    const apiKey = "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";

    // NVIDIA Image-to-3D (Microsoft Trellis) API Parametreleri
    const payload = {
      image: imageBase64,
      slat_cfg_scale: 3,
      ss_cfg_scale: 7.5,
      slat_sampling_steps: 25,
      ss_sampling_steps: 25,
      seed: 0
    };

    const response = await fetch("https://ai.api.nvidia.com/v1/genai/microsoft/trellis", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errBody = await response.text();
      return NextResponse.json({ error: `NVIDIA Hatası: ${errBody}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("3D API Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}