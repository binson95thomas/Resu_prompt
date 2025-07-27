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
            className={`px-4 py-2 font-medium rounded-t transition-colors duration-150 ${selected === idx ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-b shadow p-4 min-h-[120px]">{tabs[selected].content}</div>
    </div>
  );
} 