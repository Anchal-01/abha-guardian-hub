// App.tsx
import { Toaster } from "@/components/ui/sonner";
// import { Sonner } from "@/components/ui/sonner";
import { toast } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CreateABHA from "./pages/CreateABHA";
import AadharVerification from "./pages/AadharVerification";
import OTPVerification from "./pages/OTPVerification";
import MobileVerification from "./pages/MobileVerification";
import MobileOTPVerification from "./pages/MobileOTPVerification";
import AddressSelection from "./pages/AddressSelection";
import ABHADetails from "./pages/ABHADetails";
import NotFound from "./pages/NotFound";
import VerifyABHA from "./pages/VerifyABHA";
import VerifyByABHANumber from "./pages/VerifyByABHANumber";
import VerifyByAadhaar from "./pages/VerifyByAadhaar";
import GetProfile from "./pages/GetProfile";
import VerifyByMobile from "./pages/VerifyByMobile";
import VerifyByABHAAddress from "./pages/VerifyByABHAAddress";
import FindABHA from "./pages/FindABHA";
import VerifyABHASelection from "./pages/VerifyABHASelection";
import ReactivateABHA from "./pages/ReactivateABHA";
import ReactivateABHAViaAadhaar from "./pages/ReactivateABHAviaAadhar";
import DeactivateABHA from "./pages/DeactivateABHA";
import VerifyABHAViaAadhaar from "./pages/VerifyABHAViaAadhaar";
import ChooseMethods from "./pages/ChooseMethods";
import SendOTPViaAadhaar from "./pages/SendOTPViaAadhaar";
import SendOTPViaABHA from "./pages/SendOTPViaABHA";
import DeleteABHA from "./pages/DeleteABHA";
import ReactivateABHAViaABHA from "./pages/ReactivateABHAviaABHA";

const queryClient = new QueryClient();

// Define routes with future flag
const router = createBrowserRouter(
  [
    { path: "/", element: <Login />, },

    { path: "/login", element: <Login />,},

    { path: "/dashboard", element: <Dashboard />, },

    { path: "/create-abha", element: <CreateABHA />, },

    { path: "/create-abha/aadhar", element: <AadharVerification />, },

    { path: "/create-abha/aadhar/otp", element: <OTPVerification />, },

    { path: "/create-abha/mobile-verification", element: <MobileVerification />, },

    { path: "/create-abha/mobile/otp", element: <MobileOTPVerification />, },

    { path: "/create-abha/address-selection", element: <AddressSelection />, },

    { path: "/abha-details", element: <ABHADetails />, },

    { path: "/verify-abha", element: <VerifyABHA />, },

    { path: "/verify-abha/abha-number", element: <VerifyByABHANumber />, },

    { path: "/verify-abha/aadhaar", element: <VerifyByAadhaar />, },

    { path: "/verify-abha/mobile", element: <VerifyByMobile />, },

    { path: "/verify-abha/address", element: <VerifyByABHAAddress />, },

    { path: "/verify-abha/get-profile", element: <GetProfile />, },

    { path: "/find-abha", element: <FindABHA />, },

    { path: "/find-abha/verify", element: <VerifyABHASelection />, },

    { path: "/reactivate-abha", element: <ReactivateABHA />, },

    { path: "/reactivate-abha/via-aadhaar", element: <ReactivateABHAViaAadhaar />, },

    { path: "/reactivate-abha/via-abha", element: <ReactivateABHAViaABHA />, },
    
    { path: "/deactivate-abha", element: <DeactivateABHA />, },

    { path: "/delete-abha", element: <DeleteABHA />, },

    { path: "/abha/action/verify", element: <VerifyABHAViaAadhaar />, },

    { path: "/abha/action/method", element: <ChooseMethods />, },

    { path: "/abha/action/via-aadhaar", element: <SendOTPViaAadhaar />, },

    { path: "/abha/action/via-abha", element: <SendOTPViaABHA />, },


  //    path: "/abha/action/verify",
  // element: <VerifyABHAViaAadhaar />,

    // { path: "/delete-abha/via-abha", element: <DeleteABHAViaABHA />, },

  

    { path: "*", element: <NotFound />, },
  ],
  {
    future: {
      v7_relativeSplatPath: true, // 👈 Eliminates the warning
      // v7_startTransition: true,   // 👈 Also fix the second warning
    },
  }
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      {/* <Sonner /> */}
      <RouterProvider router={router} />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;