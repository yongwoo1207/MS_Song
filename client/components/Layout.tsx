import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PropsWithChildren } from "react";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[hsl(120_50%_97%)] via-[hsl(105_60%_98%)] to-[hsl(90_50%_97%)] text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between">
          <Link to="/" className={cn("font-extrabold tracking-tight text-xl")}>입대곡 아카이브</Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <a href="https://forms.gle" target="_blank" rel="noreferrer" className="hover:text-foreground">피드백</a>
            <a href="/" className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-primary-foreground shadow hover:shadow-md">홈</a>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-10">{children}</main>
      <footer className="border-t py-10 text-center text-sm text-muted-foreground">
        <div className="container mx-auto">© {new Date().getFullYear()} 입대곡 아카이브</div>
      </footer>
    </div>
  );
}
