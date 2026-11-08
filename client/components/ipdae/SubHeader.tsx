import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

/** Back arrow and title for pages opened from the header. */
export default function SubHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  const navigate = useNavigate();
  // Opened straight from a link: there is no page to go back to
  const back = () =>
    window.history.length > 1 ? navigate(-1) : navigate("/", { replace: true });
  return (
    <header className="flex items-center gap-1 px-2.5 pb-1.5 pt-3">
      <button
        type="button"
        aria-label="뒤로"
        onClick={back}
        className="flex size-11 items-center justify-center text-foreground"
      >
        <ChevronLeft className="size-[21px]" strokeWidth={2} />
      </button>
      <h1 className="flex-1 text-lg font-bold">{title}</h1>
      {action}
    </header>
  );
}
