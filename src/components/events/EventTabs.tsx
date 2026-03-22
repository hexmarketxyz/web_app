'use client';

import { useState, useEffect, type ReactNode } from 'react';

interface Tab {
  key: string;
  label: string;
  content: ReactNode;
}

interface EventTabsProps {
  tabs: Tab[];
}

export function EventTabs({ tabs }: EventTabsProps) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key);

  // If the active tab no longer exists in the list, fall back to the first available tab
  useEffect(() => {
    if (tabs.length > 0 && !tabs.some((t) => t.key === activeKey)) {
      setActiveKey(tabs[0].key);
    }
  }, [tabs, activeKey]);

  const activeTab = tabs.find((t) => t.key === activeKey);

  return (
    <div className="bg-hex-card rounded-xl border border-hex-border">
      {/* Tab headers */}
      <div className="flex border-b border-hex-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveKey(tab.key)}
            className={`px-5 py-3 text-sm font-medium transition border-b-2 -mb-px ${
              activeKey === tab.key
                ? 'border-hex-blue text-hex-blue'
                : 'border-transparent text-theme-secondary hover:text-theme-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">{activeTab?.content}</div>
    </div>
  );
}
