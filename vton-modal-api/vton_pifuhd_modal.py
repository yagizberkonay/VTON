import modal

app = modal.App("hermes-pifuhd-api")

def download_pifuhd_model():
    import urllib.request
    import os
    print("[HERMES PIFUHD] Meta AI PIFuHD model ağırlıkları indiriliyor...")
    os.makedirs("/root/pifuhd/checkpoints", exist_ok=True)
    url = "https://dl.fbaipublicfiles.com/pifuhd/checkpoints/pifuhd.pt"
    urllib.request.urlretrieve(url, "/root/pifuhd/checkpoints/pifuhd.pt")
    print("[HERMES PIFUHD] Ağırlıklar başarıyla kaydedildi.")

pifuhd_image = (
    modal.Image.from_registry("nvidia/cuda:12.1.1-devel-ubuntu22.04", add_python="3.10")
    .apt_install("git", "libgl1-mesa-glx", "libglib2.0-0", "wget")
    .pip_install(
        "torch==2.1.2+cu121", 
        "torchvision==0.16.2+cu121",
        extra_options="--index-url https://download.pytorch.org/whl/cu121"
    )
    .pip_install(
        "numpy==1.23.5",
        "Pillow",
        "requests",
        "fastapi",
        "opencv-python",
        "scikit-image",
        "matplotlib",
        "onnxruntime",
        "rembg"
    )
    .run_commands("git clone https://github.com/facebookresearch/pifuhd.git /root/pifuhd")
    .run_function(download_pifuhd_model)
)

with pifuhd_image.imports():
    import torch
    import requests
    import io
    import base64
    import gc
    import os
    import subprocess
    import glob
    from PIL import Image
    from fastapi import Response
    from fastapi.responses import JSONResponse
    from rembg import remove

@app.cls(image=pifuhd_image, gpu="A10G", timeout=600)
class PIFuHDGenerator:
    
    @modal.enter()
    def load_model(self):
        print("[HERMES PIFUHD] Anatomi motoru aktif. GPU hazır.")

    @modal.fastapi_endpoint(method="POST")
    def generate_3d(self, item: dict):
        try:
            image_url = item.get("image_url")
            if not image_url:
                return JSONResponse(status_code=400, content={"error": "image_url eksik."})
            
            print("[HERMES PIFUHD] VTON Görseli İşleniyor...")
            
            # --- ÇÖZÜM: Base64 ve URL Ayrımı ---
            if image_url.startswith("data:image"):
                # Gelen veri Base64 ise direkt işliyoruz
                print("[HERMES PIFUHD] Base64 formatı algılandı, resme çevriliyor...")
                header, encoded = image_url.split(",", 1)
                img_data = base64.b64decode(encoded)
                input_image = Image.open(io.BytesIO(img_data)).convert("RGBA")
            else:
                # Gelen veri standart bir HTTP linki ise indiriyoruz
                print("[HERMES PIFUHD] HTTP Linki algılandı, indiriliyor...")
                res = requests.get(image_url, timeout=30)
                res.raise_for_status()
                input_image = Image.open(io.BytesIO(res.content)).convert("RGBA")
            
            no_bg_image = remove(input_image)
            
            bg = Image.new("RGBA", no_bg_image.size, (0, 0, 0, 255))
            final_image = Image.alpha_composite(bg, no_bg_image).convert("RGB")
            
            input_dir = "/tmp/pifuhd_input"
            output_dir = "/tmp/pifuhd_output"
            os.makedirs(input_dir, exist_ok=True)
            os.makedirs(output_dir, exist_ok=True)
            
            input_path = os.path.join(input_dir, "test_image.png")
            rect_path = os.path.join(input_dir, "test_image_rect.txt")
            final_image.save(input_path)
            
            # Alpha Filtresi (Gerçek Beden Algılama)
            alpha = no_bg_image.split()[-1]
            bbox = alpha.point(lambda p: 255 if p > 50 else 0).getbbox()
            
            if bbox:
                left, upper, right, lower = bbox
                w = right - left
                h = lower - upper
                
                center_x = left + w // 2
                center_y = upper + h // 2
                
                b_size = int(max(w, h) * 1.20)
                
                x1 = center_x - (b_size // 2)
                y1 = center_y - (b_size // 2)
                
                with open(rect_path, "w") as rect_file:
                    rect_file.write(f"{x1} {y1} {b_size} {b_size}\n")
            else:
                with open(rect_path, "w") as rect_file:
                    rect_file.write(f"0 0 {final_image.width} {final_image.height}\n")
            
            print("[HERMES PIFUHD] Sınır kutusu başarıyla ayarlandı. Motor çalıştırılıyor...")
            
            cmd = [
                "python", "-m", "apps.simple_test",
                "-r", "256",
                "--use_rect",
                "-i", input_dir,
                "-o", output_dir
            ]
            subprocess.run(cmd, check=True, cwd="/root/pifuhd")
            
            obj_files = glob.glob(f"{output_dir}/**/*.obj", recursive=True)
            if not obj_files:
                return JSONResponse(status_code=500, content={"error": "OBJ dosyası oluşturulamadı."})
                
            latest_obj = max(obj_files, key=os.path.getctime)
            
            with open(latest_obj, "rb") as f:
                obj_bytes = f.read()
                
            os.remove(input_path)
            os.remove(rect_path)
            os.remove(latest_obj)
            torch.cuda.empty_cache()
            gc.collect()
            
            print("[HERMES PIFUHD] Saf 3D Heykel başarıyla gönderiliyor.")
            return Response(content=obj_bytes, media_type="text/plain")
            
        except subprocess.CalledProcessError as e:
            print(f"[HERMES PIFUHD FATAL ERROR - Subprocess]: {e}")
            return JSONResponse(status_code=500, content={"error": "PIFuHD motoru çöktü."})
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"[HERMES PIFUHD FATAL ERROR]:\n{error_details}")
            return JSONResponse(status_code=500, content={"error": str(e)})