import React from 'react';
import * as Icons from 'lucide-react';

export const DynamicIcon = ({ name, className = '', size = 24 }) => {
  // Get icon component by name, fallback to 'HelpCircle' if it doesn't exist
  const IconComponent = Icons[name] || Icons.HelpCircle;
  return <IconComponent className={className} size={size} />;
};

export default DynamicIcon;
