import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Simulate a check for route existence (you can adapt this logic to check for actual valid routes)
const validRoutes = [
  '/dao',
  '/about',
  '/home',
  '/staking',
  '/staking/details/:poolAddress', // Add other valid routes here
  '/dao/create',
  '/dao/historic',
  '/dao/details/:proposalId',
]; // Define your valid routes

const RouteRedirect = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const path = location.pathname;

        // If the path is valid, no need to do anything, let React Router handle it
        if (validRoutes.includes(path)) {
            return;
        }

        // If not a valid route, navigate to the home page
        navigate('/');

        // After redirecting to home, check if the route exists again and navigate to it
        setTimeout(() => {
            if (validRoutes.includes(path)) {
                navigate(path);
            } else {
                // If route still does not exist, navigate to NotFound
                navigate('/404'); // Ensure that NotFound route exists
            }
        }, 300); // Wait a bit for the homepage navigation to complete before navigating to the original route
    }, [location, navigate]);

    return null; // No UI to render
};

export default RouteRedirect;
