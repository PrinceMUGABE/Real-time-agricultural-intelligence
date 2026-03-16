import React, {useEffect } from 'react'
import {BrowserRouter, Routes, Route} from "react-router-dom";
import AOS from "aos";
import './App.css'
import LandingPage from './component/common/LandindPage';

//Admin Pages
import AdminLayout from './component/pages/admin/Layout';
import AdminMarketMatches from './component/pages/admin/MarketMatch';
import ManageCrops from './component/pages/admin/ManageCrops';
import FarmersPage from './component/pages/admin/ManageFarmers';
import UserManagement from './component/pages/admin/UserManagement';
import ContractsManagement from './component/pages/admin/ManageContracts';
import AdminStandardsManagement from './component/pages/admin/ManageStandards';



//Farmer Pages
import FarmerLayout from './component/pages/farmer/Layout';
import FarmerDashboard from './component/pages/farmer/Dashboard';
import MyStockManagement from './component/pages/farmer/MyStocks';


//Buyer Pages
import BuyerLayout from './component/pages/buyer/Layout';
import BuyerDashboard from './component/pages/buyer/Dashboard';


function App() {
  useEffect( ()=> {
    AOS.init({
      duration: 800,
      offset: 100,
      easing: "ease-in",
      delay: 100,
    });

    AOS.refresh();
  }, []);

  return (
    <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminMarketMatches />} />
            <Route path="crops" element={<ManageCrops />} />
            <Route path="farmers" element={<FarmersPage />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="contracts" element={<ContractsManagement />} />
            <Route path="standards" element={<AdminStandardsManagement />} />
          </Route>


          <Route path="/farmer" element={<FarmerLayout />}>
            <Route path="dashboard" element={<FarmerDashboard />} />
            <Route path="myStocks" element={<MyStockManagement />} />
          </Route>


          <Route path="/buyer" element={<BuyerLayout />}>
            <Route path="dashboard" element={<BuyerDashboard />} />
           
          </Route>



        </Routes>
      </BrowserRouter>
  )
}

export default App
