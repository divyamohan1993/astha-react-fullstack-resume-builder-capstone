export function Slide10ThankYou() {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center p-8 text-center text-white"
      style={{
        background: 'linear-gradient(135deg, #e41a1a 0%, #8a1010 40%, #182B49 100%)',
      }}
    >
      <img
        src="https://shooliniuniversity.com/assets/images/logo.png"
        alt="Shoolini University logo"
        className="mb-8 h-20 w-auto"
        crossOrigin="anonymous"
      />
      <h2 className="mb-6 text-5xl font-extrabold md:text-6xl">
        Thank You
      </h2>
      <p className="mb-2 text-3xl font-bold">Astha Chandel</p>
      <p className="text-xl opacity-90">GF202214559</p>
      <p className="mt-4 text-lg opacity-80">
        Shoolini University, Solan, Himachal Pradesh
      </p>
      <div
        className="mt-10 rounded-full px-10 py-4 text-2xl font-bold"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          border: '2px solid rgba(255, 255, 255, 0.4)',
        }}
      >
        Questions?
      </div>
    </div>
  );
}
