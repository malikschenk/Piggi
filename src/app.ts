// Piggi - Personal Finance & AI Budgeting

type Goal = { name: string; amount: number };
type IncomeSource = { name: string; amount: number };
type ExpenseSource = { name: string; amount: number };
type CurrencyCode = 'USD' | 'EUR' | 'JPY';

// State variables
let currentBalance = parseFloat(localStorage.getItem('piggi_balance') || '0.00');
if (isNaN(currentBalance)) currentBalance = 0.00;

let savingGoals: Goal[] = [];
try {
    savingGoals = JSON.parse(localStorage.getItem('piggi_goals') || '[]');
    if (!Array.isArray(savingGoals)) savingGoals = [];
} catch {
    savingGoals = [];
}

let incomeSources: IncomeSource[] = [];
try {
    incomeSources = JSON.parse(localStorage.getItem('piggi_income') || '[]');
    if (!Array.isArray(incomeSources)) incomeSources = [];
} catch {
    incomeSources = [];
}

let expenseSources: ExpenseSource[] = [];
try {
    expenseSources = JSON.parse(localStorage.getItem('piggi_expenses') || '[]');
    if (!Array.isArray(expenseSources)) expenseSources = [];
} catch {
    expenseSources = [];
}

let avatarSymbol = (localStorage.getItem('piggi_avatar') || 'P').trim();
if (!avatarSymbol) avatarSymbol = 'P';
avatarSymbol = avatarSymbol[0].toUpperCase();

let currentCurrency: CurrencyCode = (localStorage.getItem('piggi_currency') as CurrencyCode) || 'EUR';
if (!['USD', 'EUR', 'JPY'].includes(currentCurrency)) {
    currentCurrency = 'EUR';
}

// Elements
const profileTrigger = document.getElementById('profile-trigger');
if (profileTrigger) profileTrigger.textContent = avatarSymbol;

const mainBalanceValue = document.getElementById('main-balance-value');
const modalBalanceValue = document.getElementById('modal-balance-value');
const mainGoalsList = document.getElementById('main-goals-list');
const modalGoalsList = document.getElementById('modal-goals-list');
const modalGoalsListEdit = document.getElementById('modal-goals-list-edit');
const mainIncomeList = document.getElementById('main-income-list');
const modalIncomeList = document.getElementById('modal-income-list');
const modalIncomeListEdit = document.getElementById('modal-income-list-edit');
const modalIncomeValue = document.getElementById('modal-income-value');
const mainExpenseList = document.getElementById('main-expense-list');
const modalExpenseList = document.getElementById('modal-expense-list');
const modalExpenseListEdit = document.getElementById('modal-expense-list-edit');
const modalExpenseValue = document.getElementById('modal-expense-value');
const totalGoalAmount = document.getElementById('total-goal-amount');

const mainInput = document.getElementById('main-input') as HTMLTextAreaElement | null;
const sendBtn = document.getElementById('send-btn') as HTMLButtonElement | null;
const modalAi = document.getElementById('modal-ai');
const aiChatHistory = document.getElementById('ai-chat-history');

const editIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
const deleteIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

// Currency formatting
function formatCurrency(amount: number): string {
    const isJpy = currentCurrency === 'JPY';
    const locale = currentCurrency === 'EUR' ? 'de-DE' : currentCurrency === 'JPY' ? 'ja-JP' : 'en-US';
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currentCurrency,
            minimumFractionDigits: isJpy ? 0 : 2,
            maximumFractionDigits: isJpy ? 0 : 2,
        }).format(amount);
    } catch {
        const symbol = currentCurrency === 'USD' ? '$' : currentCurrency === 'JPY' ? '¥' : '€';
        return `${symbol}${amount.toFixed(isJpy ? 0 : 2)}`;
    }
}

function updateCurrencyCheckmarks() {
    const checkUsd = document.getElementById('check-currency-usd');
    const checkEur = document.getElementById('check-currency-eur');
    const checkJpy = document.getElementById('check-currency-jpy');

    if (checkUsd) checkUsd.style.display = currentCurrency === 'USD' ? 'block' : 'none';
    if (checkEur) checkEur.style.display = currentCurrency === 'EUR' ? 'block' : 'none';
    if (checkJpy) checkJpy.style.display = currentCurrency === 'JPY' ? 'block' : 'none';
}

function setCurrency(curr: CurrencyCode) {
    currentCurrency = curr;
    localStorage.setItem('piggi_currency', curr);
    updateCurrencyCheckmarks();
    updateBalanceUI();
    renderIncome();
    renderExpenses();
}

// Currency option buttons
const btnCurrUsd = document.getElementById('btn-currency-usd');
const btnCurrEur = document.getElementById('btn-currency-eur');
const btnCurrJpy = document.getElementById('btn-currency-jpy');

if (btnCurrUsd) btnCurrUsd.addEventListener('click', () => setCurrency('USD'));
if (btnCurrEur) btnCurrEur.addEventListener('click', () => setCurrency('EUR'));
if (btnCurrJpy) btnCurrJpy.addEventListener('click', () => setCurrency('JPY'));

// Modals management
const cards: Record<string, HTMLElement | null> = {
    'balance-card': document.getElementById('balance-modal'),
    'goals-card': document.getElementById('goals-modal'),
    'income-card': document.getElementById('income-modal'),
    'expenses-card': document.getElementById('expenses-modal'),
    'profile-trigger': document.getElementById('profile-modal'),
};

function closeModal(overlay: HTMLElement | null) {
    if (!overlay) return;
    overlay.classList.remove('active');
    const sheet = overlay.querySelector('.bottom-sheet') as HTMLElement | null;
    if (sheet) {
        sheet.style.transform = '';
        sheet.style.transition = '';
    }
}

function openModal(overlay: HTMLElement | null) {
    if (!overlay) return;
    overlay.classList.add('active');
    if (overlay.id === 'profile-modal') {
        changeSlide('profile-slider', 0);
    } else {
        const s = overlay.querySelector('.sheet-slider') as HTMLElement | null;
        if (s && !s.classList.contains('profile-tree-slider')) {
            s.setAttribute('data-active-slide', '0');
        }
    }
}

