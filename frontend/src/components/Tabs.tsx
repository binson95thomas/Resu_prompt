import React, { useState } from 'react';

export default function Tabs({ tabs, initial = 0 }) {
  const [selected, setSelected] = useState(initial);
  return (
    <div>
      <div className="flex space-x-2 border-b mb-4">
        {tabs.map((tab, idx) => (
          <button
            key={tab.label}
            onClick={() => setSelected(idx)}
            className={`px-4 py-2 font-medium rounded-t transition-all duration-200 ${selected === idx ? 'bg-gradient-to-r from-ocean-100 to-cyan-100 text-ocean-700 border-b-2 border-ocean-500 shadow-sm' : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 hover:from-gray-100 hover:to-gray-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-b shadow p-4 min-h-[120px]">{tabs[selected].content}</div>
    </div>
  );
} 