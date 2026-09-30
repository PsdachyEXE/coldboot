/**
 * The exam simulator (Section 6.6), lazy-loaded at `/exam`. The URL says which view to show:
 *
 * - `/exam` and `/exam?mini=1`: the start screen (the mini paper first with `mini=1`), with the
 *   paper in progress and past papers;
 * - `/exam?sit=1`: the paper in progress, sat or (once submitted) marked;
 * - `/exam?report=<id>`: a marked paper's report.
 */
import { useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { ContentGate } from '../app/study/ContentGate';
import type { ContentIndex } from '../content/loader';
import { PaperView } from './ExamPaper';
import { ExamReport } from './ExamReport';
import { ExamStart } from './ExamStart';
import { useExam } from './store';

export default function ExamScreen() {
  const [params] = useSearchParams();
  const { search } = useLocation();
  // Moving between the exam's views keeps the same route, so the shell doesn't scroll: do it here.
  // Each view's heading takes focus as it mounts.
  const lastSearch = useRef(search);
  useEffect(() => {
    if (lastSearch.current === search) return;
    lastSearch.current = search;
    window.scrollTo?.(0, 0);
  }, [search]);
  const report = params.get('report');
  if (report !== null) return <ExamReport id={report} />;
  const sit = params.get('sit') === '1';
  const mini = params.get('mini') === '1';
  return <ContentGate heading="Exam">{(content) => <ExamHome content={content} sit={sit} mini={mini} />}</ContentGate>;
}

function ExamHome({ content, sit, mini }: { content: ContentIndex; sit: boolean; mini: boolean }) {
  const paper = useExam((s) => s.paper);
  if (paper && sit) return <PaperView key={paper.id} paper={paper} content={content} />;
  return <ExamStart content={content} mini={mini} />;
}
