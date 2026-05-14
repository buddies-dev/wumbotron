export default function DisplayLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <section className="h-dvh min-h-screen overflow-hidden bg-black text-white">
      <div className="safe-tv h-full overflow-hidden">{children}</div>
    </section>
  );
}
