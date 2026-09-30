/** Opens the shared "Report a content problem" dialog from anywhere (screens, terminal). */
import { create } from 'zustand';

export interface ReportRequest {
  itemId: string;
  /** Context line, e.g. "Review" or "terminal: play sort --hard". */
  where?: string;
  /** Generated items only (see AnswerResult.instance). */
  instance?: string;
}

export interface ReportUiState {
  request: ReportRequest | null;
  openReport(req: ReportRequest): void;
  closeReport(): void;
}

export const useReportDialog = create<ReportUiState>()((set) => ({
  request: null,
  openReport: (request) => set({ request }),
  closeReport: () => set({ request: null }),
}));

export function openReport(req: ReportRequest): void {
  useReportDialog.getState().openReport(req);
}
