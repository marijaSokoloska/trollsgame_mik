document.addEventListener("DOMContentLoaded", () => {
  // 1. СИТЕ ЕЛЕМЕНТИ
  const chatEl = document.getElementById("chat");
  const levelInfoEl = document.getElementById("levelInfo");
  const scoreInfoEl = document.getElementById("scoreInfo");
  const replyInput = document.getElementById("replyInput");
  const btnSend = document.getElementById("btnSend");
  const btnReport = document.getElementById("btnReport");
  const btnBack = document.getElementById("btnBack");

  const introOverlay = document.getElementById("introOverlay");
  const btnIntroOk = document.getElementById("btnIntroOk");
  const levelMenuOverlay = document.getElementById("levelMenuOverlay");
  const btnSecretMenu = document.getElementById("btnSecretMenu");
  const reportOverlay = document.getElementById("reportOverlay");
  const btnCancelReport = document.getElementById("btnCancelReport");
  const reasonList = document.getElementById("reasonList");
  const markoOverlay = document.getElementById("markoOverlay");
  const markoText = document.getElementById("markoText");
  const btnMarkoOk = document.getElementById("btnMarkoOk");
  const codeOverlay = document.getElementById("codeOverlay");
  const codeOptionsEl = document.getElementById("codeOptions");
  const btnCodeConfirm = document.getElementById("btnCodeConfirm");

  const DATA = window.GAME_DATA || { levels: [] };
  
  let levelIndex = 0;
  let turnIndex = 0;
  let correctCount = 0;
  let unlockedLevels = [0]; 
  let selectedCodeOption = null;

  const level = () => DATA.levels[levelIndex];
  const turn = () => level() ? level().turns[turnIndex] : null;

  // --- КЛУЧНИ ФУНКЦИИ ЗА ЗАТВОРАЊЕ (Ова мора да е прво) ---
  
  const closeAllPopups = () => {
    reportOverlay.classList.add("hidden");
    markoOverlay.classList.add("hidden");
    codeOverlay.classList.add("hidden");
    introOverlay.classList.add("hidden");
    // Присилно криење за секој случај
    reportOverlay.style.display = "none";
  };

  btnCancelReport.onclick = (e) => {
    e.preventDefault();
    console.log("Кликнато ОТКАЖИ");
    reportOverlay.classList.add("hidden");
    reportOverlay.style.display = "none";
  };

  btnMarkoOk.onclick = () => markoOverlay.classList.add("hidden");

  // --- ИГРА И МЕНИ ---

  window.selectLevel = (idx) => {
    levelIndex = idx;
    levelMenuOverlay.classList.add("hidden");
    startLevel();
  };

  function updateMenuUI() {
    unlockedLevels.forEach(idx => {
      const btn = document.getElementById(`lvlBtn${idx}`);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = btn.innerHTML.replace(" 🔒", "");
        btn.classList.remove("btn-ghost");
        btn.classList.add("btn-like");
      }
    });
  }

  function startLevel() {
    chatEl.innerHTML = "";
    correctCount = 0;
    turnIndex = 0;
    if(level()) {
        updateHeader();
        renderTurn();
    }
  }

  function updateHeader() {
    if(!level()) return;
    levelInfoEl.textContent = `Ниво ${level().id}`;
    scoreInfoEl.textContent = `Точно: ${correctCount}`;
  }

  function renderTurn() {
    const t = turn();
    if(!t) return;

    btnSend.disabled = true;
    btnReport.disabled = true;
    replyInput.value = "";
    
    const typingMsg = document.createElement("div");
    typingMsg.className = "msg troll";
    typingMsg.innerHTML = `<img class="avatar" src="assets/troll.jpg"><div class="bubble">...</div>`;
    chatEl.appendChild(typingMsg);

    setTimeout(() => {
      typingMsg.remove();
      const msg = document.createElement("div");
      msg.className = "msg troll";
      msg.innerHTML = `<img class="avatar" src="assets/troll.jpg"><div class="bubble">${t.text}</div>`;
      chatEl.appendChild(msg);
      
      replyInput.value = t.suggestedReply;
      btnSend.disabled = false;
      btnReport.disabled = false;
      chatEl.scrollTop = chatEl.scrollHeight;
    }, 1000);
  }

  function handleAction(action, reasonId = null) {
    reportOverlay.classList.add("hidden");
    reportOverlay.style.display = "none";
    const t = turn();
    
    if (action === "send") {
      chatEl.innerHTML += `<div class="msg me"><div class="bubble">${replyInput.value}</div></div>`;
    } else {
      chatEl.innerHTML += `<div class="msg system"><div class="bubble">🚨 ПРИЈАВЕНО: ${reasonId}</div></div>`;
    }

    const isCorrect = (action === t.correctAction) && (action === "send" || reasonId === t.correctReason);

    if (isCorrect) {
      correctCount++;
      if (t.markoPraise || t.praiseOnCorrect) showMarko(t.markoPraise || "Браво!");
    } else {
      showMarko(t.markoWrong || "Размисли пак!");
    }

    updateHeader();
    chatEl.scrollTop = chatEl.scrollHeight;

    if (turnIndex < level().turns.length - 1) {
      turnIndex++;
      setTimeout(renderTurn, 1000);
    } else {
      setTimeout(() => {
        chatEl.innerHTML += `<div class="msg system"><div class="bubble">🎁 КОД: ${level().code.emoji}</div></div>`;
        chatEl.scrollTop = chatEl.scrollHeight;
        setTimeout(showCodeQuiz, 1500);
      }, 1000);
    }
  }

  function showMarko(text) {
    markoText.textContent = text;
    markoOverlay.classList.remove("hidden");
  }

  function showCodeQuiz() {
    codeOptionsEl.innerHTML = "";
    btnCodeConfirm.disabled = true;
    level().code.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.textContent = opt;
      btn.className = "btn btn-ghost";
      btn.style.fontSize = "30px";
      btn.onclick = () => {
        selectedCodeOption = opt;
        Array.from(codeOptionsEl.children).forEach(b => b.classList.remove("btn-like"));
        btn.classList.add("btn-like");
        btnCodeConfirm.disabled = false;
      };
      codeOptionsEl.appendChild(btn);
    });
    codeOverlay.classList.remove("hidden");
  }

  // --- ОСТАНАТИ EVENT LISTENERS ---

  btnIntroOk.onclick = () => {
    introOverlay.classList.add("hidden");
    levelMenuOverlay.classList.remove("hidden");
    updateMenuUI();
  };

  btnBack.onclick = () => {
    levelMenuOverlay.classList.remove("hidden");
  };

  btnSend.onclick = () => handleAction("send");

  btnReport.onclick = () => {
    reasonList.innerHTML = "";
    if(DATA.reportReasons) {
        DATA.reportReasons.forEach(r => {
          const btn = document.createElement("button");
          btn.className = "reason";
          btn.textContent = r.label;
          btn.onclick = () => handleAction("report", r.id);
          reasonList.appendChild(btn);
        });
    }
    reportOverlay.style.display = "flex";
    reportOverlay.classList.remove("hidden");
  };

  btnCodeConfirm.onclick = () => {
    codeOverlay.classList.add("hidden");
    if (selectedCodeOption === level().code.correct) {
      if (!unlockedLevels.includes(levelIndex + 1)) unlockedLevels.push(levelIndex + 1);
      alert("Точно!");
    } else {
      alert("Грешен код!");
    }
    levelMenuOverlay.classList.remove("hidden");
    updateMenuUI();
  };
});
