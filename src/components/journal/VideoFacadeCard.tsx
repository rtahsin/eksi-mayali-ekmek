"use client";

import React, { useState} from "react";
import { JournalVideo} from "@/types/journal";
import { Play} from "lucide-react";

interface VideoFacadeCardProps {
 video: JournalVideo;
}

export function VideoFacadeCard({ video}: VideoFacadeCardProps) {
 const [isPlaying, setIsPlaying] = useState<boolean>(false);

 return (
 <figure className="my-10 space-y-3">
 <div className="relative aspect-video w-full bg-[#1A140F] border border-surface-border overflow-hidden rounded-xl">
 {isPlaying && video.youtubeId ? (
 <iframe
 src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&modestbranding=1&rel=0&color=white`}
 title={video.title}
 className="w-full h-full border-0"
 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
 allowFullScreen
 />
 ) : (
 <div
 onClick={() => setIsPlaying(true)}
 className="group cursor-pointer relative w-full h-full flex items-center justify-center"
 >
 <img
 src={video.posterUrl}
 alt={video.title}
 className="absolute inset-0 w-full h-full object-cover filter brightness-85 group-hover:scale-101 transition-transform duration-500"
 />
 <div className="absolute inset-0 bg-black/40 group-hover:bg-black/25 transition-colors" />

 {/* Quiet Play Button */}
 <div className="relative z-10 w-14 h-14 rounded-full bg-artisan-terracotta border border-[#D2B48C] text-foreground flex items-center justify-center shadow-2xl transition-transform group-hover:scale-108">
 <Play className="w-5 h-5 fill-current ml-0.5" />
 </div>

 <span className="absolute bottom-3 right-3 text-[11px] font-mono text-foreground bg-black/70 px-2.5 py-0.5 rounded border border-white/10">
 {video.duration}
 </span>
 </div>
 )}
 </div>

 <figcaption className="text-xs text-foreground/80/70 font-serif italic text-left">
 <strong className="font-semibold text-foreground">{video.title}: </strong>
 {video.caption}
 </figcaption>
 </figure>
 );
}
