const API_URL = "http://localhost:3001/notes";
let editingNoteId = null;
let allNotes = []; // full list fetched from backend; search filters this locally

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

        await fetch(`${API_URL}/${note.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
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

        await fetch(`${API_URL}/${note.id}`, {
          method: "DELETE",
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

  const response = await fetch(API_URL);
  allNotes = await response.json();

  applySearchFilter();
}

loadNotes();

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

  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newNote),
  });

  titleInput.value = "";
  contentInput.value = "";
  charCount.textContent = "0/500";

  loadNotes();
});