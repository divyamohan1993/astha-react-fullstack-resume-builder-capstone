import type { TemplateId, Resume } from '@/store/types';
import { ATSClassic } from './ATSClassic';
import { ModernBlue } from './ModernBlue';
import { Creative } from './Creative';
import { Minimal } from './Minimal';

export type TemplateComponent = (props: { resume: Resume }) => React.JSX.Element;

export const templateRegistry: Record<TemplateId, TemplateComponent> = {
  'ats-classic': ATSClassic,
  'modern-blue': ModernBlue,
  'creative': Creative,
  'minimal': Minimal,
};
