document.addEventListener('DOMContentLoaded', function() {
  console.log("Dashboard.js loaded");

  
  const auth = window.auth || firebase.auth();
  const db = window.db || firebase.firestore();


  auth.onAuthStateChanged((user) => {
    if (!user) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/auth.html";
      return;
    }

    const currentUser = {
      uid: user.uid,
      email: user.email,
      fullName: user.displayName || user.email.split('@')[0],
      name: user.displayName || user.email.split('@')[0]
    };

    document.getElementById("userName").textContent = currentUser.fullName || "User";
    document.getElementById("userEmail").textContent = currentUser.email || "";
    document.getElementById("userAvatar").textContent = (currentUser.fullName || "U").charAt(0).toUpperCase();

    localStorage.setItem("user", JSON.stringify(currentUser));

    initializeDashboard(user);
  });

  
document.querySelectorAll('[data-section="withdrawals"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const navItem = document.querySelector('.nav-item[data-section="withdrawals"]');
        if (navItem) {
            navItem.click();
        }
    });
});

  const navItems = document.querySelectorAll(".nav-item");
  const dashboardContent = document.getElementById("dashboardContent");
  const profileContent = document.getElementById("profileContent");
  const supportContent = document.getElementById("supportContent");
  const withdrawalsContent = document.getElementById("withdrawalsContent");
  const loadingState = document.getElementById("loadingState");
  const pageTitle = document.getElementById("pageTitle");
  const pageSubtitle = document.getElementById("pageSubtitle");

  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const section = item.dataset.section;

      navItems.forEach((nav) => nav.classList.remove("active"));
      item.classList.add("active");

      if (section === "dashboard") {
        dashboardContent.classList.remove("hidden");
        profileContent.classList.add("hidden");
        supportContent.classList.add("hidden");
        withdrawalsContent.classList.add("hidden");
        pageTitle.textContent = "Investment Dashboard";
        pageSubtitle.textContent = "Track your crypto investments in real-time";
        loadDashboard();
      } else if (section === "profile") {
        dashboardContent.classList.add("hidden");
        profileContent.classList.remove("hidden");
        supportContent.classList.add("hidden");
        withdrawalsContent.classList.add("hidden");
        pageTitle.textContent = "Profile Settings";
        pageSubtitle.textContent = "Manage your account information and settings";
        loadProfile();
      } else if (section === "support") {
        dashboardContent.classList.add("hidden");
        profileContent.classList.add("hidden");
        supportContent.classList.remove("hidden");
        withdrawalsContent.classList.add("hidden");
        pageTitle.textContent = "Support Center";
        pageSubtitle.textContent = "Get help with your account and investments";
        loadTickets();
      } else if (section === "withdrawals") {
        dashboardContent.classList.add("hidden");
        profileContent.classList.add("hidden");
        supportContent.classList.add("hidden");
        withdrawalsContent.classList.remove("hidden");
        pageTitle.textContent = "Withdraw Funds";
        pageSubtitle.textContent = "Request a withdrawal from your balance";
        loadWithdrawals();
      }
    });
  });

  // Add click handler for View All link
  document.querySelectorAll('.nav-link[data-section], .view-all-link[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      const navItem = document.querySelector(`.nav-item[data-section="${section}"]`);
      if (navItem) {
        navItem.click();
      }
    });
  });

  // Logout handler
  document.getElementById("logoutBtn").addEventListener("click", () => {
    auth.signOut()
      .then(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/";
      })
      .catch((error) => {
        console.error("Logout error:", error);
      });
  });

  // Initialize dashboard function
  function initializeDashboard(user) {
    console.log("Initializing dashboard for user:", user.uid);
    loadDashboard();
  }

  // Format currency
  function formatCurrency(amount) {
    if (isNaN(amount) || amount === null || amount === undefined) {
      amount = 0;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  // Format date
  function formatDate(dateString) {
    if (!dateString) return "Unknown date";
    try {
      // Handle Firestore Timestamp
      if (dateString.toDate) {
        return dateString.toDate().toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return "Invalid date";
    }
  }

  // Investment Modal
  const investmentModal = document.getElementById("investmentModal");
  const openModalBtn = document.getElementById("openInvestModal1");
  const openModalBtn2 = document.getElementById("openInvestModal2");
  const closeModalBtn = document.getElementById("closeInvestModal");
  const cancelBtn = document.getElementById("cancelInvest");
  const investmentForm = document.getElementById("investmentForm");

  if (openModalBtn) {
    openModalBtn.addEventListener("click", async () => {
      investmentModal.classList.remove("hidden");
      await loadWalletAddresses();
    });
  }
  
  if (openModalBtn2){
    openModalBtn2.addEventListener("click", async () => {
      investmentModal.classList.remove("hidden");
      await loadWalletAddresses();
    });
  }

  function closeModal() {
    if (investmentModal) {
      investmentModal.classList.add("hidden");
      if (investmentForm) investmentForm.reset();
      const errorEl = document.getElementById("investmentError");
      if (errorEl) errorEl.textContent = "";
    }
  }

  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

  if (investmentModal) {
    investmentModal.addEventListener("click", (e) => {
      if (e.target === investmentModal) {
        closeModal();
      }
    });
  }

  // Investment Form Submission
  if (investmentForm) {
    investmentForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(investmentForm);
      const cryptocurrency = formData.get("cryptocurrency");
      const amount = Number.parseFloat(formData.get("amount"));

      if (!cryptocurrency || !amount || amount < 10) {
        const errorEl = document.getElementById("investmentError");
        if (errorEl) {
          errorEl.textContent =
            "Please select a cryptocurrency and enter a valid amount (minimum $10)";
          errorEl.style.display = "block";
        }
        return;
      }

      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error("User not authenticated");
        }

        const submitBtn = document.getElementById("submitInvest");
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Processing...";
        }

        const adminWallets = await getAdminWalletAddresses();
        let walletAddress = adminWallets[cryptocurrency] || "Not configured";

        const investmentRequestData = {
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName || user.email.split("@")[0],
          amount: amount,
          cryptocurrency: cryptocurrency,
          walletAddress: walletAddress,
          transactionId: `INV${Date.now()}`,
          status: "pending",
          description: `${cryptocurrency} Investment Request`,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          type: "investment",
        };

        await db.collection("investmentRequests").add(investmentRequestData);

        closeModal();

        alert(
          "✅ Investment request submitted successfully!\n\nStatus: Pending\n\nYour investment is awaiting admin approval. You'll be notified once it's approved.",
        );
      } catch (error) {
        console.error("Investment error:", error);
        const errorEl = document.getElementById("investmentError");
        if (errorEl) {
          errorEl.textContent = error.message;
          errorEl.style.display = "block";
        }
      } finally {
        const submitBtn = document.getElementById("submitInvest");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `Confirm Payment`;
        }
      }
    });
  }

  // Helper function to get admin wallet addresses
  async function getAdminWalletAddresses() {
    try {
      const adminDoc = await db.collection('adminSettings').doc('wallets').get();
      if (adminDoc.exists) {
        return adminDoc.data();
      }
      return {};
    } catch (error) {
      console.error("Error getting admin wallets:", error);
      return {};
    }
  }

  // Helper function to update investment stats
  async function updateUserInvestmentStats(userId, amount) {
    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        const currentInvestment = userData.investmentAmount || 0;
        const currentBalance = userData.currentBalance || 0;

        const profitPercentage = 5; 
        const profitAmount = amount * (profitPercentage / 100);

        await userRef.update({
          investmentAmount: currentInvestment + amount,
          currentBalance: currentBalance + amount + profitAmount,
          profitLoss: (userData.profitLoss || 0) + profitAmount,
          profitPercentage: profitPercentage,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error updating investment stats:", error);
    }
  }

  // Load dashboard data
  async function loadDashboard() {
    try {
      const user = auth.currentUser;
      if (!user) {
        window.location.href = "/auth.html";
        return;
      }

      // Show loading state
      const loadingEl = document.getElementById("loadingState");
      if (loadingEl) loadingEl.classList.remove("hidden");

      // Get user data from Firestore
      const userDoc = await db.collection('users').doc(user.uid).get();

      let userData;
      if (userDoc.exists) {
        userData = userDoc.data();
      } else {
        // Create user document if it doesn't exist
        userData = {
          uid: user.uid,
          email: user.email,
          fullName: user.displayName || user.email.split('@')[0],
          investmentAmount: 0,
          currentBalance: 0,
          profitLoss: 0,
          profitPercentage: 0,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('users').doc(user.uid).set(userData);
      }

      // Get BOTH approved investments AND pending investment requests
      const [approvedInvestmentsSnapshot, pendingRequestsSnapshot] = await Promise.all([
        db.collection('investments')
          .where('userId', '==', user.uid)
          .orderBy('createdAt', 'desc')
          .get(),
        db.collection('investmentRequests')
          .where('userId', '==', user.uid)
          .orderBy('createdAt', 'desc')
          .get()
      ]);

      const investments = [];
      
      // Add approved investments
      approvedInvestmentsSnapshot.forEach(doc => {
        investments.push({
          id: doc.id,
          ...doc.data(),
          type: 'approved'
        });
      });

      // Add pending requests
      pendingRequestsSnapshot.forEach(doc => {
        investments.push({
          id: doc.id,
          ...doc.data(),
          type: 'request'
        });
      });

      // Sort by creation date (newest first)
      investments.sort((a, b) => {
        const aDate = a.createdAt?.toDate() || new Date(0);
        const bDate = b.createdAt?.toDate() || new Date(0);
        return bDate - aDate;
      });

      // Get payments
      const paymentsSnapshot = await db.collection('payments')
        .where('userId', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .get();

      const payments = [];
      paymentsSnapshot.forEach(doc => {
        payments.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Update user info in localStorage
      const updatedUser = {
        ...JSON.parse(localStorage.getItem("user") || "{}"),
        ...userData
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      // Update UI
      await displayDashboard({
        user: userData,
        investment: {
          investmentAmount: userData.investmentAmount || 0,
          currentBalance: userData.currentBalance || 0,
          profitLoss: userData.profitLoss || 0,
          profitPercentage: userData.profitPercentage || 0
        },
        payments: payments,
        investments: investments
      });

    } catch (error) {
      console.error("Dashboard error:", error);
      if (error.code === 'permission-denied') {
        localStorage.removeItem("user");
        window.location.href = "/auth.html";
      }
    } finally {
      // Hide loading state
      const loadingEl = document.getElementById("loadingState");
      if (loadingEl) loadingEl.classList.add("hidden");

      // Show dashboard content
      const dashboardEl = document.getElementById("dashboardContent");
      if (dashboardEl) dashboardEl.classList.remove("hidden");
    }
  }

  // Display dashboard data - NOW ASYNC
  async function displayDashboard(data) {
    const { investment, payments, investments } = data;

    // Update stats
    const investmentAmountEl = document.getElementById("investmentAmount");
    const currentBalanceEl = document.getElementById("currentBalance");
    const profitLossEl = document.getElementById("profitLoss");
    const profitPercentageEl = document.getElementById("profitPercentage");

    if (investmentAmountEl) investmentAmountEl.textContent = formatCurrency(investment.investmentAmount || 0);
    if (currentBalanceEl) currentBalanceEl.textContent = formatCurrency(investment.currentBalance || 0);
    if (profitLossEl) profitLossEl.textContent = formatCurrency(investment.profitLoss || 0);

    if (profitPercentageEl) {
      const percentage = investment.profitPercentage || 0;
      profitPercentageEl.textContent = `${percentage >= 0 ? "+" : ""}${percentage.toFixed(2)}%`;
      profitPercentageEl.className = `stat-change ${percentage >= 0 ? "positive" : "negative"}`;
    }

    // Display investments (both approved and pending)
    const investmentsList = document.getElementById("investmentsList");
    const investmentsEmpty = document.getElementById("investmentsEmpty");

    if (!investments || investments.length === 0) {
      if (investmentsEmpty) investmentsEmpty.classList.remove("hidden");
      if (investmentsList) investmentsList.innerHTML = "";
    } else {
      if (investmentsEmpty) investmentsEmpty.classList.add("hidden");

      const investmentsHTML = investments
        .map((inv) => {
          const isPending = inv.type === 'request' && inv.status === 'pending';
          const statusText = isPending ? 'Pending Approval' : (inv.status === 'approved' ? 'Approved' : 'Active');
          const statusClass = isPending ? 'pending' : (inv.status === 'approved' ? 'approved' : 'active');
          
          return `
          <div class="investment-item ${isPending ? 'pending-request' : ''}">
            <div class="investment-details">
              <div class="investment-crypto ${inv.cryptocurrency?.toLowerCase() || 'btc'}">
                ${getCryptoSymbol(inv.cryptocurrency || 'BTC')}
              </div>
              <div class="investment-info">
                <h4>${getCryptoName(inv.cryptocurrency || 'BTC')} Investment</h4>
                <div class="investment-meta">
                  ${formatDate(inv.createdAt)}
                  ${isPending ? ' • Awaiting admin approval' : ''}
                </div>
              </div>
            </div>
            <div class="investment-amount">
              <div class="amount">${formatCurrency(inv.amount)}</div>
              <span class="investment-status-badge ${statusClass}">${statusText}</span>
            </div>
          </div>
        `;
        })
        .join("");

      if (investmentsList) investmentsList.innerHTML = investmentsHTML;
    }

    // Update payments
    const paymentCount = payments.length;
    const paymentCountEl = document.getElementById("paymentCount");
    if (paymentCountEl) paymentCountEl.textContent = `${paymentCount} payment${paymentCount !== 1 ? "s" : ""}`;

    const paymentsEmpty = document.getElementById("paymentsEmpty");
    const paymentsList = document.getElementById("paymentsList");

    if (paymentCount === 0) {
      if (paymentsEmpty) paymentsEmpty.classList.remove("hidden");
      if (paymentsList) paymentsList.classList.add("hidden");
    } else {
      if (paymentsEmpty) paymentsEmpty.classList.add("hidden");
      if (paymentsList) paymentsList.classList.remove("hidden");

      const paymentsHTML = payments
        .map(
          (payment) => `
        <div class="payment-item">
          <div class="payment-info">
            <h4>${payment.description || payment.cryptocurrency || "Payment"}</h4>
            <div class="payment-meta">${formatDate(payment.createdAt)}</div>
          </div>
          <div style="text-align: right;">
            <div class="payment-amount">${formatCurrency(payment.amount)}</div>
            <span class="payment-status ${payment.status}">${payment.status}</span>
          </div>
        </div>
      `
        )
        .join("");

      if (paymentsList) paymentsList.innerHTML = paymentsHTML;
    }

    // Load and display tickets on dashboard
    try {
      const dashboardTickets = await loadDashboardTickets();
      const dashboardTicketsList = document.getElementById("dashboardTicketsList");
      const dashboardTicketsEmpty = document.getElementById("dashboardTicketsEmpty");

      if (dashboardTicketsList && dashboardTicketsEmpty) {
        if (dashboardTickets.length === 0) {
          dashboardTicketsEmpty.classList.remove("hidden");
          dashboardTicketsList.innerHTML = "";
        } else {
          dashboardTicketsEmpty.classList.add("hidden");

          const ticketsHTML = dashboardTickets
            .map((ticket) => {
              // Format status for display
              const displayStatus = ticket.status.replace('_', ' ').replace('-', ' ');
              const statusClass = ticket.status.toLowerCase();
              
              // Get status icon based on status
              let statusIcon = '';
              if (ticket.status === 'open') statusIcon = '🟡';
              else if (ticket.status === 'in-progress' || ticket.status === 'in_progress') statusIcon = '🔄';
              else if (ticket.status === 'resolved') statusIcon = '✅';
              else if (ticket.status === 'closed') statusIcon = '🔒';
              else statusIcon = '📫';
              
              return `
              <div class="ticket-item" onclick="viewTicket('${ticket.id}')" style="cursor: pointer;">
                <div class="ticket-item-info">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    
                    <h4 style="margin: 0;">${ticket.subject.length > 35 ? ticket.subject.substring(0, 35) + '...' : ticket.subject}</h4>
                  </div>
                  <div class="ticket-item-meta">
                    
                    <span>${formatDate(ticket.createdAt)}</span>
                  </div>
                </div>
                <span class="ticket-status-badge small ${statusClass}">
                  ${displayStatus}
                </span>
              </div>
            `;
            })
            .join("");

          dashboardTicketsList.innerHTML = ticketsHTML;
        }
      }
    } catch (error) {
      console.error("Error displaying dashboard tickets:", error);
    }
  }

  function getCryptoSymbol(crypto) {
    const symbols = {
      BTC: "₿",
      ETH: "Ξ",
      USDT: "₮",
      BNB: "B",
      SOL: "◎",
      ADA: "₳",
    };
    return symbols[crypto] || crypto;
  }

  function getCryptoName(crypto) {
    const names = {
      BTC: "Bitcoin",
      ETH: "Ethereum",
      USDT: "Tether",
      BNB: "Binance Coin",
      SOL: "Solana",
      ADA: "Cardano",
    };
    return names[crypto] || crypto;
  }

  // Profile Section
  const profileDisplay = document.getElementById("profileDisplay");
  const profileForm = document.getElementById("profileForm");
  const editProfileBtn = document.getElementById("editProfileBtn");
  const cancelEditProfileBtn = document.getElementById("cancelEditProfile");

  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => {
      if (profileDisplay) profileDisplay.classList.add("hidden");
      if (profileForm) profileForm.classList.remove("hidden");
      editProfileBtn.classList.add("hidden");
    });
  }

  if (cancelEditProfileBtn) {
    cancelEditProfileBtn.addEventListener("click", () => {
      if (profileDisplay) profileDisplay.classList.remove("hidden");
      if (profileForm) profileForm.classList.add("hidden");
      if (editProfileBtn) editProfileBtn.classList.remove("hidden");
      const errorEl = document.getElementById("profileError");
      if (errorEl) errorEl.textContent = "";
    });
  }

  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(profileForm);
      const fullName = formData.get("fullName");
      const email = formData.get("email");

      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error("User not authenticated");
        }

        const saveBtn = document.getElementById("saveProfile");
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.textContent = "Saving...";
        }

        // Update Firebase Authentication profile
        await user.updateProfile({
          displayName: fullName
        });

        // Update Firestore user document
        await db.collection('users').doc(user.uid).update({
          fullName: fullName,
          email: email,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update local storage
        const updatedUser = {
          ...JSON.parse(localStorage.getItem("user") || "{}"),
          fullName,
          email
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));

        // Update UI
        document.getElementById("userName").textContent = fullName;
        document.getElementById("userEmail").textContent = email;
        document.getElementById("userAvatar").textContent = fullName.charAt(0).toUpperCase();

        // Reload profile display
        await loadProfile();

        // Switch back to display mode
        if (profileDisplay) profileDisplay.classList.remove("hidden");
        if (profileForm) profileForm.classList.add("hidden");
        if (editProfileBtn) editProfileBtn.classList.remove("hidden");
        const errorEl = document.getElementById("profileError");
        if (errorEl) errorEl.textContent = "";
      } catch (error) {
        console.error("Profile update error:", error);
        const errorEl = document.getElementById("profileError");
        if (errorEl) {
          errorEl.textContent = error.message;
          errorEl.style.display = "block";
        }
      } finally {
        const saveBtn = document.getElementById("saveProfile");
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = `Save Changes`;
        }
      }
    });
  }

  // Password Form
  const passwordForm = document.getElementById("passwordForm");
  if (passwordForm) {
    passwordForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(passwordForm);
      const currentPassword = formData.get("currentPassword");
      const newPassword = formData.get("newPassword");
      const confirmPassword = formData.get("confirmPassword");

      const errorEl = document.getElementById("passwordError");

      if (newPassword !== confirmPassword) {
        if (errorEl) {
          errorEl.textContent = "New passwords do not match";
          errorEl.style.display = "block";
        }
        return;
      }

      if (newPassword.length < 6) {
        if (errorEl) {
          errorEl.textContent = "Password must be at least 6 characters";
          errorEl.style.display = "block";
        }
        return;
      }

      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error("User not authenticated");
        }

        const changeBtn = document.getElementById("changePassword");
        if (changeBtn) {
          changeBtn.disabled = true;
          changeBtn.textContent = "Updating...";
        }

        // Re-authenticate user before changing password
        const credential = firebase.auth.EmailAuthProvider.credential(
          user.email,
          currentPassword
        );

        await user.reauthenticateWithCredential(credential);

        // Update password
        await user.updatePassword(newPassword);

        // Success - clear form
        passwordForm.reset();
        if (errorEl) errorEl.style.display = "none";

        // Show success message
        alert("Password updated successfully!");
      } catch (error) {
        console.error("Password update error:", error);
        let errorMessage = "Failed to update password";

        if (error.code === 'auth/wrong-password') {
          errorMessage = "Current password is incorrect";
        } else if (error.code === 'auth/requires-recent-login') {
          errorMessage = "Please login again to change password";
        } else {
          errorMessage = error.message;
        }

        if (errorEl) {
          errorEl.textContent = errorMessage;
          errorEl.style.display = "block";
        }
      } finally {
        const changeBtn = document.getElementById("changePassword");
        if (changeBtn) {
          changeBtn.disabled = false;
          changeBtn.innerHTML = `Update Password`;
        }
      }
    });
  }

  // Load Profile
  async function loadProfile() {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await db.collection('users').doc(user.uid).get();

      if (!userDoc.exists) return;

      const profile = userDoc.data();

      // Update display
      const displayNameEl = document.getElementById("displayName");
      const displayEmailEl = document.getElementById("displayEmail");
      const displayDateEl = document.getElementById("displayDate");

      if (displayNameEl) displayNameEl.textContent = profile.fullName || user.displayName || user.email.split('@')[0];
      if (displayEmailEl) displayEmailEl.textContent = profile.email || user.email;
      if (displayDateEl) displayDateEl.textContent = formatDate(profile.createdAt || user.metadata.creationTime);

      // Update form
      const editFullNameEl = document.getElementById("editFullName");
      const editEmailEl = document.getElementById("editEmail");

      if (editFullNameEl) editFullNameEl.value = profile.fullName || user.displayName || "";
      if (editEmailEl) editEmailEl.value = profile.email || user.email;
    } catch (error) {
      console.error("Profile load error:", error);
    }
  }

  // Support Tickets
  const createTicketModal = document.getElementById("createTicketModal");
  const viewTicketModal = document.getElementById("viewTicketModal");
  const createTicketBtn = document.getElementById("createTicketBtn");
  const createTicketForm = document.getElementById("createTicketForm");
  const replyTicketForm = document.getElementById("replyTicketForm");

  let currentTicket = null;

  if (createTicketBtn) {
    createTicketBtn.addEventListener("click", () => {
      if (createTicketModal) createTicketModal.classList.remove("hidden");
    });
  }

  // Close create ticket modal when clicking close button
  const closeTicketModal = document.getElementById("closeTicketModal");
  const cancelTicketBtn = document.getElementById("cancelTicket");
  
  if (closeTicketModal) {
    closeTicketModal.addEventListener("click", () => {
      createTicketModal.classList.add("hidden");
      if (createTicketForm) createTicketForm.reset();
    });
  }
  
  if (cancelTicketBtn) {
    cancelTicketBtn.addEventListener("click", () => {
      createTicketModal.classList.add("hidden");
      if (createTicketForm) createTicketForm.reset();
    });
  }

  // Create ticket
  if (createTicketForm) {
    createTicketForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const subject = document.getElementById("ticketSubject").value;
      const category = document.getElementById("ticketCategory").value;
      const message = document.getElementById("ticketMessage").value;

      const errorEl = document.getElementById("ticketError");

      if (!subject || !category || !message) {
        if (errorEl) {
          errorEl.textContent = "Subject, category and message are required";
          errorEl.style.display = "block";
        }
        return;
      }

      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error("User not authenticated");
        }

        const submitBtn = document.getElementById("submitTicket");
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Creating...";
        }

        const ticketData = {
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName || user.email.split('@')[0],
          subject: subject,
          category: category,
          message: message,
          status: "open",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          replies: []
        };

        await db.collection('tickets').add(ticketData);

        // Close modal
        createTicketModal.classList.add("hidden");
        createTicketForm.reset();
        
        // Refresh tickets if on support page
        if (!supportContent.classList.contains("hidden")) {
          await loadTickets();
        }
        
        // Also refresh dashboard if visible
        if (!dashboardContent.classList.contains("hidden")) {
          await loadDashboard();
        }
        
      } catch (error) {
        console.error("Create ticket error:", error);
        if (errorEl) {
          errorEl.textContent = error.message;
          errorEl.style.display = "block";
        }
      } finally {
        const submitBtn = document.getElementById("submitTicket");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `Submit Ticket`;
        }
      }
    });
  }

  // Load user tickets
  async function loadTickets() {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const ticketsSnapshot = await db.collection('tickets')
        .where('userId', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .get();

      const tickets = [];
      ticketsSnapshot.forEach(doc => {
        tickets.push({
          id: doc.id,
          ...doc.data()
        });
      });

      displayTickets(tickets);
    } catch (error) {
      console.error("Load tickets error:", error);
    }
  }

  // Display tickets
  function displayTickets(tickets) {
    const ticketsList = document.getElementById("ticketsList");
    const ticketsEmpty = document.getElementById("ticketsEmpty");

    if (!ticketsList || !ticketsEmpty) return;

    if (tickets.length === 0) {
      ticketsEmpty.classList.remove("hidden");
      ticketsList.innerHTML = "";
    } else {
      ticketsEmpty.classList.add("hidden");

      const ticketsHTML = tickets
        .map(
          (ticket) => `
        <div class="ticket-card" onclick="viewTicket('${ticket.id}')">
          <div class="ticket-card-header">
            <div>
              <div class="ticket-card-title">${ticket.subject}</div>
              <div class="ticket-card-id">Ticket #${ticket.id.substring(0, 8)}</div>
            </div>
            <span class="ticket-status-badge ${ticket.status}">${ticket.status.replace("_", " ")}</span>
          </div>
          <div class="ticket-card-meta">
            ${formatDate(ticket.createdAt)}
          </div>
          <div class="ticket-card-message">${ticket.message.substring(0, 100)}${ticket.message.length > 100 ? '...' : ''}</div>
          ${
            ticket.replies && ticket.replies.length > 0
              ? `
            <div class="ticket-card-footer">
              <span class="ticket-card-replies">
                ${ticket.replies.length} ${ticket.replies.length === 1 ? "reply" : "replies"}
              </span>
            </div>
          `
              : ""
          }
        </div>
      `
        )
        .join("");

      ticketsList.innerHTML = ticketsHTML;
    }
  }

  // View ticket details
  window.viewTicket = async function(ticketId) {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const ticketDoc = await db.collection('tickets').doc(ticketId).get();

      if (!ticketDoc.exists) {
        throw new Error("Ticket not found");
      }

      const ticket = {
        id: ticketDoc.id,
        ...ticketDoc.data()
      };

      currentTicket = ticket;

      // Populate modal
      document.getElementById("viewTicketSubject").textContent = ticket.subject;
      document.getElementById("viewTicketId").textContent = `Ticket #${ticket.id.substring(0, 8)}`;
      document.getElementById("viewTicketStatus").textContent = ticket.status.replace("_", " ");
      document.getElementById("viewTicketStatus").className = `ticket-status-badge ${ticket.status}`;
      document.getElementById("viewTicketCategory").textContent = ticket.category || "-";
      document.getElementById("viewTicketDate").textContent = formatDate(ticket.createdAt);
      document.getElementById("viewTicketMessage").textContent = ticket.message;

      // Display replies
      displayTicketReplies(ticket.replies || []);

      // Show modal
      viewTicketModal.classList.remove("hidden");
    } catch (error) {
      console.error("View ticket error:", error);
      alert("Failed to load ticket details");
    }
  };

  // Display ticket replies
  function displayTicketReplies(replies) {
    const messagesContainer = document.getElementById("ticketMessages");

    if (!messagesContainer) return;

    if (replies.length === 0) {
      messagesContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No replies yet</p>';
    } else {
      const repliesHTML = replies
        .map(
          (reply) => `
        <div class="ticket-message ${reply.userType}">
          <div class="message-avatar">${reply.userType === "admin" ? "A" : "U"}</div>
          <div class="message-content">
            <div class="message-header">
              <span class="message-author">${reply.userType === "admin" ? "Support Team" : "You"}</span>
              <span class="message-time">${formatDate(reply.createdAt)}</span>
            </div>
            <div class="message-text">${reply.message}</div>
          </div>
        </div>
      `
        )
        .join("");

      messagesContainer.innerHTML = repliesHTML;
    }
  }

  // Reply to ticket
  if (replyTicketForm) {
    replyTicketForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const message = document.getElementById("replyMessage").value;

      if (!message || !currentTicket) {
        return;
      }

      try {
        const user = auth.currentUser;
        if (!user) return;

        // Get current ticket to access existing replies
        const ticketRef = db.collection('tickets').doc(currentTicket.id);
        const ticketDoc = await ticketRef.get();
        
        if (!ticketDoc.exists) {
          throw new Error("Ticket not found");
        }
        
        const ticketData = ticketDoc.data();
        const currentReplies = ticketData.replies || [];
        
        // Create new reply with client-side timestamp
        const newReply = {
          message: message,
          userType: "user",
          userId: user.uid,
          createdAt: new Date().toISOString() // Use client timestamp instead of serverTimestamp
        };

        // Update with the entire replies array (not arrayUnion)
        await ticketRef.update({
          replies: [...currentReplies, newReply],
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Reload ticket
        await viewTicket(currentTicket.id);

        // Clear form
        document.getElementById("replyMessage").value = "";
        const errorEl = document.getElementById("replyError");
        if (errorEl) errorEl.textContent = "";
      } catch (error) {
        console.error("Reply error:", error);
        const errorEl = document.getElementById("replyError");
        if (errorEl) {
          errorEl.textContent = error.message;
          errorEl.style.display = "block";
        }
      }
    });
  }

  // Close view ticket modal
  const closeViewTicketModal = document.getElementById("closeViewTicketModal");
  if (closeViewTicketModal) {
    closeViewTicketModal.addEventListener("click", () => {
      viewTicketModal.classList.add("hidden");
      currentTicket = null;
    });
  }

  // Load wallet addresses for investment modal
  async function loadWalletAddresses() {
    try {
      const adminWallets = await getAdminWalletAddresses();

      // Update each cryptocurrency's wallet address display
      const cryptos = ["BTC", "ETH", "USDT", "BNB", "SOL", "ADA"];

      cryptos.forEach((crypto) => {
        const walletDiv = document.getElementById(`wallet-${crypto}`);
        if (walletDiv) {
          const addressSpan = walletDiv.querySelector(".wallet-address");
          const copyBtn = walletDiv.querySelector(".copy-wallet-btn");
          const address = adminWallets[crypto];

          if (address && address.trim()) {
            addressSpan.textContent = address;
            addressSpan.dataset.address = address;
            addressSpan.style.color = "var(--text-primary)";
            if (copyBtn) copyBtn.style.display = "inline-flex";
          } else {
            addressSpan.textContent = "Not configured";
            addressSpan.dataset.address = "";
            addressSpan.style.color = "var(--text-secondary)";
            if (copyBtn) copyBtn.style.display = "none";
          }
        }
      });
    } catch (error) {
      console.error("Error loading wallet addresses:", error);
    }
  }

  window.copyWalletAddress = function(crypto) {
    const walletDiv = document.getElementById(`wallet-${crypto}`);
    if (!walletDiv) return;

    const addressSpan = walletDiv.querySelector(".wallet-address");
    const address = addressSpan.dataset.address;

    if (!address || address === "Not configured") {
      alert("Wallet address not configured. Please contact support.");
      return;
    }

    navigator.clipboard
      .writeText(address)
      .then(() => {
        const btn = walletDiv.querySelector(".copy-wallet-btn");
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<span style="font-size: 12px;">✓</span>';
        btn.style.background = "#10b981";

        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.style.background = "";
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        alert("Failed to copy address");
      });
  };

  // Withdrawal functionality
  const withdrawalForm = document.getElementById("withdrawalForm");
  if (withdrawalForm) {
    withdrawalForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const amount = Number.parseFloat(document.getElementById("withdrawalAmount").value);
      const cryptocurrency = document.getElementById("withdrawalCryptocurrency").value;
      const walletAddress = document.getElementById("withdrawalWallet").value;
      const errorEl = document.getElementById("withdrawalError");

      if (errorEl) {
        errorEl.style.display = "none";
        errorEl.textContent = "";
      }

      if (amount <= 0) {
        if (errorEl) {
          errorEl.textContent = "Please enter a valid amount";
          errorEl.style.display = "block";
        }
        return;
      }

      if (!cryptocurrency || !walletAddress) {
        if (errorEl) {
          errorEl.textContent = "Please select cryptocurrency and enter wallet address";
          errorEl.style.display = "block";
        }
        return;
      }

      if (walletAddress.length < 10) {
        if (errorEl) {
          errorEl.textContent = "Please enter a valid wallet address";
          errorEl.style.display = "block";
        }
        return;
      }

      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error("User not authenticated");
        }

        // Disable submit button
        const submitBtn = withdrawalForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Processing...";
        }

        // Create withdrawal in Firestore
        const withdrawalData = {
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName || user.email.split('@')[0],
          amount: amount,
          cryptocurrency: cryptocurrency,
          walletAddress: walletAddress,
          status: "pending",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('withdrawals').add(withdrawalData);

        // Update user balance
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const newBalance = (userData.currentBalance || 0) - amount;

          await db.collection('users').doc(user.uid).update({
            currentBalance: newBalance < 0 ? 0 : newBalance,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }

        // Show success message
        alert("✓ Withdrawal request submitted successfully! Status: Pending");

        // Reset form
        withdrawalForm.reset();

        // Reload withdrawals immediately
        await loadWithdrawals();

        // Also reload dashboard to update balance
        await loadDashboard();

      } catch (error) {
        console.error("Withdrawal error:", error);
        if (errorEl) {
          errorEl.textContent = error.message;
          errorEl.style.display = "block";
        }
      } finally {
        // Re-enable submit button
        const submitBtn = withdrawalForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `Request Withdrawal`;
        }
      }
    });
  }

 
