// ==UserScript==
// @name         SMACSAS - Raccourci débours
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Script de Raccourci débours
// @author       Thibault Dew
// @match        https://smacsaspro.com/devis/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=smacsaspro.com
// @grant        none
// @updateURL    https://github.com/Thibd162/smacsas-script/raw/main/smacsas.user.js
// @downloadURL  https://github.com/Thibd162/smacsas-script/raw/main/smacsas.user.js
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = "custom_groups_dragdrop_v5";
    let editMode = false;
    let deleteMode = false;

const style = document.createElement('style');
    style.textContent = `
    .modal-backdrop {
        position: fixed !important;
        top: 0 !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        background-color: rgba(0, 0, 0, 0.5) !important;
    }
    `;
    document.head.appendChild(style);

    function loadGroups() {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"groups":[],"ungrouped":[]}');
    }
    function saveGroups(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function searchAndClickFirstRow(value, callback) {
        const input = document.querySelector('input[type="search"][aria-controls="ressources_search"]');
        if (!input) return;
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));

        let attempts = 0;
        const interval = setInterval(() => {
            const firstRow = document.querySelector('#ressources_search tbody tr');
            if (firstRow && firstRow.offsetParent !== null) {
                clearInterval(interval);
                firstRow.click();
                if (callback) setTimeout(callback, 250);
            }
            if (++attempts > 30) {
                clearInterval(interval);
                if (callback) callback();
            }
        }, 150);
    }

    function createRefButton(ref, gIndex, rIndex, container, isUngrouped = false) {
        const btn = document.createElement("button");
        btn.textContent = ref.label;
        btn.className = "btn btn-info";
        btn.style.margin = "2px";
        btn.draggable = true;

        btn.addEventListener("click", () => {
            if (deleteMode) {
                if (confirm(`Supprimer "${ref.label}" ?`)) {
                    const data = loadGroups();
                    const list = isUngrouped ? data.ungrouped : data.groups[gIndex].refs;
                    list.splice(rIndex, 1);
                    saveGroups(data);
                    refreshAll(container);
                }
                return;
            }
            if (editMode) {
                openInputPanel(container, "Modifier Ref", ref.label, ref.reference, (label, reference) => {
                    const data = loadGroups();
                    const list = isUngrouped ? data.ungrouped : data.groups[gIndex].refs;
                    list[rIndex].label = label;
                    list[rIndex].reference = reference;
                    saveGroups(data);
                    refreshAll(container);
                });
                return;
            }
            searchAndClickFirstRow(ref.reference);
        });

        btn.addEventListener("dragstart", e => {
            e.dataTransfer.setData("text/plain", JSON.stringify({
                type: "ref",
                gIndex, rIndex, isUngrouped
            }));
        });

        return btn;
    }

    function createGroupUI(group, gIndex, container) {
        const groupDiv = document.createElement("div");
        groupDiv.className = "group-container";
        groupDiv.style.border = "1px solid #ccc";
        groupDiv.style.padding = "5px";
        groupDiv.style.marginBottom = "8px";
        groupDiv.style.borderRadius = "6px";
        groupDiv.style.background = "#f8f9fa";

        const headerDiv = document.createElement("div");
        headerDiv.style.display = "flex";
        headerDiv.style.justifyContent = "space-between";
        headerDiv.style.alignItems = "center";

        const titleContainer = document.createElement("div");
        titleContainer.style.display = "flex";
        titleContainer.style.alignItems = "center";
        titleContainer.style.gap = "4px";

        const title = document.createElement("strong");
        title.textContent = group.name;

        const editTitleBtn = document.createElement("button");
        editTitleBtn.textContent = "✏";
        editTitleBtn.className = "btn btn-xs btn-warning";
        editTitleBtn.addEventListener("click", () => {
            openInputPanel(container, "Modifier Groupe", group.name, undefined, (newName) => {
                const data = loadGroups();
                data.groups[gIndex].name = newName;
                saveGroups(data);
                refreshAll(container);
            });
        });

        const delGroupBtn = document.createElement("button");
        delGroupBtn.textContent = "🗑";
        delGroupBtn.className = "btn btn-xs btn-danger";
        delGroupBtn.addEventListener("click", () => {
            if (confirm(`Supprimer le groupe "${group.name}" ?`)) {
                const data = loadGroups();
                data.ungrouped.push(...data.groups[gIndex].refs);
                data.groups.splice(gIndex, 1);
                saveGroups(data);
                refreshAll(container);
            }
        });

        titleContainer.appendChild(title);
        titleContainer.appendChild(editTitleBtn);
        titleContainer.appendChild(delGroupBtn);

        const arrowContainer = document.createElement("div");
        arrowContainer.style.display = "flex";
        arrowContainer.style.gap = "3px";

        const upBtn = document.createElement("button");
        upBtn.textContent = "▲";
        upBtn.className = "btn btn-xs btn-light";
        upBtn.addEventListener("click", () => {
            const data = loadGroups();
            if (gIndex > 0) {
                const tmp = data.groups.splice(gIndex, 1)[0];
                data.groups.splice(gIndex - 1, 0, tmp);
                saveGroups(data);
                refreshAll(container);
            }
        });

        const downBtn = document.createElement("button");
        downBtn.textContent = "▼";
        downBtn.className = "btn btn-xs btn-light";
        downBtn.addEventListener("click", () => {
            const data = loadGroups();
            if (gIndex < data.groups.length - 1) {
                const tmp = data.groups.splice(gIndex, 1)[0];
                data.groups.splice(gIndex + 1, 0, tmp);
                saveGroups(data);
                refreshAll(container);
            }
        });

        arrowContainer.appendChild(upBtn);
        arrowContainer.appendChild(downBtn);

        headerDiv.appendChild(titleContainer);
        headerDiv.appendChild(arrowContainer);
        groupDiv.appendChild(headerDiv);

        const refsContainer = document.createElement("div");
        refsContainer.style.marginTop = "5px";
        refsContainer.style.display = "flex";
        refsContainer.style.flexWrap = "wrap";

        group.refs.forEach((ref, rIndex) => {
            refsContainer.appendChild(createRefButton(ref, gIndex, rIndex, container));
        });

        groupDiv.appendChild(refsContainer);

        groupDiv.addEventListener("dragover", e => e.preventDefault());
        groupDiv.addEventListener("drop", e => {
            e.preventDefault();
            const data = JSON.parse(e.dataTransfer.getData("text/plain"));
            const state = loadGroups();
            if (data.type === "ref") {
                let ref;
                if (data.isUngrouped) {
                    ref = state.ungrouped.splice(data.rIndex, 1)[0];
                } else {
                    ref = state.groups[data.gIndex].refs.splice(data.rIndex, 1)[0];
                }
                state.groups[gIndex].refs.push(ref);
                saveGroups(state);
                refreshAll(container);
            }
        });

        return groupDiv;
    }

    function createUngroupedUI(container) {
        const div = document.createElement("div");
        div.style.border = "2px dashed #bbb";
        div.style.padding = "8px";
        div.style.borderRadius = "6px";
        div.style.background = "#f0f0f0";
        div.style.marginTop = "10px";
        div.textContent = "Hors Groupe :";

        div.addEventListener("dragover", e => e.preventDefault());
        div.addEventListener("drop", e => {
            e.preventDefault();
            const data = JSON.parse(e.dataTransfer.getData("text/plain"));
            const state = loadGroups();
            if (data.type === "ref" && !data.isUngrouped) {
                const ref = state.groups[data.gIndex].refs.splice(data.rIndex, 1)[0];
                state.ungrouped.push(ref);
                saveGroups(state);
                refreshAll(container);
            }
        });

        const refsContainer = document.createElement("div");
        refsContainer.style.display = "flex";
        refsContainer.style.flexWrap = "wrap";
        const state = loadGroups();
        state.ungrouped.forEach((ref, rIndex) => {
            refsContainer.appendChild(createRefButton(ref, 0, rIndex, container, true));
        });

        div.appendChild(refsContainer);
        return div;
    }

    function refreshAll(container) {
        container.innerHTML = "";
        const state = loadGroups();
        state.groups.forEach((group, gIndex) => {
            container.appendChild(createGroupUI(group, gIndex, container));
        });
        container.appendChild(createUngroupedUI(container));
    }

