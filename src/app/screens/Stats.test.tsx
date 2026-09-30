import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ALL_KK_IDS } from '../../content/studyDesign';
import { addDays, studyDay, studyDayStart } from '../../lib/time';
import { recordAttempt } from '../../state/record';
import { useSession } from '../../state/session';
import { useSettings } from '../../state/settings';
import { useSrs } from '../../state/srs';
import { fixtureIndex, fxCard, provideContent, resetStudyStores } from '../study/testing';
import Stats from './Stats';

// 6 pm on Thursday 1 October 2026 in Melbourne.
const NOW = new Date(2026, 9, 1, 18, 0).getTime();
const TODAY = studyDay(NOW);

function renderStats() {
  return render(
    <MemoryRouter>
      <Stats />
    </MemoryRouter>,
  );
}

function srsCard(due: number) {
  return { reps: 1, interval: 1, ease: 2.5, due, lapses: 0, last: NOW - 86_400_000 };
}

describe('Stats', () => {
  beforeEach(() => {
    resetStudyStores();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    useSettings.setState({ onboarded: true, motion: 'reduce', newCardLimit: 20 });
    provideContent(fixtureIndex({ cards: [fxCard('c-u3o1-kk04-001', ['U3O1-KK04']), fxCard('c-u3o1-kk04-002', ['U3O1-KK04']), fxCard('c-u3o1-kk04-003', ['U3O1-KK04'])] }));
  });
  afterEach(() => {
    vi.useRealTimers();
    resetStudyStores();
  });

  it('says how to start when there is no progress to chart', () => {
    renderStats();
    expect(screen.getByRole('heading', { level: 1, name: 'Stats' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nothing to chart yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Start today's run" })).toHaveAttribute('href', '/run');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText('Show data')).not.toBeInTheDocument();
  });

  describe('with progress', () => {
    beforeEach(() => {
      // Two days ago: a drill in U3O1 (3 of 4 right). Today: three card reviews and a PSM question.
      const twoDaysAgo = studyDayStart(addDays(TODAY, -2)) + 3_600_000;
      for (let i = 0; i < 4; i++) {
        recordAttempt({ itemId: `m-u3o1-kk04-00${i + 1}`, kk: ['U3O1-KK04'], score: i < 3 ? 1 : 0, timestamp: twoDaysAgo + i * 1000, ms: 60_000 });
      }
      for (let i = 0; i < 3; i++) {
        recordAttempt({ itemId: `c-u3o1-kk04-00${i + 1}`, kk: ['U3O1-KK04'], score: 0.8, timestamp: NOW - 600_000 + i, ms: 20_000 }, { review: true });
      }
      recordAttempt({ itemId: 'psm-m-001', kk: ['PSM'], score: 0, timestamp: NOW - 300_000, ms: 30_000 });
      useSrs.getState().setCard('c-u3o1-kk04-001', srsCard(NOW - 1000));
      useSrs.getState().setCard('c-u3o1-kk04-002', srsCard(studyDayStart(addDays(TODAY, 1))));
      useSrs.getState().setCard('c-u3o1-kk04-003', srsCard(studyDayStart(addDays(TODAY, 30))));
      // A record for a card that has left the content is not forecast.
      useSrs.getState().setCard('c-gone-001', srsCard(NOW - 1000));
    });

    it('shows every chart with a title and a summary for screen readers', () => {
      renderStats();
      for (const name of ['Accuracy by area of study', 'Reviews per day', 'Cards due in the next 14 days', 'Weakest key knowledge', 'Time studied']) {
        expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
      }
      const reviews = screen.getByRole('region', { name: 'Reviews per day' });
      expect(within(reviews).getByRole('img', { name: /cards reviewed per study day over the last 21 days: 3 in all/ })).toBeInTheDocument();
      const accuracy = screen.getByRole('region', { name: 'Accuracy by area of study' });
      const panels = within(accuracy).getByRole('list', { name: 'Accuracy charts, one per area' });
      expect(within(panels).getAllByRole('listitem')).toHaveLength(6);
      expect(within(panels).getByRole('heading', { name: 'U3O1 Software development: programming' })).toBeInTheDocument();
      // U3O1: 3 of 4 (75%) two days ago and three Good ratings (80%) today: 5.4 of 7.
      expect(within(panels).getByText('77% average over 7 answers')).toBeInTheDocument();
      expect(within(panels).getByText('0% average over 1 answer')).toBeInTheDocument();
      expect(within(panels).getByRole('img', { name: /average score in U3O1 .*: 77% over the last 21 days/ })).toBeInTheDocument();
      // An area with no answers says what to do.
      expect(within(panels).getByRole('link', { name: 'Drill U4O2' })).toHaveAttribute('href', '/drill?area=U4O2');
    });

    it('puts the numbers behind each chart in a Show data table', () => {
      renderStats();
      const reviews = screen.getByRole('region', { name: 'Reviews per day' });
      fireEvent.click(within(reviews).getByText('Show data'));
      const table = within(reviews).getByRole('table', { name: 'Cards reviewed per study day, last 21 days' });
      const rows = within(table).getAllByRole('row');
      expect(rows).toHaveLength(1 + 21 + 1);
      expect(within(rows[21]).getByRole('rowheader')).toHaveTextContent('Thursday 1 October');
      expect(within(rows[21]).getByRole('cell')).toHaveTextContent('3');
      expect(within(rows[22]).getAllByRole('cell')[0]).toHaveTextContent('3');

      const accuracy = within(screen.getByRole('region', { name: 'Accuracy by area of study' })).getByRole('table');
      const twoDaysAgo = within(accuracy).getByRole('rowheader', { name: 'Tuesday 29 September' }).closest('tr')!;
      expect(within(twoDaysAgo).getAllByRole('cell')[0]).toHaveTextContent('75% of 4 answers');
      expect(within(twoDaysAgo).getAllByRole('cell')[5]).toHaveTextContent('No answers');
      expect(screen.getAllByText('Show data')).toHaveLength(5);
    });

    it('forecasts the cards due, with the ones due now told apart in words', () => {
      renderStats();
      const forecast = screen.getByRole('region', { name: 'Cards due in the next 14 days' });
      expect(within(forecast).getByText('Due now').nextSibling).toHaveTextContent('1');
      expect(within(forecast).getByText('Next 14 days').nextSibling).toHaveTextContent('2');
      expect(within(forecast).getByText('After 14 Oct').nextSibling).toHaveTextContent('1');
      expect(within(forecast).getByRole('list', { name: 'Key' })).toHaveTextContent('Due now, including overdue cards');
      expect(within(forecast).getByText(/Review adds up to 20 new cards a day/)).toBeInTheDocument();
    });

    it('ranks the weakest key knowledge and counts the unseen points apart', () => {
      renderStats();
      const weakest = screen.getByRole('region', { name: 'Weakest key knowledge' });
      const items = within(within(weakest).getByRole('list', { name: '' })).getAllByRole('listitem');
      expect(items).toHaveLength(2);
      expect(within(items[0]).getByRole('link')).toHaveAttribute('href', '/drill?kk=PSM');
      expect(items[0]).toHaveTextContent('0%, weak');
      expect(within(items[1]).getByRole('link')).toHaveAttribute('href', '/drill?kk=U3O1-KK04');
      expect(within(weakest).getByText(new RegExp(`${ALL_KK_IDS.length - 2} key knowledge points are unseen`))).toBeInTheDocument();
      expect(within(weakest).getByRole('link', { name: 'Find unseen key knowledge on the syllabus map' })).toHaveAttribute('href', '/map');
    });

    it('shows time studied today, in the window and in total', () => {
      renderStats();
      const time = screen.getByRole('region', { name: 'Time studied' });
      // Today: three 20 s reviews and one 30 s question (1.5 min). Two days ago: four minutes.
      expect(within(time).getByText('Today', { selector: 'dt' }).nextSibling).toHaveTextContent('2 min');
      expect(within(time).getByText('Last 21 days', { selector: 'dt' }).nextSibling).toHaveTextContent('6 min');
      expect(within(time).getByText('In total', { selector: 'dt' }).nextSibling).toHaveTextContent('6 min');
      expect(within(time).getByText('Days studied').nextSibling).toHaveTextContent('2');
    });

    it('shows per-chart empty states when only some charts have data', () => {
      useSession.getState().reset();
      renderStats();
      expect(screen.queryByRole('heading', { name: 'Nothing to chart yet' })).not.toBeInTheDocument();
      expect(screen.getByText('No cards reviewed in the last 21 days.')).toBeInTheDocument();
      expect(within(screen.getByRole('region', { name: 'Reviews per day' })).getByRole('link', { name: 'Go to Review' })).toHaveAttribute('href', '/review');
      expect(screen.getByRole('region', { name: 'Cards due in the next 14 days' })).toHaveTextContent('Due now');
    });
  });
});
