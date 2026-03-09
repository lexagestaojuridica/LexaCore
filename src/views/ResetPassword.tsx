import { useEffect } from "react";
import { useRouter } from "next/navigation";

const ResetPassword = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace("/auth");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
};

export default ResetPassword;
