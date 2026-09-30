/**
 * Figures (Section 8.4): `<FigureView figure={f} />` renders any Figure from its structured data.
 * The Gantt schedule and ASCII chart are exported for the `gantt` game and the terminal.
 */
export { FigureView } from './FigureView';
export type { FigureViewProps } from './FigureView';
export type { Highlight } from './highlight';
export { describeFigure } from './describe';
export type { FigureDescription, DescriptionSection } from './describe';
export { computeSchedule, trySchedule, ScheduleError } from './gantt/schedule';
export type { Schedule, ScheduleTask, TaskTiming } from './gantt/schedule';
export { asciiGantt } from './gantt/ascii';
export type { AsciiGanttOptions, AsciiGanttTask } from './gantt/ascii';
