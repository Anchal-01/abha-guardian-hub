import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
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

const VerifyABHAViaAadhaar = () => {
  const [aadhaar, setAadhaar] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { action } = location.state || {};
  const { toast } = useToast();

  const getSessionToken = () => {
    const session = localStorage.getItem("session");
    return session ? JSON.parse(session).token : null;
  };

  const isValidAadhaar = (value: string) => /^\d{12}$/.test(value);

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 12);
    setAadhaar(value);
  };

  const handleSendOtp = async () => {
  if (!isValidAadhaar(aadhaar)) {
    setTimeout(() => {
      toast({
        title: "Invalid Aadhaar",
        description: "Please enter a valid 12-digit Aadhaar number",
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

  const requestId = generateUUID();
  const timestamp = generateTimestamp();

  try {
    const response = await fetch(
      `${API_BASE}/curiomed/v1/abdm/verify/abha/aadhaarNo/request-otp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "REQUEST-ID": requestId,
          "TIMESTAMP": timestamp,
        },
        body: JSON.stringify({ aadhaar }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      // ✅ Extract txnId from response
      const receivedTxnId = data.txnId || data.transactionId || data.data?.txnId;

      if (!receivedTxnId) {
        throw new Error("No txnId in response from send-otp API");
      }

      setOtp("");
      setIsOtpModalOpen(true);

      // ✅ Save the correct txnId from API response
      localStorage.setItem(
        "abha-action-pending",
        JSON.stringify({
          aadhaar,
          txnId: receivedTxnId,   // ✅ Use actual txnId from response
          requestId,
          timestamp,
          action,
        })
      );

      setTimeout(() => {
        toast({
          title: "OTP Sent",
          description: "OTP sent to Aadhaar-linked mobile",
        });
      }, 0);
    } else {
      throw new Error(data.message || "Failed to send OTP");
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Send failed";
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
    setTimeout(() => {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit OTP",
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

  // ✅ Get the txnId from saved response
  const pending = JSON.parse(localStorage.getItem("abha-action-pending") || "{}");
  const { txnId, requestId, timestamp } = pending;

  if (!txnId) {
    setTimeout(() => {
      toast({
        title: "Session Error",
        description: "No transaction ID found. Please try again.",
        variant: "destructive",
      });
    }, 0);
    return;
  }

  setIsLoading(true);

  try {
    const response = await fetch(
      `${API_BASE}/curiomed/v1/abdm/verify/abha/aadhaarNo/verify-otp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "REQUEST-ID": requestId,
          "TIMESTAMP": timestamp,
        },
        body: JSON.stringify({ otp, txnId }), // ✅ Use correct txnId
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Network error");
    }

    if (data.authResult === "failed") {
      throw new Error(data.message || "OTP verification failed");
    }

    const xToken = data.token;
    if (!xToken) {
      throw new Error("No xToken received from server");
    }

    // ✅ Navigate to next page
    setTimeout(() => {
      navigate("/abha/action/method", { state: { xToken, action } });
    }, 0);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Verification failed";
    setTimeout(() => {
      toast({
        title: "Verification Failed",
        description: errorMsg,
        variant: "destructive",
      });
    }, 0);
  } finally {
    setIsLoading(false);
  }
};
  const closeOtpModal = () => {
    setIsOtpModalOpen(false);
    setOtp("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="bg-card/50 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Verify Your ABHA Account</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-8">
          <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Enter Aadhaar Number</CardTitle>
              <CardDescription>We'll send OTP to your Aadhaar-linked mobile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="aadhaar">Aadhaar Number</Label>
                  <Input
                    id="aadhaar"
                    type="text"
                    inputMode="numeric"
                    placeholder="123456789012"
                    value={aadhaar}
                    onChange={handleAadhaarChange}
                    className="text-center text-lg font-mono"
                    autoFocus
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleSendOtp}
                  disabled={isLoading || !isValidAadhaar(aadhaar)}
                >
                  {isLoading ? "Sending..." : "Send OTP"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* OTP Modal */}
      {isOtpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeOtpModal}></div>
          <Card className="w-full max-w-md z-10">
            <CardHeader>
              <CardTitle>Enter OTP</CardTitle>
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

export default VerifyABHAViaAadhaar;