const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

const body = document.body;
const themeToggle = document.getElementById("toggle-theme");
const sheetEmbed = document.getElementById("sheet-embed");
const zoomIn = document.getElementById("zoom-in");
const zoomOut = document.getElementById("zoom-out");
const fullscreenButton = document.getElementById("sheet-fullscreen");

const diceType = document.getElementById("dice-type");
const diceCount = document.getElementById("dice-count");
const diceMode = document.getElementById("dice-mode");
const rollDice = document.getElementById("roll-dice");
const diceOutput = document.getElementById("dice-output");
const diceHistory = document.getElementById("dice-history");

const hpMax = document.getElementById("hp-max");
const hpCurrent = document.getElementById("hp-current");
const hpTemp = document.getElementById("hp-temp");
const hpReset = document.getElementById("hp-reset");
const hpClearTemp = document.getElementById("hp-clear-temp");

const slotList = document.getElementById("slot-list");
const conditionList = document.getElementById("condition-list");
const notesField = document.getElementById("session-notes");
const notesClear = document.getElementById("notes-clear");

const state = {
  theme: storage.get("dnd-theme", "light"),
  sheetScale: storage.get("dnd-sheet-scale", 1),
  diceHistory: storage.get("dnd-dice-history", []),
  hp: storage.get("dnd-hp", { max: 1, current: 1, temp: 0 }),
  slots: storage.get(
    "dnd-slots",
    Array.from({ length: 9 }, (_, i) => ({ level: i + 1, total: 0, used: 0 }))
  ),
  conditions: storage.get("dnd-conditions", {}),
  notes: storage.get("dnd-notes", ""),
};

const conditionNames = [
  "Blinded",
  "Charmed",
  "Deafened",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious",
  "Exhaustion",
];

function applyTheme() {
  body.classList.toggle("dark", state.theme === "dark");
  themeToggle.textContent = state.theme === "dark" ? "Light Mode" : "Dark Mode";
}

function applySheetScale() {
  const scale = Math.max(0.8, Math.min(1.4, state.sheetScale));
  sheetEmbed.style.setProperty("--sheet-scale", scale);
  state.sheetScale = scale;
  storage.set("dnd-sheet-scale", scale);
}

function pushDiceHistory(entry) {
  state.diceHistory.unshift(entry);
  state.diceHistory = state.diceHistory.slice(0, 5);
  storage.set("dnd-dice-history", state.diceHistory);
  renderDiceHistory();
}

function renderDiceHistory() {
  diceHistory.textContent = state.diceHistory.length
    ? `Last rolls: ${state.diceHistory.join(" • ")}`
    : "";
}

function roll({ sides, count, mode }) {
  const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
  if (sides === 20 && mode !== "normal" && count === 1) {
    const alt = 1 + Math.floor(Math.random() * sides);
    rolls.push(alt);
    const result = mode === "adv" ? Math.max(...rolls) : Math.min(...rolls);
    return { rolls, total: result, mode };
  }
  const total = rolls.reduce((sum, value) => sum + value, 0);
  return { rolls, total, mode: "normal" };
}

function handleRoll() {
  const sides = Number(diceType.value);
  const count = Math.max(1, Number(diceCount.value));
  const mode = diceMode.value;
  const result = roll({ sides, count, mode });
  const rollText = result.rolls.join(", ");
  diceOutput.textContent = `Rolled ${count}d${sides}${result.mode !== "normal" ? ` (${result.mode})` : ""}: ${rollText} → Total ${result.total}`;
  pushDiceHistory(`${count}d${sides} = ${result.total}`);
}

function updateHpFromInputs() {
  const max = Math.max(1, Number(hpMax.value));
  const current = Math.max(0, Math.min(max, Number(hpCurrent.value)));
  const temp = Math.max(0, Number(hpTemp.value));
  hpMax.value = max;
  hpCurrent.value = current;
  hpTemp.value = temp;
  state.hp = { max, current, temp };
  storage.set("dnd-hp", state.hp);
}

