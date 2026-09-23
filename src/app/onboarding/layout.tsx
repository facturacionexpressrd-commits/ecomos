import Backdrop from "@/components/Backdrop";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Backdrop />
      {children}
    </>
  );
}
