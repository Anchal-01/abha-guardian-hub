import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MessageSquare, IdCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL

// UUID & Timestamp Helpers
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const generateTimestamp = () => new Date().toISOString();

const VerifyByABHAAddress = () => {
  const [abhaAddress, setAbhaAddress] = useState("");
  const [authMethods, setAuthMethods] = useState<string[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<"aadhaar" | "mobile" | null>(null);
  const [showMethods, setShowMethods] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [txnId, setTxnId] = useState("");
  const [requestId, setRequestId] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  // Retrieve session token from login
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

  // Validate ABHA Address format (e.g. user@sbx, user@abha)
  const isValidABHAAddress = (value: string) => {
    if (!value) return false;
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+$/.test(value);
  };

  // Handle input change → trigger search API
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAbhaAddress(value);
    setSelectedMethod(null);
    setAuthMethods([]);
    setShowMethods(false);

    // Only trigger search if valid format
    if (!value || !isValidABHAAddress(value)) return;

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

    const newRequestId = generateUUID();
    const newTimestamp = generateTimestamp();

    try {
      const response = await fetch(
        `${API_BASE}/curiomed/v1/abdm/verify/abha/abhaAddress/search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "REQUEST-ID": newRequestId,
            "TIMESTAMP": newTimestamp,
          },
          body: JSON.stringify({
            abhaAddress: value,
          }),
        }
      );

      const data = await response.json();

      // 🔥 Debug: Check what the API actually returns
      console.log("🔍 ABHA Address Search API Response:", data);

      if (response.ok) {
        const methods = Array.isArray(data.authMethods)
          ? data.authMethods.map((m) => m.trim())
          : [];

        setAuthMethods(methods);
        setRequestId(newRequestId);
        setTimestamp(newTimestamp);

        // ✅ Fuzzy match: check if any method contains "aadhaar" or "mobile" (case-insensitive)
        const hasAadhaar = methods.some((m) =>
          m.toLowerCase().includes("aadhaar") || m.toLowerCase().includes("aadhar")
        );
        const hasMobile = methods.some((m) =>
          m.toLowerCase().includes("mobile") || m.toLowerCase().includes("otp")
        );

        if (hasAadhaar || hasMobile) {
          setShowMethods(true);
        } else {
          toast({
            title: "No Methods Found",
            description: "No verification methods available for this ABHA Address.",
            variant: "default", // ✅ Only allowed variants
          });
        }
      } else {
        throw new Error(data.message || "Failed to search ABHA Address");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Network error";
      toast({
        title: "Search Failed",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  // Handle method selection
  const handleMethodSelect = (method: "aadhaar" | "mobile") => {
    setSelectedMethod(method);
  };

  // Send OTP based on selected method
  const handleSendOtp = async () => {
    if (!abhaAddress || !isValidABHAAddress(abhaAddress)) {
      toast({
        title: "Invalid ABHA Address",
        description: "Please enter a valid ABHA Address",
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

    const newRequestId = generateUUID();
    const newTimestamp = generateTimestamp();

    try {
      let endpoint = "";
      if (selectedMethod === "aadhaar") {
        endpoint = `${API_BASE}/curiomed/v1/abdm/verify/abha/abhaAddress/aadhaar/request-otp`;
      } else {
        endpoint = `${API_BASE}/curiomed/v1/abdm/verify/abha/abhaAddress/request-otp`;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "REQUEST-ID": newRequestId,
          "TIMESTAMP": newTimestamp,
        },
        body: JSON.stringify({
          abhaAddress,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTxnId(data.txnId);
        setRequestId(newRequestId);
        setTimestamp(newTimestamp);
        setOtp("");
        setIsOtpModalOpen(true);
        toast({
          title: "OTP Sent",
          description: `OTP sent to your ${selectedMethod === "aadhaar" ? "Aadhaar-linked" : "registered"} mobile`,
        });
      } else {
        throw new Error(data.message || "Failed to send OTP");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Network error";
      toast({
        title: "Send Failed",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
  if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
    // ✅ Wrap toast in setTimeout to avoid "during render" warning
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

  setIsLoading(true);

  try {
    let endpoint = "";
    if (selectedMethod === "aadhaar") {
      endpoint = `${API_BASE}/curiomed/v1/abdm/verify/abha/abhaAddress/aadhaar/verify-otp`;
    } else {
      endpoint = `${API_BASE}/curiomed/v1/abdm/verify/abha/abhaAddress/verify-otp`;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        txnId,
        otp,
      }),
    });

    const data = await response.json();

    console.log("✅ Verify OTP Response:", data); // 🔥 Debug

    if (!response.ok) {
      throw new Error(data.message || "OTP verification failed");
    }

    // ✅ Fix: Extract xToken safely
    const xToken = data.token || data.xToken || data.accessToken || data.tokens?.token;
    if (!xToken) {
      throw new Error("No xToken received in response");
    }

    // ✅ Navigate only after success
    setTimeout(() => {
      navigate("/verify-abha/get-profile", {
        state: {
          xToken: data.tokens.token,
          txnId,
          requestId,
          abhaAddress,
          verificationMethod: selectedMethod,
        },
      });
    }, 0);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Verification failed";
    console.error("❌ OTP Verify Failed:", err); // 🔥 Debug

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
  // Close OTP modal
  const closeOtpModal = () => {
    setIsOtpModalOpen(false);
    setOtp("");
    setSelectedMethod(null);
  };

  // ✅ Fuzzy check for rendering
  const hasAadhaarMethod = authMethods.some((m) =>
    m.toLowerCase().includes("aadhaar") || m.toLowerCase().includes("aadhar")
  );
  const hasMobileMethod = authMethods.some((m) =>
    m.toLowerCase().includes("mobile") || m.toLowerCase().includes("otp")
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Verify via ABHA Address</h1>
            <p className="text-muted-foreground">Enter your ABHA Address to verify account</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-8">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="bg-success text-success-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                  ✓
                </div>
                <span className="ml-2 text-sm font-medium">Method</span>
              </div>
              <div className="w-16 h-px bg-border"></div>
              <div className="flex items-center">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <span className="ml-2 text-sm font-medium">Verify</span>
              </div>
              <div className="w-16 h-px bg-border"></div>
              <div className="flex items-center">
                <div className="bg-muted text-muted-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">
                  3
                </div>
                <span className="ml-2 text-sm text-muted-foreground">Complete</span>
              </div>
            </div>
          </div>

          {/* ABHA Address Input */}
          <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Enter ABHA Address</CardTitle>
              <CardDescription>e.g. user123@abha</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="abha-address">ABHA Address</Label>
                  <Input
                    id="abha-address"
                    type="text"
                    placeholder="user123@abha"
                    value={abhaAddress}
                    onChange={handleInputChange}
                    className="text-lg"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">Enter your full ABHA Address</p>
                </div>

                {abhaAddress && !isValidABHAAddress(abhaAddress) && (
                  <p className="text-sm text-destructive">Please enter a valid ABHA Address</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Auth Methods (Only if found) */}
          {showMethods && !selectedMethod && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-center">Choose Verification Method</h2>

              {hasAadhaarMethod && (
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm group"
                  onClick={() => handleMethodSelect("aadhaar")}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary/10 rounded-full p-3 group-hover:bg-primary/20 transition-colors">
                        <IdCard className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Using Aadhaar OTP</CardTitle>
                        <CardDescription>Verify via Aadhaar-linked mobile</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button variant="outline" className="w-full">Select Method</Button>
                  </CardContent>
                </Card>
              )}

              {hasMobileMethod && (
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm group"
                  onClick={() => handleMethodSelect("mobile")}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-success/10 rounded-full p-3 group-hover:bg-success/20 transition-colors">
                        <MessageSquare className="h-6 w-6 text-success" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Using Mobile OTP</CardTitle>
                        <CardDescription>Verify via registered mobile</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button variant="outline" className="w-full">Select Method</Button>
                  </CardContent>
                </Card>
              )}

              {/* Fallback if no methods match */}
              {!hasAadhaarMethod && !hasMobileMethod && showMethods && (
                <p className="text-sm text-destructive text-center">
                  No supported verification methods available.
                </p>
              )}
            </div>
          )}

          {/* Send OTP Button (After Method Selected) */}
          {selectedMethod && (
            <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Confirm & Send OTP</CardTitle>
                <CardDescription>
                  We'll send an OTP to verify via{" "}
                  <strong>{selectedMethod === "aadhaar" ? "Aadhaar" : "Mobile"}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={handleSendOtp}>
                  Send OTP
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Info Section */}
          <div className="bg-card/30 backdrop-blur-sm rounded-lg p-6 border text-sm text-muted-foreground">
            <h3 className="font-semibold mb-2">Need Help?</h3>
            <p>• ABHA Address is case-sensitive (e.g. user123@abha)</p>
            <p className="mt-1">• OTP will be sent to the linked mobile number</p>
          </div>
        </div>
      </main>

      {/* OTP Modal */}
      {isOtpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeOtpModal}></div>
          <Card className="w-full max-w-md relative z-10 shadow-2xl border-0 bg-card/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle>Enter OTP</CardTitle>
              <CardDescription>We've sent a 6-digit OTP to your mobile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                    className="text-center text-lg font-mono tracking-wider"
                    autoFocus
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleVerifyOtp}
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    "Verify OTP"
                  )}
                </Button>
                <Button variant="link" className="w-full" onClick={handleSendOtp}>
                  Resend OTP
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default VerifyByABHAAddress;