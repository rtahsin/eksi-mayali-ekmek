import React from "react";

interface VideoProps {
  src: string;
  title: string;
  caption?: string;
}

export function Video({ src, title, caption }: VideoProps) {
  const isEmbed = src.includes("youtube.com") || src.includes("youtu.be") || src.includes("vimeo.com");

  return (
    <figure className="my-8 rounded-xl overflow-hidden border border-[#3D342E] bg-[#1C1815]">
      <div className="relative aspect-video w-full overflow-hidden bg-black/60">
        {isEmbed ? (
          <iframe
            src={src}
            title={title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            src={src}
            controls
            title={title}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      {caption && (
        <figcaption className="p-3 text-center text-xs font-serif text-[#A89F91] border-t border-[#3D342E]/50">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