const allOverlays = document.querySelectorAll('.modal-overlay');
allOverlays.forEach(overlayNode => {
    const overlay = overlayNode as HTMLElement;
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay || (e.target as HTMLElement).classList.contains('modal-mask')) {
            closeModal(overlay);
        }
    });

    const sheet = overlay.querySelector('.bottom-sheet') as HTMLElement | null;
    if (sheet) {
        let startY = 0;
        let currentY = 0;
        let isDragging = false;
        let canDrag = false;

        sheet.addEventListener('touchstart', (e: TouchEvent) => {
            const touch = e.touches[0];
            const target = e.target as HTMLElement;

            // Don't drag if touching input, textarea, button or scrollable list that is scrolled down
            if (target.closest('input, textarea, button, .icon-btn-edit, .icon-btn-delete')) {
                canDrag = false;
                return;
            }

            const scrollableParent = target.closest('.goals-list, .income-list, .expense-list, .chat-container, .sheet-content') as HTMLElement | null;
            if (scrollableParent && scrollableParent.scrollTop > 0) {
                canDrag = false;
                return;
            }

            // Allow dragging from handle, header, or top 140px of sheet
            const sheetRect = sheet.getBoundingClientRect();
            const touchRelativeY = touch.clientY - sheetRect.top;
            if (target.closest('.drag-handle-container, .sheet-header') || touchRelativeY <= 140) {
                canDrag = true;
                startY = touch.clientY;
                currentY = 0;
                isDragging = false;
            } else {
                canDrag = false;
            }
        }, { passive: true });

        sheet.addEventListener('touchmove', (e: TouchEvent) => {
            if (!canDrag) return;
            const diff = e.touches[0].clientY - startY;
            if (diff > 0) {
                if (!isDragging) {
                    isDragging = true;
                    sheet.style.transition = 'none';
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
                sheet.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
                if (currentY > 90) {
                    closeModal(overlay);
                } else {
                    sheet.style.transform = 'translateY(0)';
                }
            }
            currentY = 0;
        };

        sheet.addEventListener('touchend', endDrag);
        sheet.addEventListener('touchcancel', endDrag);
    }
});

// Card click handlers
Object.keys(cards).forEach(id => {
    const trigger = document.getElementById(id);
    if (trigger) {
        trigger.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.icon-btn-edit') || target.closest('.icon-btn-delete')) return;
            const targetModal = cards[id];
            if (targetModal) openModal(targetModal);
        });
    }
});

// Modal close buttons
const overlayClosers = [
    { btn: 'btn-close-balance', modal: 'balance-modal' },
    { btn: 'btn-close-goals', modal: 'goals-modal' },
    { btn: 'btn-close-income', modal: 'income-modal' },
    { btn: 'btn-close-expenses', modal: 'expenses-modal' },
    { btn: 'btn-close-profile-overlay', modal: 'profile-modal' },
    { btn: 'btn-close-ai', modal: 'modal-ai' },
];

overlayClosers.forEach(c => {
    const b = document.getElementById(c.btn);
    if (b) {
        b.addEventListener('click', () => {
            const m = document.getElementById(c.modal);
            if (m) closeModal(m);
        });
    }
});

// Input validation helper
function isValidNumber(value: string): boolean {
    if (!value || value.trim() === '') return false;
    const cleanValue = value.replace(',', '.').trim();
    return !isNaN(Number(cleanValue)) && !isNaN(parseFloat(cleanValue));
}

function enforceSixDigits(inputEl: HTMLInputElement, allowNegative: boolean = false) {
    let val = inputEl.value;
    if (!val) return;

    let isNeg = false;
    if (allowNegative && val.startsWith('-')) {
        isNeg = true;
        val = val.slice(1);
    }

    // Split by decimal separator (, or .)
    const hasDecimal = val.includes('.') || val.includes(',');
    let separator = '.';
    if (val.includes(',')) separator = ',';

    const parts = val.split(/[.,]/);
    let intPart = parts[0].replace(/\D/g, '');
    if (intPart.length > 6) {
        intPart = intPart.slice(0, 6);
    }

    let result = (isNeg ? '-' : '') + intPart;
    if (hasDecimal && parts.length > 1) {
        let decPart = parts.slice(1).join('').replace(/\D/g, '').slice(0, 2);
        result += separator + decPart;
    }

    if (inputEl.value !== result) {
        inputEl.value = result;
    }
}

function validateNumberInput(
    inputEl: HTMLInputElement | null,
    errorEl: HTMLElement | null,
    _maxLimit: number = 999999,
    allowNegative: boolean = false
): boolean {
    if (!inputEl) return false;

    enforceSixDigits(inputEl, allowNegative);

    const val = inputEl.value;
    if (val === '' || val === '-') {
        inputEl.classList.remove('input-invalid');
        if (errorEl) errorEl.classList.remove('visible');
        return true;
    }
    if (!isValidNumber(val)) {
        inputEl.classList.add('input-invalid');
        if (errorEl) {
            errorEl.textContent = 'Numbers only';
            errorEl.classList.add('visible');
        }
        return false;
    }

    const cleanVal = val.replace(',', '.').trim();
    const num = parseFloat(cleanVal);
    if (!allowNegative && num < 0) {
        inputEl.classList.add('input-invalid');
        if (errorEl) {
            errorEl.textContent = 'Must be positive';
            errorEl.classList.add('visible');
        }
        return false;
    }

    inputEl.classList.remove('input-invalid');
    if (errorEl) errorEl.classList.remove('visible');
    return true;
}

function clearValidation(inputEl: HTMLInputElement | null, errorEl: HTMLElement | null) {
    if (inputEl) inputEl.classList.remove('input-invalid');
    if (errorEl) errorEl.classList.remove('visible');
}

const inputBalance = document.getElementById('input-balance') as HTMLInputElement | null;
const errorBalance = document.getElementById('error-balance');
if (inputBalance) inputBalance.addEventListener('input', () => validateNumberInput(inputBalance, errorBalance, 999999, true));

