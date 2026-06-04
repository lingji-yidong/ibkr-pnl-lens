import { parseIbkrStatement } from "./domain/analytics";
import type { ParsedStatement } from "./domain/types";
import { localeOptions, normalizeLocale, t, type Locale } from "./ui/i18n";
import { type AppElements, type PeriodMode, type ThemeMode, renderError, renderReport, translateStaticText } from "./ui/render";

interface AppState {
  report: ParsedStatement | null;
  locale: Locale;
  periodMode: PeriodMode;
  theme: ThemeMode;
}

declare global {
  interface Window {
    __loadIbkrXmlForTest?: (text: string) => void;
  }
}

const state: AppState = {
  report: null,
  locale: normalizeLocale(localStorage.getItem("ibkr-pnl-locale") || navigator.language),
  periodMode: (localStorage.getItem("ibkr-pnl-period") as PeriodMode) || "weekly",
  theme: (localStorage.getItem("ibkr-pnl-theme") as ThemeMode) || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
};

const els = getElements();
initializePreferences();
bindEvents();

window.__loadIbkrXmlForTest = (text: string) => {
  state.report = parseIbkrStatement(text);
  renderCurrentReport();
};

function bindEvents(): void {
  const fileInput = getElement<HTMLInputElement>("fileInput");
  const dropZone = getElement<HTMLElement>("dropZone");
  const localeSelect = getElement<HTMLSelectElement>("localeSelect");
  const themeToggle = getElement<HTMLButtonElement>("themeToggle");

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
      renderCurrentReport();
    });
  }
}

async function readFile(file: File): Promise<void> {
  try {
    const text = await file.text();
    state.report = parseIbkrStatement(text);
    renderCurrentReport();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    renderError(els.offlineAdvice, `${t(state.locale, "importFailed")}：${message}`);
  }
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
  localeSelect.title = t(state.locale, "language");
  localeSelect.setAttribute("aria-label", t(state.locale, "language"));
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
  });
}

function getElements(): AppElements {
  return {
    privacyStrip: getElement("privacyStrip"),
    maskedAccount: getElement("maskedAccount"),
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
    disciplineList: getElement("disciplineList"),
    bestLoserList: getElement("bestLoserList"),
    periodRows: getElement("periodRows"),
    assetRows: getElement("assetRows"),
    optionRows: getElement("optionRows"),
    symbolRows: getElement("symbolRows"),
    offlineAdvice: getElement("offlineAdvice"),
  };
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}
