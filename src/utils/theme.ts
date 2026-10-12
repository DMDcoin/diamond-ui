import logger from '@/utils/logger';

export const initializeTheme = () => {
  // Ensure we're on the client side
  if (typeof window === 'undefined') return;

  // Use a more robust approach to wait for DOM elements
  const waitForThemeToggle = () => {
    const themeToggle = document.getElementById("theme-toggle") as HTMLInputElement | null;
    
    if (!themeToggle) {
      // If element doesn't exist yet, try again after a short delay
      setTimeout(waitForThemeToggle, 50);
      return;
    }

    setupTheme(themeToggle);
  };

  // If DOM is ready, proceed immediately, otherwise wait
  if (document.readyState === 'complete') {
    waitForThemeToggle();
  } else {
    window.addEventListener('load', waitForThemeToggle);
  }
};

const setupTheme = (themeToggle: HTMLInputElement) => {
  // Check for saved theme preference or respect OS preference
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  // Set initial theme without causing layout shift
  const setInitialTheme = () => {
    if (savedTheme === "light") {
      applyTheme("light");
      themeToggle.checked = true;
    } else if (savedTheme === "dark" || prefersDark) {
      applyTheme("dark");
      themeToggle.checked = false;
    } else {
      // Default to dark theme
      applyTheme("dark");
      themeToggle.checked = false;
    }
  };

  // Use multiple requestAnimationFrame to ensure theme is applied after hydration
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setInitialTheme();
    });
  });

  // Toggle theme when checkbox changes
  themeToggle.addEventListener("change", function (this: HTMLInputElement) {
    const newTheme = this.checked ? "light" : "dark";
    applyTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    // Animate theme transition
    document.body.classList.add("theme-transition");
    setTimeout(() => {
      document.body.classList.remove("theme-transition");
    }, 1000);
  });

  function applyTheme(themeName: "light" | "dark") {
    requestAnimationFrame(() => {
      try {
        document.body.classList.toggle("light-theme", themeName === "light");
      } catch (error) {
        logger.debug("Theme application encountered an extension conflict:", error);
      }
    });
  }
};