const inputGoalPrice = document.getElementById('input-goal-price') as HTMLInputElement | null;
const errorGoalPrice = document.getElementById('error-goal-price');
if (inputGoalPrice) inputGoalPrice.addEventListener('input', () => validateNumberInput(inputGoalPrice, errorGoalPrice, 999999, false));

const inputIncomeAmount = document.getElementById('input-income-amount') as HTMLInputElement | null;
const errorIncomeAmount = document.getElementById('error-income-amount');
if (inputIncomeAmount) inputIncomeAmount.addEventListener('input', () => validateNumberInput(inputIncomeAmount, errorIncomeAmount, 999999, false));

const inputExpenseAmount = document.getElementById('input-expense-amount') as HTMLInputElement | null;
const errorExpenseAmount = document.getElementById('error-expense-amount');
if (inputExpenseAmount) inputExpenseAmount.addEventListener('input', () => validateNumberInput(inputExpenseAmount, errorExpenseAmount, 999999, false));

// UI Renderers
function updateBalanceUI() {
    const formatted = formatCurrency(currentBalance);
    if (mainBalanceValue) {
        mainBalanceValue.textContent = formatted;
        mainBalanceValue.classList.remove('price-red', 'price-green');
        mainBalanceValue.classList.add(currentBalance < 0 ? 'price-red' : 'price-green');
    }
    if (modalBalanceValue) {
        modalBalanceValue.textContent = formatted;
        modalBalanceValue.classList.remove('price-red', 'price-green');
        modalBalanceValue.classList.add('big-green');
        modalBalanceValue.classList.add(currentBalance < 0 ? 'price-red' : 'price-green');
    }
    localStorage.setItem('piggi_balance', currentBalance.toString());
    renderGoals();
}

