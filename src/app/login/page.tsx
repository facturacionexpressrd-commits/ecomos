import LoginForm from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; mode?: string }> }) {
  const { error, mode } = await searchParams;
  return <LoginForm linkExpired={error === "auth_callback_failed"} startSignUp={mode === "sign-up"} />;
}
