import { NextResponse } from "next/server";
import { JOURNAL_ARTICLES } from "@/data/journalArticles";
import { adminDb } from "@/lib/firebase/admin";
import { JournalArticle } from "@/types/journal";
import { verifyAdminRequest } from "@/lib/auth/serverAuth";

export async function GET() {
  try {
    if (adminDb) {
      const snapshot = await adminDb.collection("journal_articles").get();
      if (!snapshot.empty) {
        const articles: JournalArticle[] = [];
        snapshot.forEach((doc) => {
          articles.push({ ...(doc.data() as JournalArticle), id: doc.id });
        });
        return NextResponse.json({ success: true, articles });
      }
    }
    return NextResponse.json({ success: true, articles: JOURNAL_ARTICLES });
  } catch (err) {
    console.warn("API GET /api/journal fallback to seed:", err);
    return NextResponse.json({ success: true, articles: JOURNAL_ARTICLES });
  }
}

export async function POST(req: Request) {
  // 1. Verify caller has admin privileges
  const authResult = await verifyAdminRequest(req);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const body = (await req.json()) as JournalArticle;
    if (!body || !body.title || !body.slug) {
      return NextResponse.json(
        { success: false, error: "Başlık ve slug zorunludur" },
        { status: 400 }
      );
    }

    const articleId = body.id || `art_${Date.now()}`;
    const articleData: JournalArticle = {
      ...body,
      id: articleId,
    };

    if (adminDb) {
      await adminDb.collection("journal_articles").doc(articleId).set(articleData, { merge: true });
    }

    return NextResponse.json({ success: true, article: articleData });
  } catch (err: any) {
    console.error("API POST /api/journal error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Kaydetme hatası" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  // 1. Verify caller has admin privileges
  const authResult = await verifyAdminRequest(req);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID parametresi gereklidir" }, { status: 400 });
    }

    if (adminDb) {
      await adminDb.collection("journal_articles").doc(id).delete();
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error("API DELETE /api/journal error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Silme hatası" },
      { status: 500 }
    );
  }
}

