import LoginForm from "./login-form";
import Backdrop from "@/components/Backdrop";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <>
      <Backdrop />
      <LoginForm linkExpired={error === "auth_callback_failed"} />
    </>
  );
}
