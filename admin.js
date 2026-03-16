// admin.js - Complete  Admin Panel
document.addEventListener('DOMContentLoaded', function() {
  console.log("Admin.js loaded");
  
  // Get  services
  const auth = window.auth || firebase.auth();
  const db = window.db || firebase.firestore();
  
  // Check authentication and admin role
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/auth.html";
      return;
    }
    
    // Check if user is admin
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== "admin") {
      window.location.href = "/dashboard.html";
      return;
    }
    
    // User is admin, set up admin panel
    initializeAdminPanel(user);
  });

  // Navigation
  const navItems = document.querySelectorAll(".nav-item");
  const usersContent = document.getElementById("usersContent");
  const investmentsContent = document.getElementById("investmentsContent");
  const withdrawalsContent = document.getElementById("withdrawalsContent");
  const walletsContent = document.getElementById("walletsContent");
  const supportContent = document.getElementById("supportContent");
  const adminProfileContent = document.getElementById("adminProfileContent");
  const loadingState = document.getElementById("loadingState");

  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const section = item.dataset.section;

      navItems.forEach((nav) => nav.classList.remove("active"));
      item.classList.add("active");

      // Hide all content sections
      [usersContent, investmentsContent, withdrawalsContent, walletsContent, supportContent, adminProfileContent].forEach(content => {
        if (content) content.classList.add("hidden");
      });

      if (loadingState) loadingState.classList.remove("hidden");

      if (section === "users") {
        if (usersContent) {
          setTimeout(() => {
            usersContent.classList.remove("hidden");
            if (loadingState) loadingState.classList.add("hidden");
          }, 500);
        }
        loadUsers();
      } else if (section === "investments") {
        if (investmentsContent) {
          setTimeout(() => {
            investmentsContent.classList.remove("hidden");
            if (loadingState) loadingState.classList.add("hidden");
          }, 500);
        }
        loadInvestmentRequests();
      } else if (section === "withdrawals") {
        if (withdrawalsContent) {
          setTimeout(() => {
            withdrawalsContent.classList.remove("hidden");
            if (loadingState) loadingState.classList.add("hidden");
          }, 500);
        }
        loadWithdrawals();
      } else if (section === "wallets") {
        if (walletsContent) {
          setTimeout(() => {
            walletsContent.classList.remove("hidden");
            if (loadingState) loadingState.classList.add("hidden");
          }, 500);
        }
        loadWalletAddresses();
      } else if (section === "support") {
        if (supportContent) {
          setTimeout(() => {
            supportContent.classList.remove("hidden");
            if (loadingState) loadingState.classList.add("hidden");
          }, 500);
        }
        loadSupportTickets();
      } else if (section === "admin-profile") {
        if (adminProfileContent) {
          setTimeout(() => {
            adminProfileContent.classList.remove("hidden");
            if (loadingState) loadingState.classList.add("hidden");
          }, 500);
        }
        loadAdminProfile();
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

  // Refresh button
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      const currentSection = document.querySelector(".nav-item.active")?.dataset.section;
      if (currentSection === "users") loadUsers();
      else if (currentSection === "investments") loadInvestmentRequests();
      else if (currentSection === "withdrawals") loadWithdrawals();
      else if (currentSection === "wallets") loadWalletAddresses();
      else if (currentSection === "support") loadSupportTickets();
      else if (currentSection === "admin-profile") loadAdminProfile();
    });
  }

  // Initialize admin panel
  function initializeAdminPanel(user) {
    console.log("Initializing admin panel for user:", user.uid);
    
    const adminEmailEl = document.getElementById("adminEmail");
    const adminNameEl = document.getElementById("adminName");
    const adminAvatarEl = document.getElementById("adminAvatar");
    
    if (adminEmailEl) adminEmailEl.textContent = user.email;
    if (adminNameEl) adminNameEl.textContent = user.displayName || "Admin";
    if (adminAvatarEl) adminAvatarEl.textContent = (user.displayName || "A").charAt(0).toUpperCase();
    
    loadUsers();
  }

  // Format currency
  function formatCurrency(amount) {
    if (isNaN(amount) || amount === null || amount === undefined) amount = 0;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  // Format date
  function formatDate(dateString) {
    if (!dateString) return "Unknown date";
    try {
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

  // ============ ADMIN PROFILE FUNCTIONS ============
  
  async function loadAdminProfile() {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await db.collection('users').doc(user.uid).get();
      if (!userDoc.exists) return;

      const profile = userDoc.data();

      document.getElementById("adminDisplayName").textContent = profile.fullName || user.displayName || user.email.split('@')[0];
      document.getElementById("adminDisplayEmail").textContent = profile.email || user.email;
      document.getElementById("adminDisplayRole").textContent = profile.role || "admin";
      document.getElementById("adminDisplayDate").textContent = formatDate(profile.createdAt || user.metadata.creationTime);
      document.getElementById("adminDisplayLastLogin").textContent = formatDate(user.metadata.lastSignInTime);

      document.getElementById("adminEditFullName").value = profile.fullName || user.displayName || "";
      document.getElementById("adminEditEmail").value = profile.email || user.email;
      document.getElementById("adminEditPhone").value = profile.phone || "";

      await loadAdminActivityStats();

    } catch (error) {
      console.error("Admin profile load error:", error);
    }
  }

  async function loadAdminActivityStats() {
    try {
      const [usersCount, investmentsCount, withdrawalsCount, ticketsCount] = await Promise.all([
        db.collection('users').where('role', '!=', 'admin').get(),
        db.collection('investmentRequests').get(),
        db.collection('withdrawals').get(),
        db.collection('tickets').get()
      ]);

      document.getElementById("totalUsersManaged").textContent = usersCount.size;
      document.getElementById("totalInvestmentsProcessed").textContent = investmentsCount.size;
      document.getElementById("totalWithdrawalsProcessed").textContent = withdrawalsCount.size;
      document.getElementById("totalTicketsHandled").textContent = ticketsCount.size;

    } catch (error) {
      console.error("Error loading admin stats:", error);
    }
  }

  // Admin profile edit
  const editAdminProfileBtn = document.getElementById("editAdminProfileBtn");
  const cancelAdminEditBtn = document.getElementById("cancelAdminEdit");
  const adminProfileDisplay = document.getElementById("adminProfileDisplay");
  const adminProfileEditForm = document.getElementById("adminProfileEditForm");

  if (editAdminProfileBtn) {
    editAdminProfileBtn.addEventListener("click", () => {
      adminProfileDisplay.classList.add("hidden");
      adminProfileEditForm.classList.remove("hidden");
      editAdminProfileBtn.classList.add("hidden");
    });
  }

  if (cancelAdminEditBtn) {
    cancelAdminEditBtn.addEventListener("click", () => {
      adminProfileDisplay.classList.remove("hidden");
      adminProfileEditForm.classList.add("hidden");
      editAdminProfileBtn.classList.remove("hidden");
      document.getElementById("adminProfileError").textContent = "";
    });
  }

  const adminProfileForm = document.getElementById("adminProfileForm");
  if (adminProfileForm) {
    adminProfileForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const fullName = document.getElementById("adminEditFullName").value;
      const email = document.getElementById("adminEditEmail").value;
      const phone = document.getElementById("adminEditPhone").value;

      try {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        await user.updateProfile({ displayName: fullName });

        const updateData = {
          fullName: fullName,
          email: email,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (phone) updateData.phone = phone;

        await db.collection('users').doc(user.uid).update(updateData);

        document.getElementById("adminName").textContent = fullName;
        document.getElementById("adminEmail").textContent = email;
        document.getElementById("adminAvatar").textContent = fullName.charAt(0).toUpperCase();

        await loadAdminProfile();

        adminProfileDisplay.classList.remove("hidden");
        adminProfileEditForm.classList.add("hidden");
        editAdminProfileBtn.classList.remove("hidden");
        
        alert("Admin profile updated successfully!");

      } catch (error) {
        console.error("Admin profile update error:", error);
        document.getElementById("adminProfileError").textContent = error.message;
      }
    });
  }

  // Admin password change
  const adminPasswordForm = document.getElementById("adminPasswordForm");
  if (adminPasswordForm) {
    adminPasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const currentPassword = document.getElementById("adminCurrentPassword").value;
      const newPassword = document.getElementById("adminNewPassword").value;
      const confirmPassword = document.getElementById("adminConfirmPassword").value;
      const errorEl = document.getElementById("adminPasswordError");

      if (newPassword !== confirmPassword) {
        errorEl.textContent = "New passwords do not match";
        return;
      }

      if (newPassword.length < 6) {
        errorEl.textContent = "Password must be at least 6 characters";
        return;
      }

      try {
        const user = auth.currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(newPassword);

        adminPasswordForm.reset();
        errorEl.style.display = "none";
        alert("Password updated successfully!");
      } catch (error) {
        console.error("Password update error:", error);
        if (error.code === 'auth/wrong-password') {
          errorEl.textContent = "Current password is incorrect";
        } else {
          errorEl.textContent = error.message;
        }
      }
    });
  }

  // ============ USER MANAGEMENT ============
  
  async function loadUsers() {
    try {
      const usersSnapshot = await db.collection('users').get();
      const users = [];
      usersSnapshot.forEach(doc => {
        users.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      displayUsers(users);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  }

  function displayUsers(users) {
    const usersGrid = document.getElementById("usersGrid");
    if (!usersGrid) return;

    if (users.length === 0) {
      usersGrid.innerHTML = '<div class="empty-state">No users found</div>';
      return;
    }

    const usersHTML = users
      .filter(user => user.role !== "admin")
      .map(user => `
        <div class="user-card" data-user-id="${user.id}">
          <div class="user-card-header">
            <div class="user-avatar">${user.fullName?.charAt(0) || user.email.charAt(0)}</div>
            <div>
              <h3 class="user-name">${user.fullName || "User"}</h3>
              <p class="user-email">${user.email}</p>
            </div>
            <span class="user-role">${user.role || "user"}</span>
          </div>
          <div class="user-stats">
            <div class="user-stat">
              <span class="stat-label">Investment</span>
              <span class="stat-value">${formatCurrency(user.investmentAmount || 0)}</span>
            </div>
            <div class="user-stat">
              <span class="stat-label">Balance</span>
              <span class="stat-value">${formatCurrency(user.currentBalance || 0)}</span>
            </div>
            <div class="user-stat">
              <span class="stat-label">Profit</span>
              <span class="stat-value ${(user.profitLoss || 0) >= 0 ? 'positive' : 'negative'}">
                ${formatCurrency(user.profitLoss || 0)}
              </span>
            </div>
          </div>
          <div class="user-actions">
            <button style="padding: 10px; bnprder-radius:10px;" class="btn-edit" onclick="editUser('${user.id}')">Edit User</button>
          </div>
        </div>
      `).join('');

    usersGrid.innerHTML = usersHTML;
  }

  // ============ ENHANCED USER EDIT ============

  window.editUser = async function(userId) {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) throw new Error("User not found");

      const user = userDoc.data();
      
      // Populate all fields
      document.getElementById("editUserId").value = userId;
      document.getElementById("editFullName").value = user.fullName || '';
      document.getElementById("editEmail").value = user.email || '';
      document.getElementById("editPhone").value = user.phone || '';
      document.getElementById("editInvestmentAmount").value = user.investmentAmount || 0;
      document.getElementById("editCurrentBalance").value = user.currentBalance || 0;
      document.getElementById("editProfitLoss").value = user.profitLoss || 0;
      document.getElementById("editProfitPercentage").value = user.profitPercentage || 0;
      document.getElementById("editUserRole").value = user.role || 'user';
      document.getElementById("editUserDisplayId").textContent = userId;
      document.getElementById("editUserDisplayEmail").textContent = user.email;
      
      // Update profit preview
      updateProfitPreview();
      
      // Load user activity
      await loadUserActivity(userId);
      
      // Hide old modal if visible, show new one
      document.getElementById("editModal").classList.add("hidden");
      document.getElementById("fullEditUserModal").classList.remove("hidden");
      
    } catch (error) {
      console.error("Error loading user:", error);
      alert("Failed to load user data");
    }
  };

  async function loadUserActivity(userId) {
    try {
      const activityList = document.getElementById("userActivityList");
      if (!activityList) return;
      
      const [investments, withdrawals, tickets] = await Promise.all([
        db.collection('investmentRequests').where('userId', '==', userId).orderBy('createdAt', 'desc').limit(5).get(),
        db.collection('withdrawals').where('userId', '==', userId).orderBy('createdAt', 'desc').limit(5).get(),
        db.collection('tickets').where('userId', '==', userId).orderBy('createdAt', 'desc').limit(5).get()
      ]);
      
      let html = '';
      
      if (!investments.empty) {
        html += '<div class="activity-group"><h5>📈 Recent Investments</h5>';
        investments.forEach(doc => {
          const inv = doc.data();
          html += `
            <div class="activity-row">
              <span class="activity-crypto">${inv.cryptocurrency || 'N/A'}</span>
              <span class="activity-amount">${formatCurrency(inv.amount || 0)}</span>
              <span class="activity-status status-${inv.status || 'pending'}">${inv.status || 'pending'}</span>
              <span class="activity-date">${formatDate(inv.createdAt)}</span>
            </div>
          `;
        });
        html += '</div>';
      }
      
      if (!withdrawals.empty) {
        html += '<div class="activity-group"><h5>💸 Recent Withdrawals</h5>';
        withdrawals.forEach(doc => {
          const wd = doc.data();
          html += `
            <div class="activity-row">
              <span class="activity-crypto">${wd.cryptocurrency || 'N/A'}</span>
              <span class="activity-amount">${formatCurrency(wd.amount || 0)}</span>
              <span class="activity-status status-${wd.status || 'pending'}">${wd.status || 'pending'}</span>
              <span class="activity-date">${formatDate(wd.createdAt)}</span>
            </div>
          `;
        });
        html += '</div>';
      }
      
      if (!tickets.empty) {
        html += '<div class="activity-group"><h5>🎫 Recent Tickets</h5>';
        tickets.forEach(doc => {
          const ticket = doc.data();
          html += `
            <div class="activity-row">
              <span class="activity-subject">${ticket.subject?.substring(0, 30) || 'No subject'}</span>
              <span class="activity-status status-${ticket.status || 'open'}">${ticket.status || 'open'}</span>
              <span class="activity-date">${formatDate(ticket.createdAt)}</span>
            </div>
          `;
        });
        html += '</div>';
      }
      
      if (investments.empty && withdrawals.empty && tickets.empty) {
        html = '<p class="no-activity">No recent activity found</p>';
      }
      
      activityList.innerHTML = html;
      
    } catch (error) {
      console.error("Error loading user activity:", error);
    }
  }

  function updateProfitPreview() {
    const investment = parseFloat(document.getElementById("editInvestmentAmount")?.value) || 0;
    const balance = parseFloat(document.getElementById("editCurrentBalance")?.value) || 0;
    const profit = balance - investment;
    const percentage = investment > 0 ? (profit / investment) * 100 : 0;
    
    document.getElementById("editProfitLoss").value = profit.toFixed(2);
    document.getElementById("editProfitPercentage").value = percentage.toFixed(2);
    
    const profitPreview = document.getElementById("profitPreview");
    if (profitPreview) {
      profitPreview.innerHTML = `
        <strong>Profit Preview:</strong>
        <span class="${profit >= 0 ? 'positive' : 'negative'}">
          ${formatCurrency(profit)} (${percentage.toFixed(2)}%)
        </span>
      `;
    }
  }

  // Add input listeners
  document.getElementById("editInvestmentAmount")?.addEventListener("input", updateProfitPreview);
  document.getElementById("editCurrentBalance")?.addEventListener("input", updateProfitPreview);

  // Save user edits
  const fullEditUserForm = document.getElementById("fullEditUserForm");
  if (fullEditUserForm) {
    fullEditUserForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const userId = document.getElementById("editUserId").value;
      
      const updateData = {
        fullName: document.getElementById("editFullName").value,
        email: document.getElementById("editEmail").value,
        phone: document.getElementById("editPhone").value || null,
        role: document.getElementById("editUserRole").value,
        investmentAmount: parseFloat(document.getElementById("editInvestmentAmount").value) || 0,
        currentBalance: parseFloat(document.getElementById("editCurrentBalance").value) || 0,
        profitLoss: parseFloat(document.getElementById("editProfitLoss").value) || 0,
        profitPercentage: parseFloat(document.getElementById("editProfitPercentage").value) || 0,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      try {
        await db.collection('users').doc(userId).update(updateData);
        
        alert("✅ User updated successfully!");
        document.getElementById("fullEditUserModal").classList.add("hidden");
        loadUsers();
        
      } catch (error) {
        console.error("Error updating user:", error);
        alert("Failed to update user: " + error.message);
      }
    });
  }

  // Delete user
  // Delete user function - COMPLETE WORKING VERSION
window.deleteUser = async function() {
    // Get user details from the modal
    const userId = document.getElementById("editUserId").value;
    const userName = document.getElementById("editFullName").value || document.getElementById("editUserDisplayEmail").textContent;
    const userEmail = document.getElementById("editUserDisplayEmail").textContent;
    
    if (!userId) {
        alert("User ID not found");
        return;
    }
    
    // Create custom confirmation dialog
    const confirmation = confirm(`⚠️ DELETE USER: ${userName}\n\nEmail: ${userEmail}\n\nThis action will permanently delete:\n\n• User profile and account\n• All investment requests\n• All withdrawal requests\n• All support tickets\n• All payment records\n\nThis cannot be undone! Are you absolutely sure?`);
    
    if (!confirmation) {
        return; // User cancelled
    }
    
    // Double-check with a second confirmation for safety
    const finalConfirmation = confirm(`FINAL WARNING: Are you 100% sure you want to delete this user?`);
    
    if (!finalConfirmation) {
        return;
    }
    
    try {
        // Disable delete button to prevent double submission
        const deleteBtn = document.getElementById("deleteUserBtn");
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<span style="margin-right: 8px;">⏳</span>Deleting...';
        }
        
        console.log(`Starting deletion process for user: ${userId} (${userEmail})`);
        
        // Use a batch write for atomic operation
        const batch = db.batch();
        let deletedCount = 0;
        
        // 1. Delete investment requests
        const investments = await db.collection('investmentRequests').where('userId', '==', userId).get();
        investments.docs.forEach(doc => {
            batch.delete(doc.ref);
            deletedCount++;
        });
        console.log(`Found ${investments.size} investment requests to delete`);
        
        // 2. Delete withdrawals
        const withdrawals = await db.collection('withdrawals').where('userId', '==', userId).get();
        withdrawals.docs.forEach(doc => {
            batch.delete(doc.ref);
            deletedCount++;
        });
        console.log(`Found ${withdrawals.size} withdrawals to delete`);
        
        // 3. Delete tickets
        const tickets = await db.collection('tickets').where('userId', '==', userId).get();
        tickets.docs.forEach(doc => {
            batch.delete(doc.ref);
            deletedCount++;
        });
        console.log(`Found ${tickets.size} tickets to delete`);
        
        // 4. Delete payments
        const payments = await db.collection('payments').where('userId', '==', userId).get();
        payments.docs.forEach(doc => {
            batch.delete(doc.ref);
            deletedCount++;
        });
        console.log(`Found ${payments.size} payments to delete`);
        
        // 5. Finally, delete the user document itself
        batch.delete(db.collection('users').doc(userId));
        deletedCount++;
        
        // Commit all deletions
        await batch.commit();
        
        console.log(`✅ Successfully deleted ${deletedCount} documents for user ${userId}`);
        
        // Show success message
        alert(`✅ User "${userName}" and all associated data (${deletedCount} records) deleted successfully!`);
        
        // Close the modal
        document.getElementById("fullEditUserModal").classList.add("hidden");
        
        // Refresh the users list
        await loadUsers();
        
        // Also refresh other sections if they might contain this user's data
        loadInvestmentRequests();
        loadWithdrawals();
        loadSupportTickets();
        
    } catch (error) {
        console.error("❌ Error deleting user:", error);
        alert("Failed to delete user: " + error.message);
    } finally {
        // Re-enable delete button
        const deleteBtn = document.getElementById("deleteUserBtn");
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 8px;">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="2"/>
                    <line x1="10" y1="11" x2="10" y2="17" stroke-width="2"/>
                    <line x1="14" y1="11" x2="14" y2="17" stroke-width="2"/>
                </svg>
                Delete User
            `;
        }
    }
};
  // Close modal helper
  window.closeFullEditModal = function() {
    document.getElementById("fullEditUserModal").classList.add("hidden");
  };

  // ============ INVESTMENT REQUESTS ============
  
  async function loadInvestmentRequests() {
    try {
      const snapshot = await db.collection('investmentRequests').orderBy('createdAt', 'desc').get();
      const requests = [];
      snapshot.forEach(doc => requests.push({ id: doc.id, ...doc.data() }));
      displayInvestmentRequests(requests);
      
      const pendingCount = requests.filter(r => r.status === 'pending').length;
      const badge = document.getElementById("investmentBadge");
      if (badge) {
        badge.textContent = pendingCount;
        badge.style.display = pendingCount > 0 ? 'flex' : 'none';
      }
    } catch (error) {
      console.error("Error loading investment requests:", error);
    }
  }

  function displayInvestmentRequests(requests) {
    const grid = document.getElementById("investmentsGrid");
    const empty = document.getElementById("investmentsEmpty");
    if (!grid || !empty) return;

    if (requests.length === 0) {
      empty.classList.remove("hidden");
      grid.innerHTML = "";
      return;
    }

    empty.classList.add("hidden");
    
    const filter = document.getElementById("investmentFilter")?.value || "all";
    const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter);

    grid.innerHTML = filtered.map(r => `
      <div class="investment-request-card" onclick="viewInvestmentRequest('${r.id}')">
        <div class="investment-request-header">
          <div>
            <h4>${r.userName || r.userEmail}</h4>
            <p class="investment-request-email">${r.userEmail}</p>
          </div>
          <span class="investment-status-badge status-${r.status}">${r.status}</span>
        </div>
        <div class="investment-request-details">
          <div class="investment-request-amount">${formatCurrency(r.amount)}</div>
          <div class="investment-request-crypto">${r.cryptocurrency}</div>
        </div>
        <div class="investment-request-meta">${formatDate(r.createdAt)}</div>
      </div>
    `).join('');
  }

  window.viewInvestmentRequest = async function(id) {
    try {
      const doc = await db.collection('investmentRequests').doc(id).get();
      const data = doc.data();
      
      document.getElementById("investmentUserName").textContent = data.userName || "User";
      document.getElementById("investmentUserEmail").textContent = data.userEmail;
      document.getElementById("investmentAmount").textContent = formatCurrency(data.amount);
      document.getElementById("investmentCrypto").textContent = data.cryptocurrency;
      document.getElementById("investmentWallet").textContent = data.walletAddress || "Not specified";
      document.getElementById("investmentDate").textContent = formatDate(data.createdAt);
      document.getElementById("investmentTransactionId").textContent = data.transactionId || "N/A";
      document.getElementById("investmentCurrentStatus").textContent = data.status;
      
      document.getElementById("investmentStatus").value = data.status;
      document.getElementById("adminNote").value = data.adminNote || '';
      
      document.getElementById("updateInvestmentForm").dataset.investmentId = id;
      document.getElementById("updateInvestmentForm").dataset.userId = data.userId;
      document.getElementById("updateInvestmentForm").dataset.amount = data.amount;
      
      document.getElementById("viewInvestmentModal").classList.remove("hidden");
    } catch (error) {
      console.error("Error loading investment:", error);
      alert("Failed to load investment details");
    }
  };

  const updateInvestmentForm = document.getElementById("updateInvestmentForm");
  if (updateInvestmentForm) {
    updateInvestmentForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const id = updateInvestmentForm.dataset.investmentId;
      const userId = updateInvestmentForm.dataset.userId;
      const amount = parseFloat(updateInvestmentForm.dataset.amount);
      const status = document.getElementById("investmentStatus").value;
      const note = document.getElementById("adminNote").value;
      
      try {
        await db.collection('investmentRequests').doc(id).update({
          status: status,
          adminNote: note,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        if (status === 'approved') {
          const userDoc = await db.collection('users').doc(userId).get();
          if (userDoc.exists) {
            const user = userDoc.data();
            const profitAmount = amount * 0.05; // 5% profit
            const totalAmount = amount + profitAmount;
            
            await db.collection('users').doc(userId).update({
              investmentAmount: (user.investmentAmount || 0) + amount,
              currentBalance: (user.currentBalance || 0) + totalAmount,
              profitLoss: (user.profitLoss || 0) + profitAmount,
              profitPercentage: 5,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          }
        }
        
        alert("Investment request updated!");
        document.getElementById("viewInvestmentModal").classList.add("hidden");
        loadInvestmentRequests();
      } catch (error) {
        console.error("Error updating investment:", error);
        alert("Failed to update investment");
      }
    });
  }

  // Close modal buttons
  document.getElementById("closeInvestmentModal")?.addEventListener("click", () => {
    document.getElementById("viewInvestmentModal").classList.add("hidden");
  });
  
  document.getElementById("cancelInvestmentBtn")?.addEventListener("click", () => {
    document.getElementById("viewInvestmentModal").classList.add("hidden");
  });

  // ============ WALLET FUNCTIONS ============
  
  async function loadWalletAddresses() {
    try {
      const doc = await db.collection('adminSettings').doc('wallets').get();
      if (doc.exists) {
        const wallets = doc.data();
        ["BTC", "ETH", "USDT", "BNB", "SOL", "ADA"].forEach(crypto => {
          const input = document.getElementById(`wallet_${crypto}`);
          if (input && wallets[crypto]) input.value = wallets[crypto];
        });
      }
    } catch (error) {
      console.error("Error loading wallets:", error);
    }
  }

  const walletAddressesForm = document.getElementById("walletAddressesForm");
  if (walletAddressesForm) {
    walletAddressesForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const wallets = {
        BTC: document.getElementById("wallet_BTC").value.trim(),
        ETH: document.getElementById("wallet_ETH").value.trim(),
        USDT: document.getElementById("wallet_USDT").value.trim(),
        BNB: document.getElementById("wallet_BNB").value.trim(),
        SOL: document.getElementById("wallet_SOL").value.trim(),
        ADA: document.getElementById("wallet_ADA").value.trim()
      };
      
      try {
        await db.collection('adminSettings').doc('wallets').set(wallets, { merge: true });
        alert("✅ Wallet addresses saved!");
      } catch (error) {
        console.error("Error saving wallets:", error);
        alert("Failed to save wallet addresses");
      }
    });
  }

  // ============ WITHDRAWAL FUNCTIONS ============
  
  async function loadWithdrawals() {
    try {
      const snapshot = await db.collection('withdrawals').orderBy('createdAt', 'desc').get();
      const withdrawals = [];
      snapshot.forEach(doc => withdrawals.push({ id: doc.id, ...doc.data() }));
      displayWithdrawals(withdrawals);
      
      const pendingCount = withdrawals.filter(w => w.status === 'pending').length;
      const badge = document.getElementById("withdrawalBadge");
      if (badge) {
        badge.textContent = pendingCount;
        badge.style.display = pendingCount > 0 ? 'flex' : 'none';
      }
    } catch (error) {
      console.error("Error loading withdrawals:", error);
    }
  }

  function displayWithdrawals(withdrawals) {
    const grid = document.getElementById("withdrawalsGrid");
    const empty = document.getElementById("withdrawalsEmpty");
    if (!grid || !empty) return;

    if (withdrawals.length === 0) {
      empty.classList.remove("hidden");
      grid.innerHTML = "";
      return;
    }

    empty.classList.add("hidden");
    
    const filter = document.getElementById("withdrawalFilter")?.value || "all";
    const filtered = filter === "all" ? withdrawals : withdrawals.filter(w => w.status === filter);

    grid.innerHTML = filtered.map(w => `
      <div class="withdrawal-card" onclick="viewWithdrawal('${w.id}')">
        <div class="withdrawal-header">
          <div>
            <h4>${w.userName || w.userEmail}</h4>
            <p class="withdrawal-email">${w.userEmail}</p>
          </div>
          <span class="withdrawal-status-badge ${w.status}">${w.status}</span>
        </div>
        <div class="withdrawal-details">
          <div class="withdrawal-amount">${formatCurrency(w.amount)}</div>
          <div class="withdrawal-crypto">${w.cryptocurrency}</div>
        </div>
        <div class="withdrawal-meta">${formatDate(w.createdAt)}</div>
      </div>
    `).join('');
  }

  window.viewWithdrawal = async function(id) {
    try {
      const doc = await db.collection('withdrawals').doc(id).get();
      const data = doc.data();
      
      document.getElementById("withdrawalUserName").textContent = data.userName || "User";
      document.getElementById("withdrawalUserEmail").textContent = data.userEmail;
      document.getElementById("withdrawalAmount").textContent = formatCurrency(data.amount);
      document.getElementById("withdrawalWallet").textContent = data.walletAddress;
      document.getElementById("withdrawalDate").textContent = formatDate(data.createdAt);
      document.getElementById("withdrawalCurrentStatus").textContent = data.status;
      
      document.getElementById("withdrawalStatus").value = data.status;
      document.getElementById("updateWithdrawalForm").dataset.withdrawalId = id;
      
      document.getElementById("viewWithdrawalModal").classList.remove("hidden");
    } catch (error) {
      console.error("Error loading withdrawal:", error);
      alert("Failed to load withdrawal");
    }
  };

  const updateWithdrawalForm = document.getElementById("updateWithdrawalForm");
  if (updateWithdrawalForm) {
    updateWithdrawalForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const id = updateWithdrawalForm.dataset.withdrawalId;
      const status = document.getElementById("withdrawalStatus").value;
      
      try {
        await db.collection('withdrawals').doc(id).update({
          status: status,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert("Withdrawal status updated!");
        document.getElementById("viewWithdrawalModal").classList.add("hidden");
        loadWithdrawals();
      } catch (error) {
        console.error("Error updating withdrawal:", error);
        alert("Failed to update withdrawal");
      }
    });
  }

  // Close withdrawal modal
  document.getElementById("closeWithdrawalModal")?.addEventListener("click", () => {
    document.getElementById("viewWithdrawalModal").classList.add("hidden");
  });
  
  document.getElementById("cancelWithdrawalBtn")?.addEventListener("click", () => {
    document.getElementById("viewWithdrawalModal").classList.add("hidden");
  });

  // ============ SUPPORT TICKET FUNCTIONS ============
  
  async function loadSupportTickets() {
    try {
      const snapshot = await db.collection('tickets').orderBy('createdAt', 'desc').get();
      const tickets = [];
      snapshot.forEach(doc => tickets.push({ id: doc.id, ...doc.data() }));
      displaySupportTickets(tickets);
      
      const openCount = tickets.filter(t => t.status === 'open').length;
      const badge = document.getElementById("supportBadge");
      if (badge) {
        badge.textContent = openCount;
        badge.style.display = openCount > 0 ? 'flex' : 'none';
      }
    } catch (error) {
      console.error("Error loading tickets:", error);
    }
  }

  function displaySupportTickets(tickets) {
    const grid = document.getElementById("ticketsGrid");
    const empty = document.getElementById("ticketsEmpty");
    if (!grid || !empty) return;

    if (tickets.length === 0) {
      empty.classList.remove("hidden");
      grid.innerHTML = "";
      return;
    }

    empty.classList.add("hidden");
    
    const filter = document.getElementById("ticketFilter")?.value || "all";
    const filtered = filter === "all" ? tickets : tickets.filter(t => t.status === filter);

    grid.innerHTML = filtered.map(t => `
      <div class="ticket-card" onclick="viewAdminTicket('${t.id}')">
        <div class="ticket-card-header">
          <div>
            <div class="ticket-card-title">${t.subject}</div>
            <div class="ticket-card-user">${t.userName} (${t.userEmail})</div>
          </div>
          <span class="ticket-status-badge ${t.status}">${t.status}</span>
        </div>
        <div class="ticket-card-meta">${formatDate(t.createdAt)} • ${t.category || "No category"}</div>
        <div class="ticket-card-message">${t.message.substring(0, 100)}...</div>
      </div>
    `).join('==================>>>');
  }

  window.viewAdminTicket = async function(id) {
    try {
      const doc = await db.collection('tickets').doc(id).get();
      const ticket = doc.data();
      
      document.getElementById("viewTicketSubject").textContent = ticket.subject;
      document.getElementById("viewTicketId").textContent = `Ticket #${id.substring(0, 8)}`;
      document.getElementById("viewTicketStatus").textContent = ticket.status;
      document.getElementById("viewTicketUser").textContent = `${ticket.userName} (${ticket.userEmail})`;
      document.getElementById("viewTicketCategory").textContent = ticket.category || "-";
      document.getElementById("viewTicketDate").textContent = formatDate(ticket.createdAt);
      document.getElementById("viewTicketMessage").textContent = ticket.message;
      
      document.getElementById("changeTicketStatus").value = ticket.status;
      document.getElementById("replyTicketForm").dataset.ticketId = id;
      
      displayTicketReplies(ticket.replies || []);
      
      document.getElementById("viewTicketModal").classList.remove("hidden");
    } catch (error) {
      console.error("Error loading ticket:", error);
      alert("Failed to load ticket");
    }
  };

  function displayTicketReplies(replies) {
    const container = document.getElementById("ticketMessages");
    if (!container) return;

    if (replies.length === 0) {
      container.innerHTML = '<p class="no-replies">No replies yet</p>';
    } else {
      container.innerHTML = replies.map(r => `
        <div class="ticket-message ${r.userType}">
          <div class="message-avatar">${r.userType === "admin" ? "A" : "U"}</div>
          <div class="message-content">
            <div class="message-header">
              <span class="message-author">${r.userType === "admin" ? "Support Team" : "You"}</span>
              <span class="message-time">${formatDate(r.createdAt)}</span>
            </div>
            <div class="message-text">${r.message}</div>
          </div>
        </div>
      `).join('');
    }
  }

  // Change ticket status
  document.getElementById("changeTicketStatus")?.addEventListener("change", async function() {
    const id = document.getElementById("replyTicketForm").dataset.ticketId;
    const status = this.value;
    
    try {
      await db.collection('tickets').doc(id).update({
        status: status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      document.getElementById("viewTicketStatus").textContent = status;
      loadSupportTickets();
    } catch (error) {
      console.error("Error updating ticket status:", error);
      alert("Failed to update status");
    }
  });

  // Reply to ticket
  const replyTicketForm = document.getElementById("replyTicketForm");
  if (replyTicketForm) {
    replyTicketForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const id = replyTicketForm.dataset.ticketId;
      const message = document.getElementById("adminReplyMessage").value;

      try {
        const doc = await db.collection('tickets').doc(id).get();
        const replies = doc.data().replies || [];
        
        const newReply = {
          message: message,
          userType: "admin",
          userId: auth.currentUser.uid,
          createdAt: new Date().toISOString()
        };

        await db.collection('tickets').doc(id).update({
          replies: [...replies, newReply],
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          status: "in-progress"
        });

        document.getElementById("adminReplyMessage").value = "";
        await viewAdminTicket(id);
        
      } catch (error) {
        console.error("Reply error:", error);
        document.getElementById("replyError").textContent = error.message;
      }
    });
  }

  // Close ticket modal
  document.getElementById("closeViewTicketModal")?.addEventListener("click", () => {
    document.getElementById("viewTicketModal").classList.add("hidden");
  });

  // Filter change listeners
  document.getElementById("investmentFilter")?.addEventListener("change", loadInvestmentRequests);
  document.getElementById("withdrawalFilter")?.addEventListener("change", loadWithdrawals);
  document.getElementById("ticketFilter")?.addEventListener("change", loadSupportTickets);

  console.log("Admin.js initialization complete");
});