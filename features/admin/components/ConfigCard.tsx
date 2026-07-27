import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface ConfigCardProps {
  title: string;
  icon: any;
  items: string[];
  onUpdate: (items: string[]) => void;
}

export default function ConfigCard({ title, icon: Icon, items, onUpdate }: ConfigCardProps) {
  const [newItem, setNewItem] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (newItem.trim() && !items.includes(newItem.trim())) {
      onUpdate([...items, newItem.trim()]);
      setNewItem('');
      setIsAdding(false);
    }
  };

  const handleRemove = (itemToRemove: string) => {
    if (confirm(`Are you sure you want to remove "${itemToRemove}"?`)) {
      onUpdate(items.filter(i => i !== itemToRemove));
    }
  };

  return (
    <div className="bg-[#2D2424] rounded-xl shadow-lg border border-[#3A2E2E] p-6 flex flex-col h-full">
       <div className="flex justify-between items-center mb-6 border-b border-[#3A2E2E] pb-4">
          <h3 className="font-bold text-lg flex items-center text-white">
             <Icon size={20} className="mr-2 text-field-gold" /> {title}
          </h3>
          <button 
            onClick={() => setIsAdding(true)}
            className="w-8 h-8 rounded-full bg-field-gold/10 text-field-gold flex items-center justify-center hover:bg-field-gold hover:text-black transition-colors"
          >
            <Plus size={16} />
          </button>
       </div>

       {isAdding && (
         <div className="mb-4 flex gap-2 animate-fade-in">
           <input 
             type="text" 
             value={newItem}
             onChange={(e) => setNewItem(e.target.value)}
             className="flex-1 p-2 bg-[#1A1515] border border-[#3A2E2E] rounded text-sm text-white focus:border-field-gold outline-none"
             placeholder="Enter name"
           />
           <button onClick={handleAdd} className="px-3 py-2 bg-field-gold text-black rounded text-sm font-bold">Save</button>
           <button onClick={() => setIsAdding(false)} className="px-3 py-2 bg-[#1A1515] text-gray-400 rounded text-sm border border-[#3A2E2E]">Cancel</button>
         </div>
       )}

       <div className="space-y-2 overflow-y-auto max-h-80 pr-2 flex-1 scrollbar-thin scrollbar-thumb-[#3A2E2E] scrollbar-track-transparent">
          {items.map((item, idx) => (
             <div key={idx} className="flex items-center justify-between p-3 bg-[#1A1515] rounded-lg border border-[#3A2E2E] group hover:border-field-gold/30 transition-colors">
                <span className="text-sm font-medium text-gray-200">{item}</span>
                <button 
                  onClick={() => handleRemove(item)}
                  className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
             </div>
          ))}
       </div>
    </div>
  );
}
