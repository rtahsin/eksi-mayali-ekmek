import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

import { checkRateLimit } from "@/lib/security/rateLimiter";

// Ensure the Gemini API key is available
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("GEMINI_API_KEY is not defined in environment variables");
}

const ai = new GoogleGenAI({ apiKey });

export async function POST(req: Request) {
  try {
    // 0. Rate limiting to prevent Gemini API quota exhaustion
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const clientIp = forwarded ? forwarded.split(",")[0].trim() : realIp || "127.0.0.1";

    const rateLimit = checkRateLimit(`ai_parse_${clientIp}`, 15, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: `Çok fazla ayrıştırma isteği. Lütfen ${rateLimit.retryAfterSeconds} saniye bekleyin.` },
        { status: 429 }
      );
    }

    const { text } = await req.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ success: false, error: "Ayrıştırılacak metin gereklidir." }, { status: 400 });
    }

    if (text.length > 2500) {
      return NextResponse.json(
        { success: false, error: "Metin çok uzun. Maksimum 2500 karakter girilebilir." },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "AI API Key eksik. Lütfen ortam değişkenlerini yapılandırın." }, { status: 500 });
    }

    const sanitizedText = text.trim();

    const prompt = `
Aşağıdaki ham WhatsApp sipariş mesajını analiz et.
Bana Müşteri Adı, Telefonu, Semt, Mahalle, Adres Detayı, Sipariş Notu ve Ürün Listesini (ürün adı ve miktarı) içeren yapılandırılmış bir JSON dön.

Müşterinin mesajı:
"""
${sanitizedText}
"""
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { 
              type: Type.STRING,
              description: "Müşterinin tam adı veya mesajdan anlaşılan isim. Bilinmiyorsa boş bırak."
            },
            phone: { 
              type: Type.STRING,
              description: "Telefon numarası (örn: 05321234567). Bilinmiyorsa boş bırak."
            },
            district: { 
              type: Type.STRING,
              description: "İlçe / Semt (örn: Beylikdüzü, Avcılar). Bilinmiyorsa boş bırak."
            },
            neighborhood: { 
              type: Type.STRING,
              description: "Mahalle adı. Bilinmiyorsa boş bırak."
            },
            addressDetail: { 
              type: Type.STRING,
              description: "Sokak, bina, kapı no gibi açık adres detayları. Bilinmiyorsa boş bırak."
            },
            note: { 
              type: Type.STRING,
              description: "Müşterinin eklediği ekstra notlar (örn: dilimli olsun). Bilinmiyorsa boş bırak."
            },
            items: {
              type: Type.ARRAY,
              description: "Siparişte istenen ürünlerin listesi.",
              items: {
                type: Type.OBJECT,
                properties: {
                  productName: { type: Type.STRING, description: "Ürünün genel adı (Karakılçık, Artisan, vb.)" },
                  quantity: { type: Type.INTEGER, description: "Adet (sayısal)" }
                }
              }
            }
          }
        }
      }
    });

    const output = response.text;
    if (!output) {
      throw new Error("Empty response from AI");
    }

    const parsedJson = JSON.parse(output);

    return NextResponse.json({ success: true, parsedOrder: parsedJson });
  } catch (error: any) {
    console.error("AI Parse Error:", error);
    return NextResponse.json({ success: false, error: "Sipariş analiz edilemedi: " + error.message }, { status: 500 });
  }
}
