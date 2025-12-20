class Comment {
  final String id;
  final String text;
  final String userId;
  final String userName;
  final String? userPhoto;
  final String createdAt;

  Comment({
    required this.id,
    required this.text,
    required this.userId,
    required this.userName,
    this.userPhoto,
    required this.createdAt,
  });

  // JSON'dan model oluştur
  factory Comment.fromJson(Map<String, dynamic> json) {
    return Comment(
      id: json['id'],
      text: json['text'],
      userId: json['userId'],
      userName: json['userName'],
      userPhoto: json['userPhoto'],
      createdAt: json['createdAt'],
    );
  }

  // Model'den JSON oluştur
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'text': text,
      'userId': userId,
      'userName': userName,
      'userPhoto': userPhoto,
      'createdAt': createdAt,
    };
  }
}
