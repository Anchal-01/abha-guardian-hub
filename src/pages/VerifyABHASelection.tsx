import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MessageSquare, IdCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL

const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const generateTimestamp = () => new Date().toISOString();

const VerifyABHASelection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [txnId, setTxnId] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { abha, mobile } = location.state || {};
  const { toast } = useToast();

  const getSessionToken = () => {
    const session = localStorage.getItem("session");
    return session ? JSON.parse(session).token : null;
  };

 const handleSendOtp = async (method: "mobile" | "aadhaar") => {
    if (!abha || !abha.index) {

        setTimeout(() => {
        toast({
            title: "Invalid Account",
            description: "Account data is incomplete.",
            variant: "destructive",
        });
        }, 0);
        return;
    }

    const token = getSessionToken();
    if (!token) {
        setTimeout(() => {
        toast({
            title: "Session Expired",
            description: "Please log in again.",
            variant: "destructive",
        });
        }, 0);
        navigate("/login");
        return;
    }

    const txnId = generateUUID();           
    const requestId = generateUUID();       
    const timestamp = generateTimestamp();  

    const endpoint =
    method === "mobile"
      ? `${API_BASE}/curiomed/v1/abdm/search/abha/mobile/request-otp`
      : `${API_BASE}/curiomed/v1/abdm/search/abha/aadhaar/request-otp`;

    try {
        const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "REQUEST-ID": requestId,     
            "TIMESTAMP": timestamp,      
        },
        body: JSON.stringify({
            index: abha.index.toString(), 
            txnId,                       
        }),
        });

        const data = await response.json();

        if (response.ok) {
        setTxnId(txnId); // Save for verify step
        setOtp("");
        setIsModalOpen(true);

        setTimeout(() => {
            toast({
            title: "OTP Sent",
            description: `OTP sent to ${method === "mobile" ? "registered" : "Aadhaar-linked"} mobile`,
            });
        }, 0);
        } else {
        // Handle error message
        let errorMsg = "Failed to send OTP";
        try {
            const err = JSON.parse(data.message);
            errorMsg = err.loginIdTxnId || errorMsg;
        } catch (e) {
            errorMsg = data.message || errorMsg;
        }

        throw new Error(errorMsg);
        }
    } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Network error";
    setTimeout(() => {
      toast({
        title: "Send Failed",
        description: errorMsg,
        variant: "destructive",
      });
    }, 0);
  }
};

  const handleVerifyOtp = async () => {
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    const token = getSessionToken();
    if (!token) {
      toast({
        title: "Session Expired",
        description: "Please log in again.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    setIsLoading(true);

    const endpoint =
      abha.authMethods?.includes("AADHAAR_OTP") || abha.authMethods?.includes("AadhaarOTP")
        ? `${API_BASE}/curiomed/v1/abdm/search/abha/aadhaar/verify-otp`
        : `${API_BASE}/curiomed/v1/abdm/search/abha/mobile/verify-otp`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "REQUEST-ID": generateUUID(),
          "TIMESTAMP": generateTimestamp(),
        },
        body: JSON.stringify({ txnId, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Verification failed");
      }

      const xToken = data.token;
      if (!xToken) {
        throw new Error("No token received after verification");
      }

      navigate("/verify-abha/get-profile", {
        state: {
          xToken,
          txnId,
          abhaNumber: abha.ABHANumber,
          verificationMethod: abha.authMethods?.includes("AADHAAR_OTP") ? "aadhaar" : "mobile",
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Verification failed";
      toast({
        title: "Verification Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setOtp("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Choose Verification Method</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          <div className="grid gap-4">
            {/* Find via Mobile OTP */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm group"
              onClick={() => handleSendOtp("mobile")}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-success/10 rounded-full p-3 group-hover:bg-success/20 transition-colors">
                    <MessageSquare className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Find ABHA via Mobile OTP</CardTitle>
                    <CardDescription>Send OTP to registered mobile</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button variant="outline" className="w-full">Select Method</Button>
              </CardContent>
            </Card>

            {/* Find via Aadhaar OTP */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm group"
              onClick={() => handleSendOtp("aadhaar")}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 rounded-full p-3 group-hover:bg-primary/20 transition-colors">
                    <IdCard className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Find ABHA via Aadhaar OTP</CardTitle>
                    <CardDescription>Send OTP to Aadhaar-linked mobile</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button variant="outline" className="w-full">Select Method</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* OTP Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal}></div>
          <Card className="w-full max-w-md z-10">
            <CardHeader>
              <CardTitle>Enter OTP</CardTitle>
              <CardDescription>We've sent a 6-digit OTP to your mobile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  autoFocus
                />
                <Button
                  className="w-full"
                  onClick={handleVerifyOtp}
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? "Verifying..." : "Verify OTP"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default VerifyABHASelection;