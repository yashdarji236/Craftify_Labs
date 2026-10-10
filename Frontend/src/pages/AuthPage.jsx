import React, { useState } from 'react';
import AuthCard from '../components/AuthCard';
import Toast from '../components/Toast';

export default function AuthPage() {
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const closeToast = () => {
    setToast({ message: '', type: 'info' });
  };

  return (
    <main className="relative h-screen w-full flex flex-col md:flex-row md:justify-end overflow-hidden p-0 m-0 bg-[#09090b]">
      {/* Fullscreen Metallic Silk Wallpaper Background */}
      <div className="fixed inset-0 z-0">
        <img
          src="/img2.jpg"
          alt="Dark metallic texture background"
          className="w-full h-full object-cover object-center filter brightness-95 contrast-105"
        />
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
      </div>

      {/* Right Container Docked to Corner: Full Height, Half Width, Rounded Left Radius */}
      <div className="relative z-10 w-full md:w-1/2 lg:w-[48%] xl:w-[42%] h-full bg-[#111114]/92 md:bg-[#111114]/88 backdrop-blur-2xl border-l border-white/10 rounded-none md:rounded-l-3xl shadow-[-30px_0_70px_rgba(0,0,0,0.85)] flex flex-col md:ml-auto overflow-y-auto">
        <AuthCard onToast={showToast} />
      </div>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={closeToast}
      />
    </main>
  );
}
