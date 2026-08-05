import type { Metadata } from "next";
import { LoginForm } from "@/components/modules/auth/login-form";

export const metadata: Metadata = {
  title: "Acceso",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <LoginForm />
    </main>
  );
}
