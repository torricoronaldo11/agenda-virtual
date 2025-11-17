/* app.js - improved and safe version */
const USERS_KEY = "agenda_users_v1";
const ACTIV_KEY = "agenda_acts_v1";
const $ = id => document.getElementById(id);
const uid = () => Math.random().toString(36).slice(2, 9);

let users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
let activities = JSON.parse(localStorage.getItem(ACTIV_KEY)) || [];
let currentUser = null;

// create demo users if empty
if (users.length === 0) {
    users.push({ id: uid(), name: "Profe Demo", email: "profe@cole.edu", pass: btoa("profe123"), role: "profesor" });
    users.push({ id: uid(), name: "Alumno Demo", email: "alumno@cole.edu", pass: btoa("alumno123"), role: "alumno" });
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function saveUsers() { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }

function saveActivities() { localStorage.setItem(ACTIV_KEY, JSON.stringify(activities)); }

// AUTH BOX render (shows login/register when logged out, or user info when logged in)
function renderAuthBox() {
    const box = $("authBox");
    if (!box) return;
    if (currentUser) {
        box.innerHTML = `
      <div style="font-weight:700">${currentUser.name}</div>
      <div style="color:#6b7280;font-size:13px">${currentUser.email} • ${currentUser.role}</div>
      <div style="margin-top:10px"><button id="btnGoLogout" class="btn full danger">Cerrar sesión</button></div>
    `;
        $("btnGoLogout").onclick = () => { doLogout(); };
        $("btnLogout").classList.remove("hidden");
        $("btnCrear").classList.remove("hidden");
    } else {
        box.innerHTML = `
      <div style="font-weight:600">Iniciar sesión</div>
      <input id="loginEmail" placeholder="Email" />
      <input id="loginPass" placeholder="Contraseña" type="password" />
      <button id="btnLogin" class="btn full">Entrar</button>
      <hr style="margin:10px 0" />
      <div style="font-weight:600">Registrarse</div>
      <input id="regName" placeholder="Nombre completo" />
      <input id="regEmail" placeholder="Email" />
      <input id="regPass" placeholder="Contraseña" type="password" />
      <select id="regRole"><option value="alumno">Alumno</option><option value="profesor">Profesor</option></select>
      <button id="btnRegister" class="btn full ghost">Crear cuenta</button>
    `;
        // attach
        $("btnLogin").onclick = doLogin;
        $("btnRegister").onclick = doRegister;
        $("btnLogout").classList.add("hidden");
        $("btnCrear").classList.add("hidden");
    }
    renderDemoUsers();
    renderActivities();
}

function renderDemoUsers() {
    const ul = $("demoUsers");
    if (!ul) return;
    ul.innerHTML = "";
    users.forEach((user, index) => {
        const li = document.createElement("li");
        const text = document.createElement("span");
        text.textContent = `${user.name} — ${user.role} — ${user.email}`;
        li.appendChild(text);
        // delete button only visible to professors and for non-professor users
        if (shouldShowDeleteButton(user)) {
            const btn = document.createElement("button");
            btn.className = "deleteUserBtn";
            btn.textContent = "Eliminar";
            btn.onclick = () => deleteUser(index);
            li.appendChild(btn);
        }
        ul.appendChild(li);
    });
}

function shouldShowDeleteButton(userToDelete) {
    if (!currentUser) return false;
    if (currentUser.role !== "profesor") return false;
    if (userToDelete.role === "profesor") return false;
    return true;
}

function deleteUser(index) {
    const u = users[index];
    if (!u) return;
    if (!currentUser || currentUser.role !== "profesor") { alert("No tienes permisos."); return; }
    if (u.role === "profesor") { alert("No puedes eliminar a otro profesor."); return; }
    if (!confirm(`Eliminar a ${u.name}?`)) return;
    users.splice(index, 1);
    saveUsers();
    renderDemoUsers();
    alert("Alumno eliminado");
}

// Register/Login/Logout
function doRegister() {
    const name = $("regName").value.trim();
    const email = $("regEmail").value.trim().toLowerCase();
    const pass = $("regPass").value;
    const role = $("regRole").value;
    if (!name || !email || !pass) { alert("Completa todos los campos"); return; }
    if (users.some(u => u.email === email)) { alert("El email ya existe"); return; }
    const nu = { id: uid(), name, email, pass: btoa(pass), role };
    users.push(nu);
    saveUsers();
    currentUser = nu;
    renderAuthBox();
    renderAppState();
}

function doLogin() {
    const email = $("loginEmail").value.trim().toLowerCase();
    const pass = $("loginPass").value;
    const found = users.find(u => u.email === email && u.pass === btoa(pass));
    if (!found) { alert("Credenciales incorrectas"); return; }
    currentUser = found;
    renderAuthBox();
    renderAppState();
}

function doLogout() {
    currentUser = null;
    renderAuthBox();
    renderAppState();
    alert("Sesión cerrada");
}

// UI controls
const panelMain = $("panelMain");
const createSection = $("createSection");
const listSection = $("listSection");
if ($("btnPanel")) $("btnPanel").addEventListener("click", () => showPanel());
if ($("btnCrear")) $("btnCrear").addEventListener("click", () => {
    if (!checkAuth()) return;
    showCreate();
});
if ($("btnExport")) $("btnExport").addEventListener("click", exportJSON);
if ($("btnImport")) $("btnImport").addEventListener("click", () => $("fileImport").click());
if ($("fileImport")) $("fileImport").addEventListener("change", importJSON);
if ($("btnCSV")) $("btnCSV").addEventListener("click", downloadCSV);
if ($("btnPrint")) $("btnPrint").addEventListener("click", () => window.print());

// filters
["filterDate", "filterCourse", "filterType", "filterText"].forEach(id => { const el = $(id); if (el) el.addEventListener("input", renderActivities); });

// form handlers
const form = $("formActivity");
if (form) {
    form.addEventListener("submit", e => {
        e.preventDefault();
        saveActivity();
    });
}
if ($("cancelAct")) $("cancelAct").addEventListener("click", () => {
    resetForm();
    showPanel();
});

function renderAppState() {
    if (currentUser) {
        $("welcomeTitle").textContent = `Hola, ${currentUser.name}`;
        $("welcomeSubtitle").textContent = `Rol: ${currentUser.role} — Gestiona las actividades en la agenda.`;
        $("btnLogout").classList.remove("hidden");
    } else {
        $("welcomeTitle").textContent = `Bienvenido`;
        $("welcomeSubtitle").textContent = `Inicia sesión o regístrate para crear/editar actividades.`;
        $("btnLogout").classList.add("hidden");
        createSection.classList.add("hidden");
    }
    renderActivities();
}

// activities CRUD
function checkAuth() { if (!currentUser) { alert("Necesitas iniciar sesión"); return false; } return true; }

function showPanel() {
    panelMain.classList.remove("hidden");
    createSection.classList.add("hidden");
    listSection.classList.remove("hidden");
}

function showCreate(edit = false, act = null) {
    if (!checkAuth()) return;
    if (currentUser.role !== "profesor") { alert("Solo profesores pueden crear/editar actividades."); return; }
    panelMain.classList.add("hidden");
    createSection.classList.remove("hidden");
    if (edit && act) {
        $("actId").value = act.id;
        $("actTitle").value = act.title;
        $("actDate").value = act.date;
        $("actTime").value = act.time || "";
        $("actCourse").value = act.course || "1ro";
        $("actType").value = act.type || "Tarea";
        $("actDesc").value = act.desc || "";
    } else resetForm();
}

function resetForm() { if ($("actId")) $("actId").value = ""; if ($("actTitle")) $("actTitle").value = ""; if ($("actDate")) $("actDate").value = ""; if ($("actTime")) $("actTime").value = ""; if ($("actCourse")) $("actCourse").value = "1ro"; if ($("actType")) $("actType").value = "Tarea"; if ($("actDesc")) $("actDesc").value = ""; }

function saveActivity() {
    const id = $("actId").value;
    const title = $("actTitle").value.trim();
    const date = $("actDate").value;
    const time = $("actTime").value;
    const course = $("actCourse").value;
    const type = $("actType").value;
    const desc = $("actDesc").value.trim();
    if (!title || !date) { alert("Título y fecha obligatorios"); return; }
    if (id) {
        const idx = activities.findIndex(a => a.id === id);
        if (idx !== -1) {
            activities[idx] = {...activities[idx], title, date, time, course, type, desc, updatedAt: new Date().toISOString() };
            saveActivities();
            renderActivities();
            alert("Actividad actualizada");
        }
    } else {
        const a = { id: uid(), title, date, time, course, type, desc, createdBy: currentUser ? currentUser.id : null, createdAt: new Date().toISOString() };
        activities.push(a);
        activities.sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""));
        saveActivities();
        renderActivities();
        alert("Actividad creada");
    }
    resetForm();
    showPanel();
}

