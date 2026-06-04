import { parseIbkrStatement } from "./domain/analytics";
import type { ParsedStatement } from "./domain/types";
import { type AppElements, renderError, renderReport } from "./ui/render";

interface AppState {
  report: ParsedStatement | null;
}

declare global {
  interface Window {
    __loadIbkrXmlForTest?: (text: string) => void;
  }
}

const state: AppState = {
  report: null,
};

const els = getElements();
bindEvents();

window.__loadIbkrXmlForTest = (text: string) => {
  state.report = parseIbkrStatement(text);
  renderReport(els, state.report);
};

function bindEvents(): void {
  const fileInput = getElement<HTMLInputElement>("fileInput");
  const dropZone = getElement<HTMLElement>("dropZone");

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
}

async function readFile(file: File): Promise<void> {
  try {
    const text = await file.text();
    state.report = parseIbkrStatement(text);
    renderReport(els, state.report);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    renderError(els.offlineAdvice, `XML 解析失敗：${message}`);
  }
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
    weeklyChart: getElement("weeklyChart"),
    monthlyChart: getElement("monthlyChart"),
    disciplineList: getElement("disciplineList"),
    bestLoserList: getElement("bestLoserList"),
    weeklyRows: getElement("weeklyRows"),
    monthlyRows: getElement("monthlyRows"),
    symbolRows: getElement("symbolRows"),
    offlineAdvice: getElement("offlineAdvice"),
  };
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}
