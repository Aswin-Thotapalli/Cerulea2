import type { Dispatch, SetStateAction } from 'react';

export type StepComponentProps = {
  stepIndex: number;
  stepId: number;
  projectId?: string;
  setProjectId?: Dispatch<SetStateAction<string | null>>;
  goPrev: () => void;
  goNext: () => void;
  onSoftSave?: () => void; // called by step when it “saves” something lightweight
  /** The disclosure level the shell shows: 1 Template, 2 Outcomes, 3 Designer, 4 Blueprint. */
  disclosureLevel?: 1 | 2 | 3 | 4;
};
