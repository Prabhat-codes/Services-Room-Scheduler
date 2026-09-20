import { LiveRefresh } from "@/components/live-refresh";

export default function RunnerLayout({ children }: LayoutProps<"/companies">) {
  return (
    <>
      {children}
      <LiveRefresh />
    </>
  );
}
