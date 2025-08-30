import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Check, Mail, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL

const AddressSelection = () => {
  const [selectedAddress, setSelectedAddress] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchingAddresses, setFetchingAddresses] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Get state from previous step
  const { aadharNumber, mobileNumber, txnId, xToken } = location.state || {};

  // Validate required state
  useEffect(() => {
    if (!aadharNumber || !mobileNumber || !txnId || !xToken) {
      toast({
        title: "Missing Data",
        description: "Required data missing. Please restart the process.",
        variant: "destructive",
      });
      navigate("/create-abha");
      return;
    }
  }, [aadharNumber, mobileNumber, txnId, xToken, navigate, toast]);

  // Retrieve session token
  const getSessionToken = () => {
    const session = localStorage.getItem("session");
    if (session) {
      try {
        const sessionData = JSON.parse(session);
        return sessionData.token || null;
      } catch (e) {
        console.error("Failed to parse session", e);
        return null;
      }
    }
    return null;
  };

  // Fetch ABHA address suggestions
  useEffect(() => {
    const fetchAddressSuggestions = async () => {
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

      setFetchingAddresses(true);
      try {
        const response = await fetch(
          `${API_BASE}/curiomed/v1/abdm/enrollment/address/suggestion?txnId=${txnId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (response.ok && Array.isArray(data.abhaAddressList)) {
          // ✅ Use correct key: abhaAddressList
          setAddressSuggestions(data.abhaAddressList);

          if (data.abhaAddressList.length > 0) {
            setSelectedAddress(data.abhaAddressList[0]); // Pre-select first
          } else {
            toast({
              title: "No Addresses Suggested",
              description: "Try again or use a different mobile number.",
              variant: "default",
            });
          }
        } else {
          throw new Error(data.message || "Failed to fetch addresses");
        }
      } catch (err) {
        console.error("Error fetching ABHA addresses:", err);
        toast({
          title: "Could Not Load Addresses",
          description: err instanceof Error ? err.message : "Network error",
          variant: "destructive",
        });
        setAddressSuggestions([]);
      } finally {
        setFetchingAddresses(false);
      }
    };

    fetchAddressSuggestions();
  }, [txnId, navigate, toast]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAddress) {
      toast({
        title: "Select ABHA Address",
        description: "Please select an ABHA address to continue",
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
        `${API_BASE}/curiomed/v1/abdm/enrollment/address/set`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            txnId,
            abhaAddress: selectedAddress,
            preferred: 1,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "ABHA Created Successfully",
          description: "Your ABHA account has been created and linked",
        });

        // Extract ABHA number from response if available
        const abhaNumber = data.abha || data.abhaNumber || "12-3456-7890-1234";

        // Navigate to ABHA details
        navigate("/abha-details", {
          state: {
            aadharNumber,
            mobileNumber,
            abhaAddress: selectedAddress,
            abhaNumber: data.abha || "12-3456-7890-1234",
            txnId,
            name: data.name || "User", // optional
            gender: data.gender || "Not Specified",
            dob: data.dob || "1990-01-01",
            xToken,
          },
        });
      } else {
        throw new Error(data.message || `Failed to set ABHA address (${response.status})`);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to create ABHA account";

      toast({
        title: "Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
          <div>
            <h1 className="text-2xl font-bold">Select ABHA Address</h1>
            <p className="text-muted-foreground">Choose your preferred ABHA address</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="bg-success text-success-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                  ✓
                </div>
                <span className="ml-2 text-sm font-medium">Verified</span>
              </div>
              <div className="w-16 h-px bg-border"></div>
              <div className="flex items-center">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                  4
                </div>
                <span className="ml-2 text-sm font-medium">Address</span>
              </div>
              <div className="w-16 h-px bg-border"></div>
              <div className="flex items-center">
                <div className="bg-muted text-muted-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">
                  5
                </div>
                <span className="ml-2 text-sm text-muted-foreground">Complete</span>
              </div>
            </div>
          </div>

          {/* Address Selection Card */}
          <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-primary/10 rounded-full p-4">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle>Choose ABHA Address</CardTitle>
              <CardDescription>
                 {fetchingAddresses
                  ? "Fetching your ABHA addresses..."
                  : addressSuggestions.length === 0
                  ? "No ABHA addresses suggested"
                  : `Select one of ${addressSuggestions.length} suggested addresses`}
              </CardDescription>
            </CardHeader>
            <CardContent>
               {fetchingAddresses ? (
                // Loading State
                <div className="flex flex-col items-center py-6 space-y-3">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-muted-foreground">Loading addresses...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {addressSuggestions.length === 0 ? (
                    // No Addresses
                    <div className="p-4 bg-muted rounded-lg text-center text-sm text-muted-foreground">
                      <AlertCircle className="h-5 w-5 mx-auto mb-2 opacity-70" />
                      No ABHA addresses were suggested. Please try again.
                    </div>
                  ) : (
                    // Show Addresses as Selectable List (like a dropdown)
                    <RadioGroup value={selectedAddress} onValueChange={setSelectedAddress}>
                      <div className="space-y-2">
                        {addressSuggestions.map((address, index) => (
                          <div
                            key={index}
                            className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-all hover:bg-primary/5 ${
                              selectedAddress === address
                                ? "border-primary bg-primary/10 ring-1 ring-primary"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <RadioGroupItem value={address} id={`address-${index}`} />
                            <Label
                              htmlFor={`address-${index}`}
                              className="flex-1 font-mono text-sm cursor-pointer"
                            >
                              {address}
                            </Label>
                            {selectedAddress === address && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  )}

                  <Button
                    type="submit"
                    className="w-full mt-4"
                    disabled={isLoading || !selectedAddress}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                        <span>Creating ABHA...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Check className="h-4 w-4" />
                        <span>Create ABHA Account</span>
                      </div>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Info */}
          <div className="bg-card/30 backdrop-blur-sm rounded-lg p-4 border">
            <div className="text-sm space-y-2">
              <p><span className="font-medium">Mobile:</span> {mobileNumber}</p>
              <p>
                <span className="font-medium">Aadhar:</span>{" "}
                {aadharNumber?.replace(/(\d{4})(\d{4})(\d{4})/, "****-****-$3")}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AddressSelection;