function applyHpChange(delta) {
  hpCurrent.value = Math.max(0, Number(hpCurrent.value) + delta);
  updateHpFromInputs();
}

function renderSlots() {
  slotList.innerHTML = "";
  state.slots.forEach((slot, index) => {
    const row = document.createElement("div");
    row.className = "slot-row";

    const label = document.createElement("div");
    label.textContent = `Level ${slot.level}`;

    const totals = document.createElement("input");
    totals.type = "number";
    totals.min = "0";
    totals.value = slot.total;
    totals.addEventListener("change", () => {
      const value = Math.max(0, Number(totals.value));
      state.slots[index].total = value;
      if (state.slots[index].used > value) {
        state.slots[index].used = value;
      }
      storage.set("dnd-slots", state.slots);
      renderSlots();
    });

    const controls = document.createElement("div");
    controls.className = "slot-controls";

    const minus = document.createElement("button");
    minus.className = "button ghost";
    minus.type = "button";
    minus.textContent = "-";
    minus.addEventListener("click", () => {
      state.slots[index].used = Math.max(0, slot.used - 1);
      storage.set("dnd-slots", state.slots);
      renderSlots();
    });

    const used = document.createElement("span");
    used.textContent = `${slot.used}/${slot.total}`;

    const plus = document.createElement("button");
    plus.className = "button ghost";
    plus.type = "button";
    plus.textContent = "+";
    plus.addEventListener("click", () => {
      state.slots[index].used = Math.min(slot.total, slot.used + 1);
      storage.set("dnd-slots", state.slots);
      renderSlots();
    });

    controls.append(minus, used, plus);
    row.append(label, totals, controls);
    slotList.append(row);
  });
}

function renderConditions() {
  conditionList.innerHTML = "";
  conditionNames.forEach((name) => {
    const item = document.createElement("label");
    item.className = "condition-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(state.conditions[name]);
    checkbox.addEventListener("change", () => {
      state.conditions[name] = checkbox.checked;
      storage.set("dnd-conditions", state.conditions);
    });

    const text = document.createElement("span");
    text.textContent = name;

    item.append(checkbox, text);
    conditionList.append(item);
  });
}

function initNotes() {
  notesField.value = state.notes;
  notesField.addEventListener("input", () => {
    state.notes = notesField.value;
    storage.set("dnd-notes", state.notes);
  });
  notesClear.addEventListener("click", () => {
    notesField.value = "";
    state.notes = "";
    storage.set("dnd-notes", "");
  });
}

function initHp() {
  hpMax.value = state.hp.max;
  hpCurrent.value = state.hp.current;
  hpTemp.value = state.hp.temp;
  hpMax.addEventListener("change", updateHpFromInputs);
  hpCurrent.addEventListener("change", updateHpFromInputs);
  hpTemp.addEventListener("change", updateHpFromInputs);

  document.querySelectorAll("[data-hp-change]").forEach((button) => {
    button.addEventListener("click", () => {
      const delta = Number(button.dataset.hpChange);
      applyHpChange(delta);
    });
  });

  hpReset.addEventListener("click", () => {
    hpCurrent.value = hpMax.value;
    updateHpFromInputs();
  });

  hpClearTemp.addEventListener("click", () => {
    hpTemp.value = 0;
    updateHpFromInputs();
  });
}

function initTheme() {
  applyTheme();
  themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    storage.set("dnd-theme", state.theme);
    applyTheme();
  });
}

function initSheetControls() {
  applySheetScale();
  zoomIn.addEventListener("click", () => {
    state.sheetScale += 0.1;
    applySheetScale();
  });
  zoomOut.addEventListener("click", () => {
    state.sheetScale -= 0.1;
    applySheetScale();
  });
  fullscreenButton.addEventListener("click", () => {
    const target = document.getElementById("sheet-embed");
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      target.requestFullscreen().catch(() => {});
    }
  });
}

function init() {
  initTheme();
  initSheetControls();
  renderDiceHistory();
  rollDice.addEventListener("click", handleRoll);
  initHp();
  renderSlots();
  renderConditions();
  initNotes();
}

init();
