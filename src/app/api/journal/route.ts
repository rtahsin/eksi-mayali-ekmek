import { NextResponse } from "next/server";
import { JOURNAL_ARTICLES } from "@/data/journalArticles";
import { createAdminClient } from "@/lib/supabase/admin";
import { JournalArticle } from "@/types/journal";
import { getErrorMessage } from "@/lib/utils/error";

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient();
    if (supabaseAdmin) {
      const { data, error } = await (supabaseAdmin as any)
        .from("journal_articles")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const articles: JournalArticle[] = data.map((d: any) => ({
          id: d.id,
          title: d.title,
          slug: d.slug,
          excerpt: d.excerpt || "",
          content: d.content || "",
          category: d.category || "fermentation",
          readTime: d.read_time || "5 dk",
          author: d.author || "Tahsin Usta",
          imageUrl: d.image_url,
          published: d.published !== false,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
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
  try {
    const body = (await req.json()) as JournalArticle;
    if (!body || !body.title || !body.slug) {
      return NextResponse.json(
        { success: false, error: "Başlık ve slug zorunludur" },
        { status: 400 }
      );
    }

    const articleId = body.id || `art_${Date.now()}`;
    const supabaseAdmin = createAdminClient();

    if (supabaseAdmin) {
      await (supabaseAdmin as any).from("journal_articles").upsert({
        id: articleId,
        title: body.title,
        slug: body.slug,
        excerpt: body.excerpt || "",
        content: body.content,
        category: body.category || "fermentation",
        read_time: body.readTime || "5 dk",
        author: body.author || "Tahsin Usta",
        image_url: body.imageUrl || null,
        published: body.published !== false,
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, article: { ...body, id: articleId } });
  } catch (err: unknown) {
    console.error("API POST /api/journal error:", err);
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Kaydetme hatası" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID parametresi gereklidir" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    if (supabaseAdmin) {
      await (supabaseAdmin as any)
        .from("journal_articles")
        .delete()
        .or(`id.eq.${id},slug.eq.${id}`);
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: unknown) {
    console.error("API DELETE /api/journal error:", err);
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Silme hatası" },
      { status: 500 }
    );
  }
}
