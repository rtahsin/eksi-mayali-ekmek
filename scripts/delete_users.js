// Firebase Console > Firestore > Query
// Collection: users
// Field: email, Operator: !=, Value: tahsinreyhan@gmail.com
// Sonra tüm belgeleri seç ve sil

// YA DA Functions ile toplu silme:
const admin = require('firebase-admin');
admin.initializeApp();

async function deleteAllUsersExceptAdmin() {
  const db = admin.firestore();
  const auth = admin.auth();

  // Firestore'dan sil
  const usersSnapshot = await db.collection('users')
    .where('email', '!=', 'tahsinreyhan@gmail.com')
    .get();

  const batch = db.batch();
  usersSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log(`${usersSnapshot.size} kullanıcı Firestore'dan silindi`);

  // Auth'tan sil
  const listUsers = await auth.listUsers();
  const deletePromises = listUsers.users
    .filter(user => user.email !== 'tahsinreyhan@gmail.com')
    .map(user => auth.deleteUser(user.uid));

  await Promise.all(deletePromises);
  console.log(`${deletePromises.length} kullanıcı Authentication'dan silindi`);
}

deleteAllUsersExceptAdmin();
