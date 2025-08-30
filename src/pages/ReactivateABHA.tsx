import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ArrowLeft, MessageSquare, IdCard } from "lucide-react";

const ReactivateABHA = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Reactivate ABHA</h1>
          <p className="text-muted-foreground">Choose a verification method to Reactivate your ABHA account</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          <div className="grid gap-4">
            {/* Delete via ABHA OTP */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm group"
              onClick={() => navigate("/delete-abha/via-abha")}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-success/10 rounded-full p-3 group-hover:bg-success/20 transition-colors">
                    <MessageSquare className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Reactivate via ABHA OTP</CardTitle>
                    <CardDescription>Send OTP to ABHA-registered mobile</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button variant="outline" className="w-full">Select Method</Button>
              </CardContent>
            </Card>

            {/* Delete via Aadhaar OTP */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm group"
              onClick={() => navigate("/delete-abha/via-aadhaar")}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 rounded-full p-3 group-hover:bg-primary/20 transition-colors">
                    <IdCard className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Reactivate via Aadhaar OTP</CardTitle>
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

export default ReactivateABHA;