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
import { ArrowLeft, Search } from "lucide-react";
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

const FindABHA = () => {
  const [mobile, setMobile] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
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

  const formatMobile = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 10);
    return cleaned.length > 5
      ? `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
      : cleaned;
  };

  const isValidMobile = (value: string) => /^\d{10}$/.test(value.replace(/\s/g, ""));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleaned = value.replace(/[^0-9]/g, "");
    const formatted = formatMobile(cleaned);
    setMobile(formatted);
  };

  const handleSearch = async () => {
    setAccounts([]);
    if (!isValidMobile(mobile)) {
      setTimeout(() => {
        toast({
          title: "Invalid Mobile",
          description: "Please enter a valid 10-digit mobile number",
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

    const newRequestId = generateUUID();
    const newTimestamp = generateTimestamp();
    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/curiomed/v1/abdm/search/abha/mobile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "REQUEST-ID": newRequestId,
            "TIMESTAMP": newTimestamp,
          },
          body: JSON.stringify({
            mobile: mobile.replace(/\s/g, ""),
          }),
        }
      );

      const data = await response.json();

      let abhaAccounts = [];
      if (Array.isArray(data) && data[0]?.ABHA) {
        abhaAccounts = data[0].ABHA;
      } else if (data.accounts) {
        abhaAccounts = data.accounts;
      } else {
        throw new Error("No ABHA accounts found or invalid response format");
      }

      if (abhaAccounts.length === 0) {
        throw new Error("No ABHA linked to this mobile number");
      }

      setAccounts(abhaAccounts);

      setTimeout(() => {
        toast({
          title: "Accounts Found",
          description: `Found ${abhaAccounts.length} ABHA(s) linked to this mobile`,
        });
      }, 0);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Search failed";
      setTimeout(() => {
        toast({
          title: "Search Failed",
          description: errorMsg,
          variant: "destructive",
        });
      }, 0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectABHA = (abha: any) => {
    navigate("/find-abha/verify", {
      state: {
        abha: {
          ...abha,
          index: abha.index.toString(), // ensure string
        },
        mobile: mobile.replace(/\s/g, ""),
      },
    });
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
          <h1 className="text-2xl font-bold">Find Your ABHA</h1>
          <p className="text-muted-foreground">Enter your registered mobile number to locate your ABHA</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-8">
          {/* Mobile Input */}
          <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Enter Mobile Number</CardTitle>
              <CardDescription>We'll search for ABHA(s) linked to this mobile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input
                    id="mobile"
                    type="text"
                    inputMode="numeric"
                    placeholder="98765 43210"
                    value={mobile}
                    onChange={handleInputChange}
                    maxLength={12}
                    className="text-center text-lg tracking-wider font-mono"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground text-center">Format: 98765 43210</p>
                </div>

                {mobile && !isValidMobile(mobile) && (
                  <p className="text-sm text-destructive">Please enter a valid 10-digit mobile number</p>
                )}

                <Button
                  className="w-full"
                  onClick={handleSearch}
                  disabled={isLoading || !isValidMobile(mobile)}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                      <span>Searching...</span>
                    </div>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      <span>Find My ABHA</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ABHA List */}
          {accounts.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-center">Select ABHA Account</h2>
              <div className="space-y-3">
                {accounts.map((acc, idx) => (
                  <Card
                    key={idx}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleSelectABHA(acc)}
                  >
                    <CardContent className="p-4">
                      <div className="font-mono text-lg">{acc.ABHANumber}</div>
                      <div className="text-sm text-muted-foreground">{acc.name}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default FindABHA;