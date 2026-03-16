// auth.js - Complete Firebase Authentication
document.addEventListener("DOMContentLoaded", function () {
  console.log("Auth.js DOM loaded");

  // Get services
  const auth = window.auth || firebase.auth();
  const db = window.db || firebase.firestore();

  // DOM Elements
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const loginFormElement = document.getElementById("loginFormElement");
  const registerFormElement = document.getElementById("registerFormElement");
  const showRegisterBtn = document.getElementById("showRegister");
  const showLoginBtn = document.getElementById("showLogin");

  // Check if user is already logged in
  auth.onAuthStateChanged((user) => {
    console.log("Auth state changed:", user ? "User logged in" : "No user");

    if (
      user &&
      (window.location.pathname.includes("auth.html") ||
        window.location.pathname === "/" ||
        window.location.pathname === "/index.html")
    ) {
      console.log("Auto-redirecting logged in user...");

      // Check if user has admin role in Firestore
      db.collection("users")
        .doc(user.uid)
        .get()
        .then((doc) => {
          if (doc.exists) {
            const userData = doc.data();
            // Store in localStorage for compatibility
            localStorage.setItem(
              "user",
              JSON.stringify({
                uid: user.uid,
                email: user.email,
                fullName:
                  user.displayName ||
                  userData.fullName ||
                  user.email.split("@")[0],
                name:
                  user.displayName ||
                  userData.fullName ||
                  user.email.split("@")[0],
                role: userData.role || "user",
              }),
            );

            // Redirect based on role
            if (userData.role === "admin") {
              window.location.href = "/admin.html";
            } else {
              window.location.href = "/dashboard.html";
            }
          } else {
            // User doc doesn't exist, create it
            const userData = {
              uid: user.uid,
              email: user.email,
              fullName: user.displayName || user.email.split("@")[0],
              role: "user",
              investmentAmount: 0,
              currentBalance: 0,
              profitLoss: 0,
              profitPercentage: 0,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            };

            db.collection("users")
              .doc(user.uid)
              .set(userData)
              .then(() => {
                localStorage.setItem("user", JSON.stringify(userData));
                window.location.href = "/dashboard.html";
              });
          }
        })
        .catch((error) => {
          console.error("Error checking user role:", error);
          // Still redirect to dashboard as fallback
          localStorage.setItem(
            "user",
            JSON.stringify({
              uid: user.uid,
              email: user.email,
              fullName: user.displayName || user.email.split("@")[0],
              role: "user",
            }),
          );
          window.location.href = "/dashboard.html";
        });
    }
  });

  // Show Register Form
  if (showRegisterBtn) {
    showRegisterBtn.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("Show register button clicked");

      if (loginForm && registerForm) {
        loginForm.classList.add("hidden");
        registerForm.classList.remove("hidden");
        console.log("Switched to register form");

        // Clear errors
        const loginError = document.getElementById("loginError");
        const registerError = document.getElementById("registerError");
        if (loginError) loginError.style.display = "none";
        if (registerError) registerError.style.display = "none";
      }
    });
  }

  // Show Login Form
  if (showLoginBtn) {
    showLoginBtn.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("Show login button clicked");

      if (loginForm && registerForm) {
        registerForm.classList.add("hidden");
        loginForm.classList.remove("hidden");
        console.log("Switched to login form");

        // Clear errors
        const loginError = document.getElementById("loginError");
        const registerError = document.getElementById("registerError");
        if (loginError) loginError.style.display = "none";
        if (registerError) registerError.style.display = "none";
      }
    });
  }

  // Handle Login
  if (loginFormElement) {
    loginFormElement.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;
      const errorEl = document.getElementById("loginError");

      errorEl.style.display = "none";
      errorEl.textContent = "";

      // Basic validation
      if (!email || !password) {
        errorEl.textContent = "Please fill in all fields";
        errorEl.style.display = "block";
        return;
      }

      try {
        // Disable submit button
        const submitBtn = document.querySelector(
          '#loginFormElement button[type="submit"]',
        );
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Signing in...";
        }

        console.log("Attempting Firebase login for:", email);

        // Firebase Authentication login
        const userCredential = await auth.signInWithEmailAndPassword(
          email,
          password,
        );
        const user = userCredential.user;

        console.log("Login successful, user ID:", user.uid);

        // Get user data from Firestore
        const userDoc = await db.collection("users").doc(user.uid).get();

        let userData;
        if (userDoc.exists) {
          userData = userDoc.data();
          console.log("User data from Firestore:", userData);
        } else {
          // Create user document if it doesn't exist
          userData = {
            uid: user.uid,
            email: user.email,
            fullName: user.displayName || user.email.split("@")[0],
            role: "user",
            investmentAmount: 0,
            currentBalance: 0,
            profitLoss: 0,
            profitPercentage: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          };

          await db.collection("users").doc(user.uid).set(userData);
          console.log("Created new user document");
        }

        // Store in localStorage for compatibility
        const userStorageData = {
          uid: user.uid,
          email: user.email,
          fullName:
            user.displayName || userData.fullName || user.email.split("@")[0],
          name:
            user.displayName || userData.fullName || user.email.split("@")[0],
          role: userData.role || "user",
          investmentAmount: userData.investmentAmount || 0,
          currentBalance: userData.currentBalance || 0,
          profitLoss: userData.profitLoss || 0,
          profitPercentage: userData.profitPercentage || 0,
        };

        localStorage.setItem("user", JSON.stringify(userStorageData));
        console.log("Stored user in localStorage");

        // Get Firebase ID token for compatibility
        user
          .getIdToken()
          .then((token) => {
            localStorage.setItem("token", token);
            console.log("Stored Firebase token");

            // Redirect based on role
            if (userData.role === "admin") {
              window.location.href = "/admin.html";
            } else {
              window.location.href = "/dashboard.html";
            }
          })
          .catch((error) => {
            console.error("Error getting ID token:", error);
            // Still redirect
            if (userData.role === "admin") {
              window.location.href = "/admin.html";
            } else {
              window.location.href = "/dashboard.html";
            }
          });
      } catch (error) {
        console.error("Login error:", error);

        // Firebase specific error messages
        let errorMessage = `Login failed.                                                                     `;

        switch (error.code) {
          case "auth/invalid-email":
            errorMessage += "Invalid email address.";
            break;
          case "auth/user-disabled":
            errorMessage += "This account has been disabled.";
            break;
          case "auth/user-not-found":
            errorMessage += "No account found with this email.";
            break;
          case "auth/wrong-password":
            errorMessage += "Incorrect password.";
            break;
          case "auth/too-many-requests":
            errorMessage += "Too many failed attempts. Try again later.";
            break;
          case "auth/network-request-failed":
            errorMessage += "Network error. Check your connection.";
            break;
          default:
            errorMessage += error.message || "Please try again.";
        }

        errorEl.textContent = errorMessage;
        errorEl.style.display = "block";
        errorEl.style.fontSize = "10px";
      } finally {
        // Re-enable submit button
        const submitBtn = document.querySelector(
          '#loginFormElement button[type="submit"]',
        );
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `Sign In`;
        }
      }
    });
  }

  // Handle Registration
  if (registerFormElement) {
    registerFormElement.addEventListener("submit", async (e) => {
      e.preventDefault();

      const fullName = document.getElementById("registerName").value;
      const email = document.getElementById("registerEmail").value;
      const password = document.getElementById("registerPassword").value;
      const errorEl = document.getElementById("registerError");

      errorEl.style.display = "none";
      errorEl.textContent = "";

      // Basic validation
      if (!fullName || !email || !password) {
        errorEl.textContent = "Please fill in all fields";
        errorEl.style.display = "block";
        return;
      }

      if (password.length < 6) {
        errorEl.textContent = "Password must be at least 6 characters";
        errorEl.style.display = "block";
        return;
      }

      try {
        // Disable submit button
        const submitBtn = document.querySelector(
          '#registerFormElement button[type="submit"]',
        );
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Creating account...";
        }

        console.log("Attempting Firebase registration for:", email);

        // Firebase Authentication registration
        const userCredential = await auth.createUserWithEmailAndPassword(
          email,
          password,
        );
        const user = userCredential.user;

        console.log("Registration successful, user ID:", user.uid);

        // Update user profile with display name
        await user.updateProfile({
          displayName: fullName,
        });

        console.log("Updated user profile with name:", fullName);

        // Create user document in Firestore
        const userData = {
          uid: user.uid,
          email: user.email,
          fullName: fullName,
          role: "user",
          investmentAmount: 0,
          currentBalance: 0,
          profitLoss: 0,
          profitPercentage: 0,
          walletAddresses: {},
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection("users").doc(user.uid).set(userData);
        console.log("Created user document in Firestore");

        // Store in localStorage for compatibility
        localStorage.setItem(
          "user",
          JSON.stringify({
            uid: user.uid,
            email: user.email,
            fullName: fullName,
            name: fullName,
            role: "user",
            investmentAmount: 0,
            currentBalance: 0,
            profitLoss: 0,
            profitPercentage: 0,
          }),
        );

        console.log("Stored user in localStorage");

        // Get Firebase ID token for compatibility
        user
          .getIdToken()
          .then((token) => {
            localStorage.setItem("token", token);
            console.log("Stored Firebase token");
            // Redirect to dashboard
            window.location.href = "/dashboard.html";
          })
          .catch((error) => {
            console.error("Error getting ID token:", error);
            // Still redirect
            window.location.href = "/dashboard.html";
          });
      } catch (error) {
        console.error("Registration error:", error);

        // Firebase specific error messages
        let errorMessage = "Registration failed. ";

        switch (error.code) {
          case "auth/email-already-in-use":
            errorMessage += "Email already in use.";
            break;
          case "auth/invalid-email":
            errorMessage += "Invalid email address.";
            break;
          case "auth/operation-not-allowed":
            errorMessage += "Email/password accounts are not enabled.";
            break;
          case "auth/weak-password":
            errorMessage += "Password is too weak. Use at least 6 characters.";
            break;
          case "auth/network-request-failed":
            errorMessage += "Network error. Check your connection.";
            break;
          default:
            errorMessage += error.message || "Please try again.";
        }

        errorEl.textContent = errorMessage;
        errorEl.style.display = "block";
      } finally {
        // Re-enable submit button
        const submitBtn = document.querySelector(
          '#registerFormElement button[type="submit"]',
        );
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `Create Account`;
        }
      }
    });
  }

  // Check if already logged in (from localStorage) - Compatibility fallback
  const token = localStorage.getItem("token");
  const userFromStorage = localStorage.getItem("user");

  if (token && userFromStorage) {
    try {
      const user = JSON.parse(userFromStorage);
      // Only auto-redirect if on auth page or home page
      const currentPath = window.location.pathname;
      const isAuthPage =
        currentPath.includes("auth.html") ||
        currentPath === "/" ||
        currentPath === "/index.html" ||
        currentPath.includes("index.html");

      if (isAuthPage) {
        console.log("Auto-redirecting from localStorage...");
        if (user.role === "admin") {
          window.location.href = "/admin.html";
        } else {
          window.location.href = "/dashboard.html";
        }
      }
    } catch (e) {
      // Invalid JSON, clear storage
      console.error("Invalid user data in localStorage:", e);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }
});
