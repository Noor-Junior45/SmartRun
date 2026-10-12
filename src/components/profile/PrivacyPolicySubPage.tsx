import React from 'react';
import { PrivacyPolicyPage } from '../PrivacyPolicyPage';

interface PrivacyPolicySubPageProps {
  onBack: () => void;
}

export const PrivacyPolicySubPage = ({ onBack }: PrivacyPolicySubPageProps) => {
  return <PrivacyPolicyPage onBack={onBack} />;
};
