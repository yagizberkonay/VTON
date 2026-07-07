"use client";
import React, { useState } from "react";

export default function ImageUploader() {
  const [preview, setPreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <label className="font-bold text-lg uppercase">Zorunlu: Net Boy Fotoğrafı</label>
      
      <div className="relative w-full h-80 bg-white border-4 border-dashed border-black flex flex-col items-center justify-center p-6 text-center overflow-hidden cursor-pointer hover:bg-accent-yellow/10 transition-colors">
        
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
        />
        
        {preview ? (
          <img 
            src={preview} 
            alt="Dijital İkiz Önizleme" 
            className="w-full h-full object-cover border-3 border-black shadow-brutal"
          />
        ) : (
          <div className="flex flex-col items-center gap-4 pointer-events-none">
            <div className="w-16 h-16 bg-accent-blue text-white rounded-full border-3 border-black shadow-brutal flex items-center justify-center text-3xl font-black">
              +
            </div>
            <p className="font-bold text-xl uppercase tracking-wide">
              Buraya Tıkla veya Sürükle
            </p>
            <span className="bg-accent-yellow px-2 py-1 border-2 border-black font-bold text-sm transform -rotate-2">
              Tüm vücudun görünmeli!
            </span>
          </div>
        )}
      </div>
    </div>
  );
}