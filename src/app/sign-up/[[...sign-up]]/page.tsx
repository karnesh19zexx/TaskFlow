import { SignUp } from "@clerk/nextjs";
import { Logo } from "@/components/logo";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-muted/30 p-4">
      <Logo />
      <SignUp />
    </div>
  );
}
