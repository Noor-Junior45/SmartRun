import React from 'react';
import { TermsOfServicePage } from '../TermsOfServicePage';

interface TermsOfServiceSubPageProps {
  onBack: () => void;
}

export const TermsOfServiceSubPage = ({ onBack }: TermsOfServiceSubPageProps) => {
  return <TermsOfServicePage onBack={onBack} />;
};