function openInputPanel(container, title, defaultLabel = "", defaultRef = undefined, callback) {
    let panel = document.getElementById("custom-input-panel");
    if (panel) panel.remove();

    panel = document.createElement("div");
    panel.id = "custom-input-panel";
    panel.style.background = "#fff";
    panel.style.border = "1px solid #ccc";
    panel.style.borderRadius = "6px";
    panel.style.padding = "10px";
    panel.style.marginBottom = "10px";
    panel.style.display = "flex";
    panel.style.justifyContent = "space-between";
    panel.style.alignItems = "center";

    const leftDiv = document.createElement("div");
    leftDiv.style.flex = "-3";

    const titleEl = document.createElement("strong");
    titleEl.textContent = title;
    leftDiv.appendChild(titleEl);

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.placeholder = "Nom";
    labelInput.value = defaultLabel;
    labelInput.style.margin = "5px";
    leftDiv.appendChild(labelInput);

    let refInput = null;
    if (typeof defaultRef !== "undefined") {
        refInput = document.createElement("input");
        refInput.type = "text";
        refInput.placeholder = "Référence";
        refInput.value = defaultRef;
        refInput.style.margin = "5px";
        leftDiv.appendChild(refInput);
    }

    panel.appendChild(leftDiv);

    const rightDiv = document.createElement("div");
    rightDiv.style.flex = "1";
    rightDiv.style.textAlign = "right";

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Valider";
    saveBtn.style.marginLeft = "10px";
    saveBtn.addEventListener("click", () => {
        if (refInput) {
            callback(labelInput.value, refInput.value);
        } else {
            callback(labelInput.value);
        }
        panel.remove();
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Annuler";
    cancelBtn.style.marginLeft = "10px";
    cancelBtn.addEventListener("click", () => {
        panel.remove();
    });

    rightDiv.appendChild(saveBtn);
    rightDiv.appendChild(cancelBtn);
    panel.appendChild(rightDiv);

    container.insertBefore(panel, container.firstChild);
}


    function injectUI() {
        const footer = document.querySelector(".modal.fade.in .modal-footer, .modal.show .modal-footer");
        if (!footer || footer.querySelector("#custom-group-container")) return;

        const container = document.createElement("div");
        container.id = "custom-group-container";
        container.style.marginTop = "10px";
        container.style.marginBottom = "15px";
        footer.appendChild(container);

        const leftControls = document.createElement("div");
        leftControls.style.float = "left";
        leftControls.style.gap = "5px";

        const rightControls = document.createElement("div");
        rightControls.style.float = "right";
        rightControls.style.display = "flex";
        rightControls.style.gap = "5px";

        const exportBtn = document.createElement("button");
        exportBtn.textContent = "📤 Exporter";
        exportBtn.className = "btn btn-sm btn-info";
        exportBtn.addEventListener("click", () => {
            const dataStr = JSON.stringify(loadGroups(), null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
        a.href = url;
        a.download = "groupes_refs.json";
        a.click();
        URL.revokeObjectURL(url);
});

        const importBtn = document.createElement("button");
        importBtn.textContent = "📥 Importer";
        importBtn.className = "btn btn-sm btn-secondary";
        importBtn.addEventListener("click", () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".json";
            input.addEventListener("change", () => {
                const file = input.files[0];
                const reader = new FileReader();
                reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                if (parsed.groups && parsed.ungrouped) {
                    saveGroups(parsed);
                    alert("Import réussi !");
                    refreshAll(container);
                } else {
                    alert("Fichier invalide !");
                }
            } catch (err) {
                alert("Erreur de lecture du fichier !");
            }
        };
        reader.readAsText(file);
    });
    input.click();
});

rightControls.appendChild(exportBtn);
rightControls.appendChild(importBtn);

        const grpBtn = document.createElement("button");
        grpBtn.textContent = "➕ Groupe";
        grpBtn.className = "btn btn-sm btn-success";
        grpBtn.addEventListener("click", () => {
            openInputPanel(container, "Créer Groupe", "", undefined, (name) => {
                const state = loadGroups();
                state.groups.push({ name, refs: [] });
                saveGroups(state);
                refreshAll(container);
            });
        });

        const refBtn = document.createElement("button");
        refBtn.textContent = "➕ Ref";
        refBtn.className = "btn btn-sm btn-info";
        refBtn.addEventListener("click", () => {
            openInputPanel(container, "Créer Ref", "", "", (label, reference) => {
                const state = loadGroups();
                state.ungrouped.push({ label, reference });
                saveGroups(state);
                refreshAll(container);
            });
        });

        leftControls.appendChild(grpBtn);
        leftControls.appendChild(refBtn);

        const editBtn = document.createElement("button");
        editBtn.textContent = "✏ Modifier (OFF)";
        editBtn.className = "btn btn-sm btn-warning";
        editBtn.addEventListener("click", () => {
            editMode = !editMode;
            deleteMode = false;
            editBtn.textContent = `✏ Modifier (${editMode ? "ON" : "OFF"})`;
            delBtn.textContent = "🗑 Supprimer (OFF)";
        });

        const delBtn = document.createElement("button");
        delBtn.textContent = "🗑 Supprimer (OFF)";
        delBtn.className = "btn btn-sm btn-danger";
        delBtn.addEventListener("click", () => {
            deleteMode = !deleteMode;
            editMode = false;
            delBtn.textContent = `🗑 Supprimer (${deleteMode ? "ON" : "OFF"})`;
            editBtn.textContent = "✏ Modifier (OFF)";
        });

        rightControls.appendChild(editBtn);
        rightControls.appendChild(delBtn);

        footer.appendChild(leftControls);
        footer.appendChild(rightControls);

        refreshAll(container);
    }

    const observer = new MutationObserver(() => {
        const modalOpen = document.querySelector(".modal.fade.in, .modal.show");
        if (modalOpen) injectUI();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
    setTimeout(injectUI, 1000);
})();


