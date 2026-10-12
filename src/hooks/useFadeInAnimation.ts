import { useEffect } from 'react';

/**
 * Custom hook to handle fade-in animations using Intersection Observer
 * Automatically observes all elements with the 'fade-in' class and adds 'visible' class when they intersect
 * Uses MutationObserver to watch for new elements being added dynamically
 * 
 * @param threshold - The intersection threshold (default: 0.1)
 */
export const useFadeInAnimation = (threshold: number = 0.1) => {
  useEffect(() => {
    // Only run on client-side where document is available
    if (typeof window === 'undefined') return;
    
    const observedElements = new Set<Element>();
    
    // Create intersection observer
    const intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold,
      rootMargin: '50px 0px -50px 0px' // Start animation slightly before element is fully visible
    });

    // Function to observe new fade-in elements
    const observeElements = (elements: NodeListOf<Element>) => {
      elements.forEach(element => {
        if (!observedElements.has(element)) {
          intersectionObserver.observe(element);
          observedElements.add(element);
        }
      });
    };

    // Initial observation of existing elements
    const initialElements = document.querySelectorAll('.fade-in');
    observeElements(initialElements);

    // Create mutation observer to watch for new elements
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // Check if the added element itself has fade-in class
            if (element.classList.contains('fade-in')) {
              if (!observedElements.has(element)) {
                intersectionObserver.observe(element);
                observedElements.add(element);
              }
            }
            
            // Check for fade-in elements within the added element
            const fadeElements = element.querySelectorAll('.fade-in');
            observeElements(fadeElements);
          }
        });
      });
    });

    // Start watching for DOM changes
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Cleanup function
    return () => {
      if (intersectionObserver) {
        intersectionObserver.disconnect();
      }
      if (mutationObserver) {
        mutationObserver.disconnect();
      }
      observedElements.clear();
    };
  }, [threshold]);
};
