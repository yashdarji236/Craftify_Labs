import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, KeyRound } from 'lucide-react';

export default function InputField({
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  required = true,
  disabled = false,
  iconType = 'text',
  autoComplete,
}) {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  const renderIcon = () => {
    switch (iconType) {
      case 'email':
        return <Mail className="w-4 h-4 text-zinc-500" />;
      case 'password':
        return <Lock className="w-4 h-4 text-zinc-500" />;
      case 'confirmPassword':
        return <KeyRound className="w-4 h-4 text-zinc-500" />;
      case 'user':
        return <User className="w-4 h-4 text-zinc-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full group py-0.5">
      {iconType && (
        <div className="absolute left-0 bottom-3 pointer-events-none text-zinc-500 group-focus-within:text-zinc-200 transition-colors duration-200">
          {renderIcon()}
        </div>
      )}

      <input
        id={id}
        name={id}
        type={inputType}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full bg-transparent text-zinc-100 placeholder:text-zinc-500 text-sm py-2.5 sm:py-3 ${
          iconType ? 'pl-8' : 'pl-0'
        } ${
          isPassword ? 'pr-9' : 'pr-0'
        } border-b border-zinc-700/80 hover:border-zinc-500 focus:border-zinc-200 focus:outline-none transition-all duration-200`}
      />

      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-0 bottom-2.5 p-1 text-zinc-500 hover:text-zinc-200 transition-colors rounded-lg focus:outline-none cursor-pointer"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  );
}