function renderGoals() {
    if (mainGoalsList) mainGoalsList.innerHTML = '';
    if (modalGoalsList) modalGoalsList.innerHTML = '';
    if (modalGoalsListEdit) modalGoalsListEdit.innerHTML = '';

    if (savingGoals.length === 0) {
        if (mainGoalsList) mainGoalsList.innerHTML = '<div class="empty-state">Add saving goal</div>';
        if (totalGoalAmount) totalGoalAmount.textContent = formatCurrency(0);
    } else {
        let totalTarget = 0;
        savingGoals.forEach((goal, index) => {
            totalTarget += goal.amount;
            
            let percentage = 0;
            if (goal.amount > 0 && currentBalance > 0) {
                percentage = Math.round((currentBalance / goal.amount) * 100);
            }
            if (percentage > 100) percentage = 100;

            if (mainGoalsList && index < 3) {
                const div = document.createElement('div');
                div.className = 'goal-item';
                div.innerHTML = `<span>${escapeHtml(goal.name)}</span><span class="price-orange">${percentage}%</span>`;
                mainGoalsList.appendChild(div);
            }

            if (modalGoalsList) {
                const div = document.createElement('div');
                div.className = 'goal-item';
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
                const div = document.createElement('div');
                div.className = 'goal-item';
                div.style.justifyContent = 'space-between';
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
    localStorage.setItem('piggi_goals', JSON.stringify(savingGoals));
}

function renderIncome() {
    if (mainIncomeList) mainIncomeList.innerHTML = '';
    if (modalIncomeList) modalIncomeList.innerHTML = '';
    if (modalIncomeListEdit) modalIncomeListEdit.innerHTML = '';
    
    if (incomeSources.length === 0) {
        if (mainIncomeList) mainIncomeList.innerHTML = '<div class="empty-state">Add monthly income</div>';
        if (modalIncomeValue) modalIncomeValue.textContent = formatCurrency(0);
    } else {
        let total = 0;
        incomeSources.forEach((source, index) => {
            total += source.amount;

            if (mainIncomeList && index < 3) {
                const div = document.createElement('div');
                div.className = 'income-item';
                div.innerHTML = `<span>${escapeHtml(source.name)}</span><span class="price-green">${formatCurrency(source.amount)}</span>`;
                mainIncomeList.appendChild(div);
            }

            if (modalIncomeList) {
                const div = document.createElement('div');
                div.className = 'income-item';
                div.innerHTML = `<span>${escapeHtml(source.name)}</span><span class="price-green">${formatCurrency(source.amount)}</span>`;
                modalIncomeList.appendChild(div);
            }

            if (modalIncomeListEdit) {
                const div = document.createElement('div');
                div.className = 'income-item';
                div.style.justifyContent = 'space-between';
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
    localStorage.setItem('piggi_income', JSON.stringify(incomeSources));
}

function renderExpenses() {
    if (mainExpenseList) mainExpenseList.innerHTML = '';
    if (modalExpenseList) modalExpenseList.innerHTML = '';
    if (modalExpenseListEdit) modalExpenseListEdit.innerHTML = '';

    if (expenseSources.length === 0) {
        if (mainExpenseList) mainExpenseList.innerHTML = '<div class="empty-state">Add monthly expenses</div>';
        if (modalExpenseValue) modalExpenseValue.textContent = formatCurrency(0);
    } else {
        let total = 0;
        expenseSources.forEach((source, index) => {
            total += source.amount;

            if (mainExpenseList && index < 3) {
                const div = document.createElement('div');
                div.className = 'expense-item';
                div.innerHTML = `<span>${escapeHtml(source.name)}</span><span class="price-red">${formatCurrency(source.amount)}</span>`;
                mainExpenseList.appendChild(div);
            }
            if (modalExpenseList) {
                const div = document.createElement('div');
                div.className = 'expense-item';
                div.innerHTML = `<span>${escapeHtml(source.name)}</span><span class="price-red">${formatCurrency(source.amount)}</span>`;
                modalExpenseList.appendChild(div);
            }

            if (modalExpenseListEdit) {
                const div = document.createElement('div');
                div.className = 'expense-item';
                div.style.justifyContent = 'space-between';
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
    localStorage.setItem('piggi_expenses', JSON.stringify(expenseSources));
}

function escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Slider transitions
function changeSlide(sliderId: string, targetSlide: number) {
    const slider = document.getElementById(sliderId);
    if (!slider) return;
    
    if (sliderId === 'profile-slider') {
        slider.classList.remove('show-branch-1', 'show-branch-2', 'show-branch-3', 'show-branch-4', 'show-branch-5');
        if (targetSlide === 1) {
            slider.classList.add('show-branch-1');
            slider.setAttribute('data-active-slide', '1');
        } else if (targetSlide === 2) {
            slider.classList.add('show-branch-2');
            slider.setAttribute('data-active-slide', '1');
        } else if (targetSlide === 3) {
            slider.classList.add('show-branch-3');
            slider.setAttribute('data-active-slide', '1');
        } else if (targetSlide === 4) {
            slider.classList.add('show-branch-4');
            slider.setAttribute('data-active-slide', '1');
        } else if (targetSlide === 5) {
            slider.classList.add('show-branch-5');
            slider.setAttribute('data-active-slide', '1');
        } else {
            slider.setAttribute('data-active-slide', '0');
        }
    } else {
        slider.setAttribute('data-active-slide', targetSlide.toString());
    }
}

// Balance editing modes
let editingBalanceMode: 'set' | 'add' | 'subtract' = 'set';
const editBalanceTitle = document.getElementById('edit-balance-title');
const editBalanceLabel = document.getElementById('edit-balance-label');

function setupSliderNavigation(btnId: string, sliderId: string, slideIndex: number) {
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.addEventListener('click', () => {
            if (btnId === 'btn-add-funds') {
                editingBalanceMode = 'add';
                if (editBalanceTitle) editBalanceTitle.textContent = 'Add Funds';
                if (editBalanceLabel) editBalanceLabel.textContent = 'Amount to Add';
                clearValidation(inputBalance, errorBalance);
            } else if (btnId === 'btn-subtract-funds') {
                editingBalanceMode = 'subtract';
                if (editBalanceTitle) editBalanceTitle.textContent = 'Subtract Funds';
                if (editBalanceLabel) editBalanceLabel.textContent = 'Amount to Subtract';
                clearValidation(inputBalance, errorBalance);
            } else if (btnId === 'btn-edit-balance') {
                editingBalanceMode = 'set';
                if (editBalanceTitle) editBalanceTitle.textContent = 'Edit Balance';
                if (editBalanceLabel) editBalanceLabel.textContent = 'New Balance';
                clearValidation(inputBalance, errorBalance);
            }
            changeSlide(sliderId, slideIndex);
        });
    }
}

// Navigation bindings
setupSliderNavigation('btn-edit-balance', 'balance-slider', 1);
setupSliderNavigation('btn-add-funds', 'balance-slider', 1);
setupSliderNavigation('btn-subtract-funds', 'balance-slider', 1);
setupSliderNavigation('btn-to-edit-goals', 'goals-slider', 1);
setupSliderNavigation('btn-save-goals-edit', 'goals-slider', 0);
setupSliderNavigation('btn-to-add-goal', 'goals-slider', 2);
setupSliderNavigation('btn-cancel-add-goal', 'goals-slider', 1);
setupSliderNavigation('btn-to-edit-income', 'income-slider', 1);
setupSliderNavigation('btn-save-income-edit', 'income-slider', 0);
setupSliderNavigation('btn-to-add-income', 'income-slider', 2);
setupSliderNavigation('btn-cancel-add-income', 'income-slider', 1);
setupSliderNavigation('btn-to-edit-expense', 'expenses-slider', 1);
setupSliderNavigation('btn-save-expense-edit', 'expenses-slider', 0);
setupSliderNavigation('btn-to-add-expense', 'expenses-slider', 2);
setupSliderNavigation('btn-cancel-add-expense', 'expenses-slider', 1);

// Settings navigation:
// Branch 1: Appearance
setupSliderNavigation('btn-to-appearance', 'profile-slider', 1);
setupSliderNavigation('btn-back-to-profile', 'profile-slider', 0);

// Branch 2: Currency (NEW!)
setupSliderNavigation('btn-to-currency', 'profile-slider', 2);
setupSliderNavigation('btn-back-to-profile-currency', 'profile-slider', 0);

// Branch 3: Edit Avatar (formerly Edit Profile)
setupSliderNavigation('btn-to-edit-profile', 'profile-slider', 3);

// Branch 4: API Key
setupSliderNavigation('btn-to-api-key', 'profile-slider', 4);
setupSliderNavigation('btn-back-to-profile-api', 'profile-slider', 0);

// Branch 5: Reset Data
setupSliderNavigation('btn-to-reset', 'profile-slider', 5);
setupSliderNavigation('btn-cancel-reset', 'profile-slider', 0);

// Cancel balance
const btnCancelBalance = document.getElementById('btn-cancel-balance');
if (btnCancelBalance) {
    btnCancelBalance.addEventListener('click', () => {
        if (inputBalance) inputBalance.value = '';
        clearValidation(inputBalance, errorBalance);
        changeSlide('balance-slider', 0);
    });
}

// Save balance
const btnSaveBalance = document.getElementById('btn-save-balance');
function handleSaveBalance() {
    if (!inputBalance) return;
    if (!validateNumberInput(inputBalance, errorBalance, 999999, true)) return;
    const val = parseFloat(inputBalance.value.replace(',', '.'));
    if (!isNaN(val)) {
        if (editingBalanceMode === 'add') {
            currentBalance += val;
        } else if (editingBalanceMode === 'subtract') {
            currentBalance -= val;
        } else {
            currentBalance = val;
        }
        // Limit balance to 6 digits [-999999, +999999]
        currentBalance = Math.max(-999999, Math.min(999999, currentBalance));
        updateBalanceUI();
    }
    inputBalance.value = '';
    clearValidation(inputBalance, errorBalance);
    changeSlide('balance-slider', 0);
}

if (btnSaveBalance && inputBalance) {
    btnSaveBalance.addEventListener('click', handleSaveBalance);
    inputBalance.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSaveBalance();
        }
    });
}

// Goals add / edit
let editingGoalIndex: number | null = null;
const inputGoalName = document.getElementById('input-goal-name') as HTMLInputElement | null;
const btnSubmitGoal = document.getElementById('btn-submit-goal');
const addGoalHeaderTitle = document.getElementById('add-goal-header-title');
const btnSubmitGoalText = document.getElementById('btn-submit-goal-text');

function handleSubmitGoal() {
    if (!inputGoalName || !inputGoalPrice) return;
    const isPriceValid = validateNumberInput(inputGoalPrice, errorGoalPrice, 999999, false);
    let name = inputGoalName.value.trim();
    if (name.length > 18) name = name.slice(0, 18);

    if (!name || !isPriceValid || inputGoalPrice.value.trim() === '') {
        if (inputGoalPrice.value.trim() === '') validateNumberInput(inputGoalPrice, errorGoalPrice, 999999, false);
        return;
    }

    let amount = parseFloat(inputGoalPrice.value.replace(',', '.'));
    amount = Math.max(0, Math.min(999999, amount));

    if (editingGoalIndex !== null) {
        savingGoals[editingGoalIndex].name = name;
        savingGoals[editingGoalIndex].amount = amount;
        editingGoalIndex = null;
        if (addGoalHeaderTitle) addGoalHeaderTitle.textContent = 'Add Goal';
        if (btnSubmitGoalText) btnSubmitGoalText.textContent = 'Add';
    } else {
        savingGoals.push({ name, amount });
    }
    renderGoals();

    inputGoalName.value = '';
    inputGoalPrice.value = '';
    clearValidation(inputGoalPrice, errorGoalPrice);
    changeSlide('goals-slider', 1);
}

if (btnSubmitGoal && inputGoalName && inputGoalPrice) {
    btnSubmitGoal.addEventListener('click', handleSubmitGoal);

    inputGoalName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            inputGoalPrice.focus();
            inputGoalPrice.select();
        }
    });

    inputGoalPrice.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmitGoal();
        }
    });
}

// Event delegation for goal edits / deletes
if (modalGoalsListEdit) {
    modalGoalsListEdit.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const editBtn = target.closest('.icon-btn-edit') as HTMLElement | null;
        const deleteBtn = target.closest('.icon-btn-delete') as HTMLElement | null;

        if (deleteBtn) {
            const idx = parseInt(deleteBtn.getAttribute('data-idx') || '-1', 10);
            if (idx >= 0 && idx < savingGoals.length) {
                savingGoals.splice(idx, 1);
                renderGoals();
            }
        } else if (editBtn) {
            const idx = parseInt(editBtn.getAttribute('data-idx') || '-1', 10);
            if (idx >= 0 && idx < savingGoals.length) {
                editingGoalIndex = idx;
                const goal = savingGoals[idx];
                if (inputGoalName) inputGoalName.value = goal.name;
                if (inputGoalPrice) inputGoalPrice.value = goal.amount.toString();
                clearValidation(inputGoalPrice, errorGoalPrice);
                if (addGoalHeaderTitle) addGoalHeaderTitle.textContent = 'Edit Goal';
                if (btnSubmitGoalText) btnSubmitGoalText.textContent = 'Save';
                changeSlide('goals-slider', 2);
            }
        }
    });
}

// Income add / edit
let editingIncomeIndex: number | null = null;
const inputIncomeName = document.getElementById('input-income-name') as HTMLInputElement | null;
const btnSubmitIncome = document.getElementById('btn-submit-income');
const addIncomeHeaderTitle = document.getElementById('add-income-header-title');
const btnSubmitIncomeText = document.getElementById('btn-submit-income-text');

function handleSubmitIncome() {
    if (!inputIncomeName || !inputIncomeAmount) return;
    const isAmountValid = validateNumberInput(inputIncomeAmount, errorIncomeAmount, 999999, false);
    let name = inputIncomeName.value.trim();
    if (name.length > 18) name = name.slice(0, 18);

    if (!name || !isAmountValid || inputIncomeAmount.value.trim() === '') {
        if (inputIncomeAmount.value.trim() === '') validateNumberInput(inputIncomeAmount, errorIncomeAmount, 999999, false);
        return;
    }

    let amount = parseFloat(inputIncomeAmount.value.replace(',', '.'));
    amount = Math.max(0, Math.min(999999, amount));

    if (editingIncomeIndex !== null) {
        incomeSources[editingIncomeIndex].name = name;
        incomeSources[editingIncomeIndex].amount = amount;
        editingIncomeIndex = null;
        if (addIncomeHeaderTitle) addIncomeHeaderTitle.textContent = 'Add Monthly Income';
        if (btnSubmitIncomeText) btnSubmitIncomeText.textContent = 'Add';
    } else {
        incomeSources.push({ name, amount });
    }

    renderIncome();
    inputIncomeName.value = '';
    inputIncomeAmount.value = '';
    clearValidation(inputIncomeAmount, errorIncomeAmount);
    changeSlide('income-slider', 1);
}

if (btnSubmitIncome && inputIncomeName && inputIncomeAmount) {
    btnSubmitIncome.addEventListener('click', handleSubmitIncome);

    inputIncomeName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            inputIncomeAmount.focus();
            inputIncomeAmount.select();
        }
    });

    inputIncomeAmount.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmitIncome();
        }
    });
}

