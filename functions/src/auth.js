const functions = require('firebase-functions');

exports.registerUser = functions.https.onRequest((req, res) => {
  return res.status(501).send({ error: 'registerUser not implemented' });
});

exports.verifyEmail = functions.https.onRequest((req, res) => {
  return res.status(501).send({ error: 'verifyEmail not implemented' });
});

exports.resetPassword = functions.https.onRequest((req, res) => {
  return res.status(501).send({ error: 'resetPassword not implemented' });
});

exports.updateUserProfile = functions.https.onRequest((req, res) => {
  return res.status(501).send({ error: 'updateUserProfile not implemented' });
});
