import Backdrop from "@/components/Backdrop";

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Backdrop />
      {children}
    </>
  );
}