function deleteActivity(id) {
    if (!confirm("¿Eliminar esta actividad?")) return;
    activities = activities.filter(a => a.id !== id);
    saveActivities();
    renderActivities();
}

// render activities - show only when user logged in
function renderActivities() {
    const list = $("activitiesList");
    list.innerHTML = "";
    const tpl = document.getElementById("activityTemplate");
    if (!currentUser) {
        $("countInfo").textContent = `0 actividades`;
        const msg = document.createElement("div");
        msg.style.padding = "12px";
        msg.textContent = "Inicia sesión para ver las actividades.";
        list.appendChild(msg);
        return;
    }

    const fDate = $("filterDate").value;
    const fCourse = $("filterCourse").value;
    const fType = $("filterType").value;
    const fText = $("filterText").value.trim().toLowerCase();

    const filtered = activities.filter(a => {
        if (fDate && a.date !== fDate) return false;
        if (fCourse && a.course !== fCourse) return false;
        if (fType && a.type !== fType) return false;
        if (fText && !(`${a.title} ${a.desc}`.toLowerCase().includes(fText))) return false;
        return true;
    });

    $("countInfo").textContent = `${filtered.length} actividades (${activities.length} totales)`;

    const frag = document.createDocumentFragment();
    filtered.forEach(a => {
        const node = tpl.content.cloneNode(true);
        node.querySelector(".act-title").textContent = a.title + (a.time ? ` — ${a.time}` : "");
        node.querySelector(".act-date").textContent = a.date;
        node.querySelector(".act-course").textContent = a.course;
        node.querySelector(".act-type").textContent = a.type;
        node.querySelector(".act-desc").textContent = a.desc || "";
        node.querySelector(".act-created").textContent = `Creado: ${new Date(a.createdAt).toLocaleString()}`;
        const editBtn = node.querySelector(".edit");
        const delBtn = node.querySelector(".delete");
        if (!currentUser || currentUser.role !== "profesor") {
            editBtn.style.display = "none";
            delBtn.style.display = "none";
        } else {
            editBtn.onclick = () => showCreate(true, a);
            delBtn.onclick = () => deleteActivity(a.id);
        }
        frag.appendChild(node);
    });
    list.appendChild(frag);
}

