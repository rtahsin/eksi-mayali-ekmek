import React from "react";
import Image from "next/image";

interface FigureProps {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}

export function Figure({ src, alt, caption, width = 800, height = 450 }: FigureProps) {
  return (
    <figure className="my-8 rounded-xl overflow-hidden border border-[#3D342E] bg-[#1C1815]">
      <div className="relative aspect-video w-full overflow-hidden bg-black/40">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="w-full h-full object-cover"
        />
      </div>
      {caption && (
        <figcaption className="p-3 text-center text-xs font-serif text-[#A89F91] border-t border-[#3D342E]/50">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
