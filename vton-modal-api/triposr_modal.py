import modal

app = modal.App("hermes-triposr-api")

# --- ZIRH 1: TÜM MODELLERİ BUILD AŞAMASINDA GÖMME ---
def download_models_at_build_time():
    import os
    import urllib.request
    from huggingface_hub import snapshot_download
    
    print("[HERMES AI] TripoSR ağırlıkları Modal imajına gömülüyor...")
    snapshot_download("stabilityai/TripoSR")
    
    print("[HERMES AI] Arka plan silici (Rembg U2Net) imaja gömülüyor...")
    os.makedirs("/root/.u2net", exist_ok=True)
    urllib.request.urlretrieve(
        "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx", 
        "/root/.u2net/u2net.onnx"
    )

# --- ZIRH 2: EKSİKSİZ VE GELECEK KORUMALI SİSTEM BAĞIMLILIKLARI ---
triposr_image = (
    modal.Image.from_registry("nvidia/cuda:12.1.1-devel-ubuntu22.04", add_python="3.10")
    .apt_install(
        "git", "wget", "curl", "libgl1-mesa-glx", "libglib2.0-0", 
        "ninja-build", "build-essential", "libsm6", "libxext6", "libxrender-dev"
    )
    .env({
        "CC": "gcc", 
        "CXX": "g++",
        "TORCH_CUDA_ARCH_LIST": "8.6",
        "U2NET_HOME": "/root/.u2net",
        "HF_HUB_ENABLE_HF_TRANSFER": "1" 
    })
    .pip_install(
        "torch==2.1.2+cu121", 
        "torchvision==0.16.2+cu121",
        extra_options="--index-url https://download.pytorch.org/whl/cu121"
    )
    .pip_install(
        "Pillow", 
        "onnxruntime",         
        "rembg",               
        "transformers==4.38.2", 
        "accelerate",          
        "safetensors",         
        "trimesh", 
        "networkx",            
        "einops", 
        "omegaconf", 
        "requests", 
        "fastapi", 
        "python-multipart",    
        "huggingface_hub",
        "numpy<2.0.0",
        "scipy",
        "hf_transfer"
    )
    .pip_install("xformers==0.0.23.post1")
    .run_commands("pip install git+https://github.com/tatsy/torchmcubes.git")
    .run_commands("git clone https://github.com/VAST-AI-Research/TripoSR.git /root/TripoSR")
    .run_function(download_models_at_build_time)
)

with triposr_image.imports():
    import sys
    sys.path.append("/root/TripoSR")
    import torch
    import requests
    import io
    import tempfile
    import traceback
    import gc
    from PIL import Image, UnidentifiedImageError
    from tsr.system import TSR
    from tsr.utils import remove_background, resize_foreground
    from fastapi import Response
    from fastapi.responses import JSONResponse

@app.cls(image=triposr_image, gpu="A10G", timeout=600)
class TripoSRAPI:
    
    @modal.enter()
    def load_model(self):
        print("[HERMES AI] Model SSD'den GPU'ya yükleniyor...")
        torch.backends.cudnn.benchmark = True 
        
        self.model = TSR.from_pretrained(
            "stabilityai/TripoSR",
            config_name="config.yaml",
            weight_name="model.ckpt",
        )
        self.model.renderer.set_chunk_size(8192)
        self.model.to("cuda:0")
        print("[HERMES AI] Model GPU'ya yerleşti ve API üretime hazır!")

    @modal.fastapi_endpoint(method="POST")
    def generate(self, item: dict):
        try:
            image_url = item.get("image_url")
            if not image_url:
                return JSONResponse(status_code=400, content={"error": "image_url eksik."})
            
            print(f"[HERMES AI] Görsel indiriliyor: {image_url}")
            
            res = requests.get(image_url, timeout=30)
            res.raise_for_status() 
            
            try:
                img_data = io.BytesIO(res.content)
                image = Image.open(img_data)
                image.verify() 
                
                img_data.seek(0)
                image = Image.open(img_data)
                image.load() 
            except Exception:
                return JSONResponse(status_code=400, content={"error": "Gönderilen link geçerli bir görsel değil."})
            
            print("[HERMES AI] Arka plan temizleniyor...")
            image = remove_background(image, rembg_session=None)
            image = resize_foreground(image, 0.85)
            
            if image.mode == "RGBA":
                bg = Image.new("RGB", image.size, (255, 255, 255))
                bg.paste(image, mask=image.split()[3])
                image = bg
            else:
                image = image.convert("RGB")
            
            print("[HERMES AI] 3D Ağ (Mesh) üretiliyor...")
            
            torch.cuda.empty_cache()
            gc.collect()
            
            with torch.no_grad():
                scene_codes = self.model(image, device="cuda:0")
                # --- ÇÖZÜM BURADA: Renkli model istediğimizi (has_vertex_color=True) açıkça belirttik ---
                mesh = self.model.extract_mesh(scene_codes, has_vertex_color=True)[0]
            
            print("[HERMES AI] GLB dosyasına dönüştürülüyor...")
            out_path = tempfile.NamedTemporaryFile(suffix=".glb", delete=False).name
            mesh.export(out_path)
            
            with open(out_path, "rb") as f:
                glb_data = f.read()
                
            print("[HERMES AI] İşlem başarılı, model Vercel'e gönderiliyor!")
            
            del scene_codes, mesh, image
            torch.cuda.empty_cache()
            gc.collect()
            
            return Response(content=glb_data, media_type="model/gltf-binary")

        except Exception as e:
            error_details = traceback.format_exc()
            print(f"[HERMES FATAL ERROR] İşlem sırasında çökme yaşandı:\n{error_details}")
            return JSONResponse(status_code=500, content={"error": f"Modal Sunucu Hatası: {str(e)}"})