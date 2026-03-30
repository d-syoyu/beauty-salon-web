"use client";

export default function FloatingBackButton() {
  return null;

  return (
    <>
      {/* Desktop / Tablet - right edge tab */}
      <a
        href="https://www.soga.ltd/#sample"
        className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-50 flex-col items-center gap-3 px-3 py-6 bg-charcoal text-cream rounded-l-2xl shadow-xl hover:bg-sage-dark hover:px-5 transition-all duration-300 ease-out group"
      >
        {/* X icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        <span
          className="text-xs font-bold tracking-[0.15em]"
          style={{ writingMode: "vertical-rl" }}
        >
          サンプルを終了する
        </span>
      </a>

      {/* Mobile - bottom fixed bar */}
      <a
        href="https://www.soga.ltd/#sample"
        className="flex md:hidden fixed bottom-0 left-0 right-0 z-50 items-center justify-center gap-2 py-3 px-6 bg-charcoal text-cream shadow-[0_-4px_20px_rgba(0,0,0,0.15)] active:bg-sage-dark transition-colors duration-200"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4 shrink-0"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        <span className="text-sm font-bold tracking-[0.1em]">
          サンプルを終了する
        </span>
      </a>
    </>
  );
}
