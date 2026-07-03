const API_URL = "https://notes-app-backend-2e1k.onrender.com";

let editingNoteId = null;
let allNotes = [];
let isLoginMode = true; // tracks whether the auth form is in Login or Sign Up mode

// --- TOKEN HELPERS ---
function getToken() {
  return localStorage.getItem("token");
}

function saveToken(token) {
  localStorage.setItem("token", token);
}

function clearToken() {
  localStorage.removeItem("token");
}

// --- SCREEN SWITCHING ---
function showApp() {
  document.getElementById("auth-container").style.display = "none";
  document.getElementById("app-container").style.display = "block";
  loadNotes();
}

function showAuth() {
  document.getElementById("auth-container").style.display = "block";
  document.getElementById("app-container").style.display = "none";
}

// --- AUTH FORM TOGGLE (Login <-> Sign Up) ---
const authTitle = document.getElementById("auth-title");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const authToggleQuestion = document.getElementById("auth-toggle-question");
const authToggleLink = document.getElementById("auth-toggle-link");
const authError = document.getElementById("auth-error");

authToggleLink.addEventListener("click", (event) => {
  event.preventDefault();
  isLoginMode = !isLoginMode;
  authError.textContent = "";

  if (isLoginMode) {
    authTitle.textContent = "Log In";
    authSubmitBtn.textContent = "Log In";
    authToggleQuestion.textContent = "Don't have an account?";
    authToggleLink.textContent = "Sign Up";
  } else {
    authTitle.textContent = "Sign Up";
    authSubmitBtn.textContent = "Sign Up";
    authToggleQuestion.textContent = "Already have an account?";
    authToggleLink.textContent = "Log In";
  }
});

// --- AUTH FORM SUBMIT (handles both Login and Sign Up) ---
const authForm = document.getElementById("auth-form");

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authError.textContent = "";

  const email = document.getElementById("auth-email").value;
  const password = document.getElementById("auth-password").value;

  const endpoint = isLoginMode ? "/login" : "/signup";

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    authError.textContent = data.error || "Something went wrong";
    return;
  }

  if (isLoginMode) {
    // Login gives us a token directly - save it and go to the app
    saveToken(data.token);
    showApp();
  } else {
    // Sign up doesn't log us in automatically - switch to login mode
    authError.style.color = "#16a34a";
    authError.textContent = "Account created! Please log in.";
    isLoginMode = true;
    authTitle.textContent = "Log In";
    authSubmitBtn.textContent = "Log In";
    authToggleQuestion.textContent = "Don't have an account?";
    authToggleLink.textContent = "Sign Up";
  }

  authForm.reset();
});

// --- LOGOUT ---
document.getElementById("logout-btn").addEventListener("click", () => {
  clearToken();
  showAuth();
});

// --- NOTES RENDERING ---
function renderNotes(notesToRender) {
  const notesList = document.getElementById("notes-list");
  notesList.innerHTML = "";

  if (notesToRender.length === 0) {
    notesList.innerHTML = `<p class="empty-state">No notes match.</p>`;
    return;
  }

  notesToRender.forEach((note) => {
    const noteCard = document.createElement("div");
    noteCard.className = "note-card";

    if (editingNoteId === note.id) {
      noteCard.innerHTML = `
        <input type="text" class="edit-title-input" value="${note.title}" />
        <textarea class="edit-content-input" rows="3">${note.content}</textarea>
        <div class="note-actions">
          <button class="save-btn">Save</button>
          <button class="cancel-btn edit-btn">Cancel</button>
        </div>
      `;

      const saveBtn = noteCard.querySelector(".save-btn");
      saveBtn.addEventListener("click", async () => {
        const newTitle = noteCard.querySelector(".edit-title-input").value;
        const newContent = noteCard.querySelector(".edit-content-input").value;

        await fetch(`${API_URL}/notes/${note.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ title: newTitle, content: newContent }),
        });

        editingNoteId = null;
        loadNotes();
      });

      const cancelBtn = noteCard.querySelector(".cancel-btn");
      cancelBtn.addEventListener("click", () => {
        editingNoteId = null;
        renderNotes(notesToRender);
      });

    } else {
      const dateLabel = note.createdAt
        ? new Date(note.createdAt).toLocaleDateString()
        : "";

      noteCard.innerHTML = `
        <h3>${note.title}</h3>
        <p>${note.content}</p>
        ${dateLabel ? `<span class="note-date">${dateLabel}</span>` : ""}
        <div class="note-actions">
          <button class="edit-btn">Edit</button>
          <button class="delete-btn">Delete</button>
        </div>
      `;

      const editBtn = noteCard.querySelector(".edit-btn");
      editBtn.addEventListener("click", () => {
        editingNoteId = note.id;
        renderNotes(notesToRender);
      });

      const deleteBtn = noteCard.querySelector(".delete-btn");
      deleteBtn.addEventListener("click", async () => {
        const confirmed = confirm(`Delete "${note.title}"?`);
        if (!confirmed) return;

        await fetch(`${API_URL}/notes/${note.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        loadNotes();
      });
    }

    notesList.appendChild(noteCard);
  });
}

function applySearchFilter() {
  const searchInput = document.getElementById("search-input");
  const query = searchInput.value.toLowerCase();

  const filtered = allNotes.filter((note) =>
    note.title.toLowerCase().includes(query)
  );

  renderNotes(filtered);
}

async function loadNotes() {
  const notesList = document.getElementById("notes-list");
  notesList.innerHTML = `<p class="empty-state">Loading notes...</p>`;

  const response = await fetch(`${API_URL}/notes`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  if (!response.ok) {
    // token invalid/expired - log the user out
    clearToken();
    showAuth();
    return;
  }

  allNotes = await response.json();
  applySearchFilter();
}

const searchInput = document.getElementById("search-input");
searchInput.addEventListener("input", applySearchFilter);

const form = document.getElementById("note-form");
const contentInput = document.getElementById("content-input");
const charCount = document.getElementById("char-count");

contentInput.addEventListener("input", () => {
  charCount.textContent = `${contentInput.value.length}/500`;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const titleInput = document.getElementById("title-input");

  const newNote = {
    title: titleInput.value,
    content: contentInput.value,
  };

  await fetch(`${API_URL}/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(newNote),
  });

  titleInput.value = "";
  contentInput.value = "";
  charCount.textContent = "0/500";

  loadNotes();
});

// --- ON PAGE LOAD: check if already logged in ---
if (getToken()) {
  showApp();
} else {
  showAuth();
}