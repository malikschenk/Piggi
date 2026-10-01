function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`Failed to save ${key} to localStorage:`, e);
  }
}
function roundCurrency(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}
let currentBalance = roundCurrency(parseFloat(localStorage.getItem("piggi_balance") || "0.00"));
if (isNaN(currentBalance)) currentBalance = 0;
let savingGoals = [];
try {
  savingGoals = JSON.parse(localStorage.getItem("piggi_goals") || "[]");
  if (!Array.isArray(savingGoals)) savingGoals = [];
} catch {
  savingGoals = [];
}
let incomeSources = [];
try {
  incomeSources = JSON.parse(localStorage.getItem("piggi_income") || "[]");
  if (!Array.isArray(incomeSources)) incomeSources = [];
} catch {
  incomeSources = [];
}
let expenseSources = [];
try {
  expenseSources = JSON.parse(localStorage.getItem("piggi_expenses") || "[]");
  if (!Array.isArray(expenseSources)) expenseSources = [];
} catch {
  expenseSources = [];
}
const rawAvatar = (localStorage.getItem("piggi_avatar") || "P").trim();
let avatarSymbol = [...rawAvatar].length > 0 ? [...rawAvatar][0].toUpperCase() : "P";
let currentCurrency = localStorage.getItem("piggi_currency") || "EUR";
if (!["USD", "EUR", "JPY"].includes(currentCurrency)) {
  currentCurrency = "EUR";
}
const profileTrigger = document.getElementById("profile-trigger");
if (profileTrigger) profileTrigger.textContent = avatarSymbol;
const mainBalanceValue = document.getElementById("main-balance-value");
const modalBalanceValue = document.getElementById("modal-balance-value");
const mainGoalsList = document.getElementById("main-goals-list");
const modalGoalsList = document.getElementById("modal-goals-list");
const modalGoalsListEdit = document.getElementById("modal-goals-list-edit");
const mainIncomeList = document.getElementById("main-income-list");
const modalIncomeList = document.getElementById("modal-income-list");
const modalIncomeListEdit = document.getElementById("modal-income-list-edit");
const modalIncomeValue = document.getElementById("modal-income-value");
const mainExpenseList = document.getElementById("main-expense-list");
const modalExpenseList = document.getElementById("modal-expense-list");
const modalExpenseListEdit = document.getElementById("modal-expense-list-edit");
const modalExpenseValue = document.getElementById("modal-expense-value");
const totalGoalAmount = document.getElementById("total-goal-amount");
const mainInput = document.getElementById("main-input");
const sendBtn = document.getElementById("send-btn");
const modalAi = document.getElementById("modal-ai");
const aiChatHistory = document.getElementById("ai-chat-history");
const editIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
const deleteIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
function formatCurrency(amount) {
  const isJpy = currentCurrency === "JPY";
  const locale = currentCurrency === "EUR" ? "de-DE" : currentCurrency === "JPY" ? "ja-JP" : "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currentCurrency,
      minimumFractionDigits: isJpy ? 0 : 2,
      maximumFractionDigits: isJpy ? 0 : 2
    }).format(amount);
  } catch {
    const symbol = currentCurrency === "USD" ? "$" : currentCurrency === "JPY" ? "\xA5" : "\u20AC";
    return `${symbol}${amount.toFixed(isJpy ? 0 : 2)}`;
  }
}
function updateCurrencyCheckmarks() {
  const checkUsd = document.getElementById("check-currency-usd");
  const checkEur = document.getElementById("check-currency-eur");
  const checkJpy = document.getElementById("check-currency-jpy");
  if (checkUsd) checkUsd.style.display = currentCurrency === "USD" ? "block" : "none";
  if (checkEur) checkEur.style.display = currentCurrency === "EUR" ? "block" : "none";
  if (checkJpy) checkJpy.style.display = currentCurrency === "JPY" ? "block" : "none";
}
function setCurrency(curr) {
  currentCurrency = curr;
  localStorage.setItem("piggi_currency", curr);
  updateCurrencyCheckmarks();
  updateBalanceUI();
  renderIncome();
  renderExpenses();
}
const btnCurrUsd = document.getElementById("btn-currency-usd");
const btnCurrEur = document.getElementById("btn-currency-eur");
const btnCurrJpy = document.getElementById("btn-currency-jpy");
if (btnCurrUsd) btnCurrUsd.addEventListener("click", () => setCurrency("USD"));
if (btnCurrEur) btnCurrEur.addEventListener("click", () => setCurrency("EUR"));
if (btnCurrJpy) btnCurrJpy.addEventListener("click", () => setCurrency("JPY"));
const cards = {
  "balance-card": document.getElementById("balance-modal"),
  "goals-card": document.getElementById("goals-modal"),
  "stats-card": document.getElementById("stats-modal"),
  "calculator-card": document.getElementById("calculator-modal"),
  "income-card": document.getElementById("income-modal"),
  "expenses-card": document.getElementById("expenses-modal"),
  "profile-trigger": document.getElementById("profile-modal")
};
function closeModal(overlay) {
  if (!overlay) return;
  overlay.classList.remove("active");
  const sheet = overlay.querySelector(".bottom-sheet");
  if (sheet) {
    sheet.style.transform = "";
    sheet.style.transition = "";
  }
}
function openModal(overlay) {
  if (!overlay) return;
  overlay.classList.add("active");
  if (overlay.id === "profile-modal") {
    changeSlide("profile-slider", 0);
  } else {
    const s = overlay.querySelector(".sheet-slider");
    if (s && !s.classList.contains("profile-tree-slider")) {
      s.setAttribute("data-active-slide", "0");
    }
  }
}
const allOverlays = document.querySelectorAll(".modal-overlay");
allOverlays.forEach((overlayNode) => {
  const overlay = overlayNode;
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.classList.contains("modal-mask")) {
      closeModal(overlay);
    }
  });
  const sheet = overlay.querySelector(".bottom-sheet");
  if (sheet) {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let canDrag = false;
    sheet.addEventListener("touchstart", (e) => {
      const touch = e.touches[0];
      const target = e.target;
      if (target.closest("input, textarea, button, .icon-btn-edit, .icon-btn-delete")) {
        canDrag = false;
        return;
      }
      const scrollableParent = target.closest(".goals-list, .income-list, .expense-list, .chat-container, .sheet-content");
      if (scrollableParent && scrollableParent.scrollTop > 0) {
        canDrag = false;
        return;
      }
      const sheetRect = sheet.getBoundingClientRect();
      const touchRelativeY = touch.clientY - sheetRect.top;
      if (target.closest(".drag-handle-container, .sheet-header") || touchRelativeY <= 140) {
        canDrag = true;
        startY = touch.clientY;
        currentY = 0;
        isDragging = false;
      } else {
        canDrag = false;
      }
    }, { passive: true });
    sheet.addEventListener("touchmove", (e) => {
      if (!canDrag) return;
      const diff = e.touches[0].clientY - startY;
      if (diff > 0) {
        if (!isDragging) {
          isDragging = true;
          sheet.style.transition = "none";
        }
        currentY = diff;
        sheet.style.transform = `translateY(${currentY}px)`;
      }
    }, { passive: true });
    const endDrag = () => {
      if (!canDrag) return;
      canDrag = false;
      if (isDragging) {
        isDragging = false;
        sheet.style.transition = "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)";
        if (currentY > 90) {
          closeModal(overlay);
        } else {
          sheet.style.transform = "translateY(0)";
        }
      }
      currentY = 0;
    };
    sheet.addEventListener("touchend", endDrag);
    sheet.addEventListener("touchcancel", endDrag);
  }
});
Object.keys(cards).forEach((id) => {
  const trigger = document.getElementById(id);
  if (trigger) {
    trigger.addEventListener("click", (e) => {
      const target = e.target;
      if (target.closest(".icon-btn-edit") || target.closest(".icon-btn-delete")) return;
      const targetModal = cards[id];
      if (targetModal) openModal(targetModal);
    });
  }
});
const overlayClosers = [
  { btn: "btn-close-balance", modal: "balance-modal" },
  { btn: "btn-close-goals", modal: "goals-modal" },
  { btn: "btn-close-stats", modal: "stats-modal" },
  { btn: "btn-done-stats", modal: "stats-modal" },
  { btn: "btn-close-calculator", modal: "calculator-modal" },
  { btn: "btn-done-calculator", modal: "calculator-modal" },
  { btn: "btn-close-income", modal: "income-modal" },
  { btn: "btn-close-expenses", modal: "expenses-modal" },
  { btn: "btn-close-profile-overlay", modal: "profile-modal" },
  { btn: "btn-close-ai", modal: "modal-ai" }
];
overlayClosers.forEach((c) => {
  const b = document.getElementById(c.btn);
  if (b) {
    b.addEventListener("click", () => {
      const m = document.getElementById(c.modal);
      if (m) closeModal(m);
    });
  }
});
function isValidNumber(value) {
  if (!value || value.trim() === "") return false;
  const cleanValue = value.replace(",", ".").trim();
  return !isNaN(Number(cleanValue)) && !isNaN(parseFloat(cleanValue));
}
function enforceSixDigits(inputEl, allowNegative = false) {
  let val = inputEl.value;
  if (!val) return;
  let isNeg = false;
  if (allowNegative && val.startsWith("-")) {
    isNeg = true;
    val = val.slice(1);
  }
  const hasDecimal = val.includes(".") || val.includes(",");
  let separator = ".";
  if (val.includes(",")) separator = ",";
  const parts = val.split(/[.,]/);
  let intPart = parts[0].replace(/\D/g, "");
  if (intPart.length > 6) {
    intPart = intPart.slice(0, 6);
  }
  let result = (isNeg ? "-" : "") + intPart;
  if (hasDecimal && parts.length > 1) {
    let decPart = parts.slice(1).join("").replace(/\D/g, "").slice(0, 2);
    result += separator + decPart;
  }
  if (inputEl.value !== result) {
    inputEl.value = result;
  }
}
function validateNumberInput(inputEl, errorEl, _maxLimit = 999999, allowNegative = false) {
  if (!inputEl) return false;
  enforceSixDigits(inputEl, allowNegative);
  const val = inputEl.value;
  if (val === "" || val === "-") {
    inputEl.classList.remove("input-invalid");
    if (errorEl) errorEl.classList.remove("visible");
    return true;
  }
  if (!isValidNumber(val)) {
    inputEl.classList.add("input-invalid");
    if (errorEl) {
      errorEl.textContent = "Numbers only";
      errorEl.classList.add("visible");
    }
    return false;
  }
  const cleanVal = val.replace(",", ".").trim();
  const num = parseFloat(cleanVal);
  if (!allowNegative && num < 0) {
    inputEl.classList.add("input-invalid");
    if (errorEl) {
      errorEl.textContent = "Must be positive";
      errorEl.classList.add("visible");
    }
    return false;
  }
  inputEl.classList.remove("input-invalid");
  if (errorEl) errorEl.classList.remove("visible");
  return true;
}
function clearValidation(inputEl, errorEl) {
  if (inputEl) inputEl.classList.remove("input-invalid");
  if (errorEl) errorEl.classList.remove("visible");
}
const inputBalance = document.getElementById("input-balance");
const errorBalance = document.getElementById("error-balance");
if (inputBalance) inputBalance.addEventListener("input", () => validateNumberInput(inputBalance, errorBalance, 999999, true));
const inputGoalPrice = document.getElementById("input-goal-price");
const errorGoalPrice = document.getElementById("error-goal-price");
if (inputGoalPrice) inputGoalPrice.addEventListener("input", () => validateNumberInput(inputGoalPrice, errorGoalPrice, 999999, false));
const inputIncomeAmount = document.getElementById("input-income-amount");
const errorIncomeAmount = document.getElementById("error-income-amount");
if (inputIncomeAmount) inputIncomeAmount.addEventListener("input", () => validateNumberInput(inputIncomeAmount, errorIncomeAmount, 999999, false));
const inputExpenseAmount = document.getElementById("input-expense-amount");
const errorExpenseAmount = document.getElementById("error-expense-amount");
if (inputExpenseAmount) inputExpenseAmount.addEventListener("input", () => validateNumberInput(inputExpenseAmount, errorExpenseAmount, 999999, false));
let balanceHistory = [];
try {
  const savedHist = localStorage.getItem("piggi_balance_history");
  if (savedHist) balanceHistory = JSON.parse(savedHist);
} catch {
  balanceHistory = [];
}
const balanceHistoryList = document.getElementById("balance-history-list");
function renderBalanceHistory() {
  if (!balanceHistoryList) return;
  balanceHistoryList.innerHTML = "";
  if (!balanceHistory || balanceHistory.length === 0) {
    balanceHistoryList.innerHTML = '<span class="empty-state">No recent activity</span>';
    return;
  }
  balanceHistory.slice(0, 5).forEach((item) => {
    const div = document.createElement("div");
    div.className = "activity-item";
    let title = "Edited Balance";
    let amtClass = "";
    let sign = "";
    if (item.type === "add") {
      title = "Added Funds";
      amtClass = "price-green";
      sign = "+";
    } else if (item.type === "subtract") {
      title = "Subtracted Funds";
      amtClass = "price-red";
      sign = "-";
    }
    const dateObj = new Date(item.date);
    const dateStr = isNaN(dateObj.getTime()) ? "Recent" : dateObj.toLocaleDateString(void 0, { day: "numeric", month: "short" });
    div.innerHTML = `
            <div class="activity-info">
                <span class="activity-title">${title}</span>
                <span class="activity-date">${dateStr}</span>
            </div>
            <span class="activity-amount ${amtClass}">${sign}${formatCurrency(item.amount)}</span>
        `;
    balanceHistoryList.appendChild(div);
  });
}
function updateBalanceUI() {
  const formatted = formatCurrency(currentBalance);
  if (mainBalanceValue) {
    mainBalanceValue.textContent = formatted;
    mainBalanceValue.classList.remove("price-red", "price-green");
    mainBalanceValue.classList.add(currentBalance < 0 ? "price-red" : "price-green");
  }
  if (modalBalanceValue) {
    modalBalanceValue.textContent = formatted;
    modalBalanceValue.classList.remove("price-red", "price-green");
    modalBalanceValue.classList.add("big-green");
    modalBalanceValue.classList.add(currentBalance < 0 ? "price-red" : "price-green");
  }
  localStorage.setItem("piggi_balance", currentBalance.toString());
  renderGoals();
  renderStats();
  renderCalculator();
  renderBalanceHistory();
}
function renderGoals() {
  if (mainGoalsList) mainGoalsList.innerHTML = "";
  if (modalGoalsList) modalGoalsList.innerHTML = "";
  if (modalGoalsListEdit) modalGoalsListEdit.innerHTML = "";
  if (savingGoals.length === 0) {
    if (mainGoalsList) mainGoalsList.innerHTML = '<div class="empty-state">Add saving goal</div>';
    if (totalGoalAmount) totalGoalAmount.textContent = formatCurrency(0);
  } else {
    let totalTarget = 0;
    savingGoals.forEach((goal, index) => {
      totalTarget += goal.amount;
      let percentage = 0;
      if (goal.amount > 0 && currentBalance > 0) {
        percentage = Math.round(currentBalance / goal.amount * 100);
      }
      if (percentage > 100) percentage = 100;
      if (mainGoalsList && index < 3) {
        const div = document.createElement("div");
        div.className = "goal-item";
        div.innerHTML = `<span>${escapeHtml(goal.name)}</span><span class="price-orange">${percentage}%</span>`;
        mainGoalsList.appendChild(div);
      }
      if (modalGoalsList) {
        const div = document.createElement("div");
        div.className = "goal-item";
        div.innerHTML = `
                    <span>${escapeHtml(goal.name)}</span>
                    <div class="goal-values">
                        <span class="goal-amount">${formatCurrency(goal.amount)}</span>
                        <span class="price-orange">${percentage}%</span>
                    </div>
                `;
        modalGoalsList.appendChild(div);
      }
      if (modalGoalsListEdit) {
        const div = document.createElement("div");
        div.className = "goal-item";
        div.style.justifyContent = "space-between";
        div.innerHTML = `
                    <span>${escapeHtml(goal.name)} (${formatCurrency(goal.amount)})</span>
                    <div style="display:flex; gap:8px;">
                        <button class="icon-btn-edit" aria-label="Edit goal" data-idx="${index}">${editIconSvg}</button>
                        <button class="icon-btn-delete" aria-label="Delete goal" data-idx="${index}">${deleteIconSvg}</button>
                    </div>
                `;
        modalGoalsListEdit.appendChild(div);
      }
    });
    if (totalGoalAmount) totalGoalAmount.textContent = formatCurrency(totalTarget);
  }
  localStorage.setItem("piggi_goals", JSON.stringify(savingGoals));
  renderStats();
  renderCalculator();
}
function renderIncome() {
  if (mainIncomeList) mainIncomeList.innerHTML = "";
  if (modalIncomeList) modalIncomeList.innerHTML = "";
  if (modalIncomeListEdit) modalIncomeListEdit.innerHTML = "";
  if (incomeSources.length === 0) {
    if (mainIncomeList) mainIncomeList.innerHTML = '<div class="empty-state">Add monthly income</div>';
    if (modalIncomeValue) modalIncomeValue.textContent = formatCurrency(0);
  } else {
    let total = 0;
    incomeSources.forEach((source, index) => {
      total += source.amount;
      if (mainIncomeList && index < 3) {
        const div = document.createElement("div");
        div.className = "income-item";
        div.innerHTML = `<span>${escapeHtml(source.name)}</span><span>${formatCurrency(source.amount)}</span>`;
        mainIncomeList.appendChild(div);
      }
      if (modalIncomeList) {
        const div = document.createElement("div");
        div.className = "income-item";
        div.innerHTML = `<span>${escapeHtml(source.name)}</span><span>${formatCurrency(source.amount)}</span>`;
        modalIncomeList.appendChild(div);
      }
      if (modalIncomeListEdit) {
        const div = document.createElement("div");
        div.className = "income-item";
        div.style.justifyContent = "space-between";
        div.innerHTML = `
                    <span>${escapeHtml(source.name)} (${formatCurrency(source.amount)})</span>
                    <div style="display:flex; gap:8px;">
                        <button class="icon-btn-edit" aria-label="Edit income" data-idx="${index}">${editIconSvg}</button>
                        <button class="icon-btn-delete" aria-label="Delete income" data-idx="${index}">${deleteIconSvg}</button>
                    </div>
                `;
        modalIncomeListEdit.appendChild(div);
      }
    });
    if (modalIncomeValue) modalIncomeValue.textContent = formatCurrency(total);
  }
  localStorage.setItem("piggi_income", JSON.stringify(incomeSources));
  renderStats();
  renderCalculator();
}
function renderExpenses() {
  if (mainExpenseList) mainExpenseList.innerHTML = "";
  if (modalExpenseList) modalExpenseList.innerHTML = "";
  if (modalExpenseListEdit) modalExpenseListEdit.innerHTML = "";
  if (expenseSources.length === 0) {
    if (mainExpenseList) mainExpenseList.innerHTML = '<div class="empty-state">Add monthly expense</div>';
    if (modalExpenseValue) modalExpenseValue.textContent = formatCurrency(0);
  } else {
    let total = 0;
    expenseSources.forEach((source, index) => {
      total += source.amount;
      if (mainExpenseList && index < 3) {
        const div = document.createElement("div");
        div.className = "expense-item";
        div.innerHTML = `<span>${escapeHtml(source.name)}</span><span>${formatCurrency(source.amount)}</span>`;
        mainExpenseList.appendChild(div);
      }
      if (modalExpenseList) {
        const div = document.createElement("div");
        div.className = "expense-item";
        div.innerHTML = `<span>${escapeHtml(source.name)}</span><span>${formatCurrency(source.amount)}</span>`;
        modalExpenseList.appendChild(div);
      }
      if (modalExpenseListEdit) {
        const div = document.createElement("div");
        div.className = "expense-item";
        div.style.justifyContent = "space-between";
        div.innerHTML = `
                    <span>${escapeHtml(source.name)} (${formatCurrency(source.amount)})</span>
                    <div style="display:flex; gap:8px;">
                        <button class="icon-btn-edit" aria-label="Edit expense" data-idx="${index}">${editIconSvg}</button>
                        <button class="icon-btn-delete" aria-label="Delete expense" data-idx="${index}">${deleteIconSvg}</button>
                    </div>
                `;
        modalExpenseListEdit.appendChild(div);
      }
    });
    if (modalExpenseValue) modalExpenseValue.textContent = formatCurrency(total);
  }
  localStorage.setItem("piggi_expenses", JSON.stringify(expenseSources));
  renderStats();
  renderCalculator();
}
const statsTrendBadge = document.getElementById("stats-trend-badge");
const statsRateBadge = document.getElementById("stats-rate-badge");
const statsModalNet = document.getElementById("stats-modal-net");
const statsModalSavingsRate = document.getElementById("stats-modal-savings-rate");
const statsGoalsForecastList = document.getElementById("stats-goals-forecast-list");
function renderStats() {
  const totalIncome = incomeSources.reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = expenseSources.reduce((sum, e) => sum + e.amount, 0);
  const monthlyNet = totalIncome - totalExpense;
  let savingsRate = 0;
  if (totalIncome > 0 && monthlyNet > 0) {
    savingsRate = Math.round(monthlyNet / totalIncome * 100);
  }
  if (statsTrendBadge) {
    const sign = monthlyNet > 0 ? "+" : "";
    statsTrendBadge.textContent = `${sign}${formatCurrency(monthlyNet)}`;
    statsTrendBadge.classList.remove("price-green", "price-red");
  }
  if (statsRateBadge) {
    statsRateBadge.textContent = `${savingsRate}%`;
    statsRateBadge.classList.remove("price-green", "price-red");
  }
  if (statsModalNet) {
    const sign = monthlyNet > 0 ? "+" : "";
    statsModalNet.textContent = `${sign}${formatCurrency(monthlyNet)}`;
    statsModalNet.classList.remove("price-green", "price-red");
  }
  if (statsModalSavingsRate) {
    statsModalSavingsRate.textContent = `${savingsRate}%`;
  }
  if (statsGoalsForecastList) {
    statsGoalsForecastList.innerHTML = "";
    if (savingGoals.length === 0) {
      statsGoalsForecastList.innerHTML = '<span class="empty-state">No savings goals created yet.</span>';
    } else {
      let runningCumCost = 0;
      savingGoals.forEach((goal) => {
        runningCumCost += goal.amount;
        const card = document.createElement("div");
        card.className = "stats-goal-card";
        if (currentBalance >= runningCumCost) {
          card.innerHTML = `
                        <div class="stats-goal-header">
                            <span>${escapeHtml(goal.name)}</span>
                            <span class="stats-goal-amount">${formatCurrency(goal.amount)}</span>
                        </div>
                        <div class="stats-goal-meta">
                            <span class="stats-reach-tag reached">Reached today</span>
                        </div>
                    `;
        } else {
          const needed = runningCumCost - currentBalance;
          if (monthlyNet > 0) {
            const daysNeeded = Math.ceil(needed / (monthlyNet * 12 / 365));
            const reachDate = new Date(Date.now() + daysNeeded * 24 * 60 * 60 * 1e3);
            const dateFormatted = reachDate.toLocaleDateString(void 0, {
              day: "numeric",
              month: "short",
              year: "numeric"
            });
            let timeSpan = "";
            if (daysNeeded === 1) {
              timeSpan = "in 1 day";
            } else if (daysNeeded < 60) {
              timeSpan = `in ${daysNeeded} days`;
            } else if (daysNeeded < 365) {
              const mons = Math.round(daysNeeded / 30.4167);
              timeSpan = `in ~${mons} mons`;
            } else {
              const years = (daysNeeded / 365).toFixed(1).replace(".0", "");
              timeSpan = `in ~${years} ${years === "1" ? "year" : "years"}`;
            }
            card.innerHTML = `
                            <div class="stats-goal-header">
                                <span>${escapeHtml(goal.name)}</span>
                                <span class="stats-goal-amount">${formatCurrency(goal.amount)}</span>
                            </div>
                            <div class="stats-goal-meta">
                                <span class="stats-reach-tag pending">${timeSpan}</span>
                                <span class="stats-reach-date">${dateFormatted}</span>
                            </div>
                        `;
          } else {
            card.innerHTML = `
                            <div class="stats-goal-header">
                                <span>${escapeHtml(goal.name)}</span>
                                <span class="stats-goal-amount">${formatCurrency(goal.amount)}</span>
                            </div>
                            <div class="stats-goal-meta">
                                <span class="stats-reach-tag unreachable">Not reachable (need positive savings)</span>
                            </div>
                        `;
          }
        }
        statsGoalsForecastList.appendChild(card);
      });
    }
  }
}
const calculatorDateInput = document.getElementById("calculator-date-input");
const calcBalanceWithoutGoals = document.getElementById("calc-balance-without-goals");
const calcGoalsList = document.getElementById("calc-goals-list");
const calcPreview6m = document.getElementById("calc-preview-6m");
const calcPreview1y = document.getElementById("calc-preview-1y");
function initCalculator() {
  if (!calculatorDateInput) return;
  if (!calculatorDateInput.value) {
    const defaultDate = /* @__PURE__ */ new Date();
    defaultDate.setDate(defaultDate.getDate() + 90);
    calculatorDateInput.value = defaultDate.toISOString().split("T")[0];
  }
  calculatorDateInput.addEventListener("input", () => renderCalculator());
  calculatorDateInput.addEventListener("change", () => renderCalculator());
  const quickBtns = document.querySelectorAll(".calc-quick-btn");
  quickBtns.forEach((btnNode) => {
    const btn = btnNode;
    btn.addEventListener("click", () => {
      const days = parseInt(btn.getAttribute("data-days") || "30", 10);
      const d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() + days);
      if (calculatorDateInput) {
        calculatorDateInput.value = d.toISOString().split("T")[0];
        renderCalculator();
      }
    });
  });
}
function renderCalculator() {
  const totalIncome = incomeSources.reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = expenseSources.reduce((sum, e) => sum + e.amount, 0);
  const monthlyNet = totalIncome - totalExpense;
  const proj6m = currentBalance + 180 * (monthlyNet * 12 / 365);
  const proj1y = currentBalance + 365 * (monthlyNet * 12 / 365);
  if (calcPreview6m) {
    const sign6 = proj6m > 0 ? "+" : "";
    calcPreview6m.textContent = `${sign6}${formatCurrency(proj6m)}`;
    calcPreview6m.classList.remove("price-green", "price-red");
  }
  if (calcPreview1y) {
    const sign1 = proj1y > 0 ? "+" : "";
    calcPreview1y.textContent = `${sign1}${formatCurrency(proj1y)}`;
    calcPreview1y.classList.remove("price-green", "price-red");
  }
  if (!calculatorDateInput || !calcBalanceWithoutGoals) return;
  let targetDate;
  if (calculatorDateInput.value) {
    const parts = calculatorDateInput.value.split("-").map(Number);
    targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
  } else {
    targetDate = /* @__PURE__ */ new Date();
    targetDate.setDate(targetDate.getDate() + 90);
  }
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  const daysDiff = Math.round((targetDate.getTime() - today.getTime()) / (1e3 * 60 * 60 * 24));
  let projectedBalance = currentBalance;
  if (daysDiff > 0) {
    projectedBalance += daysDiff * (monthlyNet * 12 / 365);
  }
  calcBalanceWithoutGoals.textContent = formatCurrency(projectedBalance);
  calcBalanceWithoutGoals.classList.remove("price-green", "price-red");
  if (!calcGoalsList) return;
  calcGoalsList.innerHTML = "";
  if (savingGoals.length === 0) {
    calcGoalsList.innerHTML = '<div class="empty-state">No savings goals created yet</div>';
    return;
  }
  let cumulativeNeeded = 0;
  let reachedAny = false;
  savingGoals.forEach((goal) => {
    cumulativeNeeded += goal.amount;
    if (projectedBalance >= cumulativeNeeded) {
      reachedAny = true;
      const div = document.createElement("div");
      div.className = "goal-item";
      div.innerHTML = `<span>${escapeHtml(goal.name)}</span><span>${formatCurrency(goal.amount)}</span>`;
      calcGoalsList.appendChild(div);
    }
  });
  if (!reachedAny) {
    calcGoalsList.innerHTML = '<div class="empty-state">No goals reached yet</div>';
  }
}
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
function changeSlide(sliderId, targetSlide) {
  const slider = document.getElementById(sliderId);
  if (!slider) return;
  if (sliderId === "profile-slider") {
    slider.classList.remove("show-branch-1", "show-branch-2", "show-branch-3", "show-branch-4", "show-branch-5");
    if (targetSlide === 1) {
      slider.classList.add("show-branch-1");
      slider.setAttribute("data-active-slide", "1");
    } else if (targetSlide === 2) {
      slider.classList.add("show-branch-2");
      slider.setAttribute("data-active-slide", "1");
    } else if (targetSlide === 3) {
      slider.classList.add("show-branch-3");
      slider.setAttribute("data-active-slide", "1");
    } else if (targetSlide === 4) {
      slider.classList.add("show-branch-4");
      slider.setAttribute("data-active-slide", "1");
    } else if (targetSlide === 5) {
      slider.classList.add("show-branch-5");
      slider.setAttribute("data-active-slide", "1");
    } else {
      slider.setAttribute("data-active-slide", "0");
    }
  } else {
    slider.setAttribute("data-active-slide", targetSlide.toString());
  }
}
let editingBalanceMode = "set";
const editBalanceTitle = document.getElementById("edit-balance-title");
const editBalanceLabel = document.getElementById("edit-balance-label");
function setupSliderNavigation(btnId, sliderId, slideIndex) {
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.addEventListener("click", () => {
      if (btnId === "btn-add-funds") {
        editingBalanceMode = "add";
        if (editBalanceTitle) editBalanceTitle.textContent = "Add Funds";
        if (editBalanceLabel) editBalanceLabel.textContent = "Amount to Add";
        clearValidation(inputBalance, errorBalance);
      } else if (btnId === "btn-subtract-funds") {
        editingBalanceMode = "subtract";
        if (editBalanceTitle) editBalanceTitle.textContent = "Subtract Funds";
        if (editBalanceLabel) editBalanceLabel.textContent = "Amount to Subtract";
        clearValidation(inputBalance, errorBalance);
      } else if (btnId === "btn-edit-balance") {
        editingBalanceMode = "set";
        if (editBalanceTitle) editBalanceTitle.textContent = "Edit Balance";
        if (editBalanceLabel) editBalanceLabel.textContent = "New Balance";
        clearValidation(inputBalance, errorBalance);
      }
      changeSlide(sliderId, slideIndex);
    });
  }
}
setupSliderNavigation("btn-edit-balance", "balance-slider", 1);
setupSliderNavigation("btn-add-funds", "balance-slider", 1);
setupSliderNavigation("btn-subtract-funds", "balance-slider", 1);
setupSliderNavigation("btn-to-edit-goals", "goals-slider", 1);
setupSliderNavigation("btn-save-goals-edit", "goals-slider", 0);
setupSliderNavigation("btn-to-add-goal", "goals-slider", 2);
setupSliderNavigation("btn-cancel-add-goal", "goals-slider", 1);
setupSliderNavigation("btn-to-edit-income", "income-slider", 1);
setupSliderNavigation("btn-save-income-edit", "income-slider", 0);
setupSliderNavigation("btn-to-add-income", "income-slider", 2);
setupSliderNavigation("btn-cancel-add-income", "income-slider", 1);
setupSliderNavigation("btn-to-edit-expense", "expenses-slider", 1);
setupSliderNavigation("btn-save-expense-edit", "expenses-slider", 0);
setupSliderNavigation("btn-to-add-expense", "expenses-slider", 2);
setupSliderNavigation("btn-cancel-add-expense", "expenses-slider", 1);
setupSliderNavigation("btn-to-appearance", "profile-slider", 1);
setupSliderNavigation("btn-back-to-profile", "profile-slider", 0);
setupSliderNavigation("btn-to-currency", "profile-slider", 2);
setupSliderNavigation("btn-back-to-profile-currency", "profile-slider", 0);
setupSliderNavigation("btn-to-edit-profile", "profile-slider", 3);
setupSliderNavigation("btn-to-api-key", "profile-slider", 4);
setupSliderNavigation("btn-back-to-profile-api", "profile-slider", 0);
setupSliderNavigation("btn-to-reset", "profile-slider", 5);
setupSliderNavigation("btn-cancel-reset", "profile-slider", 0);
const btnCancelBalance = document.getElementById("btn-cancel-balance");
if (btnCancelBalance) {
  btnCancelBalance.addEventListener("click", () => {
    if (inputBalance) inputBalance.value = "";
    clearValidation(inputBalance, errorBalance);
    changeSlide("balance-slider", 0);
  });
}
const btnSaveBalance = document.getElementById("btn-save-balance");
function handleSaveBalance() {
  if (!inputBalance) return;
  if (!validateNumberInput(inputBalance, errorBalance, 999999, true)) return;
  const val = parseFloat(inputBalance.value.replace(",", "."));
  if (!isNaN(val)) {
    if (editingBalanceMode === "add") {
      currentBalance += val;
      balanceHistory.unshift({
        id: Date.now().toString(),
        type: "add",
        amount: val,
        date: (/* @__PURE__ */ new Date()).toISOString()
      });
    } else if (editingBalanceMode === "subtract") {
      currentBalance -= val;
      balanceHistory.unshift({
        id: Date.now().toString(),
        type: "subtract",
        amount: val,
        date: (/* @__PURE__ */ new Date()).toISOString()
      });
    } else {
      currentBalance = val;
      balanceHistory.unshift({
        id: Date.now().toString(),
        type: "set",
        amount: val,
        date: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    currentBalance = Math.max(-999999, Math.min(999999, currentBalance));
    balanceHistory = balanceHistory.slice(0, 5);
    localStorage.setItem("piggi_balance_history", JSON.stringify(balanceHistory));
    updateBalanceUI();
    renderBalanceHistory();
  }
  inputBalance.value = "";
  clearValidation(inputBalance, errorBalance);
  changeSlide("balance-slider", 0);
}
if (btnSaveBalance && inputBalance) {
  btnSaveBalance.addEventListener("click", handleSaveBalance);
  inputBalance.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveBalance();
    }
  });
}
let editingGoalIndex = null;
const inputGoalName = document.getElementById("input-goal-name");
const btnSubmitGoal = document.getElementById("btn-submit-goal");
const addGoalHeaderTitle = document.getElementById("add-goal-header-title");
const btnSubmitGoalText = document.getElementById("btn-submit-goal-text");
function handleSubmitGoal() {
  if (!inputGoalName || !inputGoalPrice) return;
  const isPriceValid = validateNumberInput(inputGoalPrice, errorGoalPrice, 999999, false);
  let name = inputGoalName.value.trim();
  if (name.length > 18) name = name.slice(0, 18);
  if (!name || !isPriceValid || inputGoalPrice.value.trim() === "") {
    if (inputGoalPrice.value.trim() === "") validateNumberInput(inputGoalPrice, errorGoalPrice, 999999, false);
    return;
  }
  let amount = parseFloat(inputGoalPrice.value.replace(",", "."));
  amount = Math.max(0, Math.min(999999, amount));
  if (editingGoalIndex !== null) {
    savingGoals[editingGoalIndex].name = name;
    savingGoals[editingGoalIndex].amount = amount;
    editingGoalIndex = null;
    if (addGoalHeaderTitle) addGoalHeaderTitle.textContent = "Add Goal";
    if (btnSubmitGoalText) btnSubmitGoalText.textContent = "Add";
  } else {
    savingGoals.push({ name, amount });
  }
  renderGoals();
  inputGoalName.value = "";
  inputGoalPrice.value = "";
  clearValidation(inputGoalPrice, errorGoalPrice);
  changeSlide("goals-slider", 1);
}
if (btnSubmitGoal && inputGoalName && inputGoalPrice) {
  btnSubmitGoal.addEventListener("click", handleSubmitGoal);
  inputGoalName.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      inputGoalPrice.focus();
      inputGoalPrice.select();
    }
  });
  inputGoalPrice.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmitGoal();
    }
  });
}
if (modalGoalsListEdit) {
  modalGoalsListEdit.addEventListener("click", (e) => {
    const target = e.target;
    const editBtn = target.closest(".icon-btn-edit");
    const deleteBtn = target.closest(".icon-btn-delete");
    if (deleteBtn) {
      const idx = parseInt(deleteBtn.getAttribute("data-idx") || "-1", 10);
      if (idx >= 0 && idx < savingGoals.length) {
        savingGoals.splice(idx, 1);
        renderGoals();
      }
    } else if (editBtn) {
      const idx = parseInt(editBtn.getAttribute("data-idx") || "-1", 10);
      if (idx >= 0 && idx < savingGoals.length) {
        editingGoalIndex = idx;
        const goal = savingGoals[idx];
        if (inputGoalName) inputGoalName.value = goal.name;
        if (inputGoalPrice) inputGoalPrice.value = goal.amount.toString();
        clearValidation(inputGoalPrice, errorGoalPrice);
        if (addGoalHeaderTitle) addGoalHeaderTitle.textContent = "Edit Goal";
        if (btnSubmitGoalText) btnSubmitGoalText.textContent = "Save";
        changeSlide("goals-slider", 2);
      }
    }
  });
}
let editingIncomeIndex = null;
const inputIncomeName = document.getElementById("input-income-name");
const btnSubmitIncome = document.getElementById("btn-submit-income");
const addIncomeHeaderTitle = document.getElementById("add-income-header-title");
const btnSubmitIncomeText = document.getElementById("btn-submit-income-text");
function handleSubmitIncome() {
  if (!inputIncomeName || !inputIncomeAmount) return;
  const isAmountValid = validateNumberInput(inputIncomeAmount, errorIncomeAmount, 999999, false);
  let name = inputIncomeName.value.trim();
  if (name.length > 18) name = name.slice(0, 18);
  if (!name || !isAmountValid || inputIncomeAmount.value.trim() === "") {
    if (inputIncomeAmount.value.trim() === "") validateNumberInput(inputIncomeAmount, errorIncomeAmount, 999999, false);
    return;
  }
  let amount = parseFloat(inputIncomeAmount.value.replace(",", "."));
  amount = Math.max(0, Math.min(999999, amount));
  if (editingIncomeIndex !== null) {
    incomeSources[editingIncomeIndex].name = name;
    incomeSources[editingIncomeIndex].amount = amount;
    editingIncomeIndex = null;
    if (addIncomeHeaderTitle) addIncomeHeaderTitle.textContent = "Add Monthly Income";
    if (btnSubmitIncomeText) btnSubmitIncomeText.textContent = "Add";
  } else {
    incomeSources.push({ name, amount });
  }
  renderIncome();
  inputIncomeName.value = "";
  inputIncomeAmount.value = "";
  clearValidation(inputIncomeAmount, errorIncomeAmount);
  changeSlide("income-slider", 1);
}
if (btnSubmitIncome && inputIncomeName && inputIncomeAmount) {
  btnSubmitIncome.addEventListener("click", handleSubmitIncome);
  inputIncomeName.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      inputIncomeAmount.focus();
      inputIncomeAmount.select();
    }
  });
  inputIncomeAmount.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmitIncome();
    }
  });
}
if (modalIncomeListEdit) {
  modalIncomeListEdit.addEventListener("click", (e) => {
    const target = e.target;
    const editBtn = target.closest(".icon-btn-edit");
    const deleteBtn = target.closest(".icon-btn-delete");
    if (deleteBtn) {
      const idx = parseInt(deleteBtn.getAttribute("data-idx") || "-1", 10);
      if (idx >= 0 && idx < incomeSources.length) {
        incomeSources.splice(idx, 1);
        renderIncome();
      }
    } else if (editBtn) {
      const idx = parseInt(editBtn.getAttribute("data-idx") || "-1", 10);
      if (idx >= 0 && idx < incomeSources.length) {
        editingIncomeIndex = idx;
        const inc = incomeSources[idx];
        if (inputIncomeName) inputIncomeName.value = inc.name;
        if (inputIncomeAmount) inputIncomeAmount.value = inc.amount.toString();
        clearValidation(inputIncomeAmount, errorIncomeAmount);
        if (addIncomeHeaderTitle) addIncomeHeaderTitle.textContent = "Edit Monthly Income";
        if (btnSubmitIncomeText) btnSubmitIncomeText.textContent = "Save";
        changeSlide("income-slider", 2);
      }
    }
  });
}
let editingExpenseIndex = null;
const inputExpenseName = document.getElementById("input-expense-name");
const btnSubmitExpense = document.getElementById("btn-submit-expense");
const addExpenseHeaderTitle = document.getElementById("add-expense-header-title");
const btnSubmitExpenseText = document.getElementById("btn-submit-expense-text");
function handleSubmitExpense() {
  if (!inputExpenseName || !inputExpenseAmount) return;
  const isAmountValid = validateNumberInput(inputExpenseAmount, errorExpenseAmount, 999999, false);
  let name = inputExpenseName.value.trim();
  if (name.length > 18) name = name.slice(0, 18);
  if (!name || !isAmountValid || inputExpenseAmount.value.trim() === "") {
    if (inputExpenseAmount.value.trim() === "") validateNumberInput(inputExpenseAmount, errorExpenseAmount, 999999, false);
    return;
  }
  let amount = parseFloat(inputExpenseAmount.value.replace(",", "."));
  amount = Math.max(0, Math.min(999999, amount));
  if (editingExpenseIndex !== null) {
    expenseSources[editingExpenseIndex].name = name;
    expenseSources[editingExpenseIndex].amount = amount;
    editingExpenseIndex = null;
    if (addExpenseHeaderTitle) addExpenseHeaderTitle.textContent = "Add Monthly Expenses";
    if (btnSubmitExpenseText) btnSubmitExpenseText.textContent = "Add";
  } else {
    expenseSources.push({ name, amount });
  }
  renderExpenses();
  inputExpenseName.value = "";
  inputExpenseAmount.value = "";
  clearValidation(inputExpenseAmount, errorExpenseAmount);
  changeSlide("expenses-slider", 1);
}
if (btnSubmitExpense && inputExpenseName && inputExpenseAmount) {
  btnSubmitExpense.addEventListener("click", handleSubmitExpense);
  inputExpenseName.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      inputExpenseAmount.focus();
      inputExpenseAmount.select();
    }
  });
  inputExpenseAmount.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmitExpense();
    }
  });
}
if (modalExpenseListEdit) {
  modalExpenseListEdit.addEventListener("click", (e) => {
    const target = e.target;
    const editBtn = target.closest(".icon-btn-edit");
    const deleteBtn = target.closest(".icon-btn-delete");
    if (deleteBtn) {
      const idx = parseInt(deleteBtn.getAttribute("data-idx") || "-1", 10);
      if (idx >= 0 && idx < expenseSources.length) {
        expenseSources.splice(idx, 1);
        renderExpenses();
      }
    } else if (editBtn) {
      const idx = parseInt(editBtn.getAttribute("data-idx") || "-1", 10);
      if (idx >= 0 && idx < expenseSources.length) {
        editingExpenseIndex = idx;
        const exp = expenseSources[idx];
        if (inputExpenseName) inputExpenseName.value = exp.name;
        if (inputExpenseAmount) inputExpenseAmount.value = exp.amount.toString();
        clearValidation(inputExpenseAmount, errorExpenseAmount);
        if (addExpenseHeaderTitle) addExpenseHeaderTitle.textContent = "Edit Monthly Expenses";
        if (btnSubmitExpenseText) btnSubmitExpenseText.textContent = "Save";
        changeSlide("expenses-slider", 2);
      }
    }
  });
}
const inputAvatarSymbol = document.getElementById("input-avatar-symbol");
const btnSaveAvatar = document.getElementById("btn-save-avatar");
const btnBackToProfileAvatar = document.getElementById("btn-back-to-profile-avatar");
const avatarCircleWrapper = document.getElementById("avatar-circle-wrapper");
if (inputAvatarSymbol) {
  inputAvatarSymbol.value = avatarSymbol;
  inputAvatarSymbol.addEventListener("input", () => {
    const val = inputAvatarSymbol.value.trim();
    if (val.length > 0) {
      inputAvatarSymbol.value = val[val.length - 1].toUpperCase();
    }
  });
}
if (avatarCircleWrapper && inputAvatarSymbol) {
  avatarCircleWrapper.addEventListener("click", () => {
    inputAvatarSymbol.focus();
    inputAvatarSymbol.select();
  });
}
if (btnSaveAvatar && inputAvatarSymbol) {
  const handleSaveAvatar = () => {
    const val = inputAvatarSymbol.value.trim();
    const chars = [...val];
    setAvatarSymbol(chars.length > 0 ? chars[0].toUpperCase() : "P");
    changeSlide("profile-slider", 0);
  };
  btnSaveAvatar.addEventListener("click", handleSaveAvatar);
  inputAvatarSymbol.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveAvatar();
    }
  });
}
if (btnBackToProfileAvatar) {
  btnBackToProfileAvatar.addEventListener("click", () => {
    if (inputAvatarSymbol) inputAvatarSymbol.value = avatarSymbol;
    changeSlide("profile-slider", 0);
  });
}
function setAvatarSymbol(symbol) {
  const chars = [...symbol.trim()];
  avatarSymbol = chars.length > 0 ? chars[0].toUpperCase() : "P";
  safeStorageSet("piggi_avatar", avatarSymbol);
  if (profileTrigger) profileTrigger.textContent = avatarSymbol;
  if (inputAvatarSymbol) inputAvatarSymbol.value = avatarSymbol;
}
const inputApiKey = document.getElementById("input-api-key");
const btnSaveApiKey = document.getElementById("btn-save-api-key");
if (btnSaveApiKey && inputApiKey) {
  inputApiKey.value = localStorage.getItem("piggi_api_key") || localStorage.getItem("gemini_api_key") || "";
  const handleSaveApiKey = () => {
    const val = inputApiKey.value.trim();
    safeStorageSet("piggi_api_key", val);
    safeStorageSet("gemini_api_key", val);
    changeSlide("profile-slider", 0);
  };
  btnSaveApiKey.addEventListener("click", handleSaveApiKey);
  inputApiKey.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveApiKey();
    }
  });
}
const btnConfirmReset = document.getElementById("btn-confirm-reset");
if (btnConfirmReset) {
  btnConfirmReset.addEventListener("click", () => {
    localStorage.clear();
    currentBalance = 0;
    savingGoals = [];
    incomeSources = [];
    expenseSources = [];
    avatarSymbol = "P";
    currentCurrency = "EUR";
    balanceHistory = [];
    if (profileTrigger) profileTrigger.textContent = "P";
    if (inputAvatarSymbol) inputAvatarSymbol.value = "P";
    if (inputApiKey) inputApiKey.value = "";
    setTheme("light");
    setCurrency("EUR");
    updateBalanceUI();
    renderGoals();
    renderIncome();
    renderExpenses();
    changeSlide("profile-slider", 0);
    closeModal(document.getElementById("profile-modal"));
  });
}
const btnLightMode = document.getElementById("btn-light-mode");
const btnDarkMode = document.getElementById("btn-dark-mode");
function setTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("dark-mode");
    localStorage.setItem("piggi_theme", "dark");
  } else {
    document.body.classList.remove("dark-mode");
    localStorage.setItem("piggi_theme", "light");
  }
  updateCheckmarks();
}
function updateCheckmarks() {
  const isDark = document.body.classList.contains("dark-mode");
  const checkLight = document.getElementById("check-light");
  const checkDark = document.getElementById("check-dark");
  if (checkLight) checkLight.style.display = isDark ? "none" : "block";
  if (checkDark) checkDark.style.display = isDark ? "block" : "none";
}
if (btnLightMode) btnLightMode.addEventListener("click", () => setTheme("light"));
if (btnDarkMode) btnDarkMode.addEventListener("click", () => setTheme("dark"));
if (localStorage.getItem("piggi_theme") === "dark") {
  setTheme("dark");
} else {
  updateCheckmarks();
}
updateCurrencyCheckmarks();
function openAiModal() {
  if (!modalAi) return;
  modalAi.classList.add("active");
  setTimeout(() => {
    if (mainInput) mainInput.focus();
  }, 150);
}
if (mainInput) {
  mainInput.addEventListener("focus", () => {
    openAiModal();
  });
  mainInput.addEventListener("click", () => {
    openAiModal();
  });
  mainInput.addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 80) + "px";
    if (this.value.trim().length > 0) {
      sendBtn?.classList.add("active");
    } else {
      sendBtn?.classList.remove("active");
    }
  });
  mainInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendAiMessage();
    }
  });
}
const suggestionChips = document.getElementById("suggestion-chips");
if (suggestionChips) {
  suggestionChips.addEventListener("click", (e) => {
    const target = e.target;
    const chip = target.closest(".chip");
    if (chip) {
      const prompt = chip.getAttribute("data-prompt");
      if (prompt && mainInput) {
        mainInput.value = prompt;
        handleSendAiMessage();
      }
    }
  });
}
function addChatMessage(role, text, badges = [], isError = false) {
  if (!aiChatHistory) return;
  const initialGreeting = document.getElementById("ai-initial-greeting");
  if (initialGreeting) {
    initialGreeting.remove();
  }
  if (role === "user") {
    const div = document.createElement("div");
    div.className = "chat-msg-user";
    div.textContent = text;
    aiChatHistory.appendChild(div);
  } else {
    const wrapper = document.createElement("div");
    wrapper.className = "chat-msg-ai-wrapper";
    const div = document.createElement("div");
    div.className = isError ? "chat-msg-ai chat-msg-error" : "chat-msg-ai";
    div.textContent = text;
    wrapper.appendChild(div);
    if (badges.length > 0) {
      badges.forEach((badge) => {
        const b = document.createElement("div");
        b.className = "chat-action-badge";
        b.textContent = badge;
        wrapper.appendChild(b);
      });
    }
    aiChatHistory.appendChild(wrapper);
  }
  aiChatHistory.scrollTop = aiChatHistory.scrollHeight;
}
function showAiTyping() {
  const indicator = document.createElement("div");
  indicator.className = "ai-typing-indicator";
  indicator.id = "ai-typing-indicator";
  indicator.innerHTML = `
        <div class="ai-typing-dot"></div>
        <div class="ai-typing-dot"></div>
        <div class="ai-typing-dot"></div>
    `;
  aiChatHistory?.appendChild(indicator);
  if (aiChatHistory) aiChatHistory.scrollTop = aiChatHistory.scrollHeight;
  return indicator;
}
function removeAiTyping() {
  const indicator = document.getElementById("ai-typing-indicator");
  if (indicator) indicator.remove();
}
function executeAction(act) {
  if (!act || !act.action) return null;
  const sanitizeName = (rawName) => {
    if (!rawName || typeof rawName !== "string") return "";
    const trimmed = rawName.trim();
    return trimmed.length > 18 ? trimmed.slice(0, 18) : trimmed;
  };
  switch (act.action) {
    case "set_balance":
      if (typeof act.amount === "number") {
        currentBalance = Math.max(-999999, Math.min(999999, roundCurrency(act.amount)));
        updateBalanceUI();
        return `\u2713 Balance set to ${formatCurrency(currentBalance)}`;
      }
      break;
    case "adjust_balance":
      if (typeof act.amount === "number") {
        currentBalance = roundCurrency(currentBalance + act.amount);
        currentBalance = Math.max(-999999, Math.min(999999, currentBalance));
        updateBalanceUI();
        const sign = act.amount >= 0 ? "+" : "";
        return `\u2713 Balance adjusted: ${sign}${formatCurrency(act.amount)}`;
      }
      break;
    case "add_income": {
      const name = sanitizeName(act.name);
      if (name && typeof act.amount === "number") {
        const amount = Math.max(0, Math.min(999999, roundCurrency(act.amount)));
        incomeSources.push({ name, amount });
        renderIncome();
        return `\u2713 Added income: ${name} (${formatCurrency(amount)})`;
      }
      break;
    }
    case "edit_income": {
      const name = sanitizeName(act.name);
      if (name && typeof act.amount === "number") {
        const amount = Math.max(0, Math.min(999999, roundCurrency(act.amount)));
        const idx = incomeSources.findIndex((i) => i.name.toLowerCase() === name.toLowerCase());
        if (idx !== -1) {
          incomeSources[idx].amount = amount;
        } else {
          incomeSources.push({ name, amount });
        }
        renderIncome();
        return `\u2713 Updated income: ${name} (${formatCurrency(amount)})`;
      }
      break;
    }
    case "delete_income": {
      const name = sanitizeName(act.name);
      if (name) {
        incomeSources = incomeSources.filter((i) => i.name.toLowerCase() !== name.toLowerCase());
        renderIncome();
        return `\u2713 Deleted income: ${name}`;
      }
      break;
    }
    case "add_expense": {
      const name = sanitizeName(act.name);
      if (name && typeof act.amount === "number") {
        const amount = Math.max(0, Math.min(999999, roundCurrency(act.amount)));
        expenseSources.push({ name, amount });
        renderExpenses();
        return `\u2713 Added expense: ${name} (${formatCurrency(amount)})`;
      }
      break;
    }
    case "edit_expense": {
      const name = sanitizeName(act.name);
      if (name && typeof act.amount === "number") {
        const amount = Math.max(0, Math.min(999999, roundCurrency(act.amount)));
        const idx = expenseSources.findIndex((e) => e.name.toLowerCase() === name.toLowerCase());
        if (idx !== -1) {
          expenseSources[idx].amount = amount;
        } else {
          expenseSources.push({ name, amount });
        }
        renderExpenses();
        return `\u2713 Updated expense: ${name} (${formatCurrency(amount)})`;
      }
      break;
    }
    case "delete_expense": {
      const name = sanitizeName(act.name);
      if (name) {
        expenseSources = expenseSources.filter((e) => e.name.toLowerCase() !== name.toLowerCase());
        renderExpenses();
        return `\u2713 Deleted expense: ${name}`;
      }
      break;
    }
    case "add_goal": {
      const name = sanitizeName(act.name);
      if (name && typeof act.amount === "number") {
        const amount = Math.max(0, Math.min(999999, roundCurrency(act.amount)));
        savingGoals.push({ name, amount });
        renderGoals();
        return `\u2713 Added savings goal: ${name} (${formatCurrency(amount)})`;
      }
      break;
    }
    case "edit_goal": {
      const name = sanitizeName(act.name);
      if (name && typeof act.amount === "number") {
        const amount = Math.max(0, Math.min(999999, roundCurrency(act.amount)));
        const idx = savingGoals.findIndex((g) => g.name.toLowerCase() === name.toLowerCase());
        if (idx !== -1) {
          savingGoals[idx].amount = amount;
        } else {
          savingGoals.push({ name, amount });
        }
        renderGoals();
        return `\u2713 Updated savings goal: ${name} (${formatCurrency(amount)})`;
      }
      break;
    }
    case "delete_goal": {
      const name = sanitizeName(act.name);
      if (name) {
        savingGoals = savingGoals.filter((g) => g.name.toLowerCase() !== name.toLowerCase());
        renderGoals();
        return `\u2713 Deleted savings goal: ${name}`;
      }
      break;
    }
    case "set_theme":
      if (act.theme === "dark" || act.theme === "light") {
        setTheme(act.theme);
        return `\u2713 Theme changed to ${act.theme} mode`;
      }
      break;
    case "change_avatar":
      if (act.initial) {
        setAvatarSymbol(act.initial);
        return `\u2713 Avatar changed to "${avatarSymbol}"`;
      }
      break;
    case "change_currency":
      if (["USD", "EUR", "JPY"].includes(act.currency)) {
        setCurrency(act.currency);
        return `\u2713 Currency changed to ${act.currency}`;
      }
      break;
  }
  return null;
}
function isHackClubKey(rawKey) {
  const k = rawKey.trim();
  return k.startsWith("sk-hc-") || k.startsWith("hc-") || k.startsWith("sk-");
}
async function callHackClubAiDirectly(userPrompt, rawKey, systemPrompt) {
  const apiKey = rawKey.trim().replace(/^['"]|['"]$/g, "");
  const models = [
    "openai/gpt-4o-mini",
    "google/gemini-2.0-flash-001",
    "meta-llama/llama-3.3-70b-instruct"
  ];
  let lastErr = null;
  for (const model of models) {
    try {
      const res = await fetch("https://ai.hackclub.com/proxy/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" }
        })
      });
      if (res.ok) {
        const data = await res.json();
        const rawText = data.choices?.[0]?.message?.content?.trim() || "{}";
        try {
          return JSON.parse(rawText);
        } catch {
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) return JSON.parse(match[0]);
          return { reply: rawText, actions: [] };
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData?.error?.message || `API error ${res.status}`;
        lastErr = new Error(errMsg);
      }
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Failed to reach Hack Club AI");
}
async function callGeminiDirectlyWithPrompt(userPrompt, rawKey, systemPrompt) {
  const apiKey = rawKey.trim().replace(/^['"]|['"]$/g, "");
  const models = [
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
  ];
  let lastErr = null;
  for (const model of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";
        try {
          return JSON.parse(rawText);
        } catch {
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) return JSON.parse(match[0]);
          return { reply: rawText, actions: [] };
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData?.error?.message || `API error ${res.status}`;
        lastErr = new Error(errMsg);
      }
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Failed to reach Gemini model");
}
async function callAiDirectly(userPrompt, rawKey) {
  const apiKey = rawKey.trim().replace(/^['"]|['"]$/g, "");
  const systemPrompt = `You are PiggiAI, the smart financial budgeting assistant inside the Piggi web app.
Analyze the user's message (which may be in German, English, etc.) and respond with a helpful, friendly message and executable actions.
Output MUST be a valid JSON object matching this schema:
{
  "reply": "Friendly response string summarizing actions or answering financial questions.",
  "actions": [
    { "action": "action_name", ...params }
  ]
}

Supported Actions in the "actions" array:
1. Balance:
   - {"action": "set_balance", "amount": 500}
   - {"action": "adjust_balance", "amount": -20}
2. Monthly Income:
   - {"action": "add_income", "name": "Salary", "amount": 2000}
   - {"action": "edit_income", "name": "Salary", "amount": 2200}
   - {"action": "delete_income", "name": "Salary"}
3. Monthly Expenses:
   - {"action": "add_expense", "name": "Rent", "amount": 800}
   - {"action": "edit_expense", "name": "Rent", "amount": 850}
   - {"action": "delete_expense", "name": "Rent"}
4. Savings Goals:
   - {"action": "add_goal", "name": "MacBook", "amount": 1200}
   - {"action": "edit_goal", "name": "MacBook", "amount": 1400}
   - {"action": "delete_goal", "name": "MacBook"}
5. App Settings:
   - {"action": "set_theme", "theme": "dark" | "light"}
   - {"action": "change_avatar", "initial": "P"}
   - {"action": "change_currency", "currency": "USD" | "EUR" | "JPY"}

CURRENT CONTEXT:
${JSON.stringify(getFinancialContext(), null, 2)}

Provide only valid JSON. If no database action is needed, return empty actions array [].`;
  if (isHackClubKey(apiKey)) {
    try {
      return await callHackClubAiDirectly(userPrompt, apiKey, systemPrompt);
    } catch (e) {
      try {
        return await callGeminiDirectlyWithPrompt(userPrompt, apiKey, systemPrompt);
      } catch {
        throw e;
      }
    }
  } else {
    try {
      return await callGeminiDirectlyWithPrompt(userPrompt, apiKey, systemPrompt);
    } catch (e) {
      try {
        return await callHackClubAiDirectly(userPrompt, apiKey, systemPrompt);
      } catch {
        throw e;
      }
    }
  }
}
function formatAiErrorMessage(err) {
  const raw = typeof err === "string" ? err : err?.message || (typeof err === "object" ? JSON.stringify(err) : String(err || ""));
  const lower = raw.toLowerCase();
  if (lower.includes("key_empty") || lower.includes("no api key") || lower.includes("kein api-key") || lower.includes("kein api key") || lower.includes("key is empty") || lower.includes("please enter your api key") || lower.includes("bitte trage deinen api-key")) {
    return "Please enter your API key in Settings > API Key to use PiggiAI.";
  }
  return "Request failed. Please check your API key in Settings > API Key or try again later.";
}
function getFinancialContext() {
  const totalIncome = incomeSources.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenseSources.reduce((sum, item) => sum + item.amount, 0);
  const monthlyNet = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (monthlyNet / totalIncome * 100).toFixed(1) : "0";
  const goalsWithProjection = savingGoals.map((goal) => {
    const remaining = Math.max(0, goal.amount - currentBalance);
    const monthsNeeded = monthlyNet > 0 ? (remaining / monthlyNet).toFixed(1) : "N/A (monthly net <= 0)";
    return {
      name: goal.name,
      targetAmount: goal.amount,
      remainingNeeded: remaining,
      isReached: currentBalance >= goal.amount,
      estimatedMonthsToReach: monthsNeeded
    };
  });
  return {
    currentBalance,
    currency: currentCurrency,
    avatarSymbol,
    theme: document.body.classList.contains("dark-mode") ? "dark" : "light",
    totalMonthlyIncome: totalIncome,
    totalMonthlyExpenses: totalExpenses,
    monthlyNetSavings: monthlyNet,
    savingsRatePercent: `${savingsRate}%`,
    savingGoals: goalsWithProjection,
    incomeSources,
    expenseSources,
    todayDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  };
}
let isAiGenerating = false;
async function handleSendAiMessage() {
  if (!mainInput || isAiGenerating) return;
  const userPrompt = mainInput.value.trim();
  if (!userPrompt) return;
  isAiGenerating = true;
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.style.opacity = "0.5";
  }
  try {
    openAiModal();
    addChatMessage("user", userPrompt);
    mainInput.value = "";
    mainInput.style.height = "auto";
    sendBtn?.classList.remove("active");
    showAiTyping();
    const activeKey = localStorage.getItem("piggi_api_key") || localStorage.getItem("gemini_api_key") || "";
    const financialCtx = getFinancialContext();
    let data = null;
    let responseSuccess = false;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userPrompt,
          apiKey: activeKey,
          context: financialCtx
        })
      });
      if (response.ok) {
        data = await response.json();
        responseSuccess = true;
      }
    } catch {
    }
    if (!responseSuccess) {
      if (activeKey && activeKey.trim().length > 0) {
        data = await callAiDirectly(userPrompt, activeKey);
        responseSuccess = true;
      } else {
        removeAiTyping();
        addChatMessage("ai", "Please enter your API key in Settings > API Key to use PiggiAI.", [], true);
        return;
      }
    }
    removeAiTyping();
    const actionBadges = [];
    if (data?.actions && Array.isArray(data.actions)) {
      data.actions.forEach((act) => {
        const badge = executeAction(act);
        if (badge) actionBadges.push(badge);
      });
      updateBalanceUI();
      renderStats();
      renderCalculator();
    }
    const reply = data?.reply || (actionBadges.length > 0 ? "Ich habe dein Budget aktualisiert!" : "Erledigt!");
    addChatMessage("ai", reply, actionBadges);
  } catch (err) {
    removeAiTyping();
    console.error("Failed to communicate with PiggiAI:", err);
    const displayError = formatAiErrorMessage(err);
    addChatMessage("ai", displayError, [], true);
  } finally {
    isAiGenerating = false;
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.style.opacity = "";
    }
    removeAiTyping();
  }
}
if (sendBtn) {
  sendBtn.addEventListener("click", () => {
    handleSendAiMessage();
  });
}
initCalculator();
updateBalanceUI();
renderIncome();
renderExpenses();
renderStats();
