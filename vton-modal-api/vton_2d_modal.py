import modal

app = modal.App("hermes-2d-vton")

vton_image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("git", "wget", "libgl1-mesa-glx", "libglib2.0-0")
    .pip_install(
        "torch==2.1.2", 
        "torchvision==0.16.2", 
        extra_options="--index-url https://download.pytorch.org/whl/cu121"
    )
    .pip_install(
        # İSYANKAR KÜTÜPHANELERİ SABİTLEDİK (NumPy ve HuggingFace Hub)
        "numpy==1.26.4",             
        "huggingface-hub==0.20.3",   
        
        # IDM-VTON Core
        "diffusers==0.25.1", 
        "transformers==4.38.2", 
        "accelerate==0.27.2", 
        "safetensors", 
        "opencv-python", 
        "pillow", 
        "fastapi",
        "einops",
        "omegaconf",
        "scipy"
    )
    .run_commands(
        "rm -rf /root/idm-vton",
        "git clone https://github.com/yisol/IDM-VTON.git /root/idm-vton"
    )
)

with vton_image.imports():
    import base64
    import io
    import os
    import subprocess
    import glob
    from PIL import Image
    from fastapi import Request, Response
    from fastapi.responses import JSONResponse

@app.cls(image=vton_image, gpu="A10G", timeout=600)
class IDMVtonEngine:
    
    @modal.enter()
    def setup(self):
        print("[HERMES 2D VTON] IDM-VTON Motoru Aktif. GPU Hazır.")
        # İhtiyaç duyulan klasörleri oluştur
        os.makedirs("/root/idm-vton/test/image", exist_ok=True)
        os.makedirs("/root/idm-vton/test/cloth", exist_ok=True)
        os.makedirs("/root/idm-vton/output", exist_ok=True)

    @modal.fastapi_endpoint(method="POST")
    async def generate(self, request: Request):
        try:
            data = await request.json()
            human_b64 = data.get("human_image")
            cloth_b64 = data.get("cloth_image")
            
            if not human_b64 or not cloth_b64:
                return JSONResponse(status_code=400, content={"error": "Eksik görsel."})

            print("[HERMES 2D VTON] Görseller alındı, işleniyor...")

            # Base64'leri resme çevir ve IDM-VTON klasörlerine kaydet
            human_data = base64.b64decode(human_b64.split(",", 1)[-1] if "," in human_b64 else human_b64)
            cloth_data = base64.b64decode(cloth_b64.split(",", 1)[-1] if "," in cloth_b64 else cloth_b64)
            
            Image.open(io.BytesIO(human_data)).convert("RGB").save("/root/idm-vton/test/image/human.png")
            Image.open(io.BytesIO(cloth_data)).convert("RGB").save("/root/idm-vton/test/cloth/cloth.png")

            # MİMARİ KORUMA: Anti-Beautification & Zero-Morphing Promptları
            # Yüzün orijinal yapısını korumak için yapay zekayı baskılıyoruz.
            positive_prompt = "photorealistic, raw photo, exact facial structure, unchanged face, original skin texture, neutral micro-expressions, identical bone structure"
            negative_prompt = "beautified, morphed, altered face, smoothed skin, different bone structure, generic ai face, changing identity, micro-expression changes, unrealistic proportions"

            print("[HERMES 2D VTON] Yüz Koruması (Anti-Beautification) Aktif. Motor tetikleniyor...")

            # IDM-VTON'un kendi inference scriptini özel promptlarla çalıştır
            cmd = [
                "python", "inference.py",
                "--image_dir", "/root/idm-vton/test/image",
                "--cloth_dir", "/root/idm-vton/test/cloth",
                "--output_dir", "/root/idm-vton/output",
                "--prompt", positive_prompt,
                "--negative_prompt", negative_prompt,
                "--num_inference_steps", "30",  # Kaliteyi artırmak için standart 20'den 30'a çıkardık
                "--guidance_scale", "2.5"       # Promptlara (özellikle yüz korumaya) itaati artırır
            ]
            
            subprocess.run(cmd, check=True, cwd="/root/idm-vton")

            # Üretilen resmi bul (output klasöründeki ilk png)
            output_files = glob.glob("/root/idm-vton/output/*.png")
            if not output_files:
                return JSONResponse(status_code=500, content={"error": "VTON motoru görsel üretemedi."})
                
            latest_image = max(output_files, key=os.path.getctime)
            
            # Resmi Base64 olarak geri döndür
            with open(latest_image, "rb") as img_file:
                encoded_string = base64.b64encode(img_file.read()).decode('utf-8')
                
            # Temizlik
            os.remove("/root/idm-vton/test/image/human.png")
            os.remove("/root/idm-vton/test/cloth/cloth.png")
            os.remove(latest_image)

            print("[HERMES 2D VTON] İşlem Başarılı! Sıfır-Morfing görsel gönderiliyor.")
            return JSONResponse(content={"image_url": f"data:image/png;base64,{encoded_string}"})

        except subprocess.CalledProcessError as e:
            print(f"[HERMES FATAL ERROR] Alt işlem çöktü: {e}")
            return JSONResponse(status_code=500, content={"error": "IDM-VTON Motoru Çöktü."})
        except Exception as e:
            import traceback
            print(f"[HERMES FATAL ERROR]\n{traceback.format_exc()}")
            return JSONResponse(status_code=500, content={"error": str(e)})