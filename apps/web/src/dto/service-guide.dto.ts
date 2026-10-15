export interface GuideTopic {
  id: string;
  title: string;
  points: string[];
}
// Operator facts that are not decided yet stay null; screens show a pending message instead.
export interface PrivacyOperatorInfo {
  operator: string | null;
  privacyOfficer: string | null;
  contact: string | null;
  retention: string | null;
  processors: string | null;
  effectiveDate: string | null;
}
export interface PrivacyGuide {
  notice: string;
  topics: GuideTopic[];
  operatorHeading: string;
  operatorInfo: PrivacyOperatorInfo;
  operatorLabels: Record<keyof PrivacyOperatorInfo, string>;
  pendingMessage: string;
}
export interface GuideRow {
  key: string;
  label: string;
  value: string;
  pending: boolean;
}
export type RecordStatus =
  'disabled' | 'invalid' | 'loading' | 'not-found' | 'error' | 'ready';
