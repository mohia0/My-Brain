"use client";

import dynamic from 'next/dynamic';
import React from 'react';

const MobilePageContent = dynamic(
    () => import('@/components/Mobile/MobilePageContent'),
    { ssr: false }
);

export default function MobilePage() {
    return <MobilePageContent />;
}
