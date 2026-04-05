export default function StorePage() {
  return (
    <main className="min-h-screen bg-white px-6 py-16 text-black">
      <div className="mx-auto max-w-5xl">
        
        {/* Store header */}
        <div className="mb-10 rounded-3xl border border-black/10 p-6">
          <h1 className="text-3xl font-semibold">Taivo Garage</h1>
          <p className="text-black/60 mt-2">
            Personal store for parts, tools and useful finds.
          </p>
        </div>

        {/* Listings */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="cursor-pointer rounded-3xl border border-black/10 p-4 shadow-sm"
            >
              <div className="mb-3 h-40 w-full rounded-xl bg-neutral-100" />

              <h2 className="text-lg font-medium">BMW E39 headlights</h2>

              <p className="mb-2 text-sm text-black/60">
                Used headlights in good condition. Fits BMW E39 models.
              </p>

              <p className="text-lg font-semibold">60€</p>
            </div>
          ))}

        </div>
      </div>
    </main>
  );
}