const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

// Initialize Firebase with default credentials for production
admin.initializeApp();
const messaging = admin.messaging();


function decodeQueryPath(path) {
  return path.replaceAll("_@dot_", ".");
}

// Listen to the Realtime Database
exports.listenToRealtimeDb = functions.database
  .ref('/messages/{messageId}')
  .onCreate(async (snapshot, context) => {
    // Get the data before and after the change
    const data = snapshot.val();

    // Log the data to the console
    console.log(data);

    // Get FCM token from the database
    return admin.database()
      .ref('/fcmTokens')
      .once('value')
      .then((snapshot) => {
        const fcmToken = snapshot.val();

        for (const [encodedEmail, tokens] of Object.entries(fcmToken)) {
          if (decodeQueryPath(encodedEmail) === data.email) {
            console.log("Skip sending notification to the sender");
            continue;
          }
          const tokenList = Object.keys(tokens).map(token => token.trim());
          console.log("EE", encodedEmail);
          console.log("TT", tokenList);

          tokenList.forEach((token) => {
            // Send a notification to the device
            messaging
              .send({
                notification: {
                  title: "Từ: " + data.user,
                  body: data.text
                },
                token: token
              })
              .then((response) => {
                console.log('Successfully sent message:', response);
              })
              .catch((error) => {
                console.log('Error sending message:', error);
              });
          });
        }
      });
  });