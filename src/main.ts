import { parseIbkrStatement } from "./domain/analytics.js";
import { DomainError } from "./domain/flexXml.js";
import type { DomainErrorCode, ParsedStatement } from "./domain/types.js";
import { localeOptions, normalizeLocale, t, type Locale } from "./ui/i18n/index.js";
import { type AppElements, type PeriodMode, type SortDirection, type SortState, type SortTable, type ThemeMode, renderError, renderPeriodSection, renderReport, translateStaticText } from "./ui/render.js";

interface AppState {
  report: ParsedStatement | null;
  sourceXml: string | null;
  selectedAccountIndex: number;
  locale: Locale;
  periodMode: PeriodMode;
  theme: ThemeMode;
  sorts: Partial<Record<SortTable, SortState>>;
  symbolPage: number;
}

declare global {
  interface Window {
    __loadIbkrXmlForTest?: (text: string) => void;
  }
}

const state: AppState = {
  report: null,
  sourceXml: null,
  selectedAccountIndex: 0,
  locale: normalizeLocale(localStorage.getItem("ibkr-pnl-locale") || navigator.language),
  periodMode: (localStorage.getItem("ibkr-pnl-period") as PeriodMode) || "weekly",
  theme: (localStorage.getItem("ibkr-pnl-theme") as ThemeMode) || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  sorts: {},
  symbolPage: 1,
};

const els = getElements();
initializePreferences();
bindEvents();

window.__loadIbkrXmlForTest = (text: string) => {
  state.sourceXml = text;
  state.selectedAccountIndex = 0;
  state.symbolPage = 1;
  state.report = parseIbkrStatement(text, state.selectedAccountIndex);
  renderCurrentReport();
};

function bindEvents(): void {
  const fileInput = getElement<HTMLInputElement>("fileInput");
  const dropZone = getElement<HTMLElement>("dropZone");
  const localeSelect = getElement<HTMLSelectElement>("localeSelect");
  const themeToggle = getElement<HTMLButtonElement>("themeToggle");
  const accountSelect = getElement<HTMLSelectElement>("accountSelect");

  fileInput.addEventListener("change", async (event) => {
    const [file] = (event.target as HTMLInputElement).files || [];
    if (file) await readFile(file);
  });

  for (const eventName of ["dragenter", "dragover"]) {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add("dragging");
    });
  }

  for (const eventName of ["dragleave", "drop"]) {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove("dragging");
    });
  }

  dropZone.addEventListener("drop", async (event) => {
    const [file] = event.dataTransfer?.files || [];
    if (file) await readFile(file);
  });

  localeSelect.addEventListener("change", () => {
    state.locale = normalizeLocale(localeSelect.value);
    localStorage.setItem("ibkr-pnl-locale", state.locale);
    applyLocale();
    renderCurrentReport();
  });

  accountSelect.addEventListener("change", () => {
    if (!state.sourceXml) return;
    state.selectedAccountIndex = Number(accountSelect.value) || 0;
    state.symbolPage = 1;
    state.report = parseIbkrStatement(state.sourceXml, state.selectedAccountIndex);
    renderCurrentReport();
  });

  themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("ibkr-pnl-theme", state.theme);
    applyTheme();
    renderCurrentReport();
  });

  for (const button of [els.periodWeekly, els.periodMonthly]) {
    button.addEventListener("click", () => {
      state.periodMode = button.dataset.period === "monthly" ? "monthly" : "weekly";
      localStorage.setItem("ibkr-pnl-period", state.periodMode);
      renderCurrentPeriod();
    });
  }

  document.addEventListener("click", (event) => {
    const collapseButton = (event.target as Element).closest<HTMLButtonElement>(".collapse-button");
    if (collapseButton) {
      const group = collapseButton.dataset.optionGroup;
      if (!group) return;
      const expanded = collapseButton.getAttribute("aria-expanded") === "true";
      collapseButton.setAttribute("aria-expanded", String(!expanded));
      collapseButton.textContent = expanded ? "+" : "-";
      for (const row of document.querySelectorAll<HTMLTableRowElement>(`.detail-row[data-option-group="${CSS.escape(group)}"]`)) {
        row.hidden = expanded;
      }
      return;
    }

    const pagerButton = (event.target as Element).closest<HTMLButtonElement>(".pager-button[data-symbol-page]");
    if (pagerButton) {
      const action = pagerButton.dataset.symbolPage;
      state.symbolPage = action === "next" ? state.symbolPage + 1 : Math.max(1, state.symbolPage - 1);
      renderCurrentReport();
      return;
    }

    const button = (event.target as Element).closest<HTMLButtonElement>(".sort-button");
    if (!button) return;
    const table = button.dataset.sortTable as SortTable | undefined;
    const key = button.dataset.sortKey;
    if (!table || !key) return;
    const current = state.sorts[table];
    const direction: SortDirection = current?.key === key && current.direction === "desc" ? "asc" : "desc";
    state.sorts = {
      ...state.sorts,
      [table]: { table, key, direction },
    };
    if (table === "symbol") state.symbolPage = 1;
    if (table === "period") renderCurrentPeriod();
    else renderCurrentReport();
  });
}

async function readFile(file: File): Promise<void> {
  try {
    const text = await file.text();
    state.sourceXml = text;
    state.selectedAccountIndex = 0;
    state.symbolPage = 1;
    state.report = parseIbkrStatement(text, state.selectedAccountIndex);
    renderCurrentReport();
  } catch (error) {
    renderError(els.offlineAdvice, state.locale, localizedError(error, state.locale));
  }
}

function localizedError(error: unknown, locale: Locale): string {
  if (error instanceof DomainError) return t(locale, errorKey(error.code));
  return error instanceof Error ? error.message : String(error);
}

function errorKey(code: DomainErrorCode): `error.${DomainErrorCode}` {
  return `error.${code}`;
}

function initializePreferences(): void {
  const localeSelect = getElement<HTMLSelectElement>("localeSelect");
  localeSelect.innerHTML = localeOptions.map((option) => `<option value="${option.code}">${option.label}</option>`).join("");
  localeSelect.value = state.locale;
  applyTheme();
  applyLocale();
}

function applyTheme(): void {
  document.documentElement.dataset.theme = state.theme;
  const themeToggle = getElement<HTMLButtonElement>("themeToggle");
  const nextThemeLabel = state.theme === "dark" ? t(state.locale, "light") : t(state.locale, "dark");
  themeToggle.innerHTML = themeIcon(state.theme);
  themeToggle.title = nextThemeLabel;
  themeToggle.setAttribute("aria-label", nextThemeLabel);
  themeToggle.setAttribute("aria-pressed", String(state.theme === "dark"));
}

function applyLocale(): void {
  document.documentElement.lang = state.locale;
  translateStaticText(state.locale);
  const localeSelect = getElement<HTMLSelectElement>("localeSelect");
  const currentLocale = localeOptions.find((option) => option.code === state.locale)?.label || state.locale;
  const languageLabel = `${t(state.locale, "language")}: ${currentLocale}`;
  localeSelect.title = languageLabel;
  localeSelect.setAttribute("aria-label", languageLabel);
  applyTheme();
}

function themeIcon(theme: ThemeMode): string {
  if (theme === "dark") {
    return `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M12 3v2.2M12 18.8V21M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M3 12h2.2M18.8 12H21M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M20.2 15.8A8.2 8.2 0 0 1 8.2 3.8 7.2 7.2 0 1 0 20.2 15.8Z"/></svg>`;
}

function renderCurrentReport(): void {
  if (!state.report) return;
  renderReport(els, state.report, {
    locale: state.locale,
    periodMode: state.periodMode,
    theme: state.theme,
    sorts: state.sorts,
    symbolPage: state.symbolPage,
  });
}

function renderCurrentPeriod(): void {
  if (!state.report) return;
  renderPeriodSection(els, state.report, {
    locale: state.locale,
    periodMode: state.periodMode,
    theme: state.theme,
    sorts: state.sorts,
    symbolPage: state.symbolPage,
  });
}

function getElements(): AppElements {
  return {
    privacyStrip: getElement("privacyStrip"),
    maskedAccount: getElement("maskedAccount"),
    accountSelect: getElement("accountSelect"),
    maskedName: getElement("maskedName"),
    period: getElement("period"),
    baseCurrency: getElement("baseCurrency"),
    metricsGrid: getElement("metricsGrid"),
    workspace: getElement("workspace"),
    tradeCount: getElement("tradeCount"),
    dailyChart: getElement("dailyChart"),
    distributionChart: getElement("distributionChart"),
    periodChart: getElement("periodChart"),
    periodTitle: getElement("periodTitle"),
    periodColumnLabel: getElement("periodColumnLabel"),
    periodWeekly: getElement("periodWeekly"),
    periodMonthly: getElement("periodMonthly"),
    intradaySessionRows: getElement("intradaySessionRows"),
    disciplineList: getElement("disciplineList"),
    bestLoserList: getElement("bestLoserList"),
    periodRows: getElement("periodRows"),
    holdingRows: getElement("holdingRows"),
    directionRows: getElement("directionRows"),
    assetRows: getElement("assetRows"),
    optionRows: getElement("optionRows"),
    symbolRows: getElement("symbolRows"),
    symbolPager: getElement("symbolPager"),
    offlineAdvice: getElement("offlineAdvice"),
  };
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}
