import NavBar from "./layout/Navbar";
import Footer from "./layout/Footer";
import NotFound from "./pages/NotFound";
import Loader from "./components/Loader";
import React, { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const Home = lazy(() => import("./pages/Home"));
const DaoHome = lazy(() => import("./pages/Dao/DaoHome"));
const Pools = lazy(() => import("./pages/Staking/Pools"));
const PoolDetails = lazy(() => import("./pages/Staking/PoolDetails"));
const CreateProposal = lazy(() => import("./pages/Dao/CreateProposal"));
const ProposalDetails = lazy(() => import("./pages/Dao/ProposalDetails"));
const HistoricProposals = lazy(() => import("./pages/Dao/HistoricProposals"));

interface AppProps {}

const App: React.FC<AppProps> = () => {
  useEffect(() => {
    const circle = document.getElementById('body-bg-glow');

    const onMouseMove = (e: MouseEvent) => {
      if (!circle) return;
      
      // Calculate the center coordinates of the circle
      let centerX = e.clientX - (circle.offsetWidth / 2) + window.scrollX;
      let centerY = e.clientY - (circle.offsetHeight / 2) + window.scrollY;
      
      // Get the viewport dimensions
      const extraPadding = 20;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Constrain the circle's position within the viewport
      centerX = Math.max(window.scrollX, Math.min(centerX, window.scrollX + viewportWidth - circle.offsetWidth - extraPadding));
      centerY = Math.max(window.scrollY, Math.min(centerY, window.scrollY + viewportHeight - circle.offsetHeight - extraPadding));
      
      // Update the position of the circle based on the center coordinates
      circle.style.left = centerX + 'px';
      circle.style.top = centerY + 'px';
    };

    document.addEventListener('mousemove', onMouseMove);

    // Clean up the event listener when the component unmounts
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, []); 

  return (
    <BrowserRouter>
      <NavBar />

      <div className="body-bg"></div>
      <div id="body-bg-glow" className="body-bg-glow"></div>

      <Suspense fallback={<Loader isLoading={true} />}>
        <Routes>
          <Route index element={<Home />} />
          <Route path="dao" element={<DaoHome />} />
          <Route path="dao/create" element={<CreateProposal />} />
          <Route path="dao/historic" element={<HistoricProposals />} />
          <Route path="dao/details/:proposalId" element={<ProposalDetails />} />
          
          <Route path="staking/" element={<Pools />} />
          <Route path="staking/details/:poolAddress" element={<PoolDetails />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Footer />
    </BrowserRouter>
  );
};

export default App;
