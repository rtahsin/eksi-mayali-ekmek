class BlogPost {
  final String id;
  final String title;
  final String summary;
  final String content;
  final String imageUrl;
  final String author;
  final DateTime date;
  final List<String> tags;
  final String category;
  final bool published;

  BlogPost({
    required this.id,
    required this.title,
    required this.summary,
    required this.content,
    required this.imageUrl,
    required this.author,
    required this.date,
    this.tags = const [],
    required this.category,
    this.published = true,
  });

  // JSON'dan model oluştur
  factory BlogPost.fromJson(Map<String, dynamic> json) {
    return BlogPost(
      id: json['id'],
      title: json['title'],
      summary: json['summary'],
      content: json['content'],
      imageUrl: json['imageUrl'],
      author: json['author'],
      date: DateTime.parse(json['date']),
      tags: List<String>.from(json['tags'] ?? []),
      category: json['category'],
      published: json['published'] ?? true,
    );
  }

  // Model'den JSON oluştur
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'summary': summary,
      'content': content,
      'imageUrl': imageUrl,
      'author': author,
      'date': date.toIso8601String(),
      'tags': tags,
      'category': category,
      'published': published,
    };
  }
}
