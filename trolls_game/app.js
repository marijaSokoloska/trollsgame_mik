// app.js
(() => {
  const chatEl = document.getElementById("chat");
  const levelInfoEl = document.getElementById("levelInfo");
  const scoreInfoEl = document.getElementById("scoreInfo");

  const replyInput = document.getElementById("replyInput");
  const btnSend = document.getElementById("btnSend");
  const btnReport = document.getElementById("btnReport");

  const reportOverlay = document.getElementById("reportOverlay");
  const reasonList = document.getElementById("reasonList");
  const btnCloseReport = document.getElementById("btnCloseReport");
  const btnCancelReport = document.getElementById("btnCancelReport");

  const markoOverlay = document.getElementById("markoOverlay");
  const markoText = document.getElementById("markoText");
  const btnMarkoOk = document.getElementById("btnMarkoOk");

  const codeOverlay = document.getElementById("codeOverlay");
  const codeOptionsEl = document.getElementById("codeOptions");
  const btnCodeConfirm = document.getElementById("btnCodeConfirm");

  const endOverlay = document.getElementById("endOverlay");
  const endTitle = document.getElementById("endTitle");
  const endText = document.getElementById("endText");
  const btnEndPrimary = document.getElementById("btnEndPrimary");
  const btnEndSecondary = document.getElementById("btnEndSecondary");

  const DATA = window.GAME_DATA;
  if (!DATA?.levels?.length) {
    alert("Недостасува GAME_DATA.levels во data.js");
    return;
  }

  // --- State ---
  let levelIndex = 0;     // 0-based
  let turnIndex = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let selectedCodeOption = null;
  let isTyping = false;

  const level = () => DATA.levels[levelIndex];
  const turn = () => level().turns[turnIndex];

  // --- UI helpers ---
  function scrollToBottom() {
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function setControlsEnabled(enabled) {
    btnSend.disabled = !enabled;
    btnReport.disabled = !enabled;
    replyInput.disabled = !enabled;
  }

  function updateHeader() {
    const total = level().turns.length;
    levelInfoEl.textContent = `Ниво ${level().id} · ${Math.min(turnIndex + 1, total)}/${total}`;
    scoreInfoEl.textContent = `Точно: ${correctCount} · Грешки: ${wrongCount}`;
  }

  function addSystemBubble(text) {
    const wrap = document.createElement("div");
    wrap.className = "msg system";
    wrap.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
    chatEl.appendChild(wrap);
    scrollToBottom();
  }

  function addTrollMessage(t) {
    const wrap = document.createElement("div");
    wrap.className = "msg troll";

    const imgHtml = t.image
      ? `<img class="inline-img" src="${t.image}" alt="inline content" />`
      : "";

    wrap.innerHTML = `
      <img class="avatar" src="assets/troll.png" alt="Troll" />
      <div class="bubble">
        <div>${escapeHtml(t.text)}</div>
        ${imgHtml}
      </div>
    `;
    chatEl.appendChild(wrap);
    scrollToBottom();
  }

  function addTypingBubble() {
    const wrap = document.createElement("div");
    wrap.className = "msg troll";
    wrap.dataset.typing = "1";
    wrap.innerHTML = `
      <img class="avatar" src="assets/troll.png" alt="Troll" />
      <div class="bubble">
        <div class="typing-dots" aria-label="typing">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    chatEl.appendChild(wrap);
    scrollToBottom();
  }

  function removeTypingBubble() {
    const node = chatEl.querySelector('.msg.troll[data-typing="1"]');
    if (node) node.remove();
  }

  function addMyMessage(text) {
    const wrap = document.createElement("div");
    wrap.className = "msg me";
    wrap.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
    chatEl.appendChild(wrap);
    scrollToBottom();
  }

  function openReportModal() {
    reasonList.innerHTML = "";
    DATA.reportReasons.forEach(r => {
      const btn = document.createElement("button");
      btn.className = "reason";
      btn.textContent = r.label;
      btn.addEventListener("click", () => submitAnswer("report", r.id));
      reasonList.appendChild(btn);
    });
    reportOverlay.classList.remove("hidden");
  }

  function closeReportModal() {
    reportOverlay.classList.add("hidden");
  }

  function openMarkoPopup(text) {
    markoText.textContent = text;
    markoOverlay.classList.remove("hidden");
  }

  function closeMarkoPopup() {
    markoOverlay.classList.add("hidden");
  }

  function openCodePopup() {
    selectedCodeOption = null;
    btnCodeConfirm.disabled = true;
    codeOptionsEl.innerHTML = "";

    const opts = level().code.options;
    opts.forEach(opt => {
      const row = document.createElement("div");
      row.className = "option";
      row.innerHTML = `<span>${escapeHtml(opt)}</span><span>○</span>`;
      row.addEventListener("click", () => {
        selectedCodeOption = opt;
        [...codeOptionsEl.children].forEach(c => c.classList.remove("selected"));
        row.classList.add("selected");
        btnCodeConfirm.disabled = false;
      });
      codeOptionsEl.appendChild(row);
    });

    codeOverlay.classList.remove("hidden");
  }

  function closeCodePopup() {
    codeOverlay.classList.add("hidden");
  }

  function openEndPopup({ title, text, primaryLabel, secondaryLabel, onPrimary, onSecondary }) {
    endTitle.textContent = title;
    endText.textContent = text;

    btnEndPrimary.textContent = primaryLabel;
    btnEndSecondary.textContent = secondaryLabel;

    btnEndPrimary.onclick = () => {
      closeEndPopup();
      onPrimary?.();
    };
    btnEndSecondary.onclick = () => {
      closeEndPopup();
      onSecondary?.();
    };

    endOverlay.classList.remove("hidden");
  }

  function closeEndPopup() {
    endOverlay.classList.add("hidden");
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // --- Game flow ---
  function startLevel() {
    chatEl.innerHTML = "";
    correctCount = 0;
    wrongCount = 0;
    turnIndex = 0;
    isTyping = false;

    updateHeader();
    addSystemBubble("📱 Ти си на телефонот на Марко. Помогни му да одлучи: да прати порака (SEND) или да пријави (REPORT).");

    renderCurrentTurn();
  }

  function renderCurrentTurn() {
    updateHeader();
    setControlsEnabled(false);

    const t = turn();

    // prefill suggested reply
    replyInput.value = t.suggestedReply || "";
    replyInput.focus();

    // typing effect
    isTyping = true;
    addTypingBubble();

    const delay = randomInt(700, 1200);
    setTimeout(() => {
      removeTypingBubble();
      addTrollMessage(t);
      isTyping = false;
      setControlsEnabled(true);
    }, delay);
  }

  function submitAnswer(action, reasonId = null) {
    if (isTyping) return;

    setControlsEnabled(false);
    closeReportModal();

    const t = turn();

    // If SEND: show my (player) message bubble
    if (action === "send") {
      const textToSend = (replyInput.value || "").trim();
      if (!textToSend) {
        openMarkoPopup("Напиши нешто (или користи предложен одговор) 🙂");
        setControlsEnabled(true);
        return;
      }
      addMyMessage(textToSend);
    } else if (action === "report") {
      // small realistic system note (not “correct/incorrect”)
      addSystemBubble("🚩 Пораката е пријавена.");
    }

    // Evaluate correctness (no “correct/incorrect” bubbles)
    const isCorrect =
      action === t.correctAction &&
      (action === "send" ? true : reasonId === t.correctReason);

    if (isCorrect) {
      correctCount++;
      // Marko popup only sometimes (important questions)
      if (t.praiseOnCorrect && t.markoPraise) {
        openMarkoPopup(t.markoPraise);
      }
    } else {
      wrongCount++;
      if (t.markoWrong) {
        openMarkoPopup(t.markoWrong);
      } else {
        openMarkoPopup("Внимавај… мислам дека ова не беше најбезбедна одлука.");
      }
    }

    updateHeader();

    const isLastTurn = (turnIndex >= level().turns.length - 1);
    if (isLastTurn) {
      endLevel();
    } else {
      turnIndex++;
      setTimeout(() => renderCurrentTurn(), 450);
    }
  }

  function endLevel() {
    // Troll sends emoji “code part” (with typing)
    setControlsEnabled(false);

    addTypingBubble();
    setTimeout(() => {
      removeTypingBubble();

      const codeEmoji = level().code.emoji;
      addSystemBubble(`🧌 Трол: Еве дел од кодот ${codeEmoji}`);

      // Code quiz popup
      openCodePopup();

      btnCodeConfirm.onclick = () => {
        const correct = level().code.correct;
        closeCodePopup();

        // Marko reacts only on wrong OR on correct (can be both, but short)
        if (selectedCodeOption === correct) {
          if (level().code.markoPraise) openMarkoPopup(level().code.markoPraise);
        } else {
          if (level().code.markoWrong) openMarkoPopup(level().code.markoWrong);
        }

        // pass/fail
        const total = level().turns.length;
        const rate = correctCount / total;
        const pct = Math.round(rate * 100);
        const minPct = Math.round(level().minPassRate * 100);
        const passed = rate >= level().minPassRate;

        const hasNext = levelIndex < DATA.levels.length - 1;

        if (!passed) {
          openEndPopup({
            title: "Ниво не е поминато",
            text: `Точност: ${pct}% (минимум ${minPct}%). Сакаш да пробаш повторно?`,
            primaryLabel: "Пробај пак",
            secondaryLabel: "Од почеток",
            onPrimary: () => startLevel(),
            onSecondary: () => { levelIndex = 0; startLevel(); }
          });
          return;
        }

        if (hasNext) {
          openEndPopup({
            title: "Браво! Ниво поминато",
            text: `Точност: ${pct}%. Спремен/на за следното ниво?`,
            primaryLabel: "Следно ниво",
            secondaryLabel: "Пробај пак",
            onPrimary: () => { levelIndex++; startLevel(); },
            onSecondary: () => startLevel()
          });
        } else {
          openEndPopup({
            title: "🎊 Честитки!",
            text: `Ги помина сите нивоа (точност: ${pct}%). Сакаш да почнеш одново?`,
            primaryLabel: "Почни одново",
            secondaryLabel: "Остани тука",
            onPrimary: () => { levelIndex = 0; startLevel(); },
            onSecondary: () => {
              addSystemBubble("🟦 Марко: Фала ти! Сега сум многу побезбеден онлајн 🙂");
            }
          });
        }
      };
    }, randomInt(700, 1200));
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // --- Events ---
  btnSend.addEventListener("click", () => submitAnswer("send"));
  btnReport.addEventListener("click", openReportModal);

  btnCloseReport.addEventListener("click", closeReportModal);
  btnCancelReport.addEventListener("click", closeReportModal);

  btnMarkoOk.addEventListener("click", closeMarkoPopup);

  // Enter key = Send
  replyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitAnswer("send");
  });

  // Close overlays when clicking outside
  reportOverlay.addEventListener("click", (e) => {
    if (e.target === reportOverlay) closeReportModal();
  });
  markoOverlay.addEventListener("click", (e) => {
    if (e.target === markoOverlay) closeMarkoPopup();
  });
  codeOverlay.addEventListener("click", (e) => {
    if (e.target === codeOverlay) closeCodePopup();
  });
  endOverlay.addEventListener("click", (e) => {
    if (e.target === endOverlay) closeEndPopup();
  });

  // Start
  startLevel();
})();
