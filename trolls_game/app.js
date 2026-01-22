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
        intro: document.getElementById("introOverlay")
    };

    const DATA = window.GAME_DATA;

    let levelIndex = 0;
    let turnIndex = 0;
    let correctCount = 0;
    let wrongCount = 0;

    /* 🔒 САМО ЕДЕН БРОЈ – највисок отклучен левел */
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

    /* ---------- UI ---------- */

    function showMarkoMessage(text) {
        document.getElementById("markoText").textContent = text;
        overlays.marko.classList.remove("hidden");
    }

    function updateMenuUI() {
        DATA.levels.forEach((lvl, i) => {
            const btn = document.getElementById(`lvlBtn${i}`);
            if (!btn) return;

            btn.textContent = `@${lvl.username}`;

            if (i <= unlockedLevel) {
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
        if (unlockedLevel >= DATA.levels.length - 1) {
            btnSecret.disabled = false;
            btnSecret.classList.remove("btn-ghost");
            btnSecret.classList.add("btn-report");
            btnSecret.onclick = openSecretVault;
        } else {
            btnSecret.disabled = true;
            btnSecret.classList.remove("btn-report");
            btnSecret.classList.add("btn-ghost");
            btnSecret.onclick = null;
        }
    }

    /* ---------- GAME FLOW ---------- */

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

        replyInput.value = "Марко пишува...";
        btnSend.disabled = true;
        btnReport.disabled = true;

        setTimeout(() => {
            chatEl.innerHTML += `
                <div class="msg troll">
                    <div class="bubble">${t.text}</div>
                </div>
            `;
            replyInput.value = t.suggestedReply;
            btnSend.disabled = false;
            btnReport.disabled = false;
            chatEl.scrollTop = chatEl.scrollHeight;
        }, 600);
    }

    function handleAction(action, reasonId = null) {
        const t = turn();

        const isCorrect =
            action === t.correctAction &&
            (action !== "report" || reasonId === t.correctReason);

        chatEl.innerHTML += action === "send"
            ? `<div class="msg me"><div class="bubble">${replyInput.value}</div></div>`
            : `<div class="msg system"><div class="bubble">🚩 Профилот е пријавен</div></div>`;

        isCorrect ? correctCount++ : wrongCount++;
        showMarkoMessage(isCorrect ? t.markoPraise : t.markoWrong);

        turnIndex++;

        if (turnIndex < level().turns.length) {
            setTimeout(renderTurn, 900);
        } else {
            setTimeout(() => {
                chatEl.innerHTML += `
                    <div class="msg system">
                        <div class="bubble">🔑 Клуч: ${level().code.emoji}</div>
                    </div>
                `;
                showCodeQuiz();
            }, 1000);
        }
    }

    function showCodeQuiz() {
        const optionsEl = document.getElementById("codeOptions");
        optionsEl.innerHTML = "";

        level().code.options.forEach(opt => {
            const btn = document.createElement("button");
            btn.className = "btn btn-ghost";
            btn.textContent = opt;

            btn.onclick = () => {
                if (opt === level().code.correct) {
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

    /* ---------- SECRET VAULT ---------- */

    function openSecretVault() {
        const bank = document.getElementById("emojiBank");
        const slots = document.querySelectorAll(".slot");

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

    document.getElementById("btnCheckSecret").onclick = () => {
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

    /* ---------- BUTTONS ---------- */

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
    };

    document.getElementById("btnCancelExit").onclick = () =>
        overlays.exit.classList.add("hidden");

    document.getElementById("btnCancelSecret").onclick = () =>
        overlays.secret.classList.add("hidden");

    document.getElementById("btnMarkoOk").onclick = () =>
        overlays.marko.classList.add("hidden");

    document.getElementById("btnCancelReport").onclick = () =>
        overlays.report.classList.add("hidden");

    document.getElementById("btnIntroOk").onclick = () => {
        overlays.intro.classList.add("hidden");
        overlays.menu.classList.remove("hidden");
    };

    updateMenuUI();
});
