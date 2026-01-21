document.addEventListener("DOMContentLoaded", () => {
    // --- ЕЛЕМЕНТИ ОД DOM ---
    const chatEl = document.getElementById("chat");
    const levelInfoEl = document.getElementById("levelInfo");
    const scoreInfoEl = document.getElementById("scoreInfo");
    const replyInput = document.getElementById("replyInput");
    const btnSend = document.getElementById("btnSend");
    const btnReport = document.getElementById("btnReport");
    const btnBack = document.getElementById("btnBack");

    // Оверлеи
    const levelMenuOverlay = document.getElementById("levelMenuOverlay");
    const reportOverlay = document.getElementById("reportOverlay");
    const markoOverlay = document.getElementById("markoOverlay");
    const codeOverlay = document.getElementById("codeOverlay");
    const secretCodeOverlay = document.getElementById("secretCodeOverlay");
    const victoryOverlay = document.getElementById("victoryOverlay");

    // --- СОСТОЈБА НА ИГРАТА ---
    const DATA = window.GAME_DATA;
    let levelIndex = 0;
    let turnIndex = 0;
    let correctCount = 0;
    
    // ВЧИТУВАЊЕ ПРОГРЕС: Проверуваме дали има зачувано прогрес
    let unlockedLevels = JSON.parse(localStorage.getItem("chatGuardProgress")) || [0];

    // Функција за зачувување на прогресот
    function saveProgress() {
        localStorage.setItem("chatGuardProgress", JSON.stringify(unlockedLevels));
    }

    // Состојба за Тајниот Сеф (Vault)
    const secretCombo = ["📱", "⚠️", "🛡️"];
    let playerSelection = [null, null, null];
    let secretWrongAttempts = 0;
    const emojiPool = ["📱", "⚠️", "🛡️", "🕵️", "🔐", "🚫", "💬", "📡", "🔥", "🛑"];

    // Помошни функции за тековно ниво
    const level = () => DATA.levels[levelIndex];
    const turn = () => level().turns[turnIndex];

    // Иницијализација на менито веднаш
    updateMenuUI();

    // --- ЛОГИКА ЗА ТАЈНИОТ СЕФ (НОВА ВЕРЗИЈА) ---
    function openSecretVault() {
        const bank = document.getElementById("emojiBank");
        const slots = document.querySelectorAll('.slot');
        bank.innerHTML = "";
        playerSelection = [null, null, null];
        
        // 1. Исчисти ги слотовите и постави настан за враќање (Undo)
        slots.forEach((slot, index) => {
            slot.textContent = "";
            slot.className = "slot"; // Ресетирај анимации
            slot.style.borderColor = "rgba(255, 255, 255, 0.1)";
            
            slot.onclick = () => {
                if (playerSelection[index]) {
                    // Најди го емоџито во банката и врати го (овозможи го повторно)
                    const emojiToReturn = playerSelection[index];
                    const bankIcons = document.querySelectorAll('.draggable-emoji');
                    
                    for (let icon of bankIcons) {
                        if (icon.textContent === emojiToReturn && icon.classList.contains("used")) {
                            icon.classList.remove("used");
                            break; // Врати само едно такво емоџи
                        }
                    }
                    
                    // Исчисти го слотот
                    playerSelection[index] = null;
                    slot.textContent = "";
                    slot.classList.remove("slot-pop");
                }
            };
        });
        
        // 2. Креирај ја банката со емоџија
        const shuffledPool = [...emojiPool].sort(() => Math.random() - 0.5);
        
        shuffledPool.forEach(emoji => {
            const el = document.createElement("div");
            el.className = "draggable-emoji";
            el.textContent = emoji;
            
            el.onclick = () => {
                // Ако е веќе искористено, не прави ништо
                if (el.classList.contains("used")) return;

                const firstEmpty = playerSelection.indexOf(null);
                if (firstEmpty !== -1) {
                    // Стави во слот
                    playerSelection[firstEmpty] = emoji;
                    const slot = slots[firstEmpty];
                    slot.textContent = emoji;
                    slot.classList.add("slot-pop"); // Активирај анимација
                    slot.style.borderColor = "var(--bubble-me)";
                    
                    // Обележи во банка дека е искористено (затемни го)
                    el.classList.add("used");
                }
            };
            bank.appendChild(el);
        });
        secretCodeOverlay.classList.remove("hidden");
    }

    document.getElementById("btnCheckSecret").onclick = () => {
        if (JSON.stringify(playerSelection) === JSON.stringify(secretCombo)) {
            // ПОБЕДА!
            secretCodeOverlay.classList.add("hidden");
            victoryOverlay.classList.remove("hidden");
            // Активирај конфети
            if (typeof confetti === "function") {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
        } else {
            // ГРЕШКА
            secretWrongAttempts++;
            document.getElementById("secretErrorCounter").textContent = `Грешни обиди: ${secretWrongAttempts}`;
            
            // Визуелен фидбек за грешка
            document.querySelectorAll('.slot').forEach(s => {
                s.style.borderColor = "#ff4757";
                setTimeout(() => s.style.borderColor = "var(--bubble-me)", 500);
            });
            alert("Погрешен редослед! Пробај пак.");
        }
    };

    document.getElementById("btnCancelSecret").onclick = () => {
        secretCodeOverlay.classList.add("hidden");
    };

    // --- ГЛАВНА ИГРАЧКА ЛОГИКА ---
    window.selectLevel = (idx) => {
        levelIndex = idx;
        levelMenuOverlay.classList.add("hidden");
        startLevel();
    };

    function startLevel() {
        chatEl.innerHTML = "";
        turnIndex = 0;
        correctCount = 0;
        updateHeader();
        renderTurn();
    }

    function updateHeader() {
        levelInfoEl.textContent = `Ниво ${level().id} · ${turnIndex + 1}/${level().turns.length}`;
        scoreInfoEl.textContent = `Точно: ${correctCount}`;
    }

    function renderTurn() {
        const t = turn();
        if (!t) return;

        updateHeader();

        // Симулација на „пишување“
        replyInput.value = "Марко пишува...";
        btnSend.disabled = true;
        btnReport.disabled = true;

        setTimeout(() => {
            const msgDiv = document.createElement("div");
            msgDiv.className = "msg troll";
            
            let content = `<div class="bubble">${t.text}`;
            if (t.image) {
                content += `<br><img src="${t.image}" style="width:100%; border-radius:10px; margin-top:10px;">`;
            }
            content += `</div>`;
            
            msgDiv.innerHTML = content;
            chatEl.appendChild(msgDiv);
            
            // Овозможи ги контролите
            replyInput.value = t.suggestedReply;
            btnSend.disabled = false;
            btnReport.disabled = false;
            
            chatEl.scrollTop = chatEl.scrollHeight;
        }, 800);
    }

    function handleAction(action, reasonId = null) {
        const t = turn();
        const isCorrect = (action === t.correctAction) && (action === "send" || reasonId === t.correctReason);

        // Прикажи ја акцијата во чет
        if (action === "send") {
            chatEl.innerHTML += `<div class="msg me"><div class="bubble">${replyInput.value}</div></div>`;
        } else {
            chatEl.innerHTML += `<div class="msg system"><div class="bubble">🚩 Ти го пријави овој разговор.</div></div>`;
        }

        if (isCorrect) {
            correctCount++;
        }

        // Покажи фидбек од Марко
        showMarko(isCorrect ? t.markoPraise : t.markoWrong);

        // Провери дали има уште пораки
        if (turnIndex < level().turns.length - 1) {
            turnIndex++;
            setTimeout(renderTurn, 1200);
        } else {
            // КРАЈ НА НИВО
            setTimeout(finishLevel, 1500);
        }
    }

    function finishLevel() {
        chatEl.innerHTML += `<div class="msg system"><div class="bubble">🎁 Марко ти даде таен клуч: ${level().code.emoji}</div></div>`;
        chatEl.scrollTop = chatEl.scrollHeight;
        
        setTimeout(() => {
            showCodeQuiz();
        }, 1500);
    }

    function showMarko(text) {
        document.getElementById("markoText").textContent = text;
        markoOverlay.classList.remove("hidden");
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
                    // --- ЛОГИКА ЗА ОТКЛУЧУВАЊЕ ---
                    let nextLvl = levelIndex + 1;
                    
                    // Ако постои следно ниво, додај го
                    if (nextLvl < DATA.levels.length && !unlockedLevels.includes(nextLvl)) {
                        unlockedLevels.push(nextLvl);
                        saveProgress();
                    }
                    
                    // Ако е завршено последното ниво (индекс 2), отклучи го сефот (индекс 3)
                    if (levelIndex === 2 && !unlockedLevels.includes(3)) {
                        unlockedLevels.push(3);
                        saveProgress();
                    }

                    updateMenuUI();
                    codeOverlay.classList.add("hidden");
                    levelMenuOverlay.classList.remove("hidden");
                } else {
                    alert("Мислам дека не беше тоа емоџито. Погледни ја последната порака во четот.");
                }
            };
            optionsEl.appendChild(btn);
        });
        codeOverlay.classList.remove("hidden");
    }

    function updateMenuUI() {
        unlockedLevels.forEach(idx => {
            const btn = document.getElementById(`lvlBtn${idx}`);
            if (btn) {
                btn.disabled = false;
                btn.classList.replace("btn-ghost", "btn-like");
                btn.innerHTML = btn.innerHTML.replace(" 🔒", " ✅");
            }
        });
        
        // Ако е отклучен сефот (индекс 3)
        if (unlockedLevels.includes(3)) {
            const btnSecret = document.getElementById("btnSecretMenu");
            btnSecret.disabled = false;
            btnSecret.classList.replace("btn-ghost", "btn-report");
            
            // Додај пулсирачка анимација преку inline стил или класа
            btnSecret.style.animation = "pulse 2s infinite"; 
            
            btnSecret.onclick = openSecretVault;
        }
    }

    // --- EVENT LISTENERS ---
    document.getElementById("btnIntroOk").onclick = () => {
        document.getElementById("introOverlay").classList.add("hidden");
        levelMenuOverlay.classList.remove("hidden");
    };

    btnBack.onclick = () => {
        if(confirm("Дали сакаш да се вратиш во менито? Прогресот за ова ниво ќе се изгуби.")) {
            levelMenuOverlay.classList.remove("hidden");
        }
    };

    btnSend.onclick = () => handleAction("send");

    btnReport.onclick = () => {
        const list = document.getElementById("reasonList");
        list.innerHTML = "";
        DATA.reportReasons.forEach(r => {
            const b = document.createElement("button");
            b.className = "reason";
            b.textContent = r.label;
            b.onclick = () => {
                reportOverlay.classList.add("hidden");
                handleAction("report", r.id);
            };
            list.appendChild(b);
        });
        reportOverlay.classList.remove("hidden");
    };

    document.getElementById("btnMarkoOk").onclick = () => markoOverlay.classList.add("hidden");
    document.getElementById("btnCancelReport").onclick = () => reportOverlay.classList.add("hidden");

    // Глобална функција за ресетирање (повикана од HTML)
    window.resetGame = () => {
        if(confirm("Дали си сигурен дека сакаш да го избришеш целиот прогрес?")) {
            localStorage.removeItem("chatGuardProgress");
            location.reload();
        }
    };
});
