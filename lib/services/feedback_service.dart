import 'package:cloud_firestore/cloud_firestore.dart';

class FeedbackService {
  FeedbackService(this._firestore);

  final FirebaseFirestore _firestore;

  Future<void> submitFeedback({
    String? email,
    String? name,
    required String message,
    required String locale,
  }) async {
    await _firestore.collection('feedback_messages').add({
      'email': email,
      'name': name,
      'message': message,
      'locale': locale,
      'createdAt': FieldValue.serverTimestamp(),
    });
  }
}
