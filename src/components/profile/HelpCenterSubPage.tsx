import React from 'react';
import { UserProfile, Order, SavedAddress } from '../../types';
import { HelpCenterChat } from '../HelpCenterChat';

interface HelpCenterSubPageProps {
  userProfile: UserProfile | null;
  orders?: Order[];
  savedAddresses?: SavedAddress[];
  onBack: () => void;
}

export const HelpCenterSubPage = ({
  userProfile,
  orders = [],
  savedAddresses = [],
  onBack
}: HelpCenterSubPageProps) => {
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">
      <HelpCenterChat
        userProfile={userProfile}
        orders={orders}
        savedAddresses={savedAddresses}
        onBack={onBack}
      />
    </div>
  );
};
