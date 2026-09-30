/**
 * The setup form for Drill and Written: practise one KK, one area of study, the weakest KKs or a
 * random mix. KKs and areas with nothing to practise are listed but can't be chosen.
 */
import { useState, type FormEvent } from 'react';
import type { ContentIndex } from '../../content/loader';
import { AREA_IDS, type AreaId, type KkId } from '../../content/schema';
import { ALL_KK_IDS, areaById, kkLabel, kksByArea } from '../../content/studyDesign';
import { Button } from '../../ui/Button';
import { Checkbox, RadioGroup, Select } from '../../ui/Field';
import { plural } from './format';
import { mcqsFor, shortsFor, type ItemKind, type StudyScope } from './select';
import study from './study.module.css';

type Mode = StudyScope['mode'];

export interface ScopeFormProps {
  content: ContentIndex;
  kind: ItemKind;
  legend: string;
  submitLabel: string;
  /** Offer timed mode (Drill only). */
  timedOption?: boolean;
  initialTimed?: boolean;
  onSubmit(scope: StudyScope, timed: boolean): void;
}

export function ScopeForm({ content, kind, legend, submitLabel, timedOption = false, initialTimed = false, onSubmit }: ScopeFormProps) {
  const count = (kk: KkId) => (kind === 'mcq' ? mcqsFor(content, kk) : shortsFor(content, kk)).length;
  const noun = kind === 'mcq' ? 'question' : 'short answer';
  const kkOptions = ALL_KK_IDS.map((kk) => {
    const n = count(kk);
    return { value: kk, label: `${kkLabel(kk)} (${n ? plural(n, noun) : 'none yet'})`, disabled: n === 0 };
  });
  const areaCount = (area: AreaId) => kksByArea[area].reduce((sum, k) => sum + count(k.id as KkId), 0);
  const areaOptions = AREA_IDS.map((area) => {
    const n = areaCount(area);
    return { value: area, label: `${area} ${areaById.get(area)?.title ?? ''} (${n ? plural(n, noun) : 'none yet'})`, disabled: n === 0 };
  });

  const [mode, setMode] = useState<Mode>('weak');
  const [kk, setKk] = useState<string>(() => kkOptions.find((o) => !o.disabled)?.value ?? '');
  const [area, setArea] = useState<string>(() => areaOptions.find((o) => !o.disabled)?.value ?? '');
  const [timed, setTimed] = useState(initialTimed);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'kk') onSubmit({ mode, kk: kk as KkId }, timed);
    else if (mode === 'area') onSubmit({ mode, area: area as AreaId }, timed);
    else onSubmit({ mode }, timed);
  };

  return (
    <form className={study.form} onSubmit={submit} noValidate>
      <RadioGroup<Mode>
        legend={legend}
        name={`${kind}-scope`}
        value={mode}
        onChange={setMode}
        options={[
          {
            value: 'weak',
            label: 'Your weakest key knowledge',
            hint: "The key knowledge you score lowest on. Until you've tried at least three key knowledge points, it mixes in some you haven't tried yet.",
          },
          { value: 'kk', label: 'One key knowledge point' },
          { value: 'area', label: 'One area of study' },
          { value: 'random', label: 'A mix from across the course' },
        ]}
      />
      {mode === 'kk' ? <Select label="Key knowledge point" width="full" value={kk} onChange={(e) => setKk(e.target.value)} options={kkOptions} /> : null}
      {mode === 'area' ? <Select label="Area of study" width="full" value={area} onChange={(e) => setArea(e.target.value)} options={areaOptions} /> : null}
      {timedOption ? (
        <Checkbox
          label="Time it at Section A pace"
          hint="20 questions in 24 minutes, as in Section A of the exam. Questions left when time runs out count as wrong."
          checked={timed}
          onChange={(e) => setTimed(e.target.checked)}
        />
      ) : null}
      <div className={study.actions}>
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