if (modalIncomeListEdit) {
    modalIncomeListEdit.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const editBtn = target.closest('.icon-btn-edit') as HTMLElement | null;
        const deleteBtn = target.closest('.icon-btn-delete') as HTMLElement | null;

        if (deleteBtn) {
            const idx = parseInt(deleteBtn.getAttribute('data-idx') || '-1', 10);
            if (idx >= 0 && idx < incomeSources.length) {
                incomeSources.splice(idx, 1);
                renderIncome();
            }
        } else if (editBtn) {
            const idx = parseInt(editBtn.getAttribute('data-idx') || '-1', 10);
            if (idx >= 0 && idx < incomeSources.length) {
                editingIncomeIndex = idx;
                const inc = incomeSources[idx];
                if (inputIncomeName) inputIncomeName.value = inc.name;
                if (inputIncomeAmount) inputIncomeAmount.value = inc.amount.toString();
                clearValidation(inputIncomeAmount, errorIncomeAmount);
                if (addIncomeHeaderTitle) addIncomeHeaderTitle.textContent = 'Edit Monthly Income';
                if (btnSubmitIncomeText) btnSubmitIncomeText.textContent = 'Save';
                changeSlide('income-slider', 2);
            }
        }
    });
}

// Expenses add / edit
let editingExpenseIndex: number | null = null;
const inputExpenseName = document.getElementById('input-expense-name') as HTMLInputElement | null;
const btnSubmitExpense = document.getElementById('btn-submit-expense');
const addExpenseHeaderTitle = document.getElementById('add-expense-header-title');
const btnSubmitExpenseText = document.getElementById('btn-submit-expense-text');

function handleSubmitExpense() {
    if (!inputExpenseName || !inputExpenseAmount) return;
    const isAmountValid = validateNumberInput(inputExpenseAmount, errorExpenseAmount, 999999, false);
    let name = inputExpenseName.value.trim();
    if (name.length > 18) name = name.slice(0, 18);

    if (!name || !isAmountValid || inputExpenseAmount.value.trim() === '') {
        if (inputExpenseAmount.value.trim() === '') validateNumberInput(inputExpenseAmount, errorExpenseAmount, 999999, false);
        return;
    }

    let amount = parseFloat(inputExpenseAmount.value.replace(',', '.'));
    amount = Math.max(0, Math.min(999999, amount));

    if (editingExpenseIndex !== null) {
        expenseSources[editingExpenseIndex].name = name;
        expenseSources[editingExpenseIndex].amount = amount;
        editingExpenseIndex = null;
        if (addExpenseHeaderTitle) addExpenseHeaderTitle.textContent = 'Add Monthly Expenses';
        if (btnSubmitExpenseText) btnSubmitExpenseText.textContent = 'Add';
    } else {
        expenseSources.push({ name, amount });
    }

    renderExpenses();
    inputExpenseName.value = '';
    inputExpenseAmount.value = '';
    clearValidation(inputExpenseAmount, errorExpenseAmount);
    changeSlide('expenses-slider', 1);
}

if (btnSubmitExpense && inputExpenseName && inputExpenseAmount) {
    btnSubmitExpense.addEventListener('click', handleSubmitExpense);

    inputExpenseName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            inputExpenseAmount.focus();
            inputExpenseAmount.select();
        }
    });

    inputExpenseAmount.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmitExpense();
        }
    });
}

if (modalExpenseListEdit) {
    modalExpenseListEdit.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const editBtn = target.closest('.icon-btn-edit') as HTMLElement | null;
        const deleteBtn = target.closest('.icon-btn-delete') as HTMLElement | null;

        if (deleteBtn) {
            const idx = parseInt(deleteBtn.getAttribute('data-idx') || '-1', 10);
            if (idx >= 0 && idx < expenseSources.length) {
                expenseSources.splice(idx, 1);
                renderExpenses();
            }
        } else if (editBtn) {
            const idx = parseInt(editBtn.getAttribute('data-idx') || '-1', 10);
            if (idx >= 0 && idx < expenseSources.length) {
                editingExpenseIndex = idx;
                const exp = expenseSources[idx];
                if (inputExpenseName) inputExpenseName.value = exp.name;
                if (inputExpenseAmount) inputExpenseAmount.value = exp.amount.toString();
                clearValidation(inputExpenseAmount, errorExpenseAmount);
                if (addExpenseHeaderTitle) addExpenseHeaderTitle.textContent = 'Edit Monthly Expenses';
                if (btnSubmitExpenseText) btnSubmitExpenseText.textContent = 'Save';
                changeSlide('expenses-slider', 2);
            }
        }
    });
}

// Avatar Circle Component (Edit Avatar)
const inputAvatarSymbol = document.getElementById('input-avatar-symbol') as HTMLInputElement | null;
const btnSaveAvatar = document.getElementById('btn-save-avatar');
const btnBackToProfileAvatar = document.getElementById('btn-back-to-profile-avatar');
const avatarCircleWrapper = document.getElementById('avatar-circle-wrapper');

if (inputAvatarSymbol) {
    inputAvatarSymbol.value = avatarSymbol;
    inputAvatarSymbol.addEventListener('input', () => {
        const val = inputAvatarSymbol.value.trim();
        if (val.length > 0) {
            inputAvatarSymbol.value = val[val.length - 1].toUpperCase();
        }
    });
}

if (avatarCircleWrapper && inputAvatarSymbol) {
    avatarCircleWrapper.addEventListener('click', () => {
        inputAvatarSymbol.focus();
        inputAvatarSymbol.select();
    });
}

if (btnSaveAvatar && inputAvatarSymbol) {
    const handleSaveAvatar = () => {
        const val = inputAvatarSymbol.value.trim();
        setAvatarSymbol(val.length > 0 ? val[0].toUpperCase() : 'P');
        changeSlide('profile-slider', 0);
    };

    btnSaveAvatar.addEventListener('click', handleSaveAvatar);
    inputAvatarSymbol.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSaveAvatar();
        }
    });
}

if (btnBackToProfileAvatar) {
    btnBackToProfileAvatar.addEventListener('click', () => {
        if (inputAvatarSymbol) inputAvatarSymbol.value = avatarSymbol;
        changeSlide('profile-slider', 0);
    });
}

function setAvatarSymbol(letter: string) {
    avatarSymbol = letter.toUpperCase();
    localStorage.setItem('piggi_avatar', avatarSymbol);
    if (profileTrigger) profileTrigger.textContent = avatarSymbol;
    if (inputAvatarSymbol) inputAvatarSymbol.value = avatarSymbol;
}