// import/export/csv
function exportJSON() {
    const blob = new Blob([JSON.stringify({ users, activities }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agenda_backup.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importJSON(e) {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            const obj = JSON.parse(ev.target.result);
            if (Array.isArray(obj.activities)) activities = obj.activities;
            if (Array.isArray(obj.users)) users = obj.users;
            saveActivities();
            saveUsers();
            renderDemoUsers();
            renderActivities();
            alert('Importado');
            $("fileImport").value = "";
        } catch (err) { alert('Archivo inválido'); }
    };
    reader.readAsText(f);
}

function downloadCSV() {
    const rows = [
        ["Título", "Descripción", "Fecha", "Hora", "Tipo", "Curso", "Creado por", "Creado At"]
    ];
    activities.forEach(a => rows.push([a.title, a.desc || "", a.date, a.time || "", a.type || "", a.course || "", userNameById(a.createdBy) || "", a.createdAt || ""]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agenda_actividades.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function userNameById(id) { const u = users.find(x => x.id === id); return u ? u.name : ''; }

// initialize UI
renderAuthBox();
renderAppState();

// expose for debug
window._agenda = { users, activities, saveActivities, saveUsers };
// REGISTER SERVICE WORKER (PWA)

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js")
        .then(() => console.log("SW registrado"))
        .catch(err => console.log("Error SW:", err));
}