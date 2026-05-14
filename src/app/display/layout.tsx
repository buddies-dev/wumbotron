export default function DisplayLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <section className="h-dvh overflow-hidden bg-black text-white">
      {children}
    </section>
  );
}