// API Key Settings
const inputApiKey = document.getElementById('input-api-key') as HTMLInputElement | null;
const btnSaveApiKey = document.getElementById('btn-save-api-key');
if (btnSaveApiKey && inputApiKey) {
    inputApiKey.value = localStorage.getItem('gemini_api_key') || '';
    const handleSaveApiKey = () => {
        localStorage.setItem('gemini_api_key', inputApiKey.value.trim());
        changeSlide('profile-slider', 0);
    };
    btnSaveApiKey.addEventListener('click', handleSaveApiKey);
    inputApiKey.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSaveApiKey();
        }
    });
}

// Reset Data
const btnConfirmReset = document.getElementById('btn-confirm-reset');
if (btnConfirmReset) {
    btnConfirmReset.addEventListener('click', () => {
        localStorage.clear();
        currentBalance = 0.00;
        savingGoals = [];
        incomeSources = [];
        expenseSources = [];
        avatarSymbol = 'P';
        currentCurrency = 'EUR';
        
        if (profileTrigger) profileTrigger.textContent = 'P';
        if (inputAvatarSymbol) inputAvatarSymbol.value = 'P';
        if (inputApiKey) inputApiKey.value = '';

        setTheme('light');
        setCurrency('EUR');

        updateBalanceUI();
        renderGoals();
        renderIncome();
        renderExpenses();

        changeSlide('profile-slider', 0);
        closeModal(document.getElementById('profile-modal'));
    });
}

// Appearance Theme Settings
const btnLightMode = document.getElementById('btn-light-mode');
const btnDarkMode = document.getElementById('btn-dark-mode');

function setTheme(theme: 'light' | 'dark') {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        localStorage.setItem('piggi_theme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('piggi_theme', 'light');
    }
    updateCheckmarks();
}

function updateCheckmarks() {
    const isDark = document.body.classList.contains('dark-mode');
    const checkLight = document.getElementById('check-light');
    const checkDark = document.getElementById('check-dark');
    if (checkLight) checkLight.style.display = isDark ? 'none' : 'block';
    if (checkDark) checkDark.style.display = isDark ? 'block' : 'none';
}

if (btnLightMode) btnLightMode.addEventListener('click', () => setTheme('light'));
if (btnDarkMode) btnDarkMode.addEventListener('click', () => setTheme('dark'));

if (localStorage.getItem('piggi_theme') === 'dark') {
    setTheme('dark');
} else {
    updateCheckmarks();
}

updateCurrencyCheckmarks();

// ----------------------------------------------------
// PiggiAI Repaired Logic & Mask
// ----------------------------------------------------

function openAiModal() {
    if (!modalAi) return;
    modalAi.classList.add('active');
    setTimeout(() => {
        if (mainInput) mainInput.focus();
    }, 150);
}

if (mainInput) {
    mainInput.addEventListener('focus', () => {
        openAiModal();
    });

    mainInput.addEventListener('click', () => {
        openAiModal();
    });

    mainInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 80) + 'px';
        if (this.value.trim().length > 0) {
            sendBtn?.classList.add('active');
        } else {
            sendBtn?.classList.remove('active');
        }
    });

    mainInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendAiMessage();
        }
    });
}

// Suggestion chips
const suggestionChips = document.getElementById('suggestion-chips');
if (suggestionChips) {
    suggestionChips.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const chip = target.closest('.chip') as HTMLElement | null;
        if (chip) {
            const prompt = chip.getAttribute('data-prompt');
            if (prompt && mainInput) {
                mainInput.value = prompt;
                handleSendAiMessage();
            }
        }
    });
}

function addChatMessage(role: 'user' | 'ai', text: string, badges: string[] = []) {
    if (!aiChatHistory) return;

    const initialGreeting = document.getElementById('ai-initial-greeting');
    if (initialGreeting) {
        initialGreeting.remove();
    }

    if (role === 'user') {
        const div = document.createElement('div');
        div.className = 'chat-msg-user';
        div.textContent = text;
        aiChatHistory.appendChild(div);
    } else {
        const wrapper = document.createElement('div');
        wrapper.className = 'chat-msg-ai-wrapper';

        const tag = document.createElement('div');
        tag.className = 'chat-ai-tag';
        tag.textContent = 'PiggiAI';

        const div = document.createElement('div');
        div.className = 'chat-msg-ai';
        div.textContent = text;

        wrapper.appendChild(tag);
        wrapper.appendChild(div);

        if (badges.length > 0) {
            badges.forEach(badge => {
                const b = document.createElement('div');
                b.className = 'chat-action-badge';
                b.textContent = badge;
                wrapper.appendChild(b);
            });
        }

        aiChatHistory.appendChild(wrapper);
    }

    aiChatHistory.scrollTop = aiChatHistory.scrollHeight;
}

function showAiTyping(): HTMLElement {
    const indicator = document.createElement('div');
    indicator.className = 'ai-typing-indicator';
    indicator.id = 'ai-typing-indicator';
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
    const indicator = document.getElementById('ai-typing-indicator');
    if (indicator) indicator.remove();
}

