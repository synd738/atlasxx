// BackendDatabaseAuth
const firebaseConfig = {
 apiKey: "AIzaSyCGEUmm1MJzDO8qI3Ua1KjmJn-AeSGpJ3U",
  authDomain: "oppybestmaindatabase-x.firebaseapp.com",
  projectId: "oppybestmaindatabase-x",
  storageBucket: "oppybestmaindatabase-x.firebasestorage.app",
  messagingSenderId: "726418539247",
  appId: "1:726418539247:web:2b0a1c9ddb6feb9581511a"
};


try {
  firebase.initializeApp(firebaseConfig);
} catch (error) {
  console.error("Initialized");
}


const auth = firebase.auth();
const db = firebase.firestore();

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((error) => {
  console.error("Error setting auth persistence:", error);
});

window.auth = auth;
window.db = db;
window.firebaseApp = firebase;

// Helper functions
window.getCurrentUser = () => {
  return auth.currentUser;
};

window.getUserDoc = async (userId) => {
  return await db.collection("users").doc(userId).get();
};

window.updateUserDoc = async (userId, data) => {
  return await db
    .collection("users")
    .doc(userId)
    .update({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
};


