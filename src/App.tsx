import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import NavBar from "./layout/Navbar";
import Loader from "./components/Loader";

const DaoHome = lazy(() => import("./pages/Dao/DaoHome"));
const Home = lazy(() => import("./pages/Home"));
const Pools = lazy(() => import("./pages/Staking/Pools"));
const PoolDetails = lazy(() => import("./pages/Staking/PoolDetails"));
const ProposalDetails = lazy(() => import("./pages/Dao/ProposalDetails"));
const CreateProposal = lazy(() => import("./pages/Dao/CreateProposal"));
const HistoricProposals = lazy(() => import("./pages/Dao/HistoricProposals"));

interface AppProps {}

const App: React.FC<AppProps> = () => {
  return (
    <BrowserRouter>
      <NavBar />
      <Suspense fallback={<Loader isLoading={true} />}>
        <Routes>
          <Route index element={<Home />} />
          <Route path="dao" element={<DaoHome />} />
          <Route path="dao/create" element={<CreateProposal />} />
          <Route path="dao/historic" element={<HistoricProposals />} />
          <Route path="dao/details/:proposalId" element={<ProposalDetails />} />
          
          <Route path="pools" element={<Pools />} />
          <Route path="pool-details/:poolAddress" element={<PoolDetails />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
