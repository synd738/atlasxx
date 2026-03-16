
document.addEventListener("DOMContentLoaded", function () {
  console.log("Auth-db.js loaded as compatibility layer");

  
  if (!window.auth || !window.db) {
    console.error(
      "Base not initialized. Make sure BackendDatabaseAuthPH.js loads first.",
    );
    return;
  }

  // Expose functions for legacy code
  window.getCurrentUser = function () {
    const user = window.auth.currentUser;
    if (user) {
      return {
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email.split("@")[0],
      };
    }
    return null;
  };

  window.isUserLoggedIn = function () {
    return window.auth.currentUser !== null;
  };

  window.saveUserData = function (data) {
    const user = window.auth.currentUser;
    if (!user) return Promise.reject("No user logged in");

    return window.db
      .collection("users")
      .doc(user.uid)
      .set(data, { merge: true });
  };

  console.log("Legacy compatibility functions loaded");
});
