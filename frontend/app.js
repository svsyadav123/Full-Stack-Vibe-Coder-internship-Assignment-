
const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");

const BASE_URL = "https://full-stack-vibe-coder-internship.onrender.com/api";

// ===== SIGNUP =====
if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("username").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            const res = await fetch(`${BASE_URL}/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password }),
            });
            const data = await res.json();
            if (res.ok) {
                alert("Signup successful!");
                window.location.href = "index.html";
            } else alert(data.message);
        } catch (err) {
            console.error(err);
            alert("Signup failed. Try again!");
        }
    });
}

// ===== LOGIN =====
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            const res = await fetch(`${BASE_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem("token", data.token);
                window.location.href = "dashboard.html";
            } else alert(data.message);
        } catch (err) {
            console.error(err);
            alert("Login failed. Try again!");
        }
    });
}

// ===== DASHBOARD =====
if (userInfo) {
    const token = localStorage.getItem("token");
    if (!token) window.location.href = "index.html";

    fetch(`${BASE_URL}/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
            if (data.user) {
                userInfo.innerHTML = `
                    <p><strong>Username:</strong> ${data.user.username}</p>
                    <p><strong>Email:</strong> ${data.user.email}</p>
                `;
            } else {
                alert("Unauthorized. Please login again.");
                window.location.href = "index.html";
            }
        })
        .catch(err => { console.error(err); window.location.href = "index.html"; });

    const createSiteBtn = document.getElementById("createSiteBtn");
    if (createSiteBtn) createSiteBtn.addEventListener("click", () => window.location.href = "create-site.html");

    const viewSitesBtn = document.getElementById("viewSitesBtn");
    if (viewSitesBtn) viewSitesBtn.addEventListener("click", loadUserSites);

    async function loadUserSites() {
        try {
            const res = await fetch(`${BASE_URL}/mysites`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            const userSitesDiv = document.getElementById("userSites");
            if (!userSitesDiv) return;

            if (data.sites && data.sites.length > 0) {
                userSitesDiv.innerHTML = ""; // clear previous
                data.sites.forEach(site => {
                    const card = document.createElement("div");
                    card.className = "site-card";

                    const siteName = document.createElement("h4");
                    siteName.textContent = site.name;
                    card.appendChild(siteName);

                    const siteDesc = document.createElement("p");
                    siteDesc.textContent = site.description || "No description";
                    card.appendChild(siteDesc);

                    const btnEdit = document.createElement("button");
                    btnEdit.textContent = "Edit Site";
                    btnEdit.addEventListener("click", () => editSite(site._id));
                    card.appendChild(btnEdit);

                    const btnDelete = document.createElement("button");
                    btnDelete.textContent = "Delete Site";
                    btnDelete.addEventListener("click", () => deleteSite(site._id));
                    card.appendChild(btnDelete);

                    // Pages section
                    if (site.pages && site.pages.length > 0) {
                        const pagesTitle = document.createElement("p");
                        pagesTitle.style.fontWeight = "bold";
                        pagesTitle.textContent = "Pages:";
                        card.appendChild(pagesTitle);

                        const pagesDiv = document.createElement("div");
                        pagesDiv.style.display = "flex";
                        pagesDiv.style.flexWrap = "wrap";
                        pagesDiv.style.gap = "5px";

                        site.pages.forEach(p => {
                            const pageBtn = document.createElement("button");
                            pageBtn.textContent = p.pageId;
                            pageBtn.style.fontSize = "12px";
                            pageBtn.addEventListener("click", () => editPage(site._id, p.pageId));
                            pagesDiv.appendChild(pageBtn);
                        });
                        card.appendChild(pagesDiv);
                    }

                    userSitesDiv.appendChild(card);
                });
            } else {
                userSitesDiv.innerHTML = "<p>You have no sites yet.</p>";
            }
        } catch (err) {
            console.error(err);
            alert("Failed to load sites");
        }
    }

    window.deleteSite = async function(id) {
        if (!confirm("Are you sure you want to delete this site?")) return;
        try {
            const res = await fetch(`${BASE_URL}/deletesite/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
                alert("Site deleted successfully!");
                loadUserSites();
            } else alert(data.message);
        } catch (err) { console.error(err); alert("Failed to delete site"); }
    }

    window.editSite = function(id) { window.location.href = `edit-site.html?id=${id}`; }
    window.editPage = function(siteId, pageId) { window.location.href = `edit-page.html?siteId=${siteId}&pageId=${pageId}`; }
}

// ===== LOGOUT =====
if (logoutBtn) logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "index.html";
});

// ===== CREATE SITE =====
const createSiteForm = document.getElementById("createSiteForm");
const backBtn = document.getElementById("backBtn");

if (createSiteForm) {
    createSiteForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("siteName").value;
        const description = document.getElementById("siteDesc").value;
        const token = localStorage.getItem("token");

        if (!token) return window.location.href = "index.html";

        try {
            const res = await fetch(`${BASE_URL}/createsite`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name, description })
            });
            const data = await res.json();
            if (res.ok) {
                alert("Site created successfully!");
                window.location.href = "dashboard.html";
            } else alert(data.message);
        } catch (err) { console.error(err); alert("Failed to create site"); }
    });
}

if (backBtn) backBtn.addEventListener("click", () => window.location.href = "dashboard.html");

// ===== EDIT SITE & PAGES =====
const editSiteForm = document.getElementById("editSiteForm");
const pagesList = document.getElementById("pagesList");
const addPageBtn = document.getElementById("addPageBtn");
const newPageInput = document.getElementById("newPageId");

if (editSiteForm) {
    const params = new URLSearchParams(window.location.search);
    const siteId = params.get("id");
    const token = localStorage.getItem("token");

    if (!siteId || !token) window.location.href = "dashboard.html";

    async function loadSiteData() {
        try {
            const res = await fetch(`${BASE_URL}/mysites`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            const site = data.sites.find(s => s._id === siteId);
            if (!site) throw new Error("Site not found");
            document.getElementById("siteName").value = site.name;
            document.getElementById("siteDesc").value = site.description;

            // Populate pages list
            if (pagesList) {
                pagesList.innerHTML = "";
                (site.pages || []).forEach(p => {
                    const li = document.createElement("li");
                    const btn = document.createElement("button");
                    btn.textContent = "Edit";
                    btn.addEventListener("click", () => editPage(site._id, p.pageId));
                    li.textContent = p.pageId + " - ";
                    li.appendChild(btn);
                    pagesList.appendChild(li);
                });
            }
        } catch (err) {
            console.error(err);
            alert("Failed to load site");
            window.location.href = "dashboard.html";
        }
    }

    loadSiteData();

    editSiteForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("siteName").value;
        const description = document.getElementById("siteDesc").value;
        try {
            const res = await fetch(`${BASE_URL}/editsite/${siteId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name, description })
            });
            const data = await res.json();
            if (res.ok) {
                alert("Site updated successfully!");
                window.location.href = "dashboard.html";
            } else alert(data.message);
        } catch (err) { console.error(err); alert("Failed to update site"); }
    });

    if (addPageBtn) addPageBtn.addEventListener("click", async () => {
        const pageId = newPageInput.value.trim();
        if (!pageId) return alert("Enter a page ID");
        try {
            const res = await fetch(`${BASE_URL}/addpage/${siteId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ pageId })
            });
            const data = await res.json();
            if (res.ok) {
                alert("Page added successfully!");
                newPageInput.value = "";
                loadSiteData();
            } else alert(data.message);
        } catch (err) { console.error(err); alert("Failed to add page"); }
    });

    if (backBtn) backBtn.addEventListener("click", () => window.location.href = "dashboard.html");
}