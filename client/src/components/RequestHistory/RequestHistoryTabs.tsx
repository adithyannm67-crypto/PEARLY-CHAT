export default function RequestHistoryTabs({ activeTab, onChange }: { activeTab: 'received' | 'sent'; onChange: (tab: 'received' | 'sent') => void }) {
  return (
    <div className="flex gap-2 p-2 border-b border-border-custom/40">
      <button onClick={() => onChange('received')} className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium ${activeTab === 'received' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-surface'}`}>Received</button>
      <button onClick={() => onChange('sent')} className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium ${activeTab === 'sent' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-surface'}`}>Sent</button>
    </div>
  );
}
