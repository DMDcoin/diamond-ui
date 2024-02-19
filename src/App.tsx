import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import NavBar from "./layout/Navbar";
import Loader from "./components/Loader";

const Dao = lazy(() => import("./pages/Dao"));
const Home = lazy(() => import("./pages/Home"));
const Pools = lazy(() => import("./pages/Pools"));
const CreateDao = lazy(() => import("./pages/CreateDao"));
const PoolDetails = lazy(() => import("./pages/PoolDetails"));
const DaoDetails = lazy(() => import("./pages/DaoDetails"));

interface AppProps {}

const App: React.FC<AppProps> = () => {
  return (
    <BrowserRouter>
      <NavBar />
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route index element={<Home />} />
          <Route path="dao" element={<Dao />} />
          <Route path="create-dao" element={<CreateDao />} />
          <Route path="dao-details/:proposalId" element={<DaoDetails />} />
          <Route path="pools" element={<Pools />} />
          <Route path="pool-details/:poolAddress" element={<PoolDetails />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
