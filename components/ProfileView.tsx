import React, { useState, useRef } from 'react';
import { User } from '../types';
import { User as UserIcon, Camera, Trash2, Save, ArrowLeft, Check, Shield, Mail, AlertCircle } from 'lucide-react';

interface Props {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onLogout: () => void;
  onBack: () => void;
}

const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='%232D2424' stroke='%23D99026' stroke-width='1.5'><path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/></svg>";

export default function ProfileView({ user, onUpdateUser, onLogout, onBack }: Props) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [avatar, setAvatar] = useState(user.avatar || DEFAULT_AVATAR);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  React.useEffect(() => {
    setName(user.name);
    setEmail(user.email);
    setAvatar(user.avatar || DEFAULT_AVATAR);
  }, [user]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatar(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteAvatar = () => {
    if (confirm("Are you sure you want to delete your profile picture?")) {
      setAvatar(DEFAULT_AVATAR);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApplyUrl = () => {
    if (customUrl.trim()) {
      setAvatar(customUrl.trim());
      setShowUrlInput(false);
      setCustomUrl('');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const updated: User = {
      ...user,
      name: name.trim(),
      email: email.trim(),
      avatar: avatar,
    };

    onUpdateUser(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="bg-[#1A1515] min-h-screen text-white pb-24">
      {/* Header */}
      <div className="p-6 border-b border-[#3A2E2E] flex items-center justify-between sticky top-0 bg-[#1A1515] z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-1 hover:bg-[#2D2424] rounded-lg transition-colors text-gray-300 hover:text-white"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-xl font-bold">Profile & Account</h2>
        </div>
        <span className="text-xs uppercase font-bold px-3 py-1 bg-field-gold/10 text-field-gold rounded-full border border-field-gold/30">
          {user.role}
        </span>
      </div>

      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
        
        {savedSuccess && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
            <Check size={20} className="flex-shrink-0" />
            <span className="text-sm font-medium">Profile updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Profile Picture Card */}
          <div className="bg-[#2D2424] p-6 rounded-2xl border border-[#3A2E2E] shadow-xl">
            <h3 className="text-sm font-bold text-field-gold uppercase tracking-wider mb-4 flex items-center gap-2">
              <Camera size={16} /> Profile Picture
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative group">
                <img 
                  src={avatar} 
                  alt={name} 
                  className="w-28 h-28 rounded-full border-4 border-field-gold object-cover shadow-lg bg-[#1A1515]" 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-field-gold text-black rounded-full shadow-lg hover:bg-field-goldHover transition-transform transform hover:scale-105"
                  title="Upload New Photo"
                >
                  <Camera size={18} />
                </button>
              </div>

              <div className="flex-1 text-center sm:text-left space-y-3">
                <p className="text-sm text-field-textMuted">
                  Upload a clear profile photo or photo avatar for team identification.
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-field-gold text-black font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-field-goldHover transition-colors flex items-center gap-2"
                  >
                    <Camera size={14} /> Upload Photo
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteAvatar}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2"
                    title="Delete Profile Picture"
                  >
                    <Trash2 size={14} /> Delete Picture
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="bg-[#1A1515] hover:bg-black/30 text-gray-300 border border-[#3A2E2E] text-xs px-3 py-2.5 rounded-lg transition-colors"
                  >
                    {showUrlInput ? 'Cancel URL' : 'Image URL'}
                  </button>
                </div>

                {showUrlInput && (
                  <div className="flex gap-2 pt-2">
                    <input 
                      type="url" 
                      value={customUrl} 
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="Paste image URL..."
                      className="flex-1 bg-[#1A1515] border border-[#3A2E2E] text-white text-xs rounded-lg px-3 py-2 focus:border-field-gold outline-none"
                    />
                    <button 
                      type="button" 
                      onClick={handleApplyUrl}
                      className="bg-field-gold text-black font-bold text-xs px-3 py-2 rounded-lg"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Staff Information Card */}
          <div className="bg-[#2D2424] p-6 rounded-2xl border border-[#3A2E2E] shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-field-gold uppercase tracking-wider mb-2 flex items-center gap-2">
              <UserIcon size={16} /> Staff Information
            </h3>

            <div>
              <label className="block text-xs font-bold text-field-textMuted uppercase tracking-wider mb-2">
                Staff Name
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#1A1515] border border-[#3A2E2E] text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-field-gold transition-colors"
                  placeholder="Enter your full name"
                  required
                />
                <UserIcon size={18} className="absolute left-3.5 top-3.5 text-field-gold" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-field-textMuted uppercase tracking-wider mb-2">
                Email / Contact
              </label>
              <div className="relative">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#1A1515] border border-[#3A2E2E] text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-field-gold transition-colors"
                  placeholder="Enter email address"
                  required
                />
                <Mail size={18} className="absolute left-3.5 top-3.5 text-field-gold" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-field-textMuted uppercase tracking-wider mb-2">
                Role
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={user.role === 'admin' ? 'Administrator' : 'Field Staff Member'}
                  disabled
                  className="w-full bg-[#1A1515]/60 border border-[#3A2E2E] text-gray-400 rounded-xl pl-10 pr-4 py-3 text-sm cursor-not-allowed"
                />
                <Shield size={18} className="absolute left-3.5 top-3.5 text-gray-500" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <button
              type="submit"
              className="flex-1 bg-field-gold hover:bg-field-goldHover text-black font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-field-gold/20 flex items-center justify-center gap-2 transition-all uppercase text-xs tracking-wider"
            >
              <Save size={18} /> Save Changes
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 uppercase text-xs tracking-wider"
            >
              Logout Account
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
