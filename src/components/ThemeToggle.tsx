import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial preference
    const isDarkMode = document.documentElement.classList.contains('dark') || 
                       localStorage.getItem('nexus-theme') === 'dark' ||
                       (!localStorage.getItem('nexus-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    setIsDark(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const newDark = !prev;
      if (newDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('nexus-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('nexus-theme', 'light');
      }
      return newDark;
    });
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl bg-nexus-surface border border-nexus-border shadow-sm hover:shadow-md transition-all duration-300 group flex items-center justify-center relative overflow-hidden"
      aria-label="Toggle Theme"
    >
      <motion.div
        initial={false}
        animate={{ 
          rotate: isDark ? -90 : 0,
          scale: isDark ? 0 : 1,
          opacity: isDark ? 0 : 1
        }}
        transition={{ duration: 0.3 }}
        className="absolute"
      >
        <Sun className="w-5 h-5 text-[#F59E0B]" />
      </motion.div>

      <motion.div
        initial={false}
        animate={{ 
          rotate: isDark ? 0 : 90,
          scale: isDark ? 1 : 0,
          opacity: isDark ? 1 : 0
        }}
        transition={{ duration: 0.3 }}
        className={isDark ? "relative" : "absolute"}
      >
        <Moon className="w-5 h-5 text-[#5B8CFF]" />
      </motion.div>
    </button>
  );
}