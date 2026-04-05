export function Footer() {
  return (
    <footer
      className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 print:hidden"
      style={{ background: 'var(--accent-navy)' }}
      role="contentinfo"
    >
      <div>
        <div className="text-sm font-bold text-white">ResumeAI</div>
        <div className="text-xs text-white/50">BTech CSE Capstone Project</div>
      </div>
      <div className="text-center">
        <div className="text-xs text-white/70">Developed by</div>
        <div className="text-sm font-bold text-white">Astha Chandel</div>
        <div className="text-xs text-white/40">GF202214559</div>
      </div>
      <div className="flex items-center gap-2 text-right">
        <img
          src="https://shooliniuniversity.com/assets/images/logo.png"
          alt="Shoolini University"
          className="h-6 w-6 rounded bg-white object-contain p-0.5"
          width={24}
          height={24}
        />
        <div>
          <div className="text-xs font-bold text-white">
            Shoolini University
          </div>
          <div className="text-xs text-white/40">Solan, Himachal Pradesh</div>
        </div>
      </div>
    </footer>
  );
}