async function loadWithdrawals() {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const withdrawalsSnapshot = await db.collection('withdrawals')
      .where('userId', '==', user.uid)
      .get();

    const withdrawals = [];
    withdrawalsSnapshot.forEach(doc => {
      withdrawals.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sort in JavaScript
    withdrawals.sort((a, b) => {
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return bDate - aDate;
    });

    displayWithdrawals(withdrawals);
  } catch (error) {
    console.error("Load withdrawals error:", error);
  }
}

  // Display withdrawals function
  function displayWithdrawals(withdrawals) {
    const withdrawalsList = document.getElementById("withdrawalsList");
    const withdrawalsEmpty = document.getElementById("withdrawalsEmpty");
    const withdrawalCount = document.getElementById("withdrawalCount");

    if (!withdrawalsList || !withdrawalsEmpty || !withdrawalCount) return;

    if (!withdrawals || withdrawals.length === 0) {
      withdrawalsEmpty.classList.remove("hidden");
      withdrawalsList.classList.add("hidden");
      withdrawalCount.textContent = "0 withdrawals";
      return;
    }

    withdrawalsEmpty.classList.add("hidden");
    withdrawalsList.classList.remove("hidden");
    withdrawalCount.textContent = `${withdrawals.length} withdrawal${withdrawals.length !== 1 ? "s" : ""}`;

    withdrawalsList.innerHTML = withdrawals
      .map(
        (withdrawal) => `
      <div class="payment-item">
        <div class="payment-info">
          <h4>Withdrawal Request</h4>
          <div class="payment-meta">
            ${formatDate(withdrawal.createdAt)} |
            ${withdrawal.cryptocurrency}: ${withdrawal.walletAddress.substring(0, 10)}...
          </div>
        </div>
        <div style="text-align: right;">
          <div class="payment-amount">${formatCurrency(withdrawal.amount)}</div>
          <span class="payment-status ${withdrawal.status}">
            ${withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
          </span>
        </div>
      </div>
    `)
      .join("");
  }

  // Close modal buttons
  const closeButtons = document.querySelectorAll(".modal-close, .btn-secondary");
  closeButtons.forEach(btn => {
    btn.addEventListener("click", function() {
      const modal = this.closest(".modal-overlay");
      if (modal) modal.classList.add("hidden");
    });
  });

  // Auto-refresh dashboard every 30 seconds
  setInterval(() => {
    const currentSection = document.querySelector(".nav-item.active")?.dataset.section;
    if (currentSection === "dashboard") {
      loadDashboard();
    } else if (currentSection === "withdrawals") {
      loadWithdrawals();
    } else if (currentSection === "support") {
      loadTickets();
    }
  }, 30000);

  console.log("Dashboard.js initialization complete");
});

