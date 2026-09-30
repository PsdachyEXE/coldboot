/** Placeholder until the exam simulator (Phase 2) lands: it points to practice for each section. */
import { drillPath, paths, writtenPath } from '../app/paths';
import { useContentIndex } from '../content/store';
import { ButtonLink } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

export default function ExamScreen() {
  const caseStudy = useContentIndex()?.caseStudies[0];
  return (
    <section>
      <h1>Exam simulator</h1>
      <EmptyState
        title="The full practice exam arrives in a later version"
        action={
          <>
            <ButtonLink variant="primary" to={drillPath({ mode: 'random', timed: true })}>
              Start a timed Section A drill
            </ButtonLink>
            <ButtonLink to={caseStudy ? writtenPath({ cs: caseStudy.id }) : paths.written}>
              {caseStudy ? 'Practise the case study' : 'Practise written questions'}
            </ButtonLink>
          </>
        }
      >
        <p>
          Until then, practise the sections one at a time: Section A as a timed drill of 20 questions in 24 minutes, and Sections B and C as written
          answers against a case study.
        </p>
      </EmptyState>
    </section>
  );
}
