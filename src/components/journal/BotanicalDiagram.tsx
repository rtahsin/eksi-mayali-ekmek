"use client";

import React from "react";
import { JournalDiagram} from "@/types/journal";

interface BotanicalDiagramProps {
 diagram: JournalDiagram;
}

export function BotanicalDiagram({ diagram}: BotanicalDiagramProps) {
 return (
 <figure className="my-12 py-8 border-y border-surface-border text-center space-y-4">
 {/* Archival Plate Label */}
 <div className="flex items-center justify-between text-left text-[11px] font-mono tracking-widest text-artisan-gold uppercase pb-2 border-b border-[#2A2017]">
 <span>EKMEKLAB ANATOMİ ARŞİVİ · LEVHA I</span>
 <span className="italic font-serif text-foreground/80/60">Özgün Gravür Çizimi</span>
 </div>

 {/* SVG Canvas on Warm Atmospheric Slate */}
 <div className="py-6 flex justify-center items-center">
 {diagram.type === "wheat_anatomy" && (
 <svg
 viewBox="0 0 620 280"
 className="w-full max-w-lg h-auto text-artisan-gold"
 fill="none"
 stroke="currentColor"
 strokeWidth="1.2"
 strokeLinecap="round"
 strokeLinejoin="round"
 >
 {/* Outer Grain Husk */}
 <path
 d="M130,140 C130,70 250,45 390,45 C490,45 525,100 525,140 C525,180 490,235 390,235 C250,235 130,210 130,140 Z"
 stroke="#D2B48C"
 strokeWidth="1.8"
 fill="#1C1611"
 />

 {/* Grain Crease */}
 <path
 d="M130,140 Q330,150 495,140"
 stroke="#8B5E3C"
 strokeWidth="1.8"
 strokeDasharray="3 3"
 />

 {/* Kepek Layer (Inner Hatching) */}
 <path
 d="M145,140 C145,80 255,58 385,58 C475,58 510,105 510,140 C510,175 475,222 385,222 C255,222 145,200 145,140 Z"
 stroke="#C49A6C"
 strokeWidth="1"
 strokeDasharray="2 3"
 fill="#221B14"
 />

 {/* Ruşeym (Germ Core) */}
 <path
 d="M150,140 C150,115 185,108 210,122 C230,135 230,152 210,165 C185,178 150,165 150,140 Z"
 fill="#8B5E3C"
 stroke="#F7EBD3"
 strokeWidth="1.5"
 />

 {/* Callouts & Labels in Bone/Gold */}
 <line x1="440" y1="52" x2="495" y2="24" stroke="#D2B48C" strokeWidth="0.8" />
 <circle cx="440" cy="52" r="2.5" fill="#D2B48C" />
 <text x="502" y="27" fill="#F7EBD3" fontSize="11" fontFamily="serif" fontWeight="bold">
 1. Kepek Katmanı (Fitik Asit & Lif)
 </text>

 <line x1="350" y1="110" x2="350" y2="18" stroke="#D2B48C" strokeWidth="0.8" />
 <circle cx="350" cy="110" r="2.5" fill="#D2B48C" />
 <text x="250" y="14" fill="#F7EBD3" fontSize="11" fontFamily="serif" fontWeight="bold">
 2. Endosperm (Gluten & Nişasta)
 </text>

 <line x1="190" y1="160" x2="190" y2="260" stroke="#D2B48C" strokeWidth="0.8" />
 <circle cx="190" cy="160" r="2.5" fill="#D2B48C" />
 <text x="95" y="268" fill="#F7EBD3" fontSize="11" fontFamily="serif" fontWeight="bold">
 3. Ruşeym (Demir, Çinko, Doğal Yağlar)
 </text>
 </svg>
 )}

 {diagram.type === "dairy_fermentation" && (
 <svg
 viewBox="0 0 600 240"
 className="w-full max-w-lg h-auto text-artisan-gold"
 fill="none"
 stroke="currentColor"
 strokeWidth="1.2"
 strokeLinecap="round"
 strokeLinejoin="round"
 >
 {/* Earthenware Jar */}
 <path
 d="M190,50 L410,50 L395,195 C375,215 225,215 205,195 Z"
 fill="#1C1611"
 stroke="#D2B48C"
 strokeWidth="1.8"
 />
 {/* Cream Line */}
 <path
 d="M195,60 Q300,70 405,60 L400,82 Q300,92 200,82 Z"
 fill="#2D2218"
 stroke="#C49A6C"
 />
 {/* Casein Micelles */}
 <circle cx="260" cy="130" r="16" stroke="#D2B48C" strokeDasharray="2 2" />
 <circle cx="330" cy="150" r="20" stroke="#D2B48C" strokeDasharray="2 2" />
 <circle cx="280" cy="175" r="14" stroke="#D2B48C" strokeDasharray="2 2" />

 {/* Labels */}
 <line x1="405" y1="70" x2="465" y2="70" stroke="#D2B48C" strokeWidth="0.8" />
 <circle cx="405" cy="70" r="2.5" fill="#D2B48C" />
 <text x="472" y="74" fill="#F7EBD3" fontSize="11" fontFamily="serif" fontWeight="bold">
 1. Doğal Mera Sütü Kaymağı
 </text>

 <line x1="350" y1="150" x2="455" y2="150" stroke="#D2B48C" strokeWidth="0.8" />
 <circle cx="350" cy="150" r="2.5" fill="#F7EBD3" />
 <text x="462" y="154" fill="#F7EBD3" fontSize="11" fontFamily="serif" fontWeight="bold">
 2. Kazein Pıhtılaşması
 </text>

 <line x1="240" y1="130" x2="105" y2="130" stroke="#D2B48C" strokeWidth="0.8" />
 <circle cx="240" cy="130" r="2.5" fill="#D2B48C" />
 <text x="20" y="134" fill="#F7EBD3" fontSize="11" fontFamily="serif" fontWeight="bold">
 3. Canlı Laktik Asit Florası
 </text>
 </svg>
 )}
 </div>

 {/* Caption */}
 <figcaption className="text-xs text-foreground/80/70 font-serif italic max-w-md mx-auto">
 {diagram.caption}
 </figcaption>
 </figure>
 );
}
