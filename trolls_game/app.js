document.addEventListener("DOMContentLoaded", () => {
  const chatEl = document.getElementById("chat");
  const levelInfoEl = document.getElementById("levelInfo");
  const scoreInfoEl = document.getElementById("scoreInfo");
  const replyInput = document.getElementById("replyInput");
  const btnSend = document.getElementById("btnSend");
  const btnReport = document.getElementById("btnReport");
  const btnBack = document.getElementById("btnBack");
  const trollNameEl = document.querySelector(".topbar .name");

  const overlays = {
    menu: document.getElementById("levelMenuOverlay"),
    report: document.getElementById("reportOverlay"),
    marko: document.getElementById("markoOverlay"),
    code: document.getElementById("codeOverlay"),
    secret: document.getElementById("secretCodeOverlay"),
    victory: document.getElementById("victoryOverlay"),
    exit: document.getElementById("confirmExitOverlay"),
    intro: document.getElementById("introOverlay"),
  };

  const DATA = window.GAME_DATA;
  if (!DATA?.levels?.length) {
    alert("Недостасува GAME_DATA.levels во data.js");
    return;
  }

  let levelIndex = 0;
  let turnIndex = 0;
  let correctCount = 0;
  let wrongCount = 0;

  // 🔒 само еден број – највисок отклучен левел (0-based index)
  let unlockedLevel = Number(localStorage.getItem("chatGuardProgress"));
  if (isNaN(unlockedLevel)) unlockedLevel = 0;

  function saveProgress() {
    localStorage.setItem("chatGuardProgress", unlockedLevel);
  }

  const secretCombo = ["📱", "⚠️", "🛡️"];
  let playerSelection = [null, null, null];
  let secretWrongAttempts = 0;

  const emojiPool = ["📱", "⚠️", "🛡️", "🕵️", "🔐", "🚫", "💬", "📡", "🔥", "🛑"];

  const level = () => DATA.levels[levelIndex];
  const turn = () => level().turns[turnIndex];

  // -------- UI helpers --------

  function showMarkoMessage(text) {
    const el = document.getElementById("markoText");
    el.textContent = text || "";
    overlays.marko.classList.remove("hidden");
  }

  function closeMarko() {
    overlays.marko.classList.add("hidden");
  }

  function scrollToBottom() {
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  // typing bubble (3 точки)
  function addTypingBubble() {
    // за да не додаваме повеќе од едно
    if (chatEl.querySelector(".msg.troll.typing")) return;

    chatEl.innerHTML += `
      <div class="msg troll typing">
        <div class="bubble">
          <span style="display:inline-block; letter-spacing:2px; opacity:.85;">•••</span>
        </div>
      </div>
    `;
    scrollToBottom();
  }

  function removeTypingBubble() {
    const node = chatEl.querySelector(".msg.troll.typing");
    if (node) node.remove();
  }

  function addTrollMessage(t) {
    const imgHtml = t.image
      ? `<img class="inline-img" src="${t.image}" alt="слика">`
      : "";

    // Ако сакаш аватарите да се појавуваат во чатот, тука може да додадеме <img>
    chatEl.innerHTML += `
      <div class="msg troll">
        <div class="bubble">
          ${escapeHtml(t.text)}
          ${imgHtml}
        </div>
      </div>
    `;
    scrollToBottom();
  }

  function addMyMessage(text) {
    chatEl.innerHTML += `
      <div class="msg me">
        <div class="bubble">${escapeHtml(text)}</div>
      </div>
    `;
    scrollToBottom();
  }

  function addSystemNote(text) {
    chatEl.innerHTML += `
      <div class="msg system">
        <div class="bubble">${escapeHtml(text)}</div>
      </div>
    `;
    scrollToBottom();
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function disableActions(disabled) {
    btnSend.disabled = disabled;
    btnReport.disabled = disabled;
  }

  // -------- Menu / Progress --------

  function updateMenuUI() {
    DATA.levels.forEach((lvl, i) => {
      const btn = document.getElementById(`lvlBtn${i}`);
      if (!btn) return;

      btn.textContent = `@${lvl.username}`;

      if (i <= unlockedLevel && i < DATA.levels.length) {
        btn.disabled = false;
        btn.classList.remove("btn-ghost");
        btn.classList.add("btn-like");
        btn.onclick = () => selectLevel(i);
      } else {
        btn.disabled = true;
        btn.classList.remove("btn-like");
        btn.classList.add("btn-ghost");
        btn.textContent += " 🔒";
        btn.onclick = null;
      }
    });

    const btnSecret = document.getElementById("btnSecretMenu");
    if (!btnSecret) return;

    // Сефот се отклучува откако ќе ги поминеш сите нивоа (unlockedLevel >= број на нивоа)
    if (unlockedLevel >= DATA.levels.length) {
      btnSecret.disabled = false;
      btnSecret.classList.remove("btn-ghost");
      btnSecret.classList.add("btn-report");
      btnSecret.innerHTML = "🔓 Отвори го сефот";
      btnSecret.onclick = openSecretVault;
    } else {
      btnSecret.disabled = true;
      btnSecret.classList.remove("btn-report");
      btnSecret.classList.add("btn-ghost");
      btnSecret.innerHTML = "🔐 Сефот е заклучен";
      btnSecret.onclick = null;
    }
  }

  // -------- Game flow --------

  function selectLevel(idx) {
    if (idx > unlockedLevel) return;

    levelIndex = idx;
    turnIndex = 0;
    correctCount = 0;
    wrongCount = 0;

    chatEl.innerHTML = "";
    trollNameEl.textContent = `@${level().username}`;

    overlays.menu.classList.add("hidden");

    renderTurn();
  }

  function renderTurn() {
    const t = turn();

    levelInfoEl.textContent = `Порака ${turnIndex + 1}/${level().turns.length}`;
    scoreInfoEl.textContent = `Точно: ${correctCount} | Грешки: ${wrongCount}`;

    // реално: во моментот тролот "куца", па ние покажуваме "Марко пишува..."
    replyInput.value = "Марко пишува...";
    disableActions(true);

    // typing bubble во чат
    addTypingBubble();

    // по малку случаен delay за реалистичност
    const delay = 550 + Math.floor(Math.random() * 450);

    setTimeout(() => {
      removeTypingBubble();
      addTrollMessage(t);

      replyInput.value = t.suggestedReply || "";
      disableActions(false);
    }, delay);
  }

  function handleAction(action, reasonId = null) {
    const t = turn();

    // прикажи што направил играчот
    if (action === "send") {
      const msg = (replyInput.value || "").trim();
      if (!msg) {
        showMarkoMessage("Напиши нешто пред да пратиш 🙂");
        disableActions(false);
        return;
      }
      addMyMessage(msg);
    } else {
      addSystemNote("🚩 Профилот е пријавен");
    }

    // провери точност
    const isCorrect =
      action === t.correctAction &&
      (action !== "report" || reasonId === t.correctReason);

    if (isCorrect) correctCount++;
    else wrongCount++;

    // Марко popup: секогаш на грешка; на точен одговор — само ако има markoPraise
    if (!isCorrect) {
      showMarkoMessage(t.markoWrong || "Внимавај… ова не беше безбедна одлука.");
    } else if (t.markoPraise) {
      showMarkoMessage(t.markoPraise);
    }

    scoreInfoEl.textContent = `Точно: ${correctCount} | Грешки: ${wrongCount}`;

    turnIndex++;

    if (turnIndex < level().turns.length) {
      setTimeout(renderTurn, 650);
    } else {
      setTimeout(endLevel, 750);
    }
  }

  function endLevel() {
    // тролот праќа клуч (emoji)
    disableActions(true);
    replyInput.value = "Марко пишува...";

    addTypingBubble();
    const delay = 600 + Math.floor(Math.random() * 500);

    setTimeout(() => {
      removeTypingBubble();
      addSystemNote(`🔑 Клуч: ${level().code.emoji}`);

      showCodeQuiz();
    }, delay);
  }

  // -------- Code quiz --------

  function showCodeQuiz() {
    const optionsEl = document.getElementById("codeOptions");
    if (!optionsEl) return;

    optionsEl.innerHTML = "";

    level().code.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "btn btn-ghost";
      btn.textContent = opt;

      btn.onclick = () => {
        if (opt === level().code.correct) {
          // unlock next level only if this one was the latest unlocked
          if (levelIndex === unlockedLevel) {
            unlockedLevel++;
            saveProgress();
          }

          overlays.code.classList.add("hidden");
          overlays.menu.classList.remove("hidden");
          updateMenuUI();
        } else {
          optionsEl.classList.add("shake");
          setTimeout(() => optionsEl.classList.remove("shake"), 400);
        }
      };

      optionsEl.appendChild(btn);
    });

    overlays.code.classList.remove("hidden");
  }

  // -------- Secret vault --------

  function openSecretVault() {
    const bank = document.getElementById("emojiBank");
    const slots = document.querySelectorAll(".slot");

    if (!bank || !slots?.length) return;

    bank.innerHTML = "";
    playerSelection = [null, null, null];
    secretWrongAttempts = 0;
    document.getElementById("secretErrorCounter").textContent = "Грешни обиди: 0";

    slots.forEach((slot, i) => {
      slot.textContent = "";
      slot.onclick = () => {
        const emoji = playerSelection[i];
        if (!emoji) return;

        document.querySelectorAll(".draggable-emoji").forEach(e => {
          if (e.textContent === emoji) e.classList.remove("used");
        });

        playerSelection[i] = null;
        slot.textContent = "";
      };
    });

    [...emojiPool].sort(() => Math.random() - 0.5).forEach(emoji => {
      const el = document.createElement("div");
      el.className = "draggable-emoji";
      el.textContent = emoji;

      el.onclick = () => {
        const idx = playerSelection.indexOf(null);
        if (idx !== -1 && !el.classList.contains("used")) {
          playerSelection[idx] = emoji;
          slots[idx].textContent = emoji;
          el.classList.add("used");
        }
      };

      bank.appendChild(el);
    });

    overlays.secret.classList.remove("hidden");
  }

  const btnCheckSecret = document.getElementById("btnCheckSecret");
  if (btnCheckSecret) {
    btnCheckSecret.onclick = () => {
      const ok = playerSelection.every((v, i) => v === secretCombo[i]);
      const area = document.querySelector(".emoji-slots");
      const counter = document.getElementById("secretErrorCounter");

      if (ok) {
        overlays.secret.classList.add("hidden");
        overlays.victory.classList.remove("hidden");
        if (window.confetti) confetti({ particleCount: 150, spread: 80 });
      } else {
        secretWrongAttempts++;
        counter.textContent = `Грешни обиди: ${secretWrongAttempts}`;
        area.classList.add("shake");
        counter.classList.add("shake");
        setTimeout(() => {
          area.classList.remove("shake");
          counter.classList.remove("shake");
        }, 500);
      }
    };
  }

  // -------- Buttons --------

  btnSend.onclick = () => handleAction("send");

  btnReport.onclick = () => {
    const list = document.getElementById("reasonList");
    list.innerHTML = "";

    DATA.reportReasons.forEach(r => {
      const b = document.createElement("button");
      b.className = "reason";
      b.textContent = r.label;

      b.onclick = () => {
        overlays.report.classList.add("hidden");
        handleAction("report", r.id);
      };

      list.appendChild(b);
    });

    overlays.report.classList.remove("hidden");
  };

  btnBack.onclick = e => {
    e.preventDefault();
    overlays.exit.classList.remove("hidden");
  };

  document.getElementById("btnConfirmExit").onclick = () => {
    overlays.exit.classList.add("hidden");
    overlays.menu.classList.remove("hidden");
    updateMenuUI();
  };

  document.getElementById("btnCancelExit").onclick = () =>
    overlays.exit.classList.add("hidden");

  document.getElementById("btnCancelSecret").onclick = () =>
    overlays.secret.classList.add("hidden");

  document.getElementById("btnMarkoOk").onclick = closeMarko;

  document.getElementById("btnCancelReport").onclick = () =>
    overlays.report.classList.add("hidden");

  document.getElementById("btnIntroOk").onclick = () => {
    overlays.intro.classList.add("hidden");
    overlays.menu.classList.remove("hidden");
    updateMenuUI();
  };

  // старт
  updateMenuUI();
});
