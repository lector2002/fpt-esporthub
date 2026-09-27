import { BrandPanel, MobileBrand, MobileFootnote } from "@/features/auth/components/brand-panel";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-2">
      <BrandPanel />
      <main className="flex flex-col items-center justify-center gap-8 px-4 py-10">
        <MobileBrand />
        {children}
        <MobileFootnote />
      </main>
    </div>
  );
}
