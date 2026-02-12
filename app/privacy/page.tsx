import type { Metadata } from 'next';
import PrivacyContent from './PrivacyContent';

export const metadata: Metadata = {
  title: 'Privacy Policy | Brainia',
  description: 'Privacy Policy for Brainia Extension, Desktop, and Mobile applications.',
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
