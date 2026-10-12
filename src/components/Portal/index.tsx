import logger from '@/utils/logger';
import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
  target?: string;
}

const Portal: React.FC<PortalProps> = ({ children, target = 'modal-root' }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  const element = document.getElementById(target);
  if (!element) {
    logger.warn(`Portal target element with id "${target}" not found`);
    return null;
  }

  return ReactDOM.createPortal(children, element);
};

export default Portal;
