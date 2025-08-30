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
import { ArrowLeft, CheckCircle } from "lucide-react";
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

const SendOTPViaAadhaar = () => {
  const [abhaNumber, setAbhaNumber] = useState("");
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); // ✅ New state
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { xToken, action } = location.state || {};
  const { toast } = useToast();

  const getSessionToken = () => {
    const session = localStorage.getItem("session");
    return session ? JSON.parse(session).token : null;
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

    const endpoint =
      action === "delete"
        ? `${API_BASE}/curiomed/v1/abdm/delete/abha/byaadhaar/request-otp`
        : `${API_BASE}/curiomed/v1/abdm/deactivate/abha/byaadhaar/request-otp`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-token": `Bearer ${xToken}`,
          "REQUEST-ID": newRequestId,
          "TIMESTAMP": newTimestamp,
        },
        body: JSON.stringify({ abhaNumber: abhaNumber.replace(/-/g, "") }),
      });

      const data = await response.json();

      if (response.ok) {
        setOtp("");
        setReason("");
        setIsOtpModalOpen(true);
        localStorage.setItem(
          "abha-action-data",
          JSON.stringify({ abhaNumber, txnId: newTxnId, requestId: newRequestId, timestamp: newTimestamp, xToken })
        );
        toast({
          title: "OTP Sent",
          description: "OTP sent to Aadhaar-linked mobile",
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

    if (!reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please enter a reason",
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

    const data = JSON.parse(localStorage.getItem("abha-action-data") || "{}");
    const { txnId, requestId, timestamp, xToken: savedXToken } = data;

    if (!txnId || !savedXToken) {
        toast({
            title: "Session Lost",
            description: "Please restart the process.",
            variant: "destructive",
        });
        navigate("/delete-abha");
        return;
    }


    setIsLoading(true);

    const endpoint =
      action === "delete"
        ? `${API_BASE}/curiomed/v1/abdm/delete/abha/byaadhaar/verify-otp`
        : `${API_BASE}/curiomed/v1/abdm/deactivate/abha/byaadhaar/verify-otp`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-token": `Bearer ${savedXToken}`,
          "REQUEST-ID": requestId,
          "TIMESTAMP": timestamp,
        },
        body: JSON.stringify({ otp, txnId, reason }),
      });

      const result = await response.json();

      if (!response.ok || result.authResult === "failed") {
        throw new Error(result.message || "Verification failed");
      }

      // ✅ Set success message
      const msg = action === "delete" ? "ABHA account deleted" : "ABHA Deactivated";
      setSuccessMessage(msg);

      toast({
        title: "Success",
        description: msg,
      });

      // ✅ Show full success screen
      setShowSuccess(true);
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
    setReason("");
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  // ✅ Success Screen
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg border-0 bg-card/50 backdrop-blur-sm">
          <CardContent className="text-center p-8">
            <div className="bg-success/10 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{successMessage}</h2>
            <p className="text-muted-foreground mb-6">
              Your request has been processed successfully.
            </p>
            <Button onClick={handleBackToDashboard} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="bg-card/50 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Enter ABHA Number</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-8">
          <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>ABHA Number</CardTitle>
              <CardDescription>Enter your ABHA number to proceed</CardDescription>
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
                <Button className="w-full" onClick={handleSendOtp}>
                  Send OTP
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
              <CardTitle>Enter OTP & Reason</CardTitle>
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
                <Input
                  type="text"
                  placeholder="Reason for action"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <Button
                  className="w-full"
                  onClick={handleVerifyOtp}
                  disabled={isLoading || otp.length !== 6 || !reason.trim()}
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

export default SendOTPViaAadhaar;