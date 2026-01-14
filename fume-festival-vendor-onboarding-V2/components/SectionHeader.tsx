
import React from 'react';

interface Props {
  title: string;
}

const SectionHeader: React.FC<Props> = ({ title }) => {
  return (
    <div className="bg-gray-900 px-8 py-5">
      <h2 className="text-xl font-bold text-white uppercase tracking-wide">{title}</h2>
    </div>
  );
};

export default SectionHeader;