// Function to load ALL tickets for dashboard
// Function to load ALL tickets for dashboard - FIXED VERSION
async function loadDashboardTickets() {
  try {
    const user = auth.currentUser;
    if (!user) return [];

    // First, get all tickets for the user (this uses the automatic userId index)
    const ticketsSnapshot = await db.collection('tickets')
      .where('userId', '==', user.uid)
      .get();

    const tickets = [];
    ticketsSnapshot.forEach(doc => {
      tickets.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Then sort by createdAt in JavaScript (not in the query)
    tickets.sort((a, b) => {
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return bDate - aDate;
    });

    // Return only the last 5
    return tickets.slice(0, 5);
  } catch (error) {
    console.error("Load dashboard tickets error:", error);
    return [];
  }
}


// ============ INVESTMENT PLAN SELECTION ============

let selectedPlan = {
    id: '',
    name: '',
    min: 0,
    max: 0
};

// Show plans section and hide investment form
document.getElementById("showPlansBtn").addEventListener("click", function() {
    document.getElementById("investmentPlansSection").classList.remove("hidden");
    document.getElementById("investmentFormSection").classList.add("hidden");
});

// Select a plan
window.selectPlan = function(planId, planName, minAmount, maxAmount) {
    selectedPlan = {
        id: planId,
        name: planName,
        min: minAmount,
        max: maxAmount
    };
    
    // Update UI
    document.getElementById("selectedPlanName").textContent = planName;
    document.getElementById("selectedPlanRoi").textContent = document.querySelector(`.plan-card[onclick*="${planId}"] .plan-roi`).textContent;
    document.getElementById("selectedPlanMin").textContent = minAmount > 0 ? `$${minAmount.toLocaleString()}` : 'No minimum';
    document.getElementById("selectedPlanMax").textContent = maxAmount > 0 ? `$${maxAmount.toLocaleString()}` : 'No maximum';
    
    // Update amount input constraints
    const amountInput = document.getElementById("investAmount");
    if (minAmount > 0) {
        amountInput.min = minAmount;
        amountInput.placeholder = `Min $${minAmount.toLocaleString()}`;
        document.getElementById("amountHint").textContent = `Minimum: $${minAmount.toLocaleString()} | Maximum: $${maxAmount.toLocaleString()}`;
    } else {
        amountInput.min = 100;
        amountInput.placeholder = "Enter amount";
        document.getElementById("amountHint").textContent = "Minimum: $100";
    }
    
    // Load crypto options
    loadCryptoOptions();
    
    // Hide plans, show investment form
    document.getElementById("investmentPlansSection").classList.add("hidden");
    document.getElementById("investmentFormSection").classList.remove("hidden");
    
    // Reset form
    document.getElementById("investmentForm").reset();
    document.getElementById("walletAddressContainer").classList.add("hidden");
    document.getElementById("submitInvest").disabled = true;
};

// Go back to plans
window.backToPlans = function() {
    document.getElementById("investmentPlansSection").classList.remove("hidden");
    document.getElementById("investmentFormSection").classList.add("hidden");
    document.getElementById("walletAddressContainer").classList.add("hidden");
};

// Load crypto options
async function loadCryptoOptions() {
    const cryptoGrid = document.getElementById("cryptoGrid");
    const cryptos = [
        { symbol: "BTC", name: "Bitcoin", icon: "₿", class: "btc" },
        { symbol: "ETH", name: "Ethereum", icon: "Ξ", class: "eth" },
        { symbol: "USDT", name: "Tether", icon: "₮", class: "usdt" },
        { symbol: "BNB", name: "Binance Coin", icon: "B", class: "bnb" },
        { symbol: "SOL", name: "Solana", icon: "◎", class: "sol" },
        { symbol: "ADA", name: "Cardano", icon: "₳", class: "ada" },
        { symbol: "TRX", name: "Tron", icon: "", class: "trx"}
    ];
    
    let html = '';
    cryptos.forEach(crypto => {
        html += `
            <label class="crypto-card">
                <input type="radio" name="cryptocurrency" value="${crypto.symbol}" onchange="onCryptoSelect('${crypto.symbol}')">
                <div class="crypto-content">
                    <div class="crypto-icon ${crypto.class}">${crypto.icon}</div>
                    <div class="crypto-info">
                        <div class="crypto-name">${crypto.name}</div>
                        <div class="crypto-symbol">${crypto.symbol}</div>
                    </div>
                    <div class="crypto-check">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="20 6 9 17 4 12" stroke-width="2"/>
                        </svg>
                    </div>
                </div>
            </label>
        `;
    });
    
    cryptoGrid.innerHTML = html;
    
    // Load wallet addresses
    await loadWalletAddresses();
}

// Handle crypto selection
window.onCryptoSelect = async function(crypto) {
    const adminWallets = await getAdminWalletAddresses();
    const address = adminWallets[crypto];
    
    const container = document.getElementById("walletAddressContainer");
    const addressText = document.getElementById("walletAddressText");
    
    if (address && address.trim()) {
        addressText.textContent = address;
        addressText.dataset.address = address;
        container.classList.remove("hidden");
        
        // Enable submit button if amount is valid
        validateAmount();
    } else {
        addressText.textContent = "Wallet address not configured. Please contact support.";
        container.classList.remove("hidden");
        document.getElementById("submitInvest").disabled = true;
    }
};

// Validate amount based on selected plan
window.validateAmount = function() {
    const amount = parseFloat(document.getElementById("investAmount").value) || 0;
    const cryptoSelected = document.querySelector('input[name="cryptocurrency"]:checked');
    const submitBtn = document.getElementById("submitInvest");
    const amountError = document.getElementById("amountError");
    
    if (!cryptoSelected) {
        submitBtn.disabled = true;
        return;
    }
    
    if (selectedPlan.min > 0 && amount < selectedPlan.min) {
        amountError.textContent = `Amount must be at least $${selectedPlan.min.toLocaleString()}`;
        amountError.classList.remove("hidden");
        submitBtn.disabled = true;
    } else if (selectedPlan.max > 0 && amount > selectedPlan.max) {
        amountError.textContent = `Amount cannot exceed $${selectedPlan.max.toLocaleString()}`;
        amountError.classList.remove("hidden");
        submitBtn.disabled = true;
    } else if (amount < 100) {
        amountError.textContent = "Amount must be at least $100";
        amountError.classList.remove("hidden");
        submitBtn.disabled = true;
    } else {
        amountError.classList.add("hidden");
        submitBtn.disabled = false;
    }
};

// Copy wallet address
window.copySelectedWalletAddress = function() {
    const addressSpan = document.getElementById("walletAddressText");
    const address = addressSpan.dataset.address;
    
    if (!address) {
        alert("Wallet address not available");
        return;
    }
    
    navigator.clipboard.writeText(address).then(() => {
        const btn = document.querySelector(".copy-wallet-btn");
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<span style="font-size: 12px;">✓ Copied!</span>';
        btn.style.background = "#10b981";
        btn.style.color = "white";
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = "";
            btn.style.color = "";
        }, 2000);
    });
};