function executeAction(act: any): string | null {
    if (!act || !act.action) return null;

    // Helper to sanitize name to max 18 chars
    const sanitizeName = (rawName: any) => {
        if (!rawName || typeof rawName !== 'string') return '';
        const trimmed = rawName.trim();
        return trimmed.length > 18 ? trimmed.slice(0, 18) : trimmed;
    };

    switch (act.action) {
        case 'set_balance':
            if (typeof act.amount === 'number') {
                currentBalance = Math.max(-999999, Math.min(999999, act.amount));
                updateBalanceUI();
                return `✓ Balance set to ${formatCurrency(currentBalance)}`;
            }
            break;

        case 'adjust_balance':
            if (typeof act.amount === 'number') {
                currentBalance += act.amount;
                currentBalance = Math.max(-999999, Math.min(999999, currentBalance));
                updateBalanceUI();
                const sign = act.amount >= 0 ? '+' : '';
                return `✓ Balance adjusted: ${sign}${formatCurrency(act.amount)}`;
            }
            break;

        case 'add_income': {
            const name = sanitizeName(act.name);
            if (name && typeof act.amount === 'number') {
                const amount = Math.max(0, Math.min(999999, act.amount));
                incomeSources.push({ name, amount });
                renderIncome();
                return `✓ Added income: ${name} (${formatCurrency(amount)})`;
            }
            break;
        }

        case 'edit_income': {
            const name = sanitizeName(act.name);
            if (name && typeof act.amount === 'number') {
                const amount = Math.max(0, Math.min(999999, act.amount));
                const idx = incomeSources.findIndex(i => i.name.toLowerCase() === name.toLowerCase());
                if (idx !== -1) {
                    incomeSources[idx].amount = amount;
                } else {
                    incomeSources.push({ name, amount });
                }
                renderIncome();
                return `✓ Updated income: ${name} (${formatCurrency(amount)})`;
            }
            break;
        }

        case 'delete_income': {
            const name = sanitizeName(act.name);
            if (name) {
                incomeSources = incomeSources.filter(i => i.name.toLowerCase() !== name.toLowerCase());
                renderIncome();
                return `✓ Deleted income: ${name}`;
            }
            break;
        }

        case 'add_expense': {
            const name = sanitizeName(act.name);
            if (name && typeof act.amount === 'number') {
                const amount = Math.max(0, Math.min(999999, act.amount));
                expenseSources.push({ name, amount });
                renderExpenses();
                return `✓ Added expense: ${name} (${formatCurrency(amount)})`;
            }
            break;
        }

        case 'edit_expense': {
            const name = sanitizeName(act.name);
            if (name && typeof act.amount === 'number') {
                const amount = Math.max(0, Math.min(999999, act.amount));
                const idx = expenseSources.findIndex(e => e.name.toLowerCase() === name.toLowerCase());
                if (idx !== -1) {
                    expenseSources[idx].amount = amount;
                } else {
                    expenseSources.push({ name, amount });
                }
                renderExpenses();
                return `✓ Updated expense: ${name} (${formatCurrency(amount)})`;
            }
            break;
        }

        case 'delete_expense': {
            const name = sanitizeName(act.name);
            if (name) {
                expenseSources = expenseSources.filter(e => e.name.toLowerCase() !== name.toLowerCase());
                renderExpenses();
                return `✓ Deleted expense: ${name}`;
            }
            break;
        }

        case 'add_goal': {
            const name = sanitizeName(act.name);
            if (name && typeof act.amount === 'number') {
                const amount = Math.max(0, Math.min(999999, act.amount));
                savingGoals.push({ name, amount });
                renderGoals();
                return `✓ Added savings goal: ${name} (${formatCurrency(amount)})`;
            }
            break;
        }

        case 'edit_goal': {
            const name = sanitizeName(act.name);
            if (name && typeof act.amount === 'number') {
                const amount = Math.max(0, Math.min(999999, act.amount));
                const idx = savingGoals.findIndex(g => g.name.toLowerCase() === name.toLowerCase());
                if (idx !== -1) {
                    savingGoals[idx].amount = amount;
                } else {
                    savingGoals.push({ name, amount });
                }
                renderGoals();
                return `✓ Updated savings goal: ${name} (${formatCurrency(amount)})`;
            }
            break;
        }

        case 'delete_goal': {
            const name = sanitizeName(act.name);
            if (name) {
                savingGoals = savingGoals.filter(g => g.name.toLowerCase() !== name.toLowerCase());
                renderGoals();
                return `✓ Deleted savings goal: ${name}`;
            }
            break;
        }

        case 'set_theme':
            if (act.theme === 'dark' || act.theme === 'light') {
                setTheme(act.theme);
                return `✓ Theme changed to ${act.theme} mode`;
            }
            break;

        case 'change_avatar':
            if (act.initial) {
                setAvatarSymbol(act.initial[0].toUpperCase());
                return `✓ Avatar changed to "${act.initial[0].toUpperCase()}"`;
            }
            break;

        case 'change_currency':
            if (['USD', 'EUR', 'JPY'].includes(act.currency)) {
                setCurrency(act.currency as CurrencyCode);
                return `✓ Currency changed to ${act.currency}`;
            }
            break;
    }
    return null;
}

async function handleSendAiMessage() {
    if (!mainInput) return;
    const userPrompt = mainInput.value.trim();
    if (!userPrompt) return;

    openAiModal();

    addChatMessage('user', userPrompt);
    mainInput.value = '';
    mainInput.style.height = 'auto';
    sendBtn?.classList.remove('active');

    showAiTyping();

    const activeKey = localStorage.getItem('gemini_api_key') || '';

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: userPrompt,
                apiKey: activeKey,
                context: {
                    currentBalance,
                    currency: currentCurrency,
                    avatarSymbol,
                    isDarkMode: document.body.classList.contains('dark-mode'),
                    savingGoals,
                    incomeSources,
                    expenseSources,
                },
            }),
        });

        removeAiTyping();

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const errMsg = errData.error || `Server responded with ${response.status}`;
            addChatMessage('ai', `I ran into an issue: ${errMsg}`);
            return;
        }

        const data = await response.json();
        const actionBadges: string[] = [];

        if (data.actions && Array.isArray(data.actions)) {
            data.actions.forEach((act: any) => {
                const badge = executeAction(act);
                if (badge) actionBadges.push(badge);
            });
        }

        const reply = data.reply || (actionBadges.length > 0 ? 'I updated your budget!' : 'Done!');
        addChatMessage('ai', reply, actionBadges);

    } catch (err: any) {
        removeAiTyping();
        console.error('Failed to communicate with PiggiAI:', err);
        addChatMessage('ai', 'Sorry, I had trouble processing that request. Please try again.');
    }
}

if (sendBtn) {
    sendBtn.addEventListener('click', () => {
        handleSendAiMessage();
    });
}

// Initial UI updates
updateBalanceUI();
renderIncome();
renderExpenses();
