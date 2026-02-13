import type { Metadata } from 'next';
import TermsContent from './TermsContent';

export const metadata: Metadata = {
    title: 'Terms of Service | Brainia',
    description: 'Terms of Service for Brainia Extension, Desktop, and Mobile applications.',
};

export default function TermsPage() {
    return <TermsContent />;
}