// Get admin wallet addresses
async function getAdminWalletAddresses() {
    try {
        const adminDoc = await db.collection('adminSettings').doc('wallets').get();
        return adminDoc.exists ? adminDoc.data() : {};
    } catch (error) {
        console.error("Error getting wallets:", error);
        return {};
    }
}

// Load wallet addresses for crypto grid
async function loadWalletAddresses() {
    const adminWallets = await getAdminWalletAddresses();
    
    // Store in data attributes for later use
    Object.keys(adminWallets).forEach(crypto => {
        const radio = document.querySelector(`input[value="${crypto}"]`);
        if (radio) {
            radio.dataset.address = adminWallets[crypto];
        }
    });
}

// Update your existing investment form submission
const investmentForm = document.getElementById("investmentForm");
if (investmentForm) {
    investmentForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const cryptocurrency = document.querySelector('input[name="cryptocurrency"]:checked')?.value;
        const amount = Number.parseFloat(document.getElementById("investAmount").value);

        if (!cryptocurrency || !amount) {
            document.getElementById("investmentError").textContent = "Please select cryptocurrency and enter amount";
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("User not authenticated");

            const submitBtn = document.getElementById("submitInvest");
            submitBtn.disabled = true;
            submitBtn.textContent = "Processing...";

            const adminWallets = await getAdminWalletAddresses();
            const walletAddress = adminWallets[cryptocurrency] || "Not configured";

            // Create investment request
            const investmentRequestData = {
                userId: user.uid,
                userEmail: user.email,
                userName: user.displayName || user.email.split("@")[0],
                amount: amount,
                cryptocurrency: cryptocurrency,
                walletAddress: walletAddress,
                transactionId: `INV${Date.now()}`,
                status: "pending",
                plan: selectedPlan.name,
                planId: selectedPlan.id,
                description: `${selectedPlan.name} - ${cryptocurrency} Investment`,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection("investmentRequests").add(investmentRequestData);

            // Reset and show success
            investmentForm.reset();
            document.getElementById("walletAddressContainer").classList.add("hidden");
            document.getElementById("investmentPlansSection").classList.remove("hidden");
            document.getElementById("investmentFormSection").classList.add("hidden");

            alert(
                `✅ Investment request submitted successfully!\n\n` +
                `Plan: ${selectedPlan.name}\n` +
                `Amount: $${amount.toLocaleString()}\n` +
                `Status: Pending Approval\n\n` +
                `Your investment is awaiting admin approval.`
            );

        } catch (error) {
            console.error("Investment error:", error);
            document.getElementById("investmentError").textContent = error.message;
        } finally {
            const submitBtn = document.getElementById("submitInvest");
            submitBtn.disabled = false;
            submitBtn.innerHTML = `Confirm Investment`;
        }
    });
}