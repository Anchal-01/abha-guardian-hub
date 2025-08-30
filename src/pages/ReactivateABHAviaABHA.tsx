import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

const ReactivateABHAViaABHA = () => {
  const [abhaNumber, setAbhaNumber] = useState("");
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [txnId, setTxnId] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const getSessionToken = () => {
    const session = localStorage.getItem("session");
    if (session) {
      try {
        const data = JSON.parse(session);
        return data.token || null;
      } catch (e) {
        console.error("Failed to parse session", e);
        return null;
      }
    }
    return null;
  };

  const isValidABHA = (value: string) => /^\d{14}$/.test(value.replace(/-/g, ""));

  const handleAbhaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 14);
    const formatted = value.length > 10
      ? `${value.slice(0, 2)}-${value.slice(2, 6)}-${value.slice(6, 10)}-${value.slice(10)}`
      : value;
    setAbhaNumber(formatted);
  };

  const handleSendOtp = async () => {
    if (!isValidABHA(abhaNumber)) {
      toast({
        title: "Invalid ABHA",
        description: "Please enter a valid 14-digit ABHA number",
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

    const newTxnId = generateUUID();
    const newRequestId = generateUUID();
    const newTimestamp = generateTimestamp();

    try {
      const response = await fetch(
        `${API_BASE}/curiomed/v1/abdm/reactivate/abha/byabha/request-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "REQUEST-ID": newRequestId,
            "TIMESTAMP": newTimestamp,
          },
          body: JSON.stringify({
            abhaNumber: abhaNumber.replace(/-/g, ""),
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setTxnId(newTxnId);
        setOtp("");
        setIsOtpModalOpen(true);
        toast({
          title: "OTP Sent",
          description: "OTP sent to ABHA-registered mobile",
        });
      } else {
        throw new Error(data.message || "Failed to send OTP");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Send failed";
      toast({
        title: "Send Failed",
        description: errorMsg,
        variant: "destructive",
      });
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

    try {
      const response = await fetch(
        `${API_BASE}/curiomed/v1/abdm/reactivate/abha/byabha/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "REQUEST-ID": generateUUID(),
            "TIMESTAMP": generateTimestamp(),
          },
          body: JSON.stringify({
            otp,
            txnId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Verification failed");
      }

      const xToken = data.token;
      if (!xToken) {
        throw new Error("No xToken received after reactivation");
      }

      // ✅ Success: Show toast and navigate to GetProfile
      toast({
        title: "Success",
        description: "ABHA account reactivated successfully",
      });

      navigate("/verify-abha/get-profile", {
        state: {
          xToken,
          txnId,
          abhaNumber: abhaNumber.replace(/-/g, ""),
          verificationMethod: "abha",
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

  const closeOtpModal = () => {
    setIsOtpModalOpen(false);
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
          <h1 className="text-2xl font-bold">Reactivate ABHA via ABHA OTP</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-8">
          <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Enter ABHA Number</CardTitle>
              <CardDescription>We'll send OTP to ABHA-registered mobile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="abha">ABHA Number</Label>
                  <Input
                    id="abha"
                    type="text"
                    placeholder="12-3456-7890-1234"
                    value={abhaNumber}
                    onChange={handleAbhaChange}
                    className="text-center text-lg font-mono"
                    autoFocus
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleSendOtp}
                  disabled={isLoading || !isValidABHA(abhaNumber)}
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

export default ReactivateABHAViaABHA;