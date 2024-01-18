import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import NavBar from "./layout/Navbar";

const Home = lazy(() => import("./pages/Home"));
const Pools = lazy(() => import("./pages/Pools"));
const PoolDetails = lazy(() => import("./pages/PoolDetails"));

interface AppProps {}

const App: React.FC<AppProps> = () => {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route index element={<Home />} />
        <Route path="pools" element={<Pools />} />
        <Route path="pool-details/:poolAddress" element={<PoolDetails />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
