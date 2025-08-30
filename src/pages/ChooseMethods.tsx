import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { MessageSquare, IdCard } from "lucide-react";

const ChooseMethod = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { xToken, action } = location.state || {};

  if (!xToken) {
    // ✅ Handle missing xToken
    console.error("xToken missing in ChooseMethod");
    navigate("/delete-abha"); // or login
    return null;
  }

  const handleSelect = (method: "aadhaar" | "abha") => {
    navigate(`/abha/action/via-${method}`, { state: { xToken, action } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="bg-card/50 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>
          <h1 className="text-2xl font-bold">Choose Methods to Delete ABHA</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          <div className="grid gap-4">
            <Card
              className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm group"
              onClick={() => handleSelect("abha")}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-success/10 rounded-full p-3 group-hover:bg-success/20 transition-colors">
                    <MessageSquare className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <CardTitle className="text-base">via ABHA OTP</CardTitle>
                    <CardDescription>Send OTP to ABHA-registered mobile</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button variant="outline" className="w-full">Select Method</Button>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm group"
              onClick={() => handleSelect("aadhaar")}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 rounded-full p-3 group-hover:bg-primary/20 transition-colors">
                    <IdCard className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">via Aadhaar OTP</CardTitle>
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
    </div>
  );
};

export default ChooseMethod